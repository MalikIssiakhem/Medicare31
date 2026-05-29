staffGuard();
initUserNav();

const TYPE_LABELS = {
  ordonnance: "Ordonnance",
  analyse: "Analyse",
  certificat: "Certificat",
  compte_rendu: "Compte-rendu",
  administratif: "Administratif",
  autre: "Autre",
};

const STATUS_LABELS = {
  nouveau: "Nouveau",
  lu: "Lu",
  a_classer: "À classer",
  partage: "Partagé",
  archive: "Archivé",
};

const STATUS_CLASS = {
  nouveau: "badge-blue",
  lu: "badge-green",
  a_classer: "badge-gold",
  partage: "badge-blue",
  archive: "badge-grey",
};

let documentsCache = [];
let selectedDocumentId = null;
let searchTimer = null;

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${getToken()}`, ...extra };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function formatDate(value) {
  if (!value) return "Date non renseignée";
  return new Intl.DateTimeFormat("fr-FR").format(new Date(value));
}

function formatSize(kb) {
  if (!kb) return "Taille inconnue";
  if (kb >= 1024) return `${(kb / 1024).toFixed(1).replace(".", ",")} Mo`;
  return `${kb} Ko`;
}

function patientName(doc) {
  if (!doc.patient) return "Patient non lié";
  return `${doc.patient.prenom || ""} ${doc.patient.nom || ""}`.trim();
}

function docIconClass(type) {
  if (type === "analyse") return "gold";
  if (type === "certificat") return "red";
  if (type === "ordonnance") return "green";
  return "blue";
}

function buildParams() {
  const params = new URLSearchParams({ limit: "100" });
  const search = document.getElementById("searchInput").value.trim();
  const type = document.getElementById("typeFilter").value;
  const status = document.getElementById("statusFilter").value;
  const archived = document.getElementById("archiveFilter").checked;
  params.set("archived", archived ? "true" : "false");
  if (search) params.set("search", search);
  if (type) params.set("document_type", type);
  if (status) params.set("status", status);
  return params;
}

async function loadStats() {
  const res = await fetch("/api/documents/stats", { headers: authHeaders() });
  if (!res.ok) throw new Error("stats");
  const stats = await res.json();
  document.getElementById("statTotal").textContent = stats.total ?? 0;
  document.getElementById("statAClasser").textContent = stats.a_classer ?? 0;
  document.getElementById("statNonLus").textContent = stats.non_lus ?? 0;
  document.getElementById("statArchives").textContent = stats.archives ?? 0;
}

async function loadDocuments() {
  const list = document.getElementById("docList");
  list.innerHTML = `<div class="empty-state">Chargement des documents...</div>`;

  try {
    const [docsRes] = await Promise.all([
      fetch(`/api/documents/?${buildParams()}`, { headers: authHeaders() }),
      loadStats(),
    ]);

    if (!docsRes.ok) throw new Error("documents");
    documentsCache = await docsRes.json();
    renderDocuments();
  } catch (error) {
    list.innerHTML = `<div class="empty-state error">Impossible de charger les documents.</div>`;
    showToast("Erreur de chargement des documents", "error");
  }
}

function renderDocuments() {
  const list = document.getElementById("docList");
  const resultCount = document.getElementById("resultCount");
  resultCount.textContent = `${documentsCache.length} résultat${documentsCache.length > 1 ? "s" : ""}`;

  if (!documentsCache.length) {
    list.innerHTML = `<div class="empty-state">Aucun document ne correspond aux filtres.</div>`;
    renderInspector(null);
    return;
  }

  list.innerHTML = documentsCache.map((doc) => {
    const selected = doc.id_document === selectedDocumentId ? "selected" : "";
    const unread = doc.is_read ? "" : `<span class="unread-dot" title="Non lu"></span>`;
    return `
      <article class="doc-item ${selected}" onclick="selectDocument(${doc.id_document})">
        <div class="doc-icon ${docIconClass(doc.document_type)}"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
        <div class="doc-main">
          <div class="doc-name">${unread}${escapeHtml(doc.titre)}</div>
          <div class="doc-meta">${escapeHtml(patientName(doc))} · ${escapeHtml(doc.patient?.numero_dossier || "Sans dossier")} · ${TYPE_LABELS[doc.document_type] || "Autre"}</div>
          <div class="doc-meta muted">${escapeHtml(doc.source_label || "Source non renseignée")} · ${formatDate(doc.document_date || doc.created_at)} · ${formatSize(doc.taille_ko)}</div>
        </div>
        <div class="doc-actions" onclick="event.stopPropagation()">
          <span class="badge ${STATUS_CLASS[doc.status] || "badge-grey"}">${STATUS_LABELS[doc.status] || doc.status || "Nouveau"}</span>
          <button class="icon-btn" title="Télécharger" onclick="downloadDocument(${doc.id_document})"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
        </div>
      </article>`;
  }).join("");

  if (!documentsCache.some((doc) => doc.id_document === selectedDocumentId)) {
    selectedDocumentId = documentsCache[0].id_document;
  }
  renderInspector(documentsCache.find((doc) => doc.id_document === selectedDocumentId));
}

function selectDocument(id) {
  selectedDocumentId = id;
  renderDocuments();
}

function renderInspector(doc) {
  const panel = document.getElementById("docInspector");
  if (!doc) {
    panel.innerHTML = `<div class="inspector-empty">Sélectionnez un document pour voir ses détails et ses actions.</div>`;
    return;
  }

  panel.innerHTML = `
    <div class="inspector-card">
      <div class="inspector-top">
        <div class="doc-icon ${docIconClass(doc.document_type)}"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
        <div><h3>${escapeHtml(doc.titre)}</h3><span class="badge ${STATUS_CLASS[doc.status] || "badge-grey"}">${STATUS_LABELS[doc.status] || doc.status || "Nouveau"}</span></div>
      </div>
      <dl class="detail-list">
        <div><dt>Patient</dt><dd>${escapeHtml(patientName(doc))}</dd></div>
        <div><dt>Dossier</dt><dd>${escapeHtml(doc.patient?.numero_dossier || "—")}</dd></div>
        <div><dt>Type</dt><dd>${TYPE_LABELS[doc.document_type] || "Autre"}</dd></div>
        <div><dt>Source</dt><dd>${escapeHtml(doc.source_label || "—")}</dd></div>
        <div><dt>Date</dt><dd>${formatDate(doc.document_date || doc.created_at)}</dd></div>
        <div><dt>Fichier</dt><dd>${escapeHtml(doc.mime_type || "Type inconnu")} · ${formatSize(doc.taille_ko)}</dd></div>
      </dl>
      <div class="inspector-actions">
        <button class="btn-primary" type="button" onclick="downloadDocument(${doc.id_document})">Télécharger</button>
        <button class="btn-secondary" type="button" onclick="markRead(${doc.id_document})">Marquer lu</button>
        <button class="btn-secondary" type="button" onclick="setStatus(${doc.id_document}, 'a_classer')">À classer</button>
        <button class="btn-secondary" type="button" onclick="setStatus(${doc.id_document}, 'partage')">Partager</button>
        <button class="btn-secondary" type="button" onclick="archiveDocument(${doc.id_document})">Archiver</button>
        <button class="btn-secondary danger" type="button" onclick="deleteDocument(${doc.id_document})">Supprimer</button>
      </div>
    </div>`;
}

async function patchDocument(id, payload, successMessage) {
  const res = await fetch(`/api/documents/${id}`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    showToast("Action impossible", "error");
    return;
  }
  showToast(successMessage);
  await loadDocuments();
}

function markRead(id) {
  patchDocument(id, { is_read: true, status: "lu" }, "Document marqué comme lu");
}

function setStatus(id, status) {
  patchDocument(id, { status, is_read: true }, "Statut mis à jour");
}

function archiveDocument(id) {
  patchDocument(id, { is_archived: true, status: "archive", is_read: true }, "Document archivé");
}

async function deleteDocument(id) {
  if (!confirm("Supprimer ce document ?")) return;
  const res = await fetch(`/api/documents/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) {
    showToast("Suppression impossible", "error");
    return;
  }
  selectedDocumentId = null;
  showToast("Document supprimé");
  await loadDocuments();
}

async function downloadDocument(id) {
  const res = await fetch(`/api/documents/${id}/download`, { headers: authHeaders() });
  if (!res.ok) {
    showToast("Téléchargement impossible", "error");
    return;
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i);
  const filename = match ? decodeURIComponent(match[1].replaceAll('"', "")) : "document";
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  await loadDocuments();
}

async function loadPatients() {
  const select = document.getElementById("patientSelect");
  try {
    const res = await fetch("/api/patients/?limit=100&sort_by=nom&sort_dir=asc", { headers: authHeaders() });
    if (!res.ok) throw new Error("patients");
    const patients = await res.json();
    select.innerHTML = `<option value="">Choisir un patient</option>` + patients.map((p) =>
      `<option value="${p.id_patient}">${escapeHtml(p.prenom)} ${escapeHtml(p.nom)} · ${escapeHtml(p.numero_dossier)}</option>`
    ).join("");
  } catch (error) {
    select.innerHTML = `<option value="">Patients indisponibles</option>`;
  }
}

function openUpload() {
  document.getElementById("uploadModal").classList.add("open");
}

function closeUpload() {
  document.getElementById("uploadModal").classList.remove("open");
  document.getElementById("uploadForm").reset();
}

function closeUploadOut(event) {
  if (event.target.id === "uploadModal") closeUpload();
}

async function submitUpload(event) {
  event.preventDefault();
  const button = document.getElementById("submitUploadBtn");
  button.disabled = true;
  button.textContent = "Envoi...";

  try {
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/documents/upload", {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });
    if (!res.ok) throw new Error("upload");
    closeUpload();
    showToast("Document déposé");
    await loadDocuments();
  } catch (error) {
    showToast("Dépôt impossible", "error");
  } finally {
    button.disabled = false;
    button.textContent = "Enregistrer";
  }
}

function bindEvents() {
  document.getElementById("openUploadBtn").addEventListener("click", openUpload);
  document.getElementById("closeUploadBtn").addEventListener("click", closeUpload);
  document.getElementById("cancelUploadBtn").addEventListener("click", closeUpload);
  document.getElementById("refreshBtn").addEventListener("click", loadDocuments);
  document.getElementById("uploadForm").addEventListener("submit", submitUpload);
  document.getElementById("typeFilter").addEventListener("change", loadDocuments);
  document.getElementById("statusFilter").addEventListener("change", loadDocuments);
  document.getElementById("archiveFilter").addEventListener("change", loadDocuments);
  document.getElementById("searchInput").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadDocuments, 250);
  });
}

bindEvents();
loadPatients();
loadDocuments();
