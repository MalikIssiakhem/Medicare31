from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import Base, engine, SessionLocal
import app.models  # noqa: F401 — enregistre tous les models avant create_all
from app.routers import auth, patients
from app.routers import auth, patients, messages



def _seed_roles() -> None:
    """Insère les rôles de base s'ils n'existent pas encore."""
    from app.models.role import Role
    db = SessionLocal()
    try:
        defaults = [
            ("patient",      "Patient"),
            ("medecin",      "Médecin"),
            ("secretariat",  "Secrétariat"),
            ("admin",        "Administrateur"),
        ]
        for code, libelle in defaults:
            if not db.query(Role).filter(Role.code_role == code).first():
                db.add(Role(code_role=code, libelle=libelle))
        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _seed_roles()
    yield


app = FastAPI(title="Medicare31 API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(messages.router)

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Medicare31 API"}
