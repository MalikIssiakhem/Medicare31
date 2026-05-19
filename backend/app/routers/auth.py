from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.db import get_db
from app.models.user import User
from app.models.role import Role
from app.schemas.user import UserCreate, UserOut, Token
from app.services.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _get_role_or_404(code: str, db: Session) -> Role:
    role = db.query(Role).filter(Role.code_role == code).first()
    if not role:
        raise HTTPException(status_code=400, detail=f"Rôle '{code}' inexistant")
    return role


def _role_from_email(email: str) -> str:
    email = email.strip().lower()

    if email.startswith("dr."):
        return "medecin"

    if email.startswith("sec."):
        return "secretariat"

    return "patient"


def _build_token(user: User) -> dict:
    role = _role_from_email(user.email)

    token = create_access_token({
        "sub": str(user.id_user),
        "role": role,
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": role,
        "nom": user.staff_profile.nom if user.staff_profile else (
            user.patient_profile.nom if user.patient_profile else ""
        ),
        "prenom": user.staff_profile.prenom if user.staff_profile else (
            user.patient_profile.prenom if user.patient_profile else ""
        ),
    }


@router.post("/register", response_model=UserOut, status_code=201)
def register(data: UserCreate, db: Session = Depends(get_db)):
    email = data.email.strip().lower()

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    role_code = _role_from_email(email)
    role = _get_role_or_404(role_code, db)

    user = User(
        email=email,
        password_hash=hash_password(data.password),
        id_role=role.id_role,
    )

    db.add(user)
    db.flush()

    if role_code == "patient":
        from app.models.patient import Patient
        import time

        patient = Patient(
            id_user=user.id_user,
            numero_dossier=f"PAT-{int(time.time())}",
            nom=data.nom,
            prenom=data.prenom,
            date_naissance="2000-01-01",
        )
        db.add(patient)

    else:
        from app.models.staff import Staff

        staff = Staff(
            id_user=user.id_user,
            nom=data.nom,
            prenom=data.prenom,
            type_staff=role_code,
        )
        db.add(staff)

    db.commit()
    db.refresh(user)

    return {
        "id_user": user.id_user,
        "email": user.email,
        "nom": data.nom,
        "prenom": data.prenom,
        "role": role.code_role,
        "is_active": user.is_active,
    }


@router.post("/login", response_model=Token)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    email = form.username.strip().lower()

    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Identifiants invalides")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Compte désactivé")

    user.last_login_at = func.now()
    db.commit()
    db.refresh(user)

    return _build_token(user)


@router.post("/france-connect", response_model=Token)
def france_connect_mock(db: Session = Depends(get_db)):
    return _get_or_create_mock_user(
        "fc-mock@medicare.fr",
        "Dupont",
        "Jean (FranceConnect)",
        db,
    )


@router.post("/carte-vitale", response_model=Token)
def carte_vitale_mock(db: Session = Depends(get_db)):
    return _get_or_create_mock_user(
        "cv-mock@medicare.fr",
        "Martin",
        "Marie (Carte Vitale)",
        db,
    )


def _get_or_create_mock_user(
    email: str,
    nom: str,
    prenom: str,
    db: Session,
) -> dict:
    user = db.query(User).filter(User.email == email).first()

    if not user:
        role = db.query(Role).filter(Role.code_role == "patient").first()

        if not role:
            raise HTTPException(status_code=400, detail="Rôle 'patient' inexistant")

        user = User(
            email=email,
            password_hash=hash_password("mock"),
            id_role=role.id_role,
        )

        db.add(user)
        db.flush()

        from app.models.patient import Patient
        import time

        db.add(Patient(
            id_user=user.id_user,
            numero_dossier=f"MOCK-{int(time.time())}",
            nom=nom,
            prenom=prenom,
            date_naissance="2000-01-01",
        ))

        db.commit()
        db.refresh(user)

    return _build_token(user)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    profile = current_user.staff_profile or current_user.patient_profile
    role = _role_from_email(current_user.email)

    return {
        "id_user": current_user.id_user,
        "email": current_user.email,
        "nom": profile.nom if profile else "",
        "prenom": profile.prenom if profile else "",
        "role": role,
        "is_active": current_user.is_active,
    }