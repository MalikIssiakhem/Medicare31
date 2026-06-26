import ssl
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging

from app.config import settings

logger = logging.getLogger(__name__)


def send_email(
    to_email: str,
    subject: str,
    html: str,
    text: str | None = None,
    from_email: str | None = None,
) -> bool:
    """
    Envoie un email via SMTP.

    Returns:
        True si l'email a été envoyé avec succès, False sinon.
        Les erreurs sont journalisées (logger) et jamais silencieuses.
    """
    # 1. Validation explicite de la configuration SMTP
    if not settings.smtp_host:
        logger.error("❌ SMTP_HOST non configuré — email NON envoyé (vers %s)", to_email)
        return False

    # 2. Si on a un username, on exige un password (sinon config incohérente)
    if settings.smtp_user and not settings.smtp_password:
        logger.error(
            "❌ SMTP_USER défini mais SMTP_PASSWORD manquant — email NON envoyé (vers %s)",
            to_email,
        )
        return False

    logger.info("📧 Envoi d'un email à %s via %s:%s (sujet: %s)",
                to_email, settings.smtp_host, settings.smtp_port, subject)

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"MediCare31 <{from_email or settings.smtp_from}>"
    message["To"] = to_email

    if text:
        message.attach(MIMEText(text, "plain", "utf-8"))
    message.attach(MIMEText(html, "html", "utf-8"))

    use_tls = settings.smtp_use_tls or bool(settings.smtp_user)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.ehlo()
            if use_tls:
                server.starttls(context=ssl.create_default_context())
                server.ehlo()

            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password)

            server.sendmail(
                from_email or settings.smtp_from,
                to_email,
                message.as_string(),
            )

        logger.info("✅ Email envoyé avec succès à %s", to_email)
        return True

    except smtplib.SMTPAuthenticationError as exc:
        logger.error(
            "❌ Échec d'authentification SMTP pour %s (vérifie SMTP_USER/SMTP_PASSWORD) : %s",
            settings.smtp_user, exc,
        )
        return False

    except smtplib.SMTPConnectError as exc:
        logger.error(
            "❌ Impossible de se connecter à %s:%s — %s",
            settings.smtp_host, settings.smtp_port, exc,
        )
        return False

    except smtplib.SMTPServerDisconnected as exc:
        logger.error("❌ Serveur SMTP déconnecté : %s", exc)
        return False

    except smtplib.SMTPException as exc:
        logger.error("❌ Erreur SMTP générique vers %s : %s", to_email, exc)
        return False

    except OSError as exc:
        # DNS, timeout réseau, refus de connexion...
        logger.error("❌ Erreur réseau vers %s:%s — %s",
                     settings.smtp_host, settings.smtp_port, exc)
        return False

    except Exception as exc:  # noqa: BLE001 — dernier filet de sécurité
        logger.exception("❌ Erreur inattendue lors de l'envoi à %s", to_email)
        return False


def send_verification_email(to_email: str, prenom: str, token: str) -> None:
    verify_url = f"{settings.app_base_url}/api/auth/verify-email?token={token}"

    text = (
        f"Bonjour {prenom} 👋\n\n"
        f"Merci de vous être inscrit sur MediCare31. Pour activer votre compte, cliquez sur le lien suivant:\n\n"
        f"{verify_url}\n\n"
        "Ce lien est valable 24 heures. Si vous n'avez pas créé de compte, ignorez cet e-mail."
    )

    html = f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Arial,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:40px 0">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(44,95,158,.12)">
            <tr>
              <td style="background:linear-gradient(135deg,#2c5f9e,#1a3a6e);padding:32px 40px;text-align:center">
                <div style="display:inline-flex;align-items:center;gap:10px">
                  <div style="background:rgba(255,255,255,.2);border-radius:10px;padding:8px;display:inline-block">
                    <img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0xMiAyTDQgNnY2YzAgNS4yNSAzLjUgMTAuMTQgOCAxMS4zNUMxNi41IDIyLjE0IDIwIDE3LjI1IDIwIDEyVjZsLTgtNHoiLz48cmVjdCB4PSIxMCIgeT0iNyIgd2lkdGg9IjQiIGhlaWdodD0iMTAiIHJ4PSIxIi8+PHJlY3QgeD0iNyIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSI0IiByeD0iMSIvPjwvc3ZnPg==" width="24" height="24" alt="">
                  </div>
                  <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-.3px">MediCare31</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:40px">
                <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1e2d45">
                  Bonjour {prenom} 👋
                </h1>
                <p style="margin:0 0 24px;font-size:15px;color:#4a5f7a;line-height:1.6">
                  Merci de vous être inscrit sur <strong>MediCare31</strong>.<br>
                  Pour activer votre compte et accéder à votre espace santé, cliquez sur le bouton ci-dessous.
                </p>
                <div style="text-align:center;margin:32px 0">
                  <a href="{verify_url}"
                     style="background:#2c5f9e;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;display:inline-block;box-shadow:0 4px 14px rgba(44,95,158,.3)">
                    ✉️ Confirmer mon adresse e-mail
                  </a>
                </div>
                <p style="margin:0 0 8px;font-size:13px;color:#8fa3bc">
                  Ce lien est valable <strong>24 heures</strong>. Si vous n'avez pas créé de compte, ignorez cet e-mail.
                </p>
                <p style="margin:0;font-size:12px;color:#b0bec5;word-break:break-all">
                  Ou copiez ce lien dans votre navigateur :<br>{verify_url}
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f5f8fc;padding:20px 40px;border-top:1px solid #e0eaf5;text-align:center">
                <p style="margin:0;font-size:12px;color:#8fa3bc">
                  © 2024 MediCare31 · Hébergement certifié HDS<br>
                  Cet e-mail a été envoyé automatiquement, merci de ne pas y répondre.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """

    send_email(
        to_email,
        "Confirmez votre adresse e-mail – MediCare31",
        html,
        text=text,
    )


def send_password_reset_email(to_email: str, prenom: str, token: str) -> None:
    frontend_url = (settings.frontend_base_url or settings.app_base_url).rstrip("/")
    reset_url = f"{frontend_url}/reset-password.html?token={token}"

    text = (
        f"Bonjour {prenom} 👋\n\n"
        "Vous avez demandé à réinitialiser votre mot de passe pour MediCare31. "
        f"Cliquez sur ce lien pour le modifier :\n\n{reset_url}\n\n"
        "Si vous n'avez pas demandé cette réinitialisation, ignorez ce message."
    )

    html = f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#f4f7fb;font-family:'Segoe UI',Arial,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 0">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 4px 24px rgba(32,62,128,.12)">
            <tr>
              <td style="background:#293a80;padding:32px 40px;text-align:center">
                <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800">Réinitialisez votre mot de passe</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px;color:#1f2d4d">
                <p style="font-size:15px;line-height:1.7;margin:0 0 22px">
                  Bonjour {prenom},<br>
                  Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte MediCare31.
                </p>
                <div style="text-align:center;margin:28px 0">
                  <a href="{reset_url}"
                     style="background:#2c5f9e;color:#ffffff;text-decoration:none;padding:14px 38px;border-radius:12px;font-size:15px;font-weight:700;display:inline-block;box-shadow:0 6px 20px rgba(46,98,180,.18)">
                    Changer mon mot de passe
                  </a>
                </div>
                <p style="font-size:13px;color:#6a7a99;margin:0 0 18px">
                  Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, vous pouvez ignorer cet e-mail.
                </p>
                <p style="font-size:12px;color:#9aa3b8;word-break:break-all">
                  Lien direct :<br>{reset_url}
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f1f5fb;padding:20px 40px;text-align:center;color:#8d9bb5;font-size:12px">
                © 2024 MediCare31 · Ne répondez pas à cet e-mail.
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """

    send_email(
        to_email,
        "Réinitialisez votre mot de passe – MediCare31",
        html,
        text=text,
    )


def _email_shell(title_bar: str, body_inner: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Arial,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:40px 0">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(44,95,158,.12)">
            <tr><td style="padding:0">{title_bar}</td></tr>
            <tr><td style="padding:40px">{body_inner}</td></tr>
            <tr>
              <td style="background:#f5f8fc;padding:20px 40px;border-top:1px solid #e0eaf5;text-align:center">
                <p style="margin:0;font-size:12px;color:#8fa3bc">
                  © 2024 MediCare31 · Hébergement certifié HDS<br>
                  Cet e-mail a été envoyé automatiquement, merci de ne pas y répondre.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """


def send_password_changed_email(to_email: str, prenom: str) -> None:
    text = (
        f"Bonjour {prenom},\n\n"
        "Votre mot de passe MediCare31 vient d'être modifié. "
        "Si vous êtes à l'origine de ce changement, aucune action n'est requise.\n\n"
        "Si vous n'êtes pas à l'origine de cette modification, contactez immédiatement le cabinet."
    )

    title_bar = (
        '<div style="background:linear-gradient(135deg,#2c5f9e,#1a3a6e);padding:30px 40px;text-align:center">'
        '<span style="color:#fff;font-size:20px;font-weight:800">Mot de passe modifié</span></div>'
    )
    body_inner = f"""
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1e2d45">Bonjour {prenom},</h1>
      <p style="margin:0 0 20px;font-size:15px;color:#4a5f7a;line-height:1.6">
        Votre mot de passe a bien été <strong>modifié</strong> à l'instant.
        Si vous êtes à l'origine de ce changement, aucune action n'est nécessaire.
      </p>
      <p style="margin:0;font-size:13px;color:#b04a4a;background:#fef2f2;border-radius:10px;padding:14px 16px">
        ⚠️ Vous n'êtes pas à l'origine de ce changement ? Contactez immédiatement le cabinet
        pour sécuriser votre compte.
      </p>
    """

    send_email(
        to_email,
        "Votre mot de passe a été modifié – MediCare31",
        _email_shell(title_bar, body_inner),
        text=text,
    )


def send_campaign_email(to_email: str, prenom: str, sujet: str, message: str, kind: str = "info") -> None:
    is_promo = kind == "promo"
    accent = "#e0853a" if is_promo else "#2c5f9e"
    badge = "Offre MediCare31" if is_promo else "Information MediCare31"

    safe_message = message.replace("\n", "<br>")

    text = f"Bonjour {prenom},\n\n{message}\n\n— L'équipe MediCare31"

    title_bar = (
        f'<div style="background:linear-gradient(135deg,{accent},#1a3a6e);padding:30px 40px;text-align:center">'
        f'<span style="color:#fff;font-size:20px;font-weight:800">{badge}</span></div>'
    )
    body_inner = f"""
      <h1 style="margin:0 0 14px;font-size:21px;font-weight:700;color:#1e2d45">{sujet}</h1>
      <p style="margin:0 0 18px;font-size:15px;color:#4a5f7a;line-height:1.7">Bonjour {prenom},</p>
      <div style="font-size:15px;color:#4a5f7a;line-height:1.7">{safe_message}</div>
      <p style="margin:24px 0 0;font-size:14px;color:#8fa3bc">— L'équipe MediCare31</p>
    """

    send_email(to_email, f"{sujet} – MediCare31", _email_shell(title_bar, body_inner), text=text)
