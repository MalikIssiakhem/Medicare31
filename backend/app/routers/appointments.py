from datetime import datetime, date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.appointment import Appointment
from app.models.staff import Staff
from app.models.patient import Patient
from app.models.room import Room, AppointmentType
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentStatusUpdate,
    AppointmentOut,
    SlotOut,
    DoctorOut,
)
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(tags=["appointments"])

STAFF_ROLES = {"medecin", "secretariat", "admin"}


def _build_appt_out(a: Appointment) -> dict:
    return {
        "id_appointment": a.id_appointment,
        "id_patient": a.id_patient,
        "id_staff": a.id_staff,
        "id_room": a.id_room,
        "id_appointment_type": a.id_appointment_type,
        "statut": a.statut,
        "couleur": a.couleur,
        "start_at": a.start_at,
        "end_at": a.end_at,
        "notes": a.notes,
        "patient_nom": a.patient.nom if a.patient else "",
        "patient_prenom": a.patient.prenom if a.patient else "",
        "staff_nom": a.staff.nom if a.staff else "",
        "staff_prenom": a.staff.prenom if a.staff else "",
        "type_libelle": a.appointment_type.libelle if a.appointment_type else None,
        "room_nom": a.room.nom if a.room else None,
    }


@router.get("/doctors", response_model=list[DoctorOut])
def list_doctors(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doctors = db.query(Staff).filter(Staff.type_staff == "medecin").all()
    return [
        {
            "id_staff": d.id_staff,
            "nom": d.nom,
            "prenom": d.prenom,
            "specialite": d.specialite,
            "couleur_agenda": d.couleur_agenda,
        }
        for d in doctors
    ]


@router.get("/available-slots", response_model=list[SlotOut])
def available_slots(
    doctor_id: int,
    date: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Format de date invalide, attendu YYYY-MM-DD")

    day_start = datetime(target_date.year, target_date.month, target_date.day, 8, 0)
    day_end = datetime(target_date.year, target_date.month, target_date.day, 18, 0)

    existing = db.query(Appointment).filter(
        Appointment.id_staff == doctor_id,
        Appointment.start_at >= day_start,
        Appointment.start_at < day_end,
        Appointment.statut != "annulé",
    ).all()

    slots = []
    slot_start = day_start
    while slot_start < day_end:
        slot_end = slot_start + timedelta(minutes=30)
        occupied = any(
            a.start_at < slot_end and a.end_at > slot_start
            for a in existing
        )
        slots.append(SlotOut(
            start=slot_start.strftime("%H:%M"),
            end=slot_end.strftime("%H:%M"),
            available=not occupied,
        ))
        slot_start = slot_end

    return slots


@router.get("/mine", response_model=list[AppointmentOut])
def my_appointments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id_user == current_user.id_user).first()
    if not patient:
        return []
    appts = (
        db.query(Appointment)
        .filter(Appointment.id_patient == patient.id_patient)
        .order_by(Appointment.start_at.asc())
        .all()
    )
    return [_build_appt_out(a) for a in appts]


@router.get("/upcoming", response_model=list[AppointmentOut])
def upcoming_appointments(
    limit: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    role = current_user.role.code_role

    query = db.query(Appointment).filter(
        Appointment.start_at >= now,
        Appointment.statut != "annulé",
    )

    if role == "patient":
        patient = db.query(Patient).filter(Patient.id_user == current_user.id_user).first()
        if not patient:
            return []
        query = query.filter(Appointment.id_patient == patient.id_patient)
    elif role == "medecin":
        staff = db.query(Staff).filter(Staff.id_user == current_user.id_user).first()
        if staff:
            query = query.filter(Appointment.id_staff == staff.id_staff)

    appts = query.order_by(Appointment.start_at.asc()).limit(limit).all()
    return [_build_appt_out(a) for a in appts]


@router.get("/", response_model=list[AppointmentOut])
def list_appointments(
    doctor_id: Optional[int] = None,
    statut: Optional[str] = None,
    date_start: Optional[str] = None,
    date_end: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = current_user.role.code_role

    query = db.query(Appointment)

    if role == "patient":
        patient = db.query(Patient).filter(Patient.id_user == current_user.id_user).first()
        if not patient:
            return []
        query = query.filter(Appointment.id_patient == patient.id_patient)
    else:
        if doctor_id:
            query = query.filter(Appointment.id_staff == doctor_id)

    if statut:
        query = query.filter(Appointment.statut == statut)

    if date_start:
        try:
            ds = datetime.strptime(date_start, "%Y-%m-%d")
            query = query.filter(Appointment.start_at >= ds)
        except ValueError:
            pass

    if date_end:
        try:
            de = datetime.strptime(date_end, "%Y-%m-%d")
            de = datetime(de.year, de.month, de.day, 23, 59, 59)
            query = query.filter(Appointment.start_at <= de)
        except ValueError:
            pass

    appts = query.order_by(Appointment.start_at.desc()).all()
    return [_build_appt_out(a) for a in appts]


@router.post("/", response_model=AppointmentOut, status_code=201)
def create_appointment(
    data: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = current_user.role.code_role
    if role == "patient":
        patient = db.query(Patient).filter(Patient.id_user == current_user.id_user).first()
        if not patient:
            raise HTTPException(status_code=403, detail="Profil patient introuvable.")
        id_patient = patient.id_patient
        statut = "en_attente"
    else:
        id_patient = data.id_patient
        statut = "confirmé"

    appt = Appointment(
        id_patient=id_patient,
        id_staff=data.id_staff,
        id_room=data.id_room,
        id_appointment_type=data.id_appointment_type,
        start_at=data.start_at,
        end_at=data.end_at,
        notes=data.notes,
        couleur=data.couleur,
        statut=statut,
        created_by_user_id=current_user.id_user,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return _build_appt_out(appt)


@router.get("/types")
def list_appointment_types(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    types = db.query(AppointmentType).all()
    return [{"id_appointment_type": t.id_appointment_type, "libelle": t.libelle} for t in types]


@router.get("/rooms")
def list_rooms(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rooms = db.query(Room).filter(Room.is_active == True).all()
    return [{"id_room": r.id_room, "nom": r.nom} for r in rooms]


@router.put("/{appt_id}", response_model=AppointmentOut)
def update_appointment(
    appt_id: int,
    data: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = current_user.role.code_role
    if role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Accès réservé au personnel médical")

    appt = db.query(Appointment).filter(Appointment.id_appointment == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable")

    appt.id_patient = data.id_patient
    appt.id_staff = data.id_staff
    appt.id_room = data.id_room
    appt.id_appointment_type = data.id_appointment_type
    appt.start_at = data.start_at
    appt.end_at = data.end_at
    appt.notes = data.notes
    appt.couleur = data.couleur
    appt.updated_by_user_id = current_user.id_user
    db.commit()
    db.refresh(appt)
    return _build_appt_out(appt)


@router.put("/{appt_id}/status", response_model=AppointmentOut)
def update_status(
    appt_id: int,
    data: AppointmentStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = current_user.role.code_role
    if role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Accès réservé au personnel médical")

    appt = db.query(Appointment).filter(Appointment.id_appointment == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable")

    appt.statut = data.statut
    appt.updated_by_user_id = current_user.id_user
    db.commit()
    db.refresh(appt)
    return _build_appt_out(appt)


@router.delete("/{appt_id}", status_code=204)
def delete_appointment(
    appt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = current_user.role.code_role
    if role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Accès réservé au personnel médical")

    appt = db.query(Appointment).filter(Appointment.id_appointment == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable")

    db.delete(appt)
    db.commit()
