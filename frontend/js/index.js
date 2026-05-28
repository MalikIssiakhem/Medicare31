staffGuard();
initUserNav();

function toggleTask(cb) {
  cb.classList.toggle("checked");

  const label = cb.parentElement.querySelector(".task-label");
  if (label) {
    label.classList.toggle("done");
  }
}

function addTask() {
  const label = prompt("Nouvelle tâche :");
  if (!label || !label.trim()) return;

  const taskCard = document.querySelector(".card:last-child");
  if (!taskCard) return;

  const footer = taskCard.querySelector(".task-footer");

  const item = document.createElement("div");
  item.className = "task-item";
  item.innerHTML = `
    <div class="task-cb" onclick="toggleTask(this)">
      <svg viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <span class="task-label">${escapeHtml(label.trim())}</span>
  `;

  if (footer) {
    taskCard.insertBefore(item, footer);
  } else {
    taskCard.appendChild(item);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/*
  Important:
  Do NOT use e.preventDefault() here.
  The sidebar/navbar links need to redirect to:
  calendrier.html, patients.html, messagerie.html, etc.
*/
const APPT_BADGE = {
  en_attente: ["badge-gold", "En attente"],
  "confirmé": ["badge-green", "Confirmé"],
  "annulé": ["badge-grey", "Annulé"],
  "terminé": ["badge-grey", "Terminé"],
};

function fmtApptTime(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return time;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) + " · " + time;
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Hier";
  return `Il y a ${days} jours`;
}

function emptyState(msg) {
  return `<div style="padding:20px 0;color:var(--text-light,#94a3b8);font-size:.88rem;text-align:center">${msg}</div>`;
}

async function loadUpcomingAppointments() {
  const el = document.getElementById("apptList");
  const res = await fetch("/api/appointments/upcoming?limit=5", {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) { el.innerHTML = emptyState("Impossible de charger les rendez-vous"); return; }
  const appts = await res.json();
  if (appts.length === 0) { el.innerHTML = emptyState("Aucun rendez-vous à venir"); return; }
  el.innerHTML = appts.map((a) => {
    const [badgeClass, badgeLabel] = APPT_BADGE[a.statut] || ["badge-grey", a.statut];
    return `
      <div class="appt-row">
        <span class="appt-time">${fmtApptTime(a.start_at)}</span>
        <div style="flex:1">
          <span class="appt-name">${escapeHtml(a.patient_prenom)} ${escapeHtml(a.patient_nom)}</span>
          ${a.type_libelle ? `<span class="appt-type">${escapeHtml(a.type_libelle)}</span>` : ""}
        </div>
        <span class="badge ${badgeClass}">${badgeLabel}</span>
      </div>`;
  }).join("");
}

async function loadRecentMessages() {
  const el = document.getElementById("msgList");
  const res = await fetch("/api/messages/conversations", {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) { el.innerHTML = emptyState("Impossible de charger les messages"); return; }
  const threads = await res.json();
  const recent = threads.slice(0, 3);
  if (recent.length === 0) { el.innerHTML = emptyState("Aucun message"); return; }
  el.innerHTML = recent.map((t) => {
    const isUnread = t.unread_count > 0;
    const preview = t.last_message ? escapeHtml(t.last_message).slice(0, 60) + (t.last_message.length > 60 ? "…" : "") : "";
    return `
      <div class="msg-row">
        <div class="msg-icon ${isUnread ? "unread" : "read"}">
          <svg viewBox="0 0 24 24">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <div class="msg-body">
          <span class="msg-name">${escapeHtml(t.sujet || "(sans sujet)")}</span>
          <span class="msg-subject">${preview}</span>
        </div>
        <div class="msg-time${isUnread ? " bold" : ""}">${timeAgo(t.last_message_at)}</div>
      </div>`;
  }).join("");
}

loadUpcomingAppointments();
loadRecentMessages();

document.querySelectorAll(".nav-links a, .side-nav a").forEach((a) => {
  a.addEventListener("click", () => {
    const href = a.getAttribute("href");

    if (!href || href === "#") {
      return;
    }

    const group = a.closest("ul");
    if (!group) return;

    group.querySelectorAll("li").forEach((li) => li.classList.remove("active"));
    group.querySelectorAll("a").forEach((link) => link.classList.remove("active"));

    const li = a.closest("li");
    if (li) li.classList.add("active");

    a.classList.add("active");
  });
});