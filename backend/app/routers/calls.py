from typing import Optional, Literal
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models.user import User
from app.models.call import Call
from app.models.patient import Patient
from app.dependencies import require_staff

router = APIRouter(prefix="/api/calls", tags=["calls"])


class CallCreate(BaseModel):
    nom_appelant: str
    telephone: Optional[str] = None
    direction: Literal["entrant", "sortant"] = "entrant"
    motif: str
    notes: Optional[str] = None
    statut: Literal["a_traiter", "a_rappeler", "traite"] = "a_traiter"
    is_urgent: bool = False
    id_patient: Optional[int] = None
    rappel_at: Optional[datetime] = None


class CallUpdate(BaseModel):
    nom_appelant: Optional[str] = None
    telephone: Optional[str] = None
    direction: Optional[Literal["entrant", "sortant"]] = None
    motif: Optional[str] = None
    notes: Optional[str] = None
    statut: Optional[Literal["a_traiter", "a_rappeler", "traite"]] = None
    is_urgent: Optional[bool] = None
    id_patient: Optional[int] = None
    rappel_at: Optional[datetime] = None


def _call_out(c: Call) -> dict:
    return {
        "id_call": c.id_call,
        "nom_appelant": c.nom_appelant,
        "telephone": c.telephone,
        "direction": c.direction,
        "motif": c.motif,
        "notes": c.notes,
        "statut": c.statut,
        "is_urgent": c.is_urgent,
        "rappel_at": c.rappel_at,
        "id_patient": c.id_patient,
        "patient_nom": c.patient.nom if c.patient else None,
        "patient_prenom": c.patient.prenom if c.patient else None,
        "created_at": c.created_at,
    }


@router.get("")
def list_calls(
    statut: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    q = db.query(Call).options(joinedload(Call.patient)).order_by(Call.created_at.desc())
    if statut:
        q = q.filter(Call.statut == statut)
    return [_call_out(c) for c in q.limit(limit).all()]


@router.get("/stats")
def call_stats(
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    base = db.query(Call)
    return {
        "a_traiter": base.filter(Call.statut == "a_traiter").count(),
        "a_rappeler": base.filter(Call.statut == "a_rappeler").count(),
        "urgents": base.filter(Call.is_urgent.is_(True), Call.statut != "traite").count(),
        "traite": base.filter(Call.statut == "traite").count(),
    }


@router.post("", status_code=201)
def create_call(
    data: CallCreate,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    id_patient = data.id_patient
    if id_patient is not None:
        exists = db.query(Patient.id_patient).filter(Patient.id_patient == id_patient).first()
        if not exists:
            id_patient = None

    call = Call(
        nom_appelant=data.nom_appelant.strip(),
        telephone=(data.telephone or "").strip() or None,
        direction=data.direction,
        motif=data.motif.strip(),
        notes=(data.notes or "").strip() or None,
        statut=data.statut,
        is_urgent=data.is_urgent,
        rappel_at=data.rappel_at,
        id_patient=id_patient,
        id_user=current_user.id_user,
    )
    db.add(call)
    db.commit()
    db.refresh(call)
    return _call_out(call)


@router.put("/{call_id}")
def update_call(
    call_id: int,
    data: CallUpdate,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    call = db.query(Call).filter(Call.id_call == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Appel introuvable.")

    payload = data.model_dump(exclude_unset=True)
    if payload.get("id_patient") is not None:
        exists = db.query(Patient.id_patient).filter(Patient.id_patient == payload["id_patient"]).first()
        if not exists:
            payload["id_patient"] = None

    for field, value in payload.items():
        if field in {"nom_appelant", "motif"} and isinstance(value, str):
            value = value.strip()
        setattr(call, field, value)

    db.commit()
    db.refresh(call)
    return _call_out(call)
