from sqlalchemy import Column, Integer, String, Boolean, Text
from app.db import Base


class Room(Base):
    __tablename__ = "rooms"

    id_room = Column(Integer, primary_key=True, index=True)
    nom = Column(String(100), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)


class AppointmentType(Base):
    __tablename__ = "appointment_types"

    id_appointment_type = Column(Integer, primary_key=True, index=True)
    libelle = Column(String(100), nullable=False)  # consultation générale, urgence, téléconsultation
    duree_par_defaut_min = Column(Integer)
