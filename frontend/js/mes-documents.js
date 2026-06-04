authGuard();
initUserNav();

const TYPE_LABELS = {
  ordonnance: "Ordonnance",
  analyse: "Analyse",
  certificat: "Certificat",
  compte_rendu: "Compte-rendu",
  administratif: "Administratif",
  autre: "Autre",
};

let docsCache = [];
let currentType = "";
let searchQuery = "";
let searchTimer = null;

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${getToken()}`, ...extra };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function formatSize(ko) {
  if (!ko) return "";
  if (ko < 1024) return `${ko} Ko`;
  return `${(ko / 1024).toFixed(1)} Mo`;
}

function docIconSvg() {
  return `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>`;
}

async function loadDocs() {
  const list = document.getElementById("docList");
  list.innerHTML = `<div class="doc-loading">Chargement de vos documents…</div>`;
  try {
    const res = await fetch("/api/documents/?limit=200", { headers: authHeaders() });
    if (!res.ok) throw new Error("documents");
    docsCache = await res.json();
    render();
  } catch (e) {
    list.innerHTML = `<div class="doc-empty"><p>Impossible de charger vos documents pour le moment.</p></div>`;
  }
}

function render() {
  const list = document.getElementById("docList");
  const q = searchQuery.trim().toLowerCase();

  const filtered = docsCache.filter((d) => {
    if (currentType && d.document_type !== currentType) return false;
    if (q) {
      const hay = `${d.titre || ""} ${d.source_label || ""} ${TYPE_LABELS[d.document_type] || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (!filtered.length) {
    list.innerHTML = `
      <div class="doc-empty">
        <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <p>${docsCache.length ? "Aucun document ne correspond à votre recherche." : "Vous n'avez aucun document pour le moment."}</p>
      </div>`;
    return;
  }

  list.innerHTML = filtered
    .map((d) => {
      const type = d.document_type || "autre";
      const typeLabel = TYPE_LABELS[type] || "Document";
      const date = formatDate(d.document_date || d.created_at);
      const size = formatSize(d.taille_ko);
      const meta = [
        `<span class="doc-type-badge">${escapeHtml(typeLabel)}</span>`,
        date ? `<span>${escapeHtml(date)}</span>` : "",
        size ? `<span class="dot"></span><span>${escapeHtml(size)}</span>` : "",
        d.source_label ? `<span class="dot"></span><span>${escapeHtml(d.source_label)}</span>` : "",
      ]
        .filter(Boolean)
        .join("");

      return `
        <div class="doc-card">
          <div class="doc-icon ${type}">${docIconSvg()}</div>
          <div class="doc-body">
            <div class="doc-title">${escapeHtml(d.titre || "Document")}</div>
            <div class="doc-meta">${meta}</div>
          </div>
          <button class="doc-download" onclick="downloadDoc(${d.id_document})" title="Télécharger">
            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
        </div>`;
    })
    .join("");
}

async function downloadDoc(id) {
  const res = await fetch(`/api/documents/${id}/download`, { headers: authHeaders() });
  if (!res.ok) {
    alert("Téléchargement impossible.");
    return;
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  const filename = match ? decodeURIComponent(match[1].replaceAll('"', "")) : "document";
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  document.getElementById("docSearch").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQuery = e.target.value;
      render();
    }, 180);
  });

  document.getElementById("typeFilters").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    document.querySelectorAll("#typeFilters .chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    currentType = chip.dataset.type || "";
    render();
  });
}

bindEvents();
loadDocs();
