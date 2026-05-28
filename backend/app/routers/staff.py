from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db import get_db
from app.models.staff import Staff

router = APIRouter(prefix="/api/staff", tags=["staff"])


class MedecinOut(BaseModel):
    id_staff: int
    civilite: Optional[str]
    nom: Optional[str]
    prenom: Optional[str]
    specialite: Optional[str]
    couleur_agenda: Optional[str]

    model_config = {"from_attributes": True}


@router.get("/medecins", response_model=list[MedecinOut])
def list_medecins(db: Session = Depends(get_db)):
    return (
        db.query(Staff)
        .filter(Staff.type_staff == "medecin")
        .order_by(Staff.nom, Staff.prenom)
        .all()
    )
