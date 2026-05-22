authGuard();
// ═══════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════
const DAYS_FR = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];
const DAYS_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

const DOCTORS = [
  { name: "Dr. Jean Martin", color: "#3b82f6", cls: "blue" },
  { name: "Dr. Sophie Blanc", color: "#10b981", cls: "green" },
  { name: "Dr. Ahmed Karim", color: "#8b5cf6", cls: "purple" },
  { name: "Dr. Marie Leclerc", color: "#f59e0b", cls: "orange" },
];

let appointments = [
  {
    id: 1,
    patient: "Sophie Durand",
    doctor: "Dr. Jean Martin",
    type: "Consultation générale",
    date: "2025-06-02",
    start: "09:00",
    end: "09:30",
    color: "blue",
    status: "En attente",
    notes: "",
  },
  {
    id: 2,
    patient: "Alain Robert",
    doctor: "Dr. Jean Martin",
    type: "Contrôle annuel",
    date: "2025-06-02",
    start: "09:30",
    end: "10:00",
    color: "blue",
    status: "Confirmé",
    notes: "",
  },
  {
    id: 3,
    patient: "Julie Lefèvre",
    doctor: "Dr. Sophie Blanc",
    type: "Suivi cholestérol",
    date: "2025-06-02",
    start: "10:15",
    end: "11:00",
    color: "green",
    status: "Confirmé",
    notes: "Patient à jeun",
  },
  {
    id: 4,
    patient: "Marc Dupont",
    doctor: "Dr. Ahmed Karim",
    type: "Urgence",
    date: "2025-06-03",
    start: "08:00",
    end: "08:30",
    color: "red",
    status: "Confirmé",
    notes: "Douleurs thoraciques",
  },
  {
    id: 5,
    patient: "Claire Martin",
    doctor: "Dr. Marie Leclerc",
    type: "Téléconsultation",
    date: "2025-06-03",
    start: "14:00",
    end: "14:30",
    color: "orange",
    status: "Confirmé",
    notes: "",
  },
  {
    id: 6,
    patient: "Paul Lefebvre",
    doctor: "Dr. Jean Martin",
    type: "Suivi diabète",
    date: "2025-06-04",
    start: "11:00",
    end: "11:45",
    color: "blue",
    status: "Confirmé",
    notes: "Apporter carnet glycémie",
  },
  {
    id: 7,
    patient: "Thomas Lambert",
    doctor: "Dr. Sophie Blanc",
    type: "Renouvellement ordonnance",
    date: "2025-06-05",
    start: "15:30",
    end: "16:00",
    color: "teal",
    status: "Confirmé",
    notes: "",
  },
  {
    id: 8,
    patient: "Laura Moreau",
    doctor: "Dr. Ahmed Karim",
    type: "Consultation générale",
    date: "2025-06-06",
    start: "09:00",
    end: "09:30",
    color: "purple",
    status: "En attente",
    notes: "",
  },
];
let nextId = 9;

let currentView = "week";
let currentDate = new Date(2025, 5, 2); // June 2, 2025
let miniDate = new Date(2025, 5, 1);
let editingId = null;
let selectedStatus = "Confirmé";
let selectedColor = "blue";
let visibleDoctors = new Set(DOCTORS.map((d) => d.name));

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
function init() {
  renderDoctorList();
  renderMiniCal();
  renderView();
  updateCurrentTimeLine();
  setInterval(updateCurrentTimeLine, 60000);
}

// ═══════════════════════════════════════════════
// DOCTOR LIST
// ═══════════════════════════════════════════════
function renderDoctorList() {
  const el = document.getElementById("doctorList");
  el.innerHTML = DOCTORS.map(
    (d) => `
          <div class="doctor-item checked" style="--color:${d.color}" onclick="toggleDoctor(this,'${d.name}')">
            <div class="doctor-dot" style="background:${d.color}"></div>
            <span class="doctor-name">${d.name}</span>
            <div class="doctor-cb"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
          </div>`,
  ).join("");
}

function toggleDoctor(el, name) {
  el.classList.toggle("checked");
  if (visibleDoctors.has(name)) visibleDoctors.delete(name);
  else visibleDoctors.add(name);
  renderView();
}

// ═══════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════
function navigate(dir) {
  if (currentView === "week") currentDate = addDays(currentDate, dir * 7);
  else if (currentView === "month")
    currentDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + dir,
      1,
    );
  else currentDate = addDays(currentDate, dir);
  renderView();
}

function goToday() {
  currentDate = new Date();
  renderView();
}

function setView(v) {
  currentView = v;
  ["vDay", "vWeek", "vMonth"].forEach((id) =>
    document.getElementById(id).classList.remove("active"),
  );
  document
    .getElementById("v" + v.charAt(0).toUpperCase() + v.slice(1))
    .classList.add("active");
  document.getElementById("weekView").classList.remove("active");
  document.getElementById("monthView").classList.remove("active");
  document.getElementById("dayView").classList.remove("active");
  if (v === "week") document.getElementById("weekView").classList.add("active");
  else if (v === "month")
    document.getElementById("monthView").classList.add("active");
  else document.getElementById("dayView").classList.add("active");
  renderView();
}

// ═══════════════════════════════════════════════
// RENDER DISPATCHER
// ═══════════════════════════════════════════════
function renderView() {
  if (currentView === "week") renderWeek();
  else if (currentView === "month") renderMonth();
  else renderDay();
  renderMiniCal();
}

// ═══════════════════════════════════════════════
// WEEK VIEW
// ═══════════════════════════════════════════════
function renderWeek() {
  const monday = getMonday(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Label
  const endDay = days[6];
  document.getElementById("currentPeriod").textContent =
    `${days[0].getDate()} – ${endDay.getDate()} ${MONTHS_FR[endDay.getMonth()]} ${endDay.getFullYear()}`;

  // Header
  const header = document.getElementById("weekHeader");
  header.innerHTML =
    '<div class="week-header-gutter"></div>' +
    days
      .map((d) => {
        const isToday = d.getTime() === today.getTime();
        return `<div class="week-header-day">
              <div class="week-day-name">${DAYS_SHORT[((d.getDay() + 6) % 7) + 1 > 6 ? 0 : (d.getDay() + 6) % 7]}</div>
              <div class="week-day-num${isToday ? " today" : ""}">${d.getDate()}</div>
            </div>`;
      })
      .join("");

  // Body
  const body = document.getElementById("weekBody");
  body.innerHTML = "";

  // Time gutter
  const gutter = document.createElement("div");
  gutter.className = "time-gutter";
  for (let h = 7; h <= 20; h++) {
    const slot = document.createElement("div");
    slot.className = "time-slot-label";
    slot.textContent = `${String(h).padStart(2, "0")}:00`;
    gutter.appendChild(slot);
  }
  body.appendChild(gutter);

  // Day columns
  days.forEach((d) => {
    const isToday = d.getTime() === today.getTime();
    const col = document.createElement("div");
    col.className = "day-col" + (isToday ? " today-col" : "");
    col.dataset.date = fmtDate(d);

    for (let h = 7; h <= 20; h++) {
      const cell = document.createElement("div");
      cell.className = "hour-cell";
      col.appendChild(cell);
    }

    // Add time line
    if (isToday) {
      const now = new Date();
      const mins = (now.getHours() - 7) * 60 + now.getMinutes();
      if (mins >= 0 && mins <= 14 * 60) {
        const tl = document.createElement("div");
        tl.className = "time-line";
        tl.id = "timeLine";
        tl.style.top = mins + "px";
        col.appendChild(tl);
      }
    }

    // Appointments
    const dayAppts = appointments.filter(
      (a) => a.date === fmtDate(d) && visibleDoctors.has(a.doctor),
    );
    dayAppts.forEach((a) => {
      col.appendChild(buildApptEl(a));
    });

    // Click to add
    col.addEventListener("click", (e) => {
      if (e.target.closest(".appt")) return;
      const rect = col.getBoundingClientRect();
      const y = e.clientY - rect.top + col.scrollTop;
      const hour = Math.floor(y / 60) + 7;
      const mins = Math.floor((y % 60) / 15) * 15;
      openModal(
        fmtDate(d),
        `${String(hour).padStart(2, "0")}:${String(mins).padStart(2, "0")}`,
      );
    });

    body.appendChild(col);
  });
}

// ═══════════════════════════════════════════════
// DAY VIEW
// ═══════════════════════════════════════════════
function renderDay() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = currentDate.getTime() === today.getTime();
  document.getElementById("currentPeriod").textContent =
    `${DAYS_FR[currentDate.getDay()]} ${currentDate.getDate()} ${MONTHS_FR[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  const header = document.getElementById("dayHeader");
  header.style.gridTemplateColumns = "60px 1fr";
  header.innerHTML = `<div class="week-header-gutter"></div>
          <div class="week-header-day">
            <div class="week-day-name">${DAYS_SHORT[currentDate.getDay()]}</div>
            <div class="week-day-num${isToday ? " today" : ""}">${currentDate.getDate()}</div>
          </div>`;

  const body = document.getElementById("dayBody");
  body.style.gridTemplateColumns = "60px 1fr";
  body.innerHTML = "";
  const gutter = document.createElement("div");
  gutter.className = "time-gutter";
  for (let h = 7; h <= 20; h++) {
    const s = document.createElement("div");
    s.className = "time-slot-label";
    s.textContent = `${String(h).padStart(2, "0")}:00`;
    gutter.appendChild(s);
  }
  body.appendChild(gutter);

  const col = document.createElement("div");
  col.className = "day-col" + (isToday ? " today-col" : "");
  col.dataset.date = fmtDate(currentDate);
  for (let h = 7; h <= 20; h++) {
    const c = document.createElement("div");
    c.className = "hour-cell";
    col.appendChild(c);
  }
  if (isToday) {
    const now = new Date();
    const mins = (now.getHours() - 7) * 60 + now.getMinutes();
    if (mins >= 0 && mins <= 14 * 60) {
      const tl = document.createElement("div");
      tl.className = "time-line";
      tl.style.top = mins + "px";
      col.appendChild(tl);
    }
  }
  appointments
    .filter(
      (a) => a.date === fmtDate(currentDate) && visibleDoctors.has(a.doctor),
    )
    .forEach((a) => col.appendChild(buildApptEl(a)));
  col.addEventListener("click", (e) => {
    if (e.target.closest(".appt")) return;
    const rect = col.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hour = Math.floor(y / 60) + 7;
    const mins = Math.floor((y % 60) / 15) * 15;
    openModal(
      fmtDate(currentDate),
      `${String(hour).padStart(2, "0")}:${String(mins).padStart(2, "0")}`,
    );
  });
  body.appendChild(col);
}

// ═══════════════════════════════════════════════
// MONTH VIEW
// ═══════════════════════════════════════════════
function renderMonth() {
  document.getElementById("currentPeriod").textContent =
    `${MONTHS_FR[currentDate.getMonth()].charAt(0).toUpperCase() + MONTHS_FR[currentDate.getMonth()].slice(1)} ${currentDate.getFullYear()}`;

  const grid = document.getElementById("monthGrid");
  grid.innerHTML = "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const last = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  );

  // start from Monday
  let start = new Date(first);
  const dow = (first.getDay() + 6) % 7; // Mon=0
  start.setDate(start.getDate() - dow);

  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i);
    const cell = document.createElement("div");
    const isOther = d.getMonth() !== currentDate.getMonth();
    const isToday = d.getTime() === today.getTime();
    cell.className =
      "month-cell" +
      (isOther ? " other-month" : "") +
      (isToday ? " today" : "");

    const dateEl = document.createElement("div");
    dateEl.className = "month-date";
    dateEl.textContent = d.getDate();
    cell.appendChild(dateEl);

    const dayAppts = appointments.filter(
      (a) => a.date === fmtDate(d) && visibleDoctors.has(a.doctor),
    );
    dayAppts.slice(0, 3).forEach((a) => {
      const el = document.createElement("div");
      el.className = `month-appt appt ${a.color}`;
      el.textContent = `${a.start} ${a.patient}`;
      el.onclick = (e) => {
        e.stopPropagation();
        showDetail(a, e);
      };
      cell.appendChild(el);
    });
    if (dayAppts.length > 3) {
      const more = document.createElement("div");
      more.className = "month-more";
      more.textContent = `+${dayAppts.length - 3} autres`;
      cell.appendChild(more);
    }

    cell.addEventListener("click", () => openModal(fmtDate(d)));
    grid.appendChild(cell);
  }
}

// ═══════════════════════════════════════════════
// BUILD APPOINTMENT ELEMENT
// ═══════════════════════════════════════════════
function buildApptEl(a) {
  const el = document.createElement("div");
  el.className = `appt ${a.color}`;
  const startMins = timeToMins(a.start) - 7 * 60;
  const endMins = timeToMins(a.end) - 7 * 60;
  el.style.top = startMins + "px";
  el.style.height = Math.max(endMins - startMins, 20) + "px";
  el.innerHTML = `<div class="appt-title">${a.patient}</div><div class="appt-sub">${a.start} · ${a.type}</div>`;
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    showDetail(a, e);
  });
  return el;
}

// ═══════════════════════════════════════════════
// MINI CALENDAR
// ═══════════════════════════════════════════════
function renderMiniCal() {
  const y = miniDate.getFullYear(),
    m = miniDate.getMonth();
  document.getElementById("miniMonth").textContent = `${MONTHS_FR[m]} ${y}`;
  const grid = document.getElementById("miniGrid");
  grid.innerHTML = ["L", "M", "M", "J", "V", "S", "D"]
    .map((d) => `<div class="mini-day-label">${d}</div>`)
    .join("");

  const first = new Date(y, m, 1);
  const start = new Date(first);
  start.setDate(start.getDate() - ((first.getDay() + 6) % 7));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sel = new Date(currentDate);
  sel.setHours(0, 0, 0, 0);

  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i);
    const hasAppt = appointments.some((a) => a.date === fmtDate(d));
    const isToday = d.getTime() === today.getTime();
    const isSel = d.getTime() === sel.getTime();
    const isOther = d.getMonth() !== m;
    const el = document.createElement("div");
    el.className =
      "mini-day" +
      (isOther ? " other-month" : "") +
      (isToday ? " today" : "") +
      (isSel && !isToday ? " selected" : "") +
      (hasAppt ? " has-appt" : "");
    el.textContent = d.getDate();
    el.onclick = () => {
      currentDate = new Date(d);
      renderView();
    };
    grid.appendChild(el);
  }
}

function miniNav(dir) {
  miniDate = new Date(miniDate.getFullYear(), miniDate.getMonth() + dir, 1);
  renderMiniCal();
}

// ═══════════════════════════════════════════════
// TIME LINE
// ═══════════════════════════════════════════════
function updateCurrentTimeLine() {
  const el = document.getElementById("timeLine");
  if (!el) return;
  const now = new Date();
  const mins = (now.getHours() - 7) * 60 + now.getMinutes();
  el.style.top = mins + "px";
}

// ═══════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════
function openModal(date, startTime) {
  editingId = null;
  selectedStatus = "Confirmé";
  selectedColor = "blue";
  document.getElementById("modalTitleText").textContent = "Nouveau rendez-vous";
  document.getElementById("btnDelete").style.display = "none";

  // Reset form
  document.getElementById("mPatient").value = "";
  document.getElementById("mDoctor").value = "";
  document.getElementById("mType").value = "";
  document.getElementById("mRoom").value = "";
  document.getElementById("mNotes").value = "";
  document.getElementById("mDate").value = date || fmtDate(currentDate);
  document.getElementById("mStart").value = startTime || "09:00";
  document.getElementById("mEnd").value = startTime
    ? addMins(startTime, 30)
    : "09:30";

  document.querySelectorAll(".status-opt").forEach((o) => {
    o.classList.toggle("sel", o.textContent === "Confirmé");
  });
  document.querySelectorAll(".color-dot").forEach((d) => {
    d.classList.toggle("selected", d.dataset.color === "blue");
  });

  closeDetail();
  document.getElementById("modalOverlay").classList.add("open");
}

function openEditModal(a) {
  editingId = a.id;
  selectedStatus = a.status;
  selectedColor = a.color;
  document.getElementById("modalTitleText").textContent =
    "Modifier le rendez-vous";
  document.getElementById("btnDelete").style.display = "flex";

  document.getElementById("mPatient").value = a.patient;
  document.getElementById("mDoctor").value = a.doctor;
  document.getElementById("mType").value = a.type;
  document.getElementById("mRoom").value = a.room || "";
  document.getElementById("mNotes").value = a.notes;
  document.getElementById("mDate").value = a.date;
  document.getElementById("mStart").value = a.start;
  document.getElementById("mEnd").value = a.end;

  document.querySelectorAll(".status-opt").forEach((o) => {
    o.classList.toggle("sel", o.textContent === a.status);
  });
  document.querySelectorAll(".color-dot").forEach((d) => {
    d.classList.toggle("selected", d.dataset.color === a.color);
  });

  closeDetail();
  document.getElementById("modalOverlay").classList.add("open");
}

function closeModal(e) {
  if (e.target === document.getElementById("modalOverlay")) closeModalBtn();
}
function closeModalBtn() {
  document.getElementById("modalOverlay").classList.remove("open");
  editingId = null;
}

function selectStatus(el, val) {
  document
    .querySelectorAll(".status-opt")
    .forEach((o) => o.classList.remove("sel"));
  el.classList.add("sel");
  selectedStatus = val;
}

function pickColor(el) {
  document
    .querySelectorAll(".color-dot")
    .forEach((d) => d.classList.remove("selected"));
  el.classList.add("selected");
  selectedColor = el.dataset.color;
}

function saveAppt() {
  const patient = document.getElementById("mPatient").value.trim();
  const doctor = document.getElementById("mDoctor").value;
  const type = document.getElementById("mType").value;
  const date = document.getElementById("mDate").value;
  const start = document.getElementById("mStart").value;
  const end = document.getElementById("mEnd").value;
  if (!patient || !doctor || !type || !date || !start || !end) {
    showToast("Veuillez remplir les champs obligatoires.", false);
    return;
  }

  if (editingId) {
    const idx = appointments.findIndex((a) => a.id === editingId);
    if (idx !== -1)
      appointments[idx] = {
        ...appointments[idx],
        patient,
        doctor,
        type,
        date,
        start,
        end,
        status: selectedStatus,
        color: selectedColor,
        notes: document.getElementById("mNotes").value,
        room: document.getElementById("mRoom").value,
      };
    showToast("Rendez-vous modifié avec succès");
  } else {
    appointments.push({
      id: nextId++,
      patient,
      doctor,
      type,
      date,
      start,
      end,
      status: selectedStatus,
      color: selectedColor,
      notes: document.getElementById("mNotes").value,
      room: document.getElementById("mRoom").value,
    });
    showToast("Rendez-vous ajouté avec succès");
  }
  closeModalBtn();
  renderView();
}

function deleteAppt() {
  if (!editingId) return;
  appointments = appointments.filter((a) => a.id !== editingId);
  closeModalBtn();
  showToast("Rendez-vous supprimé");
  renderView();
}

// ═══════════════════════════════════════════════
// DETAIL POPUP
// ═══════════════════════════════════════════════
function showDetail(a, e) {
  const popup = document.getElementById("detailPopup");
  document.getElementById("dp-title").textContent = a.patient;
  document.getElementById("dp-time").textContent =
    `${a.date ? fmtDateFr(a.date) : ""} · ${a.start} – ${a.end}`;
  document.getElementById("dp-doctor").textContent = a.doctor;
  document.getElementById("dp-type").textContent = a.type;
  const badge = document.getElementById("dp-badge");
  badge.textContent = a.status;
  badge.className = "detail-badge";
  if (a.status === "Confirmé") {
    badge.style.background = "var(--green-pale)";
    badge.style.color = "#065f46";
  } else if (a.status === "En attente") {
    badge.style.background = "var(--gold-pale)";
    badge.style.color = "#92400e";
  } else {
    badge.style.background = "var(--red-pale)";
    badge.style.color = "var(--red)";
  }

  if (a.notes) {
    document.getElementById("dp-notes").textContent = a.notes;
    document.getElementById("dp-notes-row").style.display = "flex";
  } else document.getElementById("dp-notes-row").style.display = "none";

  document.getElementById("dp-edit").onclick = () => openEditModal(a);
  document.getElementById("dp-del").onclick = () => {
    appointments = appointments.filter((x) => x.id !== a.id);
    closeDetail();
    showToast("Rendez-vous supprimé");
    renderView();
  };

  const x = Math.min(e.clientX + 10, window.innerWidth - 320);
  const y = Math.min(e.clientY + 10, window.innerHeight - 250);
  popup.style.left = x + "px";
  popup.style.top = y + "px";
  popup.classList.add("open");
}

function closeDetail() {
  document.getElementById("detailPopup").classList.remove("open");
}
document.addEventListener("click", (e) => {
  if (
    !e.target.closest(".detail-popup") &&
    !e.target.closest(".appt") &&
    !e.target.closest(".month-appt")
  )
    closeDetail();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModalBtn();
    closeDetail();
  }
});

// ═══════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════
function showToast(msg) {
  const t = document.getElementById("toast");
  document.getElementById("toastMsg").textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

// ═══════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════
function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtDateFr(s) {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}
function getMonday(d) {
  const dd = new Date(d);
  const day = dd.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dd.setDate(dd.getDate() + diff);
  return dd;
}
function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function timeToMins(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function addMins(t, n) {
  const m = timeToMins(t) + n;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

// auto-adjust end time when start changes
document.getElementById("mStart").addEventListener("change", function () {
  document.getElementById("mEnd").value = addMins(this.value, 30);
});

init();
