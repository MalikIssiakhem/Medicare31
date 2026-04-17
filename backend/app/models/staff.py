from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base


class Staff(Base):
    __tablename__ = "staff"

    id_staff = Column(Integer, primary_key=True, index=True)
    id_user = Column(Integer, ForeignKey("users.id_user"), nullable=False)
    type_staff = Column(String(50))  # medecin, secretariat, infirmier, admin
    civilite = Column(String(20))
    nom = Column(String(100))
    prenom = Column(String(100))
    specialite = Column(String(100))
    telephone = Column(String(30))
    couleur_agenda = Column(String(20))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="staff_profile")
    appointments = relationship(
        "Appointment", back_populates="staff", foreign_keys="Appointment.id_staff"
    )
    patients_traites = relationship(
        "Patient", back_populates="medecin_traitant", foreign_keys="Patient.medecin_traitant_id"
    )
