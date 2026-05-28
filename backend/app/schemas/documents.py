from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class PatientMiniOut(BaseModel):
    id_patient: int
    numero_dossier: str
    nom: str
    prenom: str

    model_config = {"from_attributes": True}


class UserMiniOut(BaseModel):
    id_user: int
    email: str

    model_config = {"from_attributes": True}


class DocumentOut(BaseModel):
    id_document: int
    id_patient: int
    id_uploaded_by_user: int
    document_type: Optional[str] = None
    titre: str
    fichier_url: str
    mime_type: Optional[str] = None
    taille_ko: Optional[int] = None
    source_label: Optional[str] = None
    document_date: Optional[date] = None
    status: Optional[str] = "nouveau"
    is_read: bool = False
    is_archived: bool = False
    created_at: Optional[datetime] = None
    patient: Optional[PatientMiniOut] = None

    model_config = {"from_attributes": True}


class DocumentUpdate(BaseModel):
    titre: Optional[str] = None
    document_type: Optional[str] = None
    source_label: Optional[str] = None
    document_date: Optional[date] = None
    status: Optional[str] = None
    is_read: Optional[bool] = None
    is_archived: Optional[bool] = None