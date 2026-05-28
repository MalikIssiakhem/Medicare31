from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AppointmentCreate(BaseModel):
    id_patient: int
    id_staff: int
    id_room: Optional[int] = None
    id_appointment_type: Optional[int] = None
    start_at: datetime
    end_at: datetime
    notes: Optional[str] = None
    couleur: Optional[str] = "blue"


class AppointmentStatusUpdate(BaseModel):
    statut: str  # "confirmé" | "annulé" | "terminé"


class AppointmentOut(BaseModel):
    id_appointment: int
    id_patient: int
    id_staff: int
    id_room: Optional[int] = None
    id_appointment_type: Optional[int] = None
    statut: str
    couleur: Optional[str]
    start_at: datetime
    end_at: datetime
    notes: Optional[str]
    patient_nom: str
    patient_prenom: str
    staff_nom: str
    staff_prenom: str
    type_libelle: Optional[str]
    room_nom: Optional[str]

    model_config = {"from_attributes": True}


class SlotOut(BaseModel):
    start: str
    end: str
    available: bool


class DoctorOut(BaseModel):
    id_staff: int
    nom: str
    prenom: str
    specialite: Optional[str]
    couleur_agenda: Optional[str]
