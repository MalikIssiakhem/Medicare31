from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class UserMiniOut(BaseModel):
    id_user: int
    email: str
    nom: str = ""
    prenom: str = ""
    role: str = ""
    is_online: bool = False
    last_seen_at: Optional[datetime] = None

class MessageAttachmentOut(BaseModel):
    id_attachment: int
    file_name: Optional[str] = None
    file_url: Optional[str] = None
    mime_type: Optional[str] = None
    file_size_kb: Optional[int] = None

    model_config = {"from_attributes": True}


class MessageOut(BaseModel):
    id_message: int
    id_thread: int
    sender_user_id: int
    sender: UserMiniOut
    body: str
    sent_at: datetime
    is_urgent: bool
    reply_to_message_id: Optional[int] = None
    attachments: list[MessageAttachmentOut] = []

    model_config = {"from_attributes": True}


class ConversationOut(BaseModel):
    id_thread: int
    sujet: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = "normal"
    is_archived: bool
    created_by_user_id: int
    created_at: datetime
    updated_at: datetime
    unread_count: int = 0
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    participants: list[UserMiniOut] = []

    model_config = {"from_attributes": True}


class ConversationDetailOut(ConversationOut):
    messages: list[MessageOut] = []


class MessageCreate(BaseModel):
    body: str
    is_urgent: bool = False
    reply_to_message_id: Optional[int] = None


class ConversationCreate(BaseModel):
    participant_ids: list[int]
    sujet: str = "Nouvelle conversation"
    body: str
    priority: str = "normal"
    category: str = "patients"