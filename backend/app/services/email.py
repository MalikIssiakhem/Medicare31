import ssl
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings


def send_email(to_email: str, subject: str, html: str, text: str | None = None, from_email: str | None = None) -> None:
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"MediCare31 <{from_email or settings.smtp_from}>"
    message["To"] = to_email

    if text:
        message.attach(MIMEText(text, "plain", "utf-8"))
    message.attach(MIMEText(html, "html", "utf-8"))

    context = ssl.create_default_context()
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.ehlo()
            server.starttls(context=context)
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(from_email or settings.smtp_from, to_email, message.as_string())
    except Exception as exc:
        print(f"[EMAIL] Échec envoi vers {to_email} : {exc}")


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
