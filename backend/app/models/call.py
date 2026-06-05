from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base


class Call(Base):
    __tablename__ = "calls"

    id_call = Column(Integer, primary_key=True, index=True)
    nom_appelant = Column(String(150), nullable=False)
    telephone = Column(String(30))
    direction = Column(String(20), default="entrant")   # entrant / sortant
    motif = Column(String(255), nullable=False)
    notes = Column(Text)
    statut = Column(String(30), default="a_traiter")    # a_traiter / a_rappeler / traite
    is_urgent = Column(Boolean, default=False)
    rappel_at = Column(DateTime, nullable=True)
    id_patient = Column(Integer, ForeignKey("patients.id_patient"), nullable=True)
    id_user = Column(Integer, ForeignKey("users.id_user"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    patient = relationship("Patient", foreign_keys=[id_patient])
    created_by = relationship("User", foreign_keys=[id_user])
