from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models.user import User
from app.models.medical import MedicalEvent, MedicalVital
from app.dependencies import get_current_user, STAFF_ROLES

router = APIRouter(prefix="/api/medical", tags=["medical"])


def _event_out(e: MedicalEvent) -> dict:
    return {
        "id_event": e.id_event,
        "type_event": e.type_event,
        "titre": e.titre,
        "description": e.description,
        "event_date": e.event_date,
        "location": e.location,
        "staff_nom": e.staff.nom if e.staff else "",
        "staff_prenom": e.staff.prenom if e.staff else "",
    }


@router.get("/history")
def medical_history(
    patient_id: Optional[int] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Historique médical (événements) d'un patient.

    - Patient : uniquement le sien (paramètre patient_id ignoré).
    - Staff : doit fournir patient_id.
    """
    if current_user.role.code_role in STAFF_ROLES:
        if not patient_id:
            raise HTTPException(status_code=400, detail="patient_id requis.")
        pid = patient_id
    else:
        if not current_user.patient_profile:
            return []
        pid = current_user.patient_profile.id_patient

    events = (
        db.query(MedicalEvent)
        .options(joinedload(MedicalEvent.staff))
        .filter(MedicalEvent.id_patient == pid)
        .order_by(MedicalEvent.event_date.desc())
        .limit(limit)
        .all()
    )
    return [_event_out(e) for e in events]


@router.get("/vitals")
def latest_vitals(
    patient_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Dernières constantes (taille / poids / tension) du patient."""
    if current_user.role.code_role in STAFF_ROLES:
        if not patient_id:
            raise HTTPException(status_code=400, detail="patient_id requis.")
        pid = patient_id
    else:
        if not current_user.patient_profile:
            return {}
        pid = current_user.patient_profile.id_patient

    v = (
        db.query(MedicalVital)
        .filter(MedicalVital.id_patient == pid)
        .order_by(MedicalVital.date_mesure.desc())
        .first()
    )
    if not v:
        return {}
    return {
        "taille_cm": float(v.taille_cm) if v.taille_cm is not None else None,
        "poids_kg": float(v.poids_kg) if v.poids_kg is not None else None,
        "tension_arterielle": v.tension_arterielle,
        "date_mesure": v.date_mesure,
    }
