from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base


class Notification(Base):
    __tablename__ = "notifications"

    id_notification = Column(Integer, primary_key=True, index=True)
    id_user = Column(Integer, ForeignKey("users.id_user"), nullable=False)
    type_notification = Column(String(50))  # rappel_rdv, message, document, systeme
    titre = Column(String(255))
    contenu = Column(Text)
    is_read = Column(Boolean, default=False)
    related_entity_type = Column(String(50), nullable=True)  # appointment, message, document
    related_entity_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="notifications", foreign_keys=[id_user])
