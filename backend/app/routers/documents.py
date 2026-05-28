import os
import shutil
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from app.db import get_db
from app.models.medical import Document
from app.models.patient import Patient
from app.models.user import User
from app.services.auth import get_current_user
from app.schemas.documents import DocumentOut, DocumentUpdate

router = APIRouter(prefix="/api/documents", tags=["documents"])

UPLOAD_DIR = os.getenv("DOCUMENT_UPLOAD_DIR", "/app/uploads/documents")


def _safe_filename(filename: str) -> str:
    cleaned = filename.replace("/", "_").replace("\\", "_").strip()
    return cleaned or "document"


def _document_file_path(doc: Document) -> str:
    if not doc.fichier_url.startswith("/uploads/documents/"):
        raise HTTPException(status_code=400, detail="Chemin fichier invalide")
    return doc.fichier_url.replace("/uploads/documents/", f"{UPLOAD_DIR}/", 1)


@router.get("/", response_model=list[DocumentOut])
def list_documents(
    search: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    patient_id: Optional[int] = Query(None),
    archived: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        db.query(Document)
        .options(joinedload(Document.patient))
        .join(Patient, Patient.id_patient == Document.id_patient)
        .filter(Document.deleted_at.is_(None))
        .filter(Document.is_archived == archived)
        .order_by(Document.created_at.desc())
    )

    if search:
        like = f"%{search}%"
        q = q.filter(
            or_(
                Document.titre.ilike(like),
                Document.source_label.ilike(like),
                Patient.nom.ilike(like),
                Patient.prenom.ilike(like),
                Patient.numero_dossier.ilike(like),
            )
        )

    if document_type:
        q = q.filter(Document.document_type == document_type)

    if status:
        q = q.filter(Document.status == status)

    if patient_id:
        q = q.filter(Document.id_patient == patient_id)

    return q.offset(skip).limit(limit).all()


@router.get("/stats")
def document_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base = db.query(Document).filter(Document.deleted_at.is_(None))

    return {
        "total": base.filter(Document.is_archived == False).count(),
        "a_classer": base.filter(Document.status == "a_classer", Document.is_archived == False).count(),
        "non_lus": base.filter(Document.is_read == False, Document.is_archived == False).count(),
        "partages": base.filter(Document.status == "partage", Document.is_archived == False).count(),
        "archives": base.filter(Document.is_archived == True).count(),
    }


@router.post("/upload", response_model=DocumentOut, status_code=201)
def upload_document(
    id_patient: int = Form(...),
    titre: str = Form(...),
    document_type: str = Form("autre"),
    source_label: Optional[str] = Form(None),
    document_date: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = db.query(Patient).filter(Patient.id_patient == id_patient).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient introuvable")

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    original_name = _safe_filename(file.filename or "document")
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    stored_name = f"{timestamp}_{original_name}"
    file_path = os.path.join(UPLOAD_DIR, stored_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    size_kb = max(1, int(os.path.getsize(file_path) / 1024))

    parsed_date = None
    if document_date:
        try:
            parsed_date = datetime.strptime(document_date, "%Y-%m-%d").date()
        except ValueError:
            parsed_date = None

    doc = Document(
        id_patient=id_patient,
        id_uploaded_by_user=current_user.id_user,
        document_type=document_type,
        titre=titre,
        fichier_url=f"/uploads/documents/{stored_name}",
        mime_type=file.content_type,
        taille_ko=size_kb,
        source_label=source_label,
        document_date=parsed_date,
        status="nouveau",
        is_read=False,
        is_archived=False,
    )

    db.add(doc)
    db.commit()
    db.refresh(doc)

    return doc


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = (
        db.query(Document)
        .options(joinedload(Document.patient))
        .filter(Document.id_document == document_id, Document.deleted_at.is_(None))
        .first()
    )

    if not doc:
        raise HTTPException(status_code=404, detail="Document introuvable")

    return doc


@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(
        Document.id_document == document_id,
        Document.deleted_at.is_(None),
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document introuvable")

    file_path = _document_file_path(doc)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Fichier introuvable sur le serveur")

    doc.is_read = True
    if doc.status == "nouveau":
        doc.status = "lu"
    db.commit()

    download_name = doc.titre or os.path.basename(file_path)
    ext = os.path.splitext(os.path.basename(file_path))[1]
    if ext and not download_name.lower().endswith(ext.lower()):
        download_name = f"{download_name}{ext}"

    return FileResponse(
        file_path,
        media_type=doc.mime_type or "application/octet-stream",
        filename=download_name,
    )


@router.patch("/{document_id}", response_model=DocumentOut)
def update_document(
    document_id: int,
    data: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(
        Document.id_document == document_id,
        Document.deleted_at.is_(None),
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document introuvable")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(doc, key, value)

    if data.status == "archive":
        doc.is_archived = True

    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{document_id}", status_code=204)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(
        Document.id_document == document_id,
        Document.deleted_at.is_(None),
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document introuvable")

    doc.deleted_at = datetime.utcnow()
    db.commit()