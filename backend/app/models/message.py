from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base


class ConversationThread(Base):
    __tablename__ = "conversation_threads"

    id_thread = Column(Integer, primary_key=True, index=True)
    sujet = Column(String(255))
    category = Column(String(50))   # patients, equipe
    priority = Column(String(30), default="normal")  # normal, urgent
    is_archived = Column(Boolean, default=False)
    created_by_user_id = Column(Integer, ForeignKey("users.id_user"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    created_by = relationship("User", foreign_keys=[created_by_user_id])
    participants = relationship("ConversationParticipant", back_populates="thread")
    messages = relationship("Message", back_populates="thread")


class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"

    id_thread = Column(Integer, ForeignKey("conversation_threads.id_thread"), primary_key=True)
    id_user = Column(Integer, ForeignKey("users.id_user"), primary_key=True)
    role_in_thread = Column(String(30))  # sender, recipient
    unread_count = Column(Integer, default=0)
    last_read_at = Column(DateTime, nullable=True)

    thread = relationship("ConversationThread", back_populates="participants")
    user = relationship("User", foreign_keys=[id_user])


class Message(Base):
    __tablename__ = "messages"

    id_message = Column(Integer, primary_key=True, index=True)
    id_thread = Column(Integer, ForeignKey("conversation_threads.id_thread"), nullable=False)
    sender_user_id = Column(Integer, ForeignKey("users.id_user"), nullable=False)
    reply_to_message_id = Column(Integer, ForeignKey("messages.id_message"), nullable=True)
    body = Column(Text, nullable=False)
    sent_at = Column(DateTime, nullable=False, server_default=func.now())
    is_urgent = Column(Boolean, default=False)

    thread = relationship("ConversationThread", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_user_id])
    reply_to = relationship("Message", remote_side="Message.id_message", foreign_keys=[reply_to_message_id])
    attachments = relationship("MessageAttachment", back_populates="message")


class MessageAttachment(Base):
    __tablename__ = "message_attachments"

    id_attachment = Column(Integer, primary_key=True, index=True)
    id_message = Column(Integer, ForeignKey("messages.id_message"), nullable=False)
    file_name = Column(String(255))
    file_url = Column(String(500))
    mime_type = Column(String(100))
    file_size_kb = Column(Integer)

    message = relationship("Message", back_populates="attachments")
