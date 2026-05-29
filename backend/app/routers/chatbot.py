from datetime import date, datetime, time
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.appointment import Appointment
from app.models.patient import Patient
from app.models.user import User
from app.services.auth import get_current_user


router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])


class ChatRequest(BaseModel):
    message: str


class ChatAction(BaseModel):
    label: str
    path: str


class ChatResponse(BaseModel):
    reply: str
    suggestions: list[str] = []
    actions: list[ChatAction] = []


def _name(user: User) -> str:
    profile = user.staff_profile or user.patient_profile
    if not profile:
        return ""
    return f"{profile.prenom or ''} {profile.nom or ''}".strip()


def _fmt_appt(appt: Appointment) -> str:
    patient = appt.patient
    patient_name = f"{patient.prenom} {patient.nom}" if patient else "le patient"
    when = appt.start_at.strftime("%d/%m/%Y à %H:%M")
    kind = appt.appointment_type.libelle if appt.appointment_type else "consultation"
    return f"{when} - {patient_name} ({kind})"


def _next_appointment(user: User, db: Session) -> Optional[Appointment]:
    now = datetime.now()
    query = db.query(Appointment).filter(
        Appointment.start_at >= now,
        Appointment.statut != "annulé",
    )

    role = user.role.code_role
    if role == "patient":
        if not user.patient_profile:
            return None
        query = query.filter(Appointment.id_patient == user.patient_profile.id_patient)
    elif role == "medecin":
        if not user.staff_profile:
            return None
        query = query.filter(Appointment.id_staff == user.staff_profile.id_staff)

    return query.order_by(Appointment.start_at.asc()).first()


def _today_count(user: User, db: Session) -> int:
    start = datetime.combine(date.today(), time.min)
    end = datetime.combine(date.today(), time.max)
    query = db.query(Appointment).filter(
        Appointment.start_at >= start,
        Appointment.start_at <= end,
        Appointment.statut != "annulé",
    )

    role = user.role.code_role
    if role == "patient":
        if not user.patient_profile:
            return 0
        query = query.filter(Appointment.id_patient == user.patient_profile.id_patient)
    elif role == "medecin":
        if not user.staff_profile:
            return 0
        query = query.filter(Appointment.id_staff == user.staff_profile.id_staff)

    return query.count()


def _pending_count(db: Session) -> int:
    return db.query(Appointment).filter(Appointment.statut == "en_attente").count()


def _patient_count(db: Session) -> int:
    return db.query(Patient).count()


@router.post("/message", response_model=ChatResponse)
def chat_message(
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    text = (data.message or "").lower().strip()
    role = current_user.role.code_role
    user_name = _name(current_user)
    greeting = f"Bonjour {user_name}. " if user_name else "Bonjour. "

    medical_terms = ["douleur", "symptôme", "symptome", "fièvre", "fievre", "urgence", "malade", "diagnostic"]
    if any(term in text for term in medical_terms):
        return ChatResponse(
            reply=(
                "Je peux aider à naviguer dans MediCare31, mais je ne remplace pas un avis médical. "
                "En cas d'urgence ou de symptômes inquiétants, contactez immédiatement un professionnel de santé ou les urgences."
            ),
            suggestions=["Voir mes rendez-vous", "Envoyer un message", "Ouvrir l'agenda"],
            actions=[ChatAction(label="Messagerie", path="/messagerie.html")],
        )

    if any(word in text for word in ["bonjour", "salut", "hello", "coucou"]):
        return ChatResponse(
            reply=greeting + "Je peux vous aider avec l'agenda, les patients, les messages, les documents et les statistiques.",
            suggestions=["Mon prochain rendez-vous", "Comment créer un rendez-vous ?", "Ouvrir la messagerie"],
        )

    if any(word in text for word in ["créer", "creer", "ajouter", "nouveau", "prendre"]):
        return ChatResponse(
            reply=(
                "Pour créer un rendez-vous, ouvrez l'agenda puis utilisez le bouton Nouveau rendez-vous. "
                "Choisissez le patient, le médecin, le type de consultation, la date et l'horaire."
            ),
            suggestions=["Voir mes rendez-vous", "Ouvrir les patients", "Documents"],
            actions=[ChatAction(label="Agenda", path="/calendrier.html")],
        )

    if any(word in text for word in ["prochain", "rdv", "rendez-vous", "agenda", "planning"]):
        appt = _next_appointment(current_user, db)
        today_count = _today_count(current_user, db)
        if appt:
            reply = f"Vous avez {today_count} rendez-vous aujourd'hui. Le prochain est le {_fmt_appt(appt)}."
        else:
            reply = f"Vous avez {today_count} rendez-vous aujourd'hui. Je ne trouve pas de prochain rendez-vous planifié."
        return ChatResponse(
            reply=reply,
            suggestions=["Créer un rendez-vous", "Voir les patients", "Messages"],
            actions=[ChatAction(label="Ouvrir l'agenda", path="/calendrier.html")],
        )

    if any(word in text for word in ["patient", "patients", "dossier"]):
        if role in {"medecin", "secretariat", "admin"}:
            return ChatResponse(
                reply=f"Il y a actuellement {_patient_count(db)} dossiers patients. Vous pouvez chercher par nom, prénom ou numéro de dossier depuis la page Patients.",
                suggestions=["Créer un rendez-vous", "Ouvrir la messagerie", "Statistiques"],
                actions=[ChatAction(label="Patients", path="/patients.html")],
            )
        return ChatResponse(
            reply="Votre espace patient vous permet surtout de suivre vos rendez-vous, messages et documents.",
            suggestions=["Mon prochain rendez-vous", "Envoyer un message", "Documents"],
            actions=[ChatAction(label="Accueil patient", path="/index2.html")],
        )

    if any(word in text for word in ["message", "messagerie", "contacter", "mail"]):
        return ChatResponse(
            reply="La messagerie sécurisée vous permet de contacter les patients ou l'équipe médicale selon votre rôle.",
            suggestions=["Ouvrir l'agenda", "Documents", "Mon prochain rendez-vous"],
            actions=[ChatAction(label="Messagerie", path="/messagerie.html")],
        )

    if any(word in text for word in ["document", "documents", "fichier", "ordonnance"]):
        return ChatResponse(
            reply="La page Documents centralise les fichiers médicaux et administratifs accessibles dans MediCare31.",
            suggestions=["Envoyer un message", "Voir les patients", "Agenda"],
            actions=[ChatAction(label="Documents", path="/documents.html")],
        )

    if any(word in text for word in ["attente", "confirmer", "validation"]):
        pending = _pending_count(db)
        return ChatResponse(
            reply=f"Il y a {pending} rendez-vous en attente de validation dans l'agenda.",
            suggestions=["Ouvrir l'agenda", "Créer un rendez-vous", "Messages"],
            actions=[ChatAction(label="Agenda", path="/calendrier.html")],
        )

    if any(word in text for word in ["stat", "statistique", "rapport", "activité", "activite"]):
        return ChatResponse(
            reply="Les statistiques regroupent l'activité des rendez-vous, patients et messages pour suivre le fonctionnement du cabinet.",
            suggestions=["Agenda", "Patients", "Messages"],
            actions=[ChatAction(label="Statistiques", path="/statistiques.html")],
        )

    if any(word in text for word in ["déconnexion", "deconnexion", "logout", "quitter"]):
        return ChatResponse(
            reply="Vous pouvez vous déconnecter en cliquant sur votre nom en haut à droite.",
            suggestions=["Agenda", "Messages", "Documents"],
        )

    return ChatResponse(
        reply=(
            "Je peux vous aider à trouver une page, vérifier vos rendez-vous, expliquer comment créer un rendez-vous, "
            "ouvrir la messagerie ou orienter vers les documents."
        ),
        suggestions=["Mon prochain rendez-vous", "Comment créer un rendez-vous ?", "Ouvrir la messagerie"],
        actions=[ChatAction(label="Agenda", path="/calendrier.html")],
    )
