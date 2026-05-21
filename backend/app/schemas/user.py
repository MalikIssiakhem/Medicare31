from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    nom: str
    prenom: str
    role: str = "patient"


class UserOut(BaseModel):
    id_user: int
    email: str
    nom: str
    prenom: str
    role: str
    is_active: bool

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    nom: str | None = ""
    prenom: str | None = ""