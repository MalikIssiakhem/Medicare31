staffGuard();
initUserNav();
function toggleTask(cb) {
  cb.classList.toggle("checked");
  const label = cb.parentElement.querySelector(".task-label");
  label.classList.toggle("done");
}

function addTask() {
  const label = prompt("Nouvelle tâche du secrétariat :");
  if (!label || !label.trim()) return;

  const taskCard = document.querySelector(".card:last-child");
  const footer = taskCard.querySelector(".card-footer");

  const item = document.createElement("div");
  item.className = "task-item";
  item.innerHTML = `
      <div class="task-cb" onclick="toggleTask(this)">
        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <span class="task-label"></span>
    `;
  item.querySelector(".task-label").textContent = label.trim();
  taskCard.insertBefore(item, footer);
}

function newAppointment() {
  alert("Action : ouvrir le formulaire de création de rendez-vous.");
}

function newPatient() {
  alert("Action : ouvrir le formulaire de création de patient.");
}

function checkInPatient() {
  alert("Action : enregistrer l’arrivée du patient.");
}

document.querySelectorAll(".nav-links a, .side-nav a").forEach((a) => {
  a.addEventListener("click", () => {
    const group = a.closest("ul");
    group.querySelectorAll("li").forEach((li) => li.classList.remove("active"));
    group.querySelectorAll("a").forEach((x) => x.classList.remove("active"));
    if (a.closest("li")) a.closest("li").classList.add("active");
    a.classList.add("active");
  });
});

/* ── Appels & messages (données réelles) ── */
function _authH() {
  return { Authorization: `Bearer ${getToken()}` };
}
function _esc(v) {
  return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function _ago(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "à l'instant";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  if (s < 172800) return "hier";
  return d.toLocaleDateString("fr-FR");
}

const _PHONE =
  '<path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3 5.18 2 2 0 0 1 5 3h3a2 2 0 0 1 2 1.72c.12.89.32 1.76.59 2.59a2 2 0 0 1-.45 2.11L9 10.5a16 16 0 0 0 4.5 4.5l1.08-1.08a2 2 0 0 1 2.11-.45c.83.27 1.7.47 2.59.59A2 2 0 0 1 22 16.92z"/>';
const _CHECK = '<polyline points="20 6 9 17 4 12"/>';
const _ENV =
  '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>';

async function loadCallStat() {
  try {
    const r = await fetch("/api/calls/stats", { headers: _authH() });
    if (!r.ok) return;
    const s = await r.json();
    const el = document.getElementById("statAppelsATraiter");
    if (el) el.textContent = s.a_traiter;
  } catch (e) {}
}

async function loadFeed() {
  const list = document.getElementById("feedList");
  if (!list) return;
  const myEmail = (getUser().email || "").toLowerCase();
  try {
    const [cr, mr] = await Promise.all([
      fetch("/api/calls?limit=10", { headers: _authH() }),
      fetch("/api/messages/conversations?archived=false", { headers: _authH() }),
    ]);
    const calls = cr.ok ? await cr.json() : [];
    const convs = mr.ok ? await mr.json() : [];

    const items = [];
    calls.forEach((c) =>
      items.push({
        kind: "call",
        time: c.created_at,
        name: c.nom_appelant,
        subject: c.motif,
        urgent: c.is_urgent && c.statut !== "traite",
        done: c.statut === "traite",
        href: "appels.html",
      }),
    );
    convs.forEach((cv) => {
      const other = (cv.participants || []).find((p) => (p.email || "").toLowerCase() !== myEmail);
      items.push({
        kind: "message",
        time: cv.last_message_at || cv.updated_at || cv.created_at,
        name: other ? `${other.prenom || ""} ${other.nom || ""}`.trim() : cv.sujet || "Conversation",
        subject: cv.last_message || cv.sujet || "",
        unread: (cv.unread_count || 0) > 0,
        href: "messagerie.html",
      });
    });

    items.sort((a, b) => new Date(b.time) - new Date(a.time));
    const top = items.slice(0, 5);

    if (!top.length) {
      list.innerHTML = `<div class="msg-row"><div class="msg-body"><span class="msg-subject" style="color: var(--text-light)">Aucun appel ni message récent.</span></div></div>`;
      return;
    }

    list.innerHTML = top
      .map((it) => {
        let iconClass = "";
        let icon = _ENV;
        if (it.kind === "call") {
          icon = it.done ? _CHECK : _PHONE;
          iconClass = it.done ? "done" : it.urgent ? "urgent" : "";
        }
        let subj = it.subject || "";
        if (subj.length > 42) subj = subj.slice(0, 42) + "…";
        const badge = it.unread ? ' <span class="badge badge-blue">Non lu</span>' : "";
        return `<div class="msg-row" style="cursor: pointer" onclick="window.location.href='${it.href}'">
          <div class="msg-icon ${iconClass}"><svg viewBox="0 0 24 24">${icon}</svg></div>
          <div class="msg-body">
            <span class="msg-name">${_esc(it.name)}${badge}</span><span class="msg-subject">${_esc(subj)}</span>
          </div>
          <div class="msg-time">${_ago(it.time)}</div>
        </div>`;
      })
      .join("");
  } catch (e) {
    list.innerHTML = `<div class="msg-row"><div class="msg-body"><span class="msg-subject" style="color: var(--text-light)">Données indisponibles.</span></div></div>`;
  }
}

loadCallStat();
loadFeed();
