import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.config import settings


def send_verification_email(to_email: str, prenom: str, token: str) -> None:
    verify_url = f"{settings.app_base_url}/api/auth/verify-email?token={token}"

    html = f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Arial,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:40px 0">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(44,95,158,.12)">

            <!-- HEADER -->
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

            <!-- BODY -->
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

            <!-- FOOTER -->
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

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Confirmez votre adresse e-mail – MediCare31"
    msg["From"]    = f"MediCare31 <{settings.smtp_from}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.ehlo()
        server.starttls()
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_from, to_email, msg.as_string())
