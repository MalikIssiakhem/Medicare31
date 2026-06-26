# Scripts utilitaires — `backend/scripts/`

Ce dossier contient des scripts de diagnostic et d'administration exécutables
à l'intérieur du conteneur backend (ou en local si l'environnement Python
est installé).

---

## `diagnose_smtp.py` — diagnostic SMTP

Répond à la question : *« est-ce que mon backend peut envoyer des emails ? »*

### Lancer depuis Docker

```bash
docker compose exec backend python scripts/diagnose_smtp.py
```

### Lancer en local

```bash
cd backend
python scripts/diagnose_smtp.py
```

### Sortie attendue (mode dev avec MailHog)

```
Medicare31 — Diagnostic SMTP
============================================================

────────────────────────────────────────────────────────────
1. Configuration SMTP chargée
────────────────────────────────────────────────────────────
   host     = 'mailhog'
   port     = 1025
   from     = 'noreply@medicare31.fr'
   user     = (vide)
   password = (vide)
   use_tls  = False

────────────────────────────────────────────────────────────
2. Connexion TCP au serveur SMTP
────────────────────────────────────────────────────────────
✅ Connexion TCP + EHLO réussis vers mailhog:1025

────────────────────────────────────────────────────────────
3. STARTTLS (skippé : pas d'authentification ni de TLS forcé)
────────────────────────────────────────────────────────────

────────────────────────────────────────────────────────────
4. Authentification SMTP + envoi d'un email de test
────────────────────────────────────────────────────────────
(skippé : pas de SMTP_USER)

────────────────────────────────────────────────────────────
Résumé
────────────────────────────────────────────────────────────
✅ Tout fonctionne. Le backend peut envoyer des emails.
```

### En cas d'échec

Le script affiche des **pistes de correction concrètes** selon le type
d'erreur rencontrée :

| Erreur | Piste suggérée |
|---|---|
| DNS / timeout | Vérifier le nom d'hôte, le port, le pare-feu |
| Connexion refusée | Le service SMTP tourne-t-il ? (MailHog: `docker compose ps mailhog`) |
| STARTTLS unsupported | Essayer le port 465 (SMTPS) ou désactiver `smtp_use_tls` |
| Authentification échouée | Vérifier `SMTP_USER` (souvent adresse complète) et `SMTP_PASSWORD` (clé API pour Brevo, App Password pour Gmail) |

### Variables d'environnement reconnues

| Variable | Usage |
|---|---|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_USE_TLS` | Lues automatiquement depuis `.env` via `app.config.settings` |
| `SMTP_TEST_TO` | (optionnel) destinataire de l'email de test ; par défaut = `SMTP_USER` |

### Exit codes

- `0` : toutes les étapes OK
- `1` : au moins une étape a échoué — utilisable en CI / pre-deploy
