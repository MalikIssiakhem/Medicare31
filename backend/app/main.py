from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine, SessionLocal
import app.models  # noqa: F401

from app.routers import auth, patients, messages, appointments, staff


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


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _seed_roles()
    _seed_reference_data()
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
app.include_router(appointments.router, prefix="/api/appointments")
app.include_router(staff.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Medicare31 API"}