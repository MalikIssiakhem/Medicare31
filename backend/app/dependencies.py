"""Dépendances FastAPI partagées : authentification et autorisation par rôle.

- `get_current_user` : exige un token valide (n'importe quel utilisateur actif).
- `require_roles(*roles)` : fabrique une dépendance qui exige un des rôles donnés.
- `require_staff` / `require_admin` / `require_medecin` : raccourcis prêts à l'emploi.

Usage dans un router :
    from app.dependencies import require_staff
    @router.get("/")
    def list_patients(user = Depends(require_staff), db = Depends(get_db)): ...
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

STAFF_ROLES = ("medecin", "secretariat", "admin")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id_user == int(user_id)).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def require_roles(*allowed_roles: str):
    """Fabrique une dépendance exigeant que l'utilisateur ait un des rôles donnés."""

    def checker(current_user: User = Depends(get_current_user)) -> User:
        if not current_user.role or current_user.role.code_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès non autorisé pour votre rôle.",
            )
        return current_user

    return checker


require_staff = require_roles(*STAFF_ROLES)
require_admin = require_roles("admin")
require_medecin = require_roles("medecin")
