authGuard();
initUserNav();
/* Nav / sidebar active state */
document.querySelectorAll(".nav-links a, .side-nav a").forEach((a) => {
  a.addEventListener("click", () => {
    const ul = a.closest("ul");
    ul.querySelectorAll("li").forEach((li) => li.classList.remove("active"));
    ul.querySelectorAll("a").forEach((x) => x.classList.remove("active"));
    if (a.closest("li")) a.closest("li").classList.add("active");
    a.classList.add("active");
  });
});

/* Quick access toggle */
document.querySelectorAll(".quick-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".quick-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

/* ── Card "Prochain rendez-vous" ── */
const _MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
const _DAYS_FR = [
  "Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi",
];

async function loadNextAppointment() {
  const content = document.getElementById("rdvContent");
  const empty = document.getElementById("rdvEmpty");
  const btn = document.getElementById("rdvBtn");
  if (!content) return;

  try {
    const res = await fetch("/api/appointments/upcoming?limit=1", {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error("appointments");
    const appts = await res.json();

    if (!appts.length) {
      content.style.display = "none";
      empty.style.display = "block";
      if (btn) btn.textContent = "Prendre un rendez-vous";
      return;
    }

    const a = appts[0];
    const d = new Date(a.start_at);

    document.getElementById("rdvDate").textContent =
      `${_DAYS_FR[d.getDay()]} ${d.getDate()} ${_MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
    document.getElementById("rdvTime").textContent =
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    document.getElementById("rdvType").textContent = a.type_libelle || "Consultation";
    document.getElementById("rdvDoctor").innerHTML =
      `<strong>Dr. ${a.staff_prenom || ""} ${a.staff_nom || ""}</strong>`;

    const status = document.getElementById("rdvStatus");
    const confirmed = a.statut === "confirmé";
    status.textContent = confirmed ? "Confirmé" : "En attente de confirmation";
    status.className = "rdv-status " + (confirmed ? "confirmed" : "pending");
    status.style.display = "inline-block";
  } catch (e) {
    document.getElementById("rdvDate").textContent = "Indisponible";
    document.getElementById("rdvTime").textContent = "";
  }
}

loadNextAppointment();

/* ── Card "Historique médical" ── */
function _escapeIdx(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function _fmtDateShort(value) {
  const d = new Date(value);
  if (isNaN(d)) return "";
  return `${d.getDate()} ${_MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

async function loadMedicalHistory() {
  const list = document.getElementById("consultList");
  const last = document.getElementById("lastConsult");
  if (!list || !last) return;

  try {
    const res = await fetch("/api/medical/history?limit=3", {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error("history");
    const events = await res.json();

    if (!events.length) {
      last.textContent = "Aucun antécédent enregistré pour le moment.";
      list.innerHTML = "";
      return;
    }

    last.innerHTML = `Dernière consultation : <strong>${_fmtDateShort(events[0].event_date)}</strong>`;

    list.innerHTML = events
      .map((e) => {
        const initials =
          (((e.staff_prenom || "")[0] || "") + ((e.staff_nom || "")[0] || "")).toUpperCase() || "MC";
        const doctor =
          e.staff_prenom || e.staff_nom
            ? `Dr. ${e.staff_prenom || ""} ${e.staff_nom || ""}`.trim()
            : "Cabinet MediCare31";
        return `<div class="consult-row">
          <div class="consult-avatar">${_escapeIdx(initials)}</div>
          <div class="consult-info">
            <div class="consult-title">${_escapeIdx(e.titre || "Consultation")}</div>
            <div class="consult-doctor">${_escapeIdx(doctor)} · ${_fmtDateShort(e.event_date)}</div>
          </div>
          <svg class="consult-chev" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>`;
      })
      .join("");
  } catch (e) {
    last.textContent = "Historique indisponible.";
    list.innerHTML = "";
  }
}

loadMedicalHistory();

/* ── Card "Mes Documents" (aperçu) ── */
async function loadRecentDocuments() {
  const list = document.getElementById("dashDocList");
  if (!list) return;

  try {
    const res = await fetch("/api/documents/?limit=3", {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error("documents");
    const docs = await res.json();

    if (!docs.length) {
      list.innerHTML =
        `<div class="doc-row"><span class="doc-name" style="color: var(--text-light); font-weight: 400">Aucun document pour le moment.</span></div>`;
      return;
    }

    list.innerHTML = docs
      .map((d) => {
        const date = d.document_date || d.created_at;
        return `<div class="doc-row" onclick="window.location.href='mes-documents.html'">
          <div class="doc-icon">
            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <span class="doc-name">${_escapeIdx(d.titre || "Document")}</span>
          <span class="doc-date">${date ? _fmtDateShort(date) : ""}</span>
        </div>`;
      })
      .join("");
  } catch (e) {
    list.innerHTML =
      `<div class="doc-row"><span class="doc-name" style="color: var(--text-light); font-weight: 400">Documents indisponibles.</span></div>`;
  }
}

loadRecentDocuments();

/* ── Card "Messages" (aperçu) ── */
async function loadRecentMessages() {
  const list = document.getElementById("msgList");
  if (!list) return;
  const myEmail = (getUser().email || "").toLowerCase();

  try {
    const res = await fetch("/api/messages/conversations?archived=false", {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error("messages");
    const convs = await res.json();

    if (!convs.length) {
      list.innerHTML =
        `<div class="msg-row"><span class="msg-text" style="color: var(--text-light)">Aucun message pour le moment.</span></div>`;
      return;
    }

    list.innerHTML = convs
      .slice(0, 3)
      .map((c) => {
        const others = (c.participants || []).filter(
          (p) => (p.email || "").toLowerCase() !== myEmail,
        );
        const other = others[0];
        const prefix = other && other.role === "medecin" ? "Dr. " : "";
        const sender = other
          ? `${prefix}${other.prenom || ""} ${other.nom || ""}`.trim()
          : c.sujet || "Conversation";
        const initials = other
          ? `${(other.prenom || "")[0] || ""}${(other.nom || "")[0] || ""}`.toUpperCase()
          : "MC";
        const unread = (c.unread_count || 0) > 0;
        const date = c.last_message_at ? _fmtDateShort(c.last_message_at) : "";
        let text = c.last_message || c.sujet || "";
        if (text.length > 70) text = text.slice(0, 70) + "…";

        return `<div class="msg-row" onclick="window.location.href='messagerie.html'">
          <div class="msg-avatar">${_escapeIdx(initials || "MC")}</div>
          <div class="msg-body">
            <div class="msg-top">
              <span class="msg-sender">${_escapeIdx(sender)}</span>
              ${unread ? '<span class="badge-unread">Non lu</span>' : ""}
              ${date ? `<span class="msg-date">${date}</span>` : ""}
            </div>
            <div class="msg-text">${_escapeIdx(text) || "&nbsp;"}</div>
          </div>
        </div>`;
      })
      .join("");
  } catch (e) {
    list.innerHTML =
      `<div class="msg-row"><span class="msg-text" style="color: var(--text-light)">Messages indisponibles.</span></div>`;
  }
}

loadRecentMessages();

/* ── Card "Infos Santé" ── */
async function loadHealthInfo() {
  const el = document.getElementById("healthInfo");
  if (!el) return;
  const NR = '<span class="health-value" style="color: var(--text-light); font-weight: 400">Non renseigné</span>';

  try {
    const [vRes, pRes] = await Promise.all([
      fetch("/api/medical/vitals", { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch("/api/profile", { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    const v = vRes.ok ? await vRes.json() : {};
    const p = pRes.ok ? await pRes.json() : {};

    const rows = [
      {
        icon: '<line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
        label: "Taille",
        value: v.taille_cm ? `${(v.taille_cm / 100).toFixed(2).replace(".", ",")} m` : null,
      },
      {
        icon: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>',
        label: "Poids",
        value: v.poids_kg ? `${v.poids_kg} kg` : null,
      },
      {
        icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
        label: "Tension",
        value: v.tension_arterielle ? `${v.tension_arterielle} mmHg` : null,
      },
      {
        icon: '<path d="M12 2s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
        label: "Groupe sanguin",
        value: p.groupe_sanguin || null,
      },
    ];

    el.innerHTML = rows
      .map(
        (r) => `<div class="health-row">
          <div class="health-icon"><svg viewBox="0 0 24 24">${r.icon}</svg></div>
          <span class="health-label">${r.label}</span>
          ${r.value ? `<span class="health-value">${_escapeIdx(r.value)}</span>` : NR}
        </div>`,
      )
      .join("");
  } catch (e) {
    el.innerHTML =
      `<div class="health-row"><span class="health-value" style="color: var(--text-light); font-weight: 400">Infos indisponibles.</span></div>`;
  }
}

loadHealthInfo();

/* ── Photo de profil dans la card "Prochain rendez-vous" ── */
async function loadProfilePhoto() {
  const box = document.querySelector(".rdv-photo");
  if (!box) return;
  try {
    const pRes = await fetch("/api/profile", { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!pRes.ok) return;
    const p = await pRes.json();
    if (!p.has_photo) return; // pas de photo -> on garde le dessin par défaut
    const res = await fetch("/api/profile/photo", { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) return;
    const url = URL.createObjectURL(await res.blob());
    box.innerHTML = `<img src="${url}" alt="Photo de profil">`;
  } catch (e) {
    /* on garde le dessin par défaut */
  }
}

loadProfilePhoto();
