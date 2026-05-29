authGuard();
staffGuard();
initUserNav();

const COLORS = [
  "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444",
  "#14b8a6", "#f97316", "#6366f1", "#ec4899", "#0891b2",
];

const STATUS_TO_API = { Actif: "actif", Nouveau: "nouveau", Suivi: "suivi", Inactif: "inactif" };
const STATUS_TO_DISPLAY = { actif: "Actif", nouveau: "Nouveau", suivi: "Suivi", inactif: "Inactif" };
const SORT_FIELD_MAP = {
  name: "nom",
  dossier: "numero_dossier",
  ddn: "date_naissance",
  lastVisit: "created_at",
  statut: "statut_patient",
};

let patientsCache = [];
let totalPatients = 0;
let editingId = null;
let currentView = "table";
let currentPage = 1;
const PER_PAGE = 8;
let sortField = "nom";
let sortAsc = true;

function adaptPatient(p) {
  return {
    id: p.id_patient,
    dossier: p.numero_dossier,
    civ: p.civilite,
    nom: p.nom,
    prenom: p.prenom,
    ddn: p.date_naissance,
    sexe: p.sexe,
    secu: p.numero_securite_sociale,
    email: p.email,
    tel: p.telephone_principal,
    tel2: p.telephone_secondaire,
    adresse: p.adresse_ligne1,
    cp: p.code_postal,
    ville: p.ville,
    groupe: p.groupe_sanguin,
    allergie: p.allergie_resume,
    statut: STATUS_TO_DISPLAY[p.statut_patient] || p.statut_patient || "Actif",
    medecin_id: p.medecin_traitant_id,
    medecin: null,
    lastVisit: null,
  };
}

async function loadStats() {
  const res = await fetch("/api/patients/stats", { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) return;
  const s = await res.json();
  document.getElementById("statNouveaux").textContent = s.nouveaux_ce_mois;
  document.getElementById("statRdv").textContent = s.rdv_cette_semaine;
  document.getElementById("statSuivis").textContent = s.suivis_actifs;
}

async function loadMedecins() {
  const res = await fetch("/api/staff/medecins", { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) return;
  const medecins = await res.json();

  const filterSelect = document.getElementById("filterDoc");
  const formSelect = document.getElementById("fMedecin");

  medecins.forEach((m) => {
    const label = [m.civilite, m.prenom, m.nom].filter(Boolean).join(" ");

    const optFilter = document.createElement("option");
    optFilter.value = m.id_staff;
    optFilter.textContent = label;
    filterSelect.appendChild(optFilter);

    const optForm = document.createElement("option");
    optForm.value = m.id_staff;
    optForm.textContent = label;
    formSelect.appendChild(optForm);
  });
}

let searchTimer = null;
function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { currentPage = 1; loadPatients(); }, 300);
}

async function loadPatients() {
  const search = document.getElementById("searchInput").value.trim();
  const statutRaw = document.getElementById("filterStatus").value;
  const statut = STATUS_TO_API[statutRaw] || "";
  const skip = (currentPage - 1) * PER_PAGE;
  const apiSort = SORT_FIELD_MAP[sortField] || sortField;
  const sortDir = sortAsc ? "asc" : "desc";

  const medecinId = document.getElementById("filterDoc").value;

  const params = new URLSearchParams({ skip, limit: PER_PAGE, sort_by: apiSort, sort_dir: sortDir });
  if (search) params.set("search", search);
  if (statut) params.set("statut", statut);
  if (medecinId) params.set("medecin_traitant_id", medecinId);

  const headers = { Authorization: `Bearer ${getToken()}` };

  const [listRes, countRes] = await Promise.all([
    fetch(`/api/patients/?${params}`, { headers }),
    fetch(`/api/patients/count?${params}`, { headers }),
  ]);

  if (!listRes.ok || !countRes.ok) {
    showToast("Erreur lors du chargement des patients");
    return;
  }

  patientsCache = (await listRes.json()).map(adaptPatient);
  totalPatients = (await countRes.json()).total;

  document.getElementById("statTotal").textContent = totalPatients;

  if (currentView === "table") renderTable(patientsCache, totalPatients);
  else renderGrid(patientsCache);
}

function filterPatients() {
  currentPage = 1;
  loadPatients();
}

function sortBy(field) {
  if (sortField === field) sortAsc = !sortAsc;
  else { sortField = field; sortAsc = true; }
  currentPage = 1;
  loadPatients();
}

function getColor(id) { return COLORS[(id - 1) % COLORS.length]; }
function initials(p) { return ((p.prenom[0] || "") + (p.nom[0] || "")).toUpperCase(); }
function age(ddn) {
  if (!ddn) return "—";
  const d = new Date(ddn), now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a;
}
function fmtDdn(ddn) {
  if (!ddn) return "—";
  const [y, m, d] = ddn.split("-");
  return `${d}/${m}/${y}`;
}
function statusBadge(s) {
  const map = { Actif: "badge-green", Nouveau: "badge-blue", Suivi: "badge-gold", Inactif: "badge-grey" };
  return `<span class="badge ${map[s] || "badge-grey"}">${s}</span>`;
}

function renderTable(list, total) {
  const pages = Math.ceil(total / PER_PAGE) || 1;

  document.getElementById("tableBody").innerHTML = list.length === 0
    ? `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-light)">Aucun patient trouvé</td></tr>`
    : list.map((p) => `
    <tr onclick="openModal(${p.id})">
      <td><div class="patient-cell">
        <div class="pat-av" style="background:${getColor(p.id)}">${initials(p)}</div>
        <div><div class="pat-name">${p.prenom} ${p.nom}</div><div class="pat-id">${p.email || "—"}</div></div>
      </div></td>
      <td class="td-light">${p.dossier}</td>
      <td class="td-light">${fmtDdn(p.ddn)} <span class="td-lighter">(${age(p.ddn)} ans)</span></td>
      <td class="td-light">${p.medecin || "—"}</td>
      <td class="td-light">${p.lastVisit || "—"}</td>
      <td>${statusBadge(p.statut)}</td>
      <td onclick="event.stopPropagation()"><div class="action-cell">
        <button class="icon-btn" title="Voir fiche" onclick="openModal(${p.id})"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
        <button class="icon-btn" title="Message" onclick="showToast('Messagerie ouverte')"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></button>
        <button class="icon-btn" title="Rendez-vous" onclick="showToast('Agenda ouvert')"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></button>
        <button class="icon-btn danger" title="Supprimer" onclick="confirmDelete(${p.id})"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
      </div></td>
    </tr>`).join("");

  const start = total === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1;
  const end = Math.min(currentPage * PER_PAGE, total);
  document.getElementById("pageInfo").textContent = total === 0
    ? "Aucun résultat"
    : `${start}–${end} sur ${total} patients`;

  const pb = document.getElementById("pageBtns");
  pb.innerHTML = `<button class="page-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""} style="opacity:${currentPage === 1 ? 0.4 : 1}"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></button>`;
  for (let i = 1; i <= pages; i++)
    pb.innerHTML += `<button class="page-btn ${i === currentPage ? "active" : ""}" onclick="changePage(${i})">${i}</button>`;
  pb.innerHTML += `<button class="page-btn" onclick="changePage(${currentPage + 1})" ${currentPage === pages ? "disabled" : ""} style="opacity:${currentPage === pages ? 0.4 : 1}"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></button>`;
}

function changePage(p) {
  const pages = Math.ceil(totalPatients / PER_PAGE) || 1;
  if (p < 1 || p > pages) return;
  currentPage = p;
  loadPatients();
}

function renderGrid(list) {
  document.getElementById("patientGrid").innerHTML = list.length === 0
    ? `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-light)">Aucun patient trouvé</div>`
    : list.map((p) => `
    <div class="patient-card" onclick="openModal(${p.id})">
      <div class="pc-top">
        <div class="pc-avatar" style="background:${getColor(p.id)}">${initials(p)}</div>
        <div class="pc-info">
          <div class="pc-name">${p.prenom} ${p.nom}</div>
          <div class="pc-meta">${age(p.ddn)} ans · ${p.sexe || "—"}</div>
          <div class="pc-id">${p.dossier}</div>
        </div>
        ${statusBadge(p.statut)}
      </div>
      <div class="pc-divider"></div>
      <div class="pc-rows">
        <div class="pc-row"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>${p.medecin || "—"}</div>
        <div class="pc-row"><svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12"/></svg>${p.tel || "—"}</div>
        <div class="pc-row"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Dernier RDV : ${p.lastVisit || "—"}</div>
      </div>
      <div class="pc-foot">
        <div class="pc-actions">
          <button class="pc-btn primary" onclick="event.stopPropagation();openModal(${p.id})">Voir fiche</button>
          <button class="pc-btn ghost" onclick="event.stopPropagation();showToast('Messagerie ouverte')">Message</button>
        </div>
      </div>
    </div>`).join("");
}

function setView(v) {
  currentView = v;
  document.getElementById("vTable").classList.toggle("active", v === "table");
  document.getElementById("vGrid").classList.toggle("active", v === "grid");
  document.getElementById("tableView").style.display = v === "table" ? "block" : "none";
  document.getElementById("gridView").style.display = v === "grid" ? "block" : "none";
  loadPatients();
}

let activeTab = 0;
function openModal(id) {
  editingId = id || null;
  activeTab = 0;

  document.querySelectorAll(".modal-tab").forEach((t, i) => t.classList.toggle("active", i === 0));
  document.querySelectorAll(".tab-panel").forEach((p, i) => p.classList.toggle("active", i === 0));

  if (id) {
    const p = patientsCache.find((x) => x.id === id);
    if (!p) return;
    document.getElementById("modalTitleText").textContent = `${p.prenom} ${p.nom}`;
    document.getElementById("btnDelete").style.display = "flex";
    document.getElementById("fCiv").value = p.civ || "M.";
    document.getElementById("fNom").value = p.nom || "";
    document.getElementById("fPrenom").value = p.prenom || "";
    document.getElementById("fDdn").value = p.ddn || "";
    document.getElementById("fEmail").value = p.email || "";
    document.getElementById("fTel").value = p.tel || "";
    document.getElementById("fTel2").value = p.tel2 || "";
    document.getElementById("fAdresse").value = p.adresse || "";
    document.getElementById("fCp").value = p.cp || "";
    document.getElementById("fVille").value = p.ville || "";
    document.getElementById("fMedecin").value = p.medecin_id || "";
    document.getElementById("fStatut").value = p.statut || "Actif";
    document.getElementById("fMutuelle").value = "";
    document.getElementById("fGroupe").value = p.groupe || "";
    document.getElementById("fAllergie").value = p.allergie || "";
    document.getElementById("fNotes").value = "";
    document.getElementById("fSexe").value = p.sexe || "";
    document.getElementById("fSecu").value = p.secu || "";
    document.getElementById("fTaille").value = "";
    document.getElementById("fPoids").value = "";
    document.getElementById("fTA").value = "";
    document.getElementById("hs-taille").textContent = "—";
    document.getElementById("hs-poids").textContent = "—";
    document.getElementById("hs-ta").textContent = "—";
  } else {
    document.getElementById("modalTitleText").textContent = "Nouveau patient";
    document.getElementById("btnDelete").style.display = "none";
    ["fNom","fPrenom","fDdn","fEmail","fTel","fTel2","fAdresse","fCp","fVille","fMutuelle","fAllergie","fNotes","fSecu","fTaille","fPoids","fTA"]
      .forEach((id) => { const el = document.getElementById(id); if (el) el.value = ""; });
    ["fCiv","fSexe","fGroupe","fMedecin","fStatut"]
      .forEach((id) => { const el = document.getElementById(id); if (el) el.selectedIndex = 0; });
    document.getElementById("hs-taille").textContent = "—";
    document.getElementById("hs-poids").textContent = "—";
    document.getElementById("hs-ta").textContent = "—";
  }
  document.getElementById("modalOverlay").classList.add("open");
}

function switchTab(i) {
  activeTab = i;
  document.querySelectorAll(".modal-tab").forEach((t, j) => t.classList.toggle("active", j === i));
  document.querySelectorAll(".tab-panel").forEach((p, j) => p.classList.toggle("active", j === i));
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  editingId = null;
}
function closeModalOut(e) {
  if (e.target === document.getElementById("modalOverlay")) closeModal();
}

async function savePatient() {
  const nom = document.getElementById("fNom").value.trim();
  const prenom = document.getElementById("fPrenom").value.trim();
  const ddn = document.getElementById("fDdn").value;
  if (!nom || !prenom) { showToast("Nom et prénom obligatoires."); return; }
  if (!ddn) { showToast("Date de naissance obligatoire."); return; }

  const body = {
    civilite: document.getElementById("fCiv").value,
    nom,
    prenom,
    date_naissance: ddn,
    sexe: document.getElementById("fSexe").value || null,
    numero_securite_sociale: document.getElementById("fSecu").value || null,
    groupe_sanguin: document.getElementById("fGroupe").value || null,
    allergie_resume: document.getElementById("fAllergie").value || null,
    statut_patient: STATUS_TO_API[document.getElementById("fStatut").value] || "actif",
    medecin_traitant_id: parseInt(document.getElementById("fMedecin").value) || null,
    contact: {
      email: document.getElementById("fEmail").value || null,
      telephone_principal: document.getElementById("fTel").value || null,
      telephone_secondaire: document.getElementById("fTel2").value || null,
      adresse_ligne1: document.getElementById("fAdresse").value || null,
      code_postal: document.getElementById("fCp").value || null,
      ville: document.getElementById("fVille").value || null,
    },
  };

  const url = editingId ? `/api/patients/${editingId}` : "/api/patients/";
  const method = editingId ? "PUT" : "POST";

  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    showToast(err.detail || "Erreur lors de l'enregistrement");
    return;
  }

  showToast(editingId ? "Patient mis à jour" : "Patient créé avec succès");
  closeModal();
  loadPatients();
}

async function confirmDelete(id) {
  const p = patientsCache.find((x) => x.id === id);
  if (!p) return;
  if (!confirm(`Supprimer le patient ${p.prenom} ${p.nom} ?`)) return;
  const res = await fetch(`/api/patients/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) { showToast("Erreur lors de la suppression"); return; }
  showToast("Patient supprimé");
  loadPatients();
}

async function deletePatient() {
  if (!editingId) return;
  const p = patientsCache.find((x) => x.id === editingId);
  if (!p) return;
  if (!confirm(`Supprimer ${p.prenom} ${p.nom} ?`)) return;
  const res = await fetch(`/api/patients/${editingId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) { showToast("Erreur lors de la suppression"); return; }
  closeModal();
  showToast("Patient supprimé");
  loadPatients();
}

function showToast(msg) {
  const t = document.getElementById("toast");
  document.getElementById("toastMsg").textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

loadStats();
loadMedecins();
loadPatients();
