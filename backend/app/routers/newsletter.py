from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.user import User
from app.models.patient import Patient, PatientSecurity
from app.schemas.user import NewsletterBroadcast
from app.dependencies import get_current_user
from app.services.email import send_campaign_email

router = APIRouter(prefix="/api/newsletter", tags=["newsletter"])


@router.post("/broadcast")
def broadcast(
    data: NewsletterBroadcast,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role.code_role != "admin":
        raise HTTPException(status_code=403, detail="Réservé aux administrateurs.")

    patients = (
        db.query(Patient)
        .join(PatientSecurity, PatientSecurity.id_patient == Patient.id_patient)
        .join(User, User.id_user == Patient.id_user)
        .filter(
            PatientSecurity.notif_email_sms_consent.is_(True),
            User.is_active.is_(True),
        )
        .all()
    )

    for patient in patients:
        background_tasks.add_task(
            send_campaign_email,
            patient.user.email,
            patient.prenom or "",
            data.sujet,
            data.message,
            data.kind,
        )

    return {"envoyes": len(patients)}
