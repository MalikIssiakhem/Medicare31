from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db import Base


class Role(Base):
    __tablename__ = "roles"

    id_role = Column(Integer, primary_key=True, index=True)
    code_role = Column(String(50), unique=True, nullable=False)  # patient, medecin, secretariat, admin
    libelle = Column(String(100))

    users = relationship("User", back_populates="role")
