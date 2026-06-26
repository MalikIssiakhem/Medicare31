"""
Endpoints de santé de l'application.

Endpoints publics (pas d'authentification requise) destinés au monitoring
et à la démonstration : devant un jury, on peut interroger
/api/health/smtp pour montrer en temps réel que le backend communique
avec le serveur SMTP configuré (Brevo en prod, MailHog en dev).
"""
from __future__ import annotations

import logging
import smtplib
import ssl
from typing import Any

from fastapi import APIRouter

from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/health", tags=["health"])


def _check_smtp_connection() -> dict[str, Any]:
    """
    Tente une connexion TCP + EHLO vers SMTP_HOST:SMTP_PORT.

    Ne fait PAS d'envoi d'email ni d'authentification — c'est volontairement
    léger pour pouvoir être appelé régulièrement sans risque.
    """
    if not settings.smtp_host:
        return {
            "configured": False,
            "reachable": False,
            "error": "SMTP_HOST non configuré",
        }

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=5) as server:
            code, message = server.ehlo()
            server.quit()
            return {
                "configured": True,
                "reachable": True,
                "host": settings.smtp_host,
                "port": settings.smtp_port,
                "ehlo_code": code,
                "ehlo_message": message.decode("utf-8", errors="replace").strip(),
                "user_configured": bool(settings.smtp_user),
            }
    except smtplib.SMTPConnectError as exc:
        return {
            "configured": True,
            "reachable": False,
            "host": settings.smtp_host,
            "port": settings.smtp_port,
            "error": f"Connexion refusée : {exc}",
        }
    except OSError as exc:
        return {
            "configured": True,
            "reachable": False,
            "host": settings.smtp_host,
            "port": settings.smtp_port,
            "error": f"Erreur réseau : {exc}",
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "configured": True,
            "reachable": False,
            "host": settings.smtp_host,
            "port": settings.smtp_port,
            "error": f"Erreur inattendue : {exc}",
        }


@router.get("")
def health() -> dict[str, Any]:
    """Health check global de l'API."""
    return {"status": "ok", "service": "Medicare31 API"}


@router.get("/smtp")
def health_smtp() -> dict[str, Any]:
    """
    Health check SMTP : vérifie la connexion TCP au serveur configuré.

    Exemples de réponses :

      Mode dev (MailHog) :
        {
          "configured": true,
          "reachable": true,
          "host": "mailhog",
          "port": 1025,
          "ehlo_code": 250,
          "user_configured": false
        }

      Mode prod (Brevo) :
        {
          "configured": true,
          "reachable": true,
          "host": "smtp-relay.brevo.com",
          "port": 587,
          "user_configured": true
        }

      En cas de problème :
        {
          "configured": true,
          "reachable": false,
          "error": "Connexion refusée : ..."
        }
    """
    return _check_smtp_connection()
