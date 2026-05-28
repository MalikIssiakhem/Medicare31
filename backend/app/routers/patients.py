from typing import Literal, Optional
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.sql import func
from pydantic import BaseModel
from app.db import get_db
from app.models.patient import Patient, PatientContact
from app.models.appointment import Appointment

router = APIRouter(prefix="/api/patients", tags=["patients"])


# ── Schémas ────────────────────────────────────────────────────────────────────

class ContactData(BaseModel):
    email: Optional[str] = None
    telephone_principal: Optional[str] = None
    telephone_secondaire: Optional[str] = None
    adresse_ligne1: Optional[str] = None
    adresse_ligne2: Optional[str] = None
    code_postal: Optional[str] = None
    ville: Optional[str] = None
    pays: str = "France"


class PatientCreate(BaseModel):
    civilite: Optional[str] = None
    nom: str
    prenom: str
    date_naissance: date
    sexe: Optional[str] = None
    numero_securite_sociale: Optional[str] = None
    groupe_sanguin: Optional[str] = None
    allergie_resume: Optional[str] = None
    statut_patient: str = "actif"
    medecin_traitant_id: Optional[int] = None
    contact: Optional[ContactData] = None


class PatientOut(BaseModel):
    id_patient: int
    numero_dossier: str
    civilite: Optional[str]
    nom: str
    prenom: str
    date_naissance: Optional[date]
    sexe: Optional[str]
    numero_securite_sociale: Optional[str]
    groupe_sanguin: Optional[str]
    allergie_resume: Optional[str]
    statut_patient: Optional[str]
    medecin_traitant_id: Optional[int]
    email: Optional[str] = None
    telephone_principal: Optional[str] = None
    telephone_secondaire: Optional[str] = None
    adresse_ligne1: Optional[str] = None
    code_postal: Optional[str] = None
    ville: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Helper ────────────────────────────────────────────────────────────────────

def _flatten(patient: Patient) -> dict:
    data = {c.key: getattr(patient, c.key) for c in patient.__table__.columns}
    if patient.contact:
        data["email"] = patient.contact.email
        data["telephone_principal"] = patient.contact.telephone_principal
        data["telephone_secondaire"] = patient.contact.telephone_secondaire
        data["adresse_ligne1"] = patient.contact.adresse_ligne1
        data["code_postal"] = patient.contact.code_postal
        data["ville"] = patient.contact.ville
    return data


def _next_dossier(db: Session) -> str:
    import time
    return f"PAT-{int(time.time() * 1000) % 10_000_000:07d}"


# ── Routes ─────────────────────────────────────────────────────────────────────

_SORT_COLUMNS = {
    "nom": Patient.nom,
    "prenom": Patient.prenom,
    "date_naissance": Patient.date_naissance,
    "numero_dossier": Patient.numero_dossier,
    "statut_patient": Patient.statut_patient,
    "created_at": Patient.created_at,
}


@router.get("/", response_model=list[PatientOut])
def list_patients(
    search: Optional[str] = Query(None),
    statut: Optional[str] = Query(None),
    medecin_traitant_id: Optional[int] = Query(None),
    sort_by: Literal["nom", "prenom", "date_naissance", "numero_dossier", "statut_patient", "created_at"] = Query("nom"),
    sort_dir: Literal["asc", "desc"] = Query("asc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(8, ge=1, le=100),
    db: Session = Depends(get_db),
):
    col = _SORT_COLUMNS[sort_by]
    q = (
        db.query(Patient)
        .options(joinedload(Patient.contact))
        .order_by(col.asc() if sort_dir == "asc" else col.desc())
    )
    if search:
        q = q.filter(
            Patient.nom.ilike(f"%{search}%") | Patient.prenom.ilike(f"%{search}%")
        )
    if statut:
        q = q.filter(Patient.statut_patient == statut)
    if medecin_traitant_id:
        q = q.filter(Patient.medecin_traitant_id == medecin_traitant_id)
    return [_flatten(p) for p in q.offset(skip).limit(limit).all()]


@router.get("/count")
def count_patients(
    search: Optional[str] = Query(None),
    statut: Optional[str] = Query(None),
    medecin_traitant_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Patient)
    if search:
        q = q.filter(
            Patient.nom.ilike(f"%{search}%") | Patient.prenom.ilike(f"%{search}%")
        )
    if statut:
        q = q.filter(Patient.statut_patient == statut)
    if medecin_traitant_id:
        q = q.filter(Patient.medecin_traitant_id == medecin_traitant_id)
    return {"total": q.count()}


@router.get("/stats")
def patient_stats(db: Session = Depends(get_db)):
    today = date.today()

    nouveaux_ce_mois = db.query(Patient).filter(
        func.extract("month", Patient.created_at) == today.month,
        func.extract("year", Patient.created_at) == today.year,
    ).count()

    suivis_actifs = db.query(Patient).filter(
        Patient.statut_patient == "suivi"
    ).count()

    monday = today - timedelta(days=today.weekday())
    week_start = datetime.combine(monday, datetime.min.time())
    week_end = datetime.combine(monday + timedelta(days=7), datetime.min.time())

    rdv_cette_semaine = db.query(Appointment).filter(
        Appointment.start_at >= week_start,
        Appointment.start_at < week_end,
        Appointment.statut != "annulé",
    ).count()

    return {
        "nouveaux_ce_mois": nouveaux_ce_mois,
        "rdv_cette_semaine": rdv_cette_semaine,
        "suivis_actifs": suivis_actifs,
    }


@router.post("/", response_model=PatientOut, status_code=201)
def create_patient(data: PatientCreate, db: Session = Depends(get_db)):
    patient = Patient(
        numero_dossier=_next_dossier(db),
        **{k: v for k, v in data.model_dump(exclude={"contact"}).items()},
    )
    db.add(patient)
    db.flush()

    contact_data = data.contact or ContactData()
    db.add(PatientContact(id_patient=patient.id_patient, **contact_data.model_dump()))
    db.commit()
    db.refresh(patient)
    return _flatten(patient)


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = (
        db.query(Patient)
        .options(joinedload(Patient.contact))
        .filter(Patient.id_patient == patient_id)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient introuvable")
    return _flatten(patient)


@router.put("/{patient_id}", response_model=PatientOut)
def update_patient(patient_id: int, data: PatientCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id_patient == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient introuvable")

    for key, value in data.model_dump(exclude={"contact"}).items():
        setattr(patient, key, value)

    if data.contact:
        if patient.contact:
            for key, value in data.contact.model_dump().items():
                setattr(patient.contact, key, value)
        else:
            db.add(PatientContact(id_patient=patient.id_patient, **data.contact.model_dump()))

    db.commit()
    db.refresh(patient)
    return _flatten(patient)


@router.delete("/{patient_id}", status_code=204)
def delete_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id_patient == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient introuvable")
    db.delete(patient)
    db.commit()
