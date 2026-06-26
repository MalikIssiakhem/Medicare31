"""
diagnose_smtp.py — Outil de diagnostic du système SMTP de Medicare31.

Usage (à l'intérieur du conteneur backend) :
    docker compose exec backend python scripts/diagnose_smtp.py

Usage (local sans Docker) :
    cd backend && python scripts/diagnose_smtp.py

Ce script :
  1. Charge la configuration SMTP depuis app.config.settings.
  2. Tente d'ouvrir une connexion TCP vers SMTP_HOST:SMTP_PORT.
  3. Si STARTTLS est activable, le négocie.
  4. Si SMTP_USER est fourni, tente l'authentification.
  5. Envoie un email de test vers SMTP_TEST_TO (ou SMTP_USER par défaut).

À la fin, il affiche un diagnostic clair avec :
  ✅ si tout fonctionne,
  ❌ + cause probable + piste de correction si quelque chose échoue.

Variable d'environnement optionnelle :
  SMTP_TEST_TO=adresse@domaine.test   pour cibler un destinataire précis.
"""
from __future__ import annotations

import os
import smtplib
import ssl
import sys
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


# ---------------------------------------------------------------------------
# Affichage "pretty" sans dépendance externe
# ---------------------------------------------------------------------------
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
BOLD = "\033[1m"
RESET = "\033[0m"


def _ok(msg: str) -> None:
    print(f"{GREEN}✅ {msg}{RESET}")


def _ko(msg: str) -> None:
    print(f"{RED}❌ {msg}{RESET}")


def _warn(msg: str) -> None:
    print(f"{YELLOW}⚠️  {msg}{RESET}")


def _info(msg: str) -> None:
    print(f"{BLUE}ℹ️  {msg}{RESET}")


def _title(msg: str) -> None:
    print(f"\n{BOLD}{BLUE}{'─' * 60}\n{msg}\n{'─' * 60}{RESET}")


# ---------------------------------------------------------------------------
# Chargement de la configuration
# ---------------------------------------------------------------------------
def _load_settings():
    """
    Charge les settings Pydantic.

    On ne peut PAS les importer tout en haut parce que ce script doit pouvoir
    tourner dans un environnement où `app.config` n'est pas installable
    (par exemple si l'utilisateur lance le script depuis la racine du repo
    sans avoir installé le package). On tente donc l'import, puis on tombe
    en fallback sur les variables d'environnement brutes.
    """
    try:
        # Quand on est dans le conteneur ou que le package est installé
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from app.config import settings  # type: ignore

        return {
            "smtp_host": settings.smtp_host,
            "smtp_port": settings.smtp_port,
            "smtp_user": settings.smtp_user,
            "smtp_password": settings.smtp_password,
            "smtp_from": settings.smtp_from,
            "smtp_use_tls": settings.smtp_use_tls,
        }
    except Exception as exc:  # noqa: BLE001
        _warn(f"Impossible de charger app.config ({exc}). "
              "Fallback sur les variables d'environnement brutes.")
        return {
            "smtp_host": os.environ.get("SMTP_HOST", ""),
            "smtp_port": int(os.environ.get("SMTP_PORT", "587")),
            "smtp_user": os.environ.get("SMTP_USER", ""),
            "smtp_password": os.environ.get("SMTP_PASSWORD", ""),
            "smtp_from": os.environ.get("SMTP_FROM", "noreply@example.com"),
            "smtp_use_tls": os.environ.get("SMTP_USE_TLS", "").lower() in ("1", "true", "yes"),
        }


# ---------------------------------------------------------------------------
# Étapes de diagnostic
# ---------------------------------------------------------------------------
def _print_config(cfg: dict) -> None:
    _title("1. Configuration SMTP chargée")
    print(f"   host     = {cfg['smtp_host']!r}")
    print(f"   port     = {cfg['smtp_port']}")
    print(f"   from     = {cfg['smtp_from']!r}")
    print(f"   user     = {cfg['smtp_user'] or '(vide)'}")
    print(f"   password = {'*' * len(cfg['smtp_password']) if cfg['smtp_password'] else '(vide)'}")
    print(f"   use_tls  = {cfg['smtp_use_tls']}")

    if not cfg["smtp_host"]:
        _ko("SMTP_HOST est vide. Le backend ne pourra pas envoyer d'email.")
        return

    if cfg["smtp_user"] and not cfg["smtp_password"]:
        _warn("SMTP_USER est défini mais SMTP_PASSWORD est vide. "
              "L'authentification va échouer.")
    elif not cfg["smtp_user"] and not cfg["smtp_password"]:
        _info("Aucun identifiant configuré : OK pour MailHog, "
              "inadapté pour Brevo/Gmail/SendGrid.")


def _check_connection(cfg: dict) -> bool:
    _title("2. Connexion TCP au serveur SMTP")
    try:
        with smtplib.SMTP(cfg["smtp_host"], cfg["smtp_port"], timeout=10) as server:
            server.ehlo()
            _ok(f"Connexion TCP + EHLO réussis vers {cfg['smtp_host']}:{cfg['smtp_port']}")
            return True
    except smtplib.SMTPConnectError as exc:
        _ko(f"Connexion refusée par {cfg['smtp_host']}:{cfg['smtp_port']} : {exc}")
        _info("Pistes :")
        _info("  - Le serveur est-il démarré ? (MailHog: docker compose ps mailhog)")
        _info("  - Le port est-il le bon ? (MailHog=1025, Brevo=587, Gmail=465/587)")
        _info("  - Un pare-feu bloque-t-il la connexion ?")
        return False
    except OSError as exc:
        _ko(f"Erreur réseau vers {cfg['smtp_host']}:{cfg['smtp_port']} : {exc}")
        _info("Pistes : nom DNS introuvable, timeout, ou IP refusée par le serveur.")
        return False
    except Exception as exc:  # noqa: BLE001
        _ko(f"Erreur inattendue : {exc}")
        return False


def _check_starttls(cfg: dict) -> bool:
    use_tls = cfg["smtp_use_tls"] or bool(cfg["smtp_user"])
    if not use_tls:
        _title("3. STARTTLS (skippé : pas d'authentification ni de TLS forcé)")
        return True

    _title("3. Négociation STARTTLS")
    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(cfg["smtp_host"], cfg["smtp_port"], timeout=10) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            _ok("STARTTLS négocié avec succès.")
            return True
    except Exception as exc:  # noqa: BLE001
        _ko(f"Échec de STARTTLS : {exc}")
        _info("Le serveur ne supporte peut-être pas STARTTLS sur ce port. "
              "Essayez le port 465 (SMTPS) ou désactivez smtp_use_tls.")
        return False


def _check_auth_and_send(cfg: dict) -> bool:
    if not cfg["smtp_user"]:
        _title("4. Authentification + envoi (skippé : pas de SMTP_USER)")
        return True

    _title("4. Authentification SMTP + envoi d'un email de test")

    test_to = os.environ.get("SMTP_TEST_TO") or cfg["smtp_user"]
    subject = "[Medicare31] Test diagnostic SMTP"
    body_text = (
        "Ceci est un email de test envoyé par backend/scripts/diagnose_smtp.py.\n"
        "Si vous le lisez, votre configuration SMTP fonctionne.\n"
    )
    body_html = "<h1>Test SMTP OK ✅</h1><p>Medicare31 / diagnose_smtp.py</p>"

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"MediCare31 <{cfg['smtp_from']}>"
    message["To"] = test_to
    message.attach(MIMEText(body_text, "plain", "utf-8"))
    message.attach(MIMEText(body_html, "html", "utf-8"))

    use_tls = cfg["smtp_use_tls"] or bool(cfg["smtp_user"])

    try:
        with smtplib.SMTP(cfg["smtp_host"], cfg["smtp_port"], timeout=10) as server:
            server.ehlo()
            if use_tls:
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
            server.login(cfg["smtp_user"], cfg["smtp_password"])
            _ok(f"Authentification réussie en tant que {cfg['smtp_user']!r}")
            server.sendmail(cfg["smtp_from"], test_to, message.as_string())
            _ok(f"Email de test envoyé à {test_to!r}")
            return True
    except smtplib.SMTPAuthenticationError as exc:
        _ko(f"Échec d'authentification : {exc}")
        _info("Pistes :")
        _info("  - Vérifier SMTP_USER (souvent une adresse complète pour Brevo)")
        _info("  - Vérifier SMTP_PASSWORD (clé API, pas le mot de passe du compte)")
        _info("  - Pour Gmail, créer un 'App Password' plutôt que le mdp principal")
        return False
    except Exception as exc:  # noqa: BLE001
        _ko(f"Échec de l'envoi : {exc}")
        return False


# ---------------------------------------------------------------------------
# Entrée principale
# ---------------------------------------------------------------------------
def main() -> int:
    print(f"{BOLD}{BLUE}Medicare31 — Diagnostic SMTP{RESET}")
    print("=" * 60)

    cfg = _load_settings()
    _print_config(cfg)

    if not cfg["smtp_host"]:
        _ko("Diagnostic interrompu : SMTP_HOST manquant.")
        return 1

    results = [
        _check_connection(cfg),
        _check_starttls(cfg),
        _check_auth_and_send(cfg),
    ]

    _title("Résumé")
    if all(results):
        _ok("Tout fonctionne. Le backend peut envoyer des emails.")
        return 0

    failed = sum(1 for r in results if not r)
    _ko(f"{failed} étape(s) en échec. Voir les pistes ci-dessus.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
