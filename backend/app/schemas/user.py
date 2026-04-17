from pydantic import BaseModel, EmailStr
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    nom: str
    prenom: str
    role: str = "patient"  # code_role: patient, medecin, secretariat, admin


class UserOut(BaseModel):
    id_user: int
    email: str
    nom: str
    prenom: str
    role: str  # code_role du role lié
    is_active: bool

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    nom: str
    prenom: str
