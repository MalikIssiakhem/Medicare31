import os
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.user import User
from app.models.patient import Patient, PatientContact
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/profile", tags=["profile"])

AVATAR_DIR = os.getenv("AVATAR_UPLOAD_DIR", "/app/uploads/avatars")
_ALLOWED_IMAGE = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
_MAX_PHOTO_BYTES = 3 * 1024 * 1024

_PATIENT_FIELDS = {
    "civilite", "nom", "prenom", "date_naissance", "sexe",
    "numero_securite_sociale", "groupe_sanguin", "allergie_resume",
}
_CONTACT_FIELDS = {
    "email", "telephone_principal", "telephone_secondaire",
    "adresse_ligne1", "adresse_ligne2", "code_postal", "ville", "pays",
}


class ProfileUpdate(BaseModel):
    civilite: Optional[str] = None
    nom: Optional[str] = None
    prenom: Optional[str] = None
    date_naissance: Optional[date] = None
    sexe: Optional[str] = None
    numero_securite_sociale: Optional[str] = None
    groupe_sanguin: Optional[str] = None
    allergie_resume: Optional[str] = None
    email: Optional[str] = None
    telephone_principal: Optional[str] = None
    telephone_secondaire: Optional[str] = None
    adresse_ligne1: Optional[str] = None
    adresse_ligne2: Optional[str] = None
    code_postal: Optional[str] = None
    ville: Optional[str] = None
    pays: Optional[str] = None


def _require_patient(current_user: User) -> Patient:
    patient = current_user.patient_profile
    if not patient:
        raise HTTPException(status_code=403, detail="Réservé aux patients.")
    return patient


def _profile_out(p: Patient) -> dict:
    c = p.contact
    return {
        "id_patient": p.id_patient,
        "numero_dossier": p.numero_dossier,
        "civilite": p.civilite,
        "nom": p.nom,
        "prenom": p.prenom,
        "date_naissance": p.date_naissance,
        "sexe": p.sexe,
        "numero_securite_sociale": p.numero_securite_sociale,
        "groupe_sanguin": p.groupe_sanguin,
        "allergie_resume": p.allergie_resume,
        "statut_patient": p.statut_patient,
        "has_photo": bool(p.photo_url),
        "email": c.email if c else None,
        "telephone_principal": c.telephone_principal if c else None,
        "telephone_secondaire": c.telephone_secondaire if c else None,
        "adresse_ligne1": c.adresse_ligne1 if c else None,
        "adresse_ligne2": c.adresse_ligne2 if c else None,
        "code_postal": c.code_postal if c else None,
        "ville": c.ville if c else None,
        "pays": c.pays if c else None,
    }


@router.get("")
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _profile_out(_require_patient(current_user))


@router.put("")
def update_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = _require_patient(current_user)
    payload = data.model_dump(exclude_unset=True)

    for field in _PATIENT_FIELDS:
        if field in payload and payload[field] is not None:
            setattr(patient, field, payload[field])

    contact_payload = {k: payload[k] for k in _CONTACT_FIELDS if k in payload}
    if contact_payload:
        if not patient.contact:
            db.add(PatientContact(id_patient=patient.id_patient, **contact_payload))
        else:
            for key, value in contact_payload.items():
                setattr(patient.contact, key, value)

    db.commit()
    db.refresh(patient)
    return _profile_out(patient)


@router.post("/photo")
def upload_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = _require_patient(current_user)

    ext = _ALLOWED_IMAGE.get(file.content_type)
    if not ext:
        raise HTTPException(status_code=400, detail="Format non supporté (JPEG, PNG ou WEBP).")

    content = file.file.read()
    if len(content) > _MAX_PHOTO_BYTES:
        raise HTTPException(status_code=400, detail="Image trop volumineuse (max 3 Mo).")

    os.makedirs(AVATAR_DIR, exist_ok=True)
    stored = f"avatar_{patient.id_patient}_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}.{ext}"
    with open(os.path.join(AVATAR_DIR, stored), "wb") as buffer:
        buffer.write(content)

    patient.photo_url = f"/uploads/avatars/{stored}"
    db.commit()
    return {"photo_url": patient.photo_url, "has_photo": True}


@router.get("/photo")
def get_photo(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = _require_patient(current_user)
    if not patient.photo_url:
        raise HTTPException(status_code=404, detail="Aucune photo.")

    name = patient.photo_url.rsplit("/", 1)[-1]
    path = os.path.join(AVATAR_DIR, name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Fichier introuvable.")

    return FileResponse(path)
