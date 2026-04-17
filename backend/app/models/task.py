from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base


class Task(Base):
    __tablename__ = "tasks"

    id_task = Column(Integer, primary_key=True, index=True)
    assigned_user_id = Column(Integer, ForeignKey("users.id_user"), nullable=False)
    titre = Column(String(255), nullable=False)
    description = Column(Text)
    statut = Column(String(30), default="todo")  # todo, done
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    assigned_user = relationship("User", back_populates="tasks", foreign_keys=[assigned_user_id])
