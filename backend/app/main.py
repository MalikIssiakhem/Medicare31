from contextlib import asynccontextmanager
import logging
import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine, SessionLocal
import app.models  # noqa: F401

from app.routers import (
    auth,
    patients,
    messages,
    appointments,
    staff,
    chatbot,
    documents,
    newsletter,
    medical,
    profile,
    calls,
)


def _configure_logging() -> None:
    """
    Configure le logging global de l'application.

    Objectifs :
      - Émettre les logs sur stdout pour qu'ils apparaissent dans
        `docker compose logs backend`.
      - Avoir un format lisible (timestamp + niveau + logger + message).
      - Réduire la verbosité des libs bruyantes (SQLAlchemy, access log).
      - Laisser le niveau INFO par défaut, modifiable via la variable
        d'environnement LOG_LEVEL (DEBUG / INFO / WARNING / ERROR).
    """
    level_name = os.environ.get("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    root = logging.getLogger()
    # Évite d'empiler les handlers si main est rechargé (uvicorn --reload)
    for handler in list(root.handlers):
        root.removeHandler(handler)

    handler = logging.StreamHandler(stream=sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )
    root.addHandler(handler)
    root.setLevel(level)

    # Libs trop bavardes à INFO — on les calme
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("passlib").setLevel(logging.WARNING)

    # Logger applicatif bien visible
    logging.getLogger("app").setLevel(level)

    logging.getLogger("app.startup").info(
        "Logging configuré (niveau=%s)", logging.getLevelName(level)
    )


def _seed_roles() -> None:
    from app.models.role import Role

    db = SessionLocal()
    try:
        defaults = [
            ("patient", "Patient"),
            ("medecin", "Médecin"),
            ("secretariat", "Secrétariat"),
            ("admin", "Administrateur"),
        ]

        for code, libelle in defaults:
            if not db.query(Role).filter(Role.code_role == code).first():
                db.add(Role(code_role=code, libelle=libelle))

        db.commit()
    finally:
        db.close()


def _seed_reference_data() -> None:
    from app.models.room import Room, AppointmentType

    db = SessionLocal()
    try:
        if not db.query(AppointmentType).first():
            types = [
                AppointmentType(libelle="Consultation générale", duree_par_defaut_min=30),
                AppointmentType(libelle="Contrôle annuel", duree_par_defaut_min=30),
                AppointmentType(libelle="Suivi chronique", duree_par_defaut_min=30),
                AppointmentType(libelle="Urgence", duree_par_defaut_min=30),
                AppointmentType(libelle="Téléconsultation", duree_par_defaut_min=30),
                AppointmentType(libelle="Renouvellement ordonnance", duree_par_defaut_min=15),
                AppointmentType(libelle="Première consultation", duree_par_defaut_min=45),
            ]
            db.add_all(types)

        if not db.query(Room).first():
            rooms = [
                Room(nom="Cabinet 1", description="Consultation générale", is_active=True),
                Room(nom="Cabinet 2", description="Consultation générale", is_active=True),
                Room(nom="Cabinet 3", description="Consultations spécialisées", is_active=True),
                Room(nom="Salle de téléconsultation", description="Consultations à distance", is_active=True),
            ]
            db.add_all(rooms)

        db.commit()
    finally:
        db.close()


def _sync_document_columns() -> None:
    from sqlalchemy import inspect, text

    existing = {col["name"] for col in inspect(engine).get_columns("documents")}
    statements = []
    if "status" not in existing:
        statements.append("ALTER TABLE documents ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'nouveau'")
    if "is_read" not in existing:
        statements.append("ALTER TABLE documents ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT FALSE")
    if "is_archived" not in existing:
        statements.append("ALTER TABLE documents ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT FALSE")
    if "deleted_at" not in existing:
        statements.append("ALTER TABLE documents ADD COLUMN deleted_at TIMESTAMP NULL")

    if not statements:
        return

    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))


def _sync_patient_columns() -> None:
    from sqlalchemy import inspect, text

    existing = {col["name"] for col in inspect(engine).get_columns("patients")}
    if "photo_url" in existing:
        return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE patients ADD COLUMN photo_url VARCHAR(500)"))


def _sync_call_columns() -> None:
    from sqlalchemy import inspect, text

    if inspect(engine).get_table_names().count("calls") == 0:
        return
    existing = {col["name"] for col in inspect(engine).get_columns("calls")}
    if "rappel_at" in existing:
        return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE calls ADD COLUMN rappel_at TIMESTAMP"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _sync_document_columns()
    _sync_patient_columns()
    _sync_call_columns()
    _seed_roles()
    _seed_reference_data()

    # Affiche la config SMTP chargée pour faciliter le diagnostic
    from app.config import settings
    smtp_logger = logging.getLogger("app.smtp")
    smtp_logger.info(
        "SMTP configuré : host=%s port=%s user=%s tls=%s",
        settings.smtp_host,
        settings.smtp_port,
        settings.smtp_user or "(vide)",
        settings.smtp_use_tls or bool(settings.smtp_user),
    )

    yield


# Initialisation du logging AVANT la création de l'app FastAPI
_configure_logging()

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
app.include_router(appointments.router, prefix="/api/appointments")
app.include_router(staff.router)
app.include_router(chatbot.router)
app.include_router(documents.router)
app.include_router(newsletter.router)
app.include_router(medical.router)
app.include_router(profile.router)
app.include_router(calls.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Medicare31 API"}