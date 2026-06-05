"""Carnet de santé MediCare31 : génération du PDF + création du dossier.

Appelé à l'inscription d'un patient pour qu'il dispose automatiquement, dans
« Mes Documents », d'un carnet de santé téléchargeable. Crée aussi le
MedicalRecord (dossier) du patient s'il n'existe pas.

`create_health_booklet` est idempotent et défensif : un échec ne doit jamais
casser l'inscription.
"""

import os
from datetime import date, datetime

from sqlalchemy.orm import Session
from fpdf import FPDF

from app.models.medical import MedicalRecord, Document
from app.models.patient import Patient

UPLOAD_DIR = os.getenv("DOCUMENT_UPLOAD_DIR", "/app/uploads/documents")

_BLUE = (44, 95, 158)
_DARK = (30, 45, 69)
_GREY = (120, 130, 150)
_LINE = (220, 230, 240)


def _section(pdf: FPDF, title: str) -> None:
    pdf.ln(4)
    pdf.set_text_color(*_BLUE)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 7, title, ln=True)
    pdf.set_draw_color(*_LINE)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(2)


def _field(pdf: FPDF, label: str, value: str) -> None:
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*_GREY)
    pdf.cell(58, 6, f"{label} :", ln=False)
    pdf.set_text_color(*_DARK)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, value, ln=True)


def _placeholder(pdf: FPDF, text: str) -> None:
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(150, 160, 175)
    pdf.cell(0, 6, text, ln=True)


def generate_carnet_pdf(patient: Patient) -> bytes:
    """Génère le PDF du carnet de santé pour un patient et renvoie les octets."""
    pdf = FPDF(format="A4")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(15, 15, 15)
    pdf.add_page()

    # Bandeau d'en-tête
    pdf.set_fill_color(*_BLUE)
    pdf.rect(0, 0, 210, 32, style="F")
    pdf.set_xy(15, 8)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 20)
    pdf.cell(0, 9, "Carnet de santé", ln=True)
    pdf.set_x(15)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, "MediCare31 - Cabinet de médecine générale (Toulouse, 31)", ln=True)

    pdf.ln(14)
    pdf.set_text_color(*_GREY)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(
        0, 5,
        f"Dossier n° {patient.numero_dossier or '-'}   -   Édité le {date.today().strftime('%d/%m/%Y')}",
        ln=True,
    )

    # Identité
    _section(pdf, "Identité du patient")
    civ = (patient.civilite or "").strip()
    nom_complet = " ".join(p for p in [civ, patient.prenom, patient.nom] if p).strip() or "-"
    ddn = patient.date_naissance.strftime("%d/%m/%Y") if patient.date_naissance else "-"
    _field(pdf, "Nom complet", nom_complet)
    _field(pdf, "Date de naissance", ddn)
    _field(pdf, "Sexe", patient.sexe or "-")
    _field(pdf, "N° de sécurité sociale", patient.numero_securite_sociale or "Non renseigné")

    # Informations médicales connues
    _section(pdf, "Informations médicales")
    _field(pdf, "Groupe sanguin", patient.groupe_sanguin or "À compléter")
    _field(pdf, "Allergies connues", patient.allergie_resume or "Aucune renseignée")

    # Sections à compléter par le médecin
    for title in ["Antécédents médicaux", "Vaccinations", "Traitements en cours"]:
        _section(pdf, title)
        _placeholder(pdf, "À compléter par votre médecin traitant.")

    # Pied de page (auto page-break désactivé pour le garder sur la page)
    pdf.set_auto_page_break(auto=False)
    pdf.set_y(-22)
    pdf.set_draw_color(*_LINE)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(3)
    pdf.set_text_color(*_GREY)
    pdf.set_font("Helvetica", "I", 8)
    pdf.multi_cell(
        0, 4,
        "Document généré automatiquement par MediCare31 - Hébergement certifié HDS. "
        "Ce carnet est confidentiel et réservé à un usage médical.",
    )

    return bytes(pdf.output())


def create_health_booklet(db: Session, patient: Patient, uploaded_by_user_id: int):
    """Crée le dossier (MedicalRecord) + le carnet de santé (Document PDF).

    Idempotent (ne recrée pas un carnet existant) et défensif (un échec
    n'interrompt pas l'inscription).
    """
    try:
        existing = (
            db.query(Document)
            .filter(
                Document.id_patient == patient.id_patient,
                Document.document_type == "carnet_sante",
                Document.deleted_at.is_(None),
            )
            .first()
        )
        if existing:
            return existing

        record = (
            db.query(MedicalRecord)
            .filter(MedicalRecord.id_patient == patient.id_patient)
            .first()
        )
        if not record:
            db.add(MedicalRecord(id_patient=patient.id_patient, antecedents="", notes_cliniques=""))

        pdf_bytes = generate_carnet_pdf(patient)
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        stored_name = f"carnet_{patient.id_patient}_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}.pdf"
        file_path = os.path.join(UPLOAD_DIR, stored_name)
        with open(file_path, "wb") as buffer:
            buffer.write(pdf_bytes)

        doc = Document(
            id_patient=patient.id_patient,
            id_uploaded_by_user=uploaded_by_user_id,
            document_type="carnet_sante",
            titre="Carnet de santé MediCare31",
            fichier_url=f"/uploads/documents/{stored_name}",
            mime_type="application/pdf",
            taille_ko=max(1, len(pdf_bytes) // 1024),
            source_label="MediCare31",
            document_date=date.today(),
            status="nouveau",
            is_read=False,
            is_archived=False,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc
    except Exception as exc:
        db.rollback()
        print(f"[CARNET] Échec génération carnet (patient {getattr(patient, 'id_patient', None)}) : {exc}")
        return None
