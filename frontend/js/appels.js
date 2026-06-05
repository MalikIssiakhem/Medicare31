staffGuard();
initUserNav();

const STATUS_META = {
  a_traiter: { label: "À traiter", chip: "blue" },
  a_rappeler: { label: "À rappeler", chip: "gold" },
  traite: { label: "Traité", chip: "green" },
};

const PHONE_ICON =
  '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.35 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>';
const CHECK_ICON = '<polyline points="20 6 9 17 4 12"/>';

let _lastPatients = [];
let selectedPatientId = null;
let _searchTimer = null;
let _allCalls = [];
let currentFilter = "all";
let editingCallId = null;

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleDateString("fr-FR");
}

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${getToken()}`, ...extra };
}
function esc(v) {
  return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function val(id) {
  return document.getElementById(id).value;
}
function setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}
function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 172800) return "hier";
  return d.toLocaleDateString("fr-FR");
}

async function loadStats() {
  try {
    const res = await fetch("/api/calls/stats", { headers: authHeaders() });
    if (!res.ok) return;
    const s = await res.json();
    setText("statATraiter", s.a_traiter);
    setText("statARappeler", s.a_rappeler);
    setText("statUrgents", s.urgents);
    setText("statTraite", s.traite);
  } catch (e) {}
}

async function loadCalls() {
  try {
    const res = await fetch("/api/calls?limit=100", { headers: authHeaders() });
    if (!res.ok) throw new Error();
    _allCalls = await res.json();
    renderCalls();
  } catch (e) {
    document.getElementById("callList").innerHTML = `<div class="call-empty">Impossible de charger les appels.</div>`;
  }
}

function _matchesFilter(c) {
  if (currentFilter === "all") return true;
  if (currentFilter === "urgent") return c.is_urgent && c.statut !== "traite";
  return c.statut === currentFilter;
}

function renderCalls() {
  const list = document.getElementById("callList");
  const calls = _allCalls.filter(_matchesFilter);
  if (!calls.length) {
    list.innerHTML = `<div class="call-empty">${_allCalls.length ? "Aucun appel pour ce filtre." : "Aucun appel enregistré pour le moment."}</div>`;
    return;
  }
  list.innerHTML = calls
    .map((c) => {
      const meta = STATUS_META[c.statut] || STATUS_META.a_traiter;
      const done = c.statut === "traite";
      const iconClass = done ? "green" : c.is_urgent ? "red" : "";
      const icon = done ? CHECK_ICON : PHONE_ICON;
      const patient = c.patient_nom
        ? ` · ${esc(((c.patient_prenom || "") + " " + c.patient_nom).trim())}`
        : "";
      const dir = c.direction === "sortant" ? "Sortant" : "Entrant";
      const rappel =
        c.statut === "a_rappeler" && c.rappel_at
          ? ` · <span class="call-rappel">rappel le ${fmtDate(c.rappel_at)}</span>`
          : "";
      const chips =
        (c.is_urgent && !done ? '<span class="chip red">Urgent</span>' : "") +
        `<span class="chip ${meta.chip}">${meta.label}</span>`;
      const quick = done
        ? ""
        : `<button class="call-quick" type="button" onclick="quickTraiter(event, ${c.id_call})">✓ Traiter</button>`;
      return `<article class="call-item" onclick="openEditCall(${c.id_call})">
        <div class="call-icon ${iconClass}"><svg viewBox="0 0 24 24">${icon}</svg></div>
        <div>
          <div class="call-name">${esc(c.nom_appelant)}</div>
          <div class="call-meta">${esc(c.motif)}${patient} · ${dir} · ${timeAgo(c.created_at)}${rappel}</div>
        </div>
        <div class="call-actions">${chips}${quick}</div>
      </article>`;
    })
    .join("");
}

document.getElementById("callFilters").addEventListener("click", (e) => {
  const chip = e.target.closest(".filter-chip");
  if (!chip) return;
  document.querySelectorAll("#callFilters .filter-chip").forEach((c) => c.classList.remove("active"));
  chip.classList.add("active");
  currentFilter = chip.dataset.filter;
  renderCalls();
});

/* ── Recherche patient ── */
function onPatientSearch() {
  clearTimeout(_searchTimer);
  const q = document.getElementById("c_patient_search").value.trim();
  const box = document.getElementById("patientResults");
  if (q.length < 2) {
    box.classList.remove("show");
    box.innerHTML = "";
    return;
  }
  _searchTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/patients/?search=${encodeURIComponent(q)}&limit=6`, { headers: authHeaders() });
      if (!res.ok) return;
      _lastPatients = await res.json();
      if (!_lastPatients.length) {
        box.innerHTML = `<div class="pr-empty">Aucun patient trouvé</div>`;
      } else {
        box.innerHTML = _lastPatients
          .map(
            (p) =>
              `<div class="pr-item" data-id="${p.id_patient}">${esc(p.prenom)} ${esc(p.nom)} · ${esc(p.numero_dossier)}</div>`,
          )
          .join("");
      }
      box.classList.add("show");
    } catch (e) {}
  }, 220);
}

// Listener sur le conteneur (et non sur document) : la modale fait
// event.stopPropagation(), ce qui bloquerait une délégation au niveau document.
document.getElementById("patientResults").addEventListener("click", (e) => {
  const item = e.target.closest(".pr-item");
  if (item) selectPatient(parseInt(item.dataset.id, 10));
});

function toggleContactPicker() {
  const search = document.getElementById("c_patient_search");
  const show = search.style.display === "none";
  search.style.display = show ? "block" : "none";
  if (show) {
    search.value = "";
    search.focus();
  } else {
    document.getElementById("patientResults").classList.remove("show");
  }
}

function selectPatient(id) {
  const p = _lastPatients.find((x) => x.id_patient === id);
  if (!p) return;
  selectedPatientId = id;
  document.getElementById("c_nom").value = `${p.prenom || ""} ${p.nom || ""}`.trim();
  if (p.telephone_principal) document.getElementById("c_tel").value = p.telephone_principal;

  const search = document.getElementById("c_patient_search");
  search.value = "";
  search.style.display = "none";
  document.getElementById("patientResults").classList.remove("show");

  const sel = document.getElementById("patientSelected");
  sel.innerHTML = `<span>Lié à la fiche de <strong>${esc(p.prenom)} ${esc(p.nom)}</strong></span><button type="button" class="pr-clear" onclick="clearPatient()">retirer le lien</button>`;
  sel.style.display = "flex";
}
function clearPatient() {
  selectedPatientId = null;
  const sel = document.getElementById("patientSelected");
  sel.style.display = "none";
  sel.innerHTML = "";
}

/* ── Modale ── */
function resetCallForm(presetStatut) {
  ["c_nom", "c_tel", "c_motif", "c_notes", "c_patient_search", "c_rappel"].forEach((id) => (document.getElementById(id).value = ""));
  document.getElementById("c_dir").value = "entrant";
  document.getElementById("c_statut").value = presetStatut || "a_traiter";
  document.getElementById("c_urgent").checked = false;
  document.getElementById("callMsg").textContent = "";
  document.getElementById("patientResults").classList.remove("show");
  document.getElementById("c_patient_search").style.display = "none";
  clearPatient();
}

function openCallModal(presetStatut) {
  editingCallId = null;
  resetCallForm(typeof presetStatut === "string" ? presetStatut : undefined);
  document.getElementById("callModalTitle").textContent = "Ajouter un appel";
  document.getElementById("callSubmit").textContent = "Enregistrer l'appel";
  document.getElementById("callOverlay").classList.add("open");
  setTimeout(() => document.getElementById("c_nom").focus(), 50);
}

function openEditCall(id) {
  const c = _allCalls.find((x) => x.id_call === id);
  if (!c) return;
  editingCallId = id;
  resetCallForm();
  document.getElementById("c_nom").value = c.nom_appelant || "";
  document.getElementById("c_tel").value = c.telephone || "";
  document.getElementById("c_dir").value = c.direction || "entrant";
  document.getElementById("c_statut").value = c.statut || "a_traiter";
  document.getElementById("c_motif").value = c.motif || "";
  document.getElementById("c_notes").value = c.notes || "";
  document.getElementById("c_urgent").checked = !!c.is_urgent;
  document.getElementById("c_rappel").value = c.rappel_at ? String(c.rappel_at).slice(0, 10) : "";
  if (c.id_patient && c.patient_nom) {
    selectedPatientId = c.id_patient;
    const sel = document.getElementById("patientSelected");
    sel.innerHTML = `<span>Lié à la fiche de <strong>${esc(c.patient_prenom || "")} ${esc(c.patient_nom)}</strong></span><button type="button" class="pr-clear" onclick="clearPatient()">retirer le lien</button>`;
    sel.style.display = "flex";
  }
  document.getElementById("callModalTitle").textContent = "Modifier l'appel";
  document.getElementById("callSubmit").textContent = "Enregistrer les modifications";
  document.getElementById("callOverlay").classList.add("open");
}

function closeCallModal() {
  document.getElementById("callOverlay").classList.remove("open");
}

async function submitCall() {
  const nom = val("c_nom").trim();
  const motif = val("c_motif").trim();
  const msg = document.getElementById("callMsg");
  if (!nom || !motif) {
    msg.textContent = "L'appelant et le motif sont obligatoires.";
    msg.className = "form-msg err";
    return;
  }
  const rappel = val("c_rappel");
  const body = {
    nom_appelant: nom,
    telephone: val("c_tel"),
    direction: val("c_dir"),
    motif: motif,
    notes: val("c_notes"),
    statut: val("c_statut"),
    is_urgent: document.getElementById("c_urgent").checked,
    id_patient: selectedPatientId,
    rappel_at: rappel || null,
  };
  const editing = editingCallId !== null;
  const btn = document.getElementById("callSubmit");
  btn.disabled = true;
  btn.textContent = "Enregistrement…";
  try {
    const res = await fetch(editing ? `/api/calls/${editingCallId}` : "/api/calls", {
      method: editing ? "PUT" : "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      msg.textContent = d.detail || "Erreur lors de l'enregistrement.";
      msg.className = "form-msg err";
      return;
    }
    closeCallModal();
    loadCalls();
    loadStats();
  } catch (e) {
    msg.textContent = "Erreur serveur. Réessayez.";
    msg.className = "form-msg err";
  } finally {
    btn.disabled = false;
    btn.textContent = editing ? "Enregistrer les modifications" : "Enregistrer l'appel";
  }
}

async function quickTraiter(event, id) {
  event.stopPropagation();
  try {
    const res = await fetch(`/api/calls/${id}`, {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ statut: "traite" }),
    });
    if (res.ok) {
      loadCalls();
      loadStats();
    }
  } catch (e) {}
}

loadStats();
loadCalls();
