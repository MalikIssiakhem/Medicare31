from typing import Optional
from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    nom: str
    prenom: str
    role: str = "patient"


class PatientRegister(BaseModel):
    # Identité
    civilite: Optional[str] = None
    nom: str
    prenom: str
    date_naissance: str
    sexe: Optional[str] = None
    numero_securite_sociale: Optional[str] = None
    # Compte
    email: EmailStr
    password: str
    # Coordonnées
    telephone_principal: Optional[str] = None
    telephone_secondaire: Optional[str] = None
    adresse_ligne1: Optional[str] = None
    code_postal: Optional[str] = None
    ville: Optional[str] = None
    # Sécurité
    question_secrete: Optional[str] = None
    reponse_secrete: Optional[str] = None
    # Consentements
    cgu_accepted: bool = False
    hds_consent: bool = False
    notif_email_sms_consent: bool = False


class UserOut(BaseModel):
    id_user: int
    email: str
    nom: str
    prenom: str
    role: str
    is_active: bool
    id_patient: Optional[int] = None

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    nom: str | None = ""
    prenom: str | None = ""


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    password: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class NewsletterBroadcast(BaseModel):
    sujet: str
    message: str
    kind: str = "info"  # "info" | "promo"
