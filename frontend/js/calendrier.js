staffGuard();

// ═══════════════════════════════════════════════
// AUTH HELPERS
// ═══════════════════════════════════════════════
const TOKEN = () => getToken();
const authHeaders = () => ({
  'Authorization': `Bearer ${TOKEN()}`,
  'Content-Type': 'application/json',
});
const currentUser = getUser();
let currentDoctorFilter = null;

async function apiFetch(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...authHeaders(), ...(options.headers || {}) } });
  if (res.status === 401) {
    logout();
    return null;
  }
  return res;
}

// ═══════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════
const DAYS_FR = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const DAYS_SHORT = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const MONTHS_FR = [
  'janvier','février','mars','avril','mai','juin',
  'juillet','août','septembre','octobre','novembre','décembre',
];

let DOCTORS = [];
let appointments = [];
let nextId = 9000;

let currentView = 'week';
let currentDate = new Date();
let miniDate = new Date();
let editingId = null;
let selectedStatus = 'Confirmé';
let selectedColor = 'blue';
let visibleDoctors = new Set();

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
async function init() {
  initUserNav();
  await loadDoctors();
  await loadAppointments();
  renderMiniCal();
  renderView();
  updateCurrentTimeLine();
  setInterval(updateCurrentTimeLine, 60000);

  if (currentUser.role === 'secretariat' || currentUser.role === 'admin') {
    setupDoctorSelector();
  }

  await loadPendingAppointments();
  await populateModalSelects();
}

// ═══════════════════════════════════════════════
// API — DOCTORS
// ═══════════════════════════════════════════════
async function loadDoctors() {
  try {
    const res = await apiFetch('/api/appointments/doctors');
    if (!res || !res.ok) throw new Error('Erreur chargement médecins');
    const data = await res.json();
    DOCTORS = data.map(d => ({
      id: d.id_staff,
      name: `Dr. ${d.prenom} ${d.nom}`,
      color: d.couleur_agenda || '#3b82f6',
      cls: 'blue',
      specialite: d.specialite,
    }));
    visibleDoctors = new Set(DOCTORS.map(d => d.name));
    renderDoctorList();
  } catch(e) {
    console.error('Erreur chargement médecins', e);
    DOCTORS = [];
    visibleDoctors = new Set();
    renderDoctorList();
  }
}

// ═══════════════════════════════════════════════
// MODAL SELECTS — peuplage depuis l'API
// ═══════════════════════════════════════════════
async function populateModalSelects() {
  await populatePatientSelect();
  populateDoctorSelect();
  await populateTypeSelect();
  await populateRoomSelect();
}

async function populatePatientSelect() {
  try {
    const res = await apiFetch('/api/patients/?limit=100');
    if (!res || !res.ok) return;
    const data = await res.json();
    const sel = document.getElementById('mPatient');
    sel.innerHTML = '<option value="">-- Choisir un patient --</option>';
    data.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id_patient;
      opt.textContent = `${p.prenom} ${p.nom}`;
      sel.appendChild(opt);
    });
  } catch(e) {
    console.error('Erreur chargement patients', e);
  }
}

function populateDoctorSelect() {
  const sel = document.getElementById('mDoctor');
  sel.innerHTML = '<option value="">-- Choisir un médecin --</option>';
  DOCTORS.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.name;
    sel.appendChild(opt);
  });
}

async function populateTypeSelect() {
  try {
    const res = await apiFetch('/api/appointments/types');
    if (!res || !res.ok) return;
    const data = await res.json();
    const sel = document.getElementById('mType');
    sel.innerHTML = '<option value="">-- Type --</option>';
    data.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id_appointment_type;
      opt.textContent = t.libelle;
      sel.appendChild(opt);
    });
  } catch(e) {
    console.error('Erreur chargement types', e);
  }
}

async function populateRoomSelect() {
  try {
    const res = await apiFetch('/api/appointments/rooms');
    if (!res || !res.ok) return;
    const data = await res.json();
    const sel = document.getElementById('mRoom');
    sel.innerHTML = '<option value="">-- Aucune salle --</option>';
    data.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.id_room;
      opt.textContent = r.nom;
      sel.appendChild(opt);
    });
  } catch(e) {
    console.error('Erreur chargement salles', e);
  }
}

// ═══════════════════════════════════════════════
// API — APPOINTMENTS
// ═══════════════════════════════════════════════
async function loadAppointments() {
  try {
    let url = '/api/appointments/';
    const params = [];
    if (currentDoctorFilter) params.push(`doctor_id=${currentDoctorFilter}`);
    if (params.length) url += '?' + params.join('&');

    const res = await apiFetch(url);
    if (!res || !res.ok) throw new Error('Erreur chargement RDV');
    const data = await res.json();

    appointments = data.map(a => ({
      id: a.id_appointment,
      patient: `${a.patient_prenom} ${a.patient_nom}`,
      doctor: `Dr. ${a.staff_prenom} ${a.staff_nom}`,
      type: a.type_libelle || 'Consultation',
      date: a.start_at.substring(0, 10),
      start: a.start_at.substring(11, 16),
      end: a.end_at.substring(11, 16),
      color: a.couleur || 'blue',
      status: a.statut === 'confirmé' ? 'Confirmé' : a.statut === 'annulé' ? 'Annulé' : 'En attente',
      notes: a.notes || '',
      room: a.room_nom || '',
      _raw: a,
    }));

    renderView();
  } catch(e) {
    console.error('Erreur chargement RDV', e);
    appointments = [];
    renderView();
  }
}

// ═══════════════════════════════════════════════
// PENDING APPOINTMENTS
// ═══════════════════════════════════════════════
async function loadPendingAppointments() {
  try {
    const res = await apiFetch('/api/appointments/?statut=en_attente');
    if (!res || !res.ok) throw new Error('Erreur');
    const data = await res.json();
    renderPendingTable(data);
  } catch(e) {
    console.error('Erreur RDV en attente', e);
    renderPendingTable([]);
  }
}

function renderPendingTable(list) {
  const container = document.getElementById('pendingTableBody');
  const empty = document.getElementById('pendingEmpty');
  const badge = document.getElementById('pendingCount');
  badge.textContent = list.length;

  if (!list.length) {
    container.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  container.innerHTML = list.map(a => {
    const dt = new Date(a.start_at);
    const dateStr = dt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
    const timeStr = a.start_at.substring(11, 16);
    const initials = ((a.patient_prenom || '')[0] || '') + ((a.patient_nom || '')[0] || '');
    const notes = a.notes ? `<span class="pending-item-notes" title="${a.notes}">${a.notes}</span>` : '<span class="pending-item-notes"></span>';
    return `
    <div class="pending-item">
      <div class="pending-item-avatar">${initials.toUpperCase()}</div>
      <div class="pending-item-info">
        <div class="pending-item-patient">${a.patient_prenom} ${a.patient_nom}</div>
        <div class="pending-item-doctor">Dr. ${a.staff_prenom} ${a.staff_nom}</div>
      </div>
      <div class="pending-item-datetime">
        <span class="pending-item-date">${dateStr}</span>
        <span class="pending-item-time">${timeStr}</span>
      </div>
      <span class="pending-item-type">${a.type_libelle || 'Consultation'}</span>
      ${notes}
      <div class="pending-item-actions">
        <button class="btn-confirm" onclick="updateStatus(${a.id_appointment}, 'confirmé')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Confirmer
        </button>
        <button class="btn-refuse" onclick="updateStatus(${a.id_appointment}, 'annulé')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          Refuser
        </button>
      </div>
    </div>`;
  }).join('');
}

async function updateStatus(id, statut) {
  try {
    const res = await apiFetch(`/api/appointments/${id}/status`, { method: 'PUT', body: JSON.stringify({ statut }) });
    if (!res || !res.ok) throw new Error('Erreur');
    await loadAppointments();
    await loadPendingAppointments();
    showToast(`Rendez-vous ${statut === 'confirmé' ? 'confirmé' : 'refusé'}`);
  } catch(e) {
    console.error('Erreur mise à jour statut', e);
    showToast('Erreur lors de la mise à jour', false);
  }
}

// ═══════════════════════════════════════════════
// DOCTOR SELECTOR (secrétaire / admin)
// ═══════════════════════════════════════════════
function setupDoctorSelector() {
  const sel = document.getElementById('doctorSelector');
  sel.classList.remove('hidden');
  DOCTORS.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.name;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', async e => {
    currentDoctorFilter = e.target.value || null;
    await loadAppointments();
  });
}

// ═══════════════════════════════════════════════
// DOCTOR LIST (sidebar)
// ═══════════════════════════════════════════════
function renderDoctorList() {
  const el = document.getElementById('doctorList');
  if (!DOCTORS.length) {
    el.innerHTML = '<div style="font-size:.8rem;color:var(--text-light);padding:4px 0;">Aucun médecin</div>';
    return;
  }
  el.innerHTML = DOCTORS.map(
    d => `<div class="doctor-item checked" style="--color:${d.color}" onclick="toggleDoctor(this,'${d.name}')">
        <div class="doctor-dot" style="background:${d.color}"></div>
        <span class="doctor-name">${d.name}</span>
        <div class="doctor-cb"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
      </div>`
  ).join('');
}

function toggleDoctor(el, name) {
  el.classList.toggle('checked');
  if (visibleDoctors.has(name)) visibleDoctors.delete(name);
  else visibleDoctors.add(name);
  renderView();
}

// ═══════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════
function navigate(dir) {
  if (currentView === 'week') currentDate = addDays(currentDate, dir * 7);
  else if (currentView === 'month')
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + dir, 1);
  else currentDate = addDays(currentDate, dir);
  renderView();
  loadAppointments();
  loadPendingAppointments();
}

function goToday() {
  currentDate = new Date();
  renderView();
  loadAppointments();
  loadPendingAppointments();
}

function setView(v) {
  currentView = v;
  ['vDay','vWeek','vMonth'].forEach(id => document.getElementById(id).classList.remove('active'));
  document.getElementById('v' + v.charAt(0).toUpperCase() + v.slice(1)).classList.add('active');
  document.getElementById('weekView').classList.remove('active');
  document.getElementById('monthView').classList.remove('active');
  document.getElementById('dayView').classList.remove('active');
  if (v === 'week') document.getElementById('weekView').classList.add('active');
  else if (v === 'month') document.getElementById('monthView').classList.add('active');
  else document.getElementById('dayView').classList.add('active');
  renderView();
}

// ═══════════════════════════════════════════════
// RENDER DISPATCHER
// ═══════════════════════════════════════════════
function renderView() {
  if (currentView === 'week') renderWeek();
  else if (currentView === 'month') renderMonth();
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

  const endDay = days[6];
  document.getElementById('currentPeriod').textContent =
    `${days[0].getDate()} – ${endDay.getDate()} ${MONTHS_FR[endDay.getMonth()]} ${endDay.getFullYear()}`;

  const header = document.getElementById('weekHeader');
  header.innerHTML =
    '<div class="week-header-gutter"></div>' +
    days.map(d => {
      const isToday = d.getTime() === today.getTime();
      return `<div class="week-header-day">
            <div class="week-day-name">${DAYS_SHORT[((d.getDay() + 6) % 7) + 1 > 6 ? 0 : (d.getDay() + 6) % 7]}</div>
            <div class="week-day-num${isToday ? ' today' : ''}">${d.getDate()}</div>
          </div>`;
    }).join('');

  const body = document.getElementById('weekBody');
  body.innerHTML = '';

  const gutter = document.createElement('div');
  gutter.className = 'time-gutter';
  for (let h = 7; h <= 20; h++) {
    const slot = document.createElement('div');
    slot.className = 'time-slot-label';
    slot.textContent = `${String(h).padStart(2, '0')}:00`;
    gutter.appendChild(slot);
  }
  body.appendChild(gutter);

  days.forEach(d => {
    const isToday = d.getTime() === today.getTime();
    const col = document.createElement('div');
    col.className = 'day-col' + (isToday ? ' today-col' : '');
    col.dataset.date = fmtDate(d);

    for (let h = 7; h <= 20; h++) {
      const cell = document.createElement('div');
      cell.className = 'hour-cell';
      col.appendChild(cell);
    }

    if (isToday) {
      const now = new Date();
      const mins = (now.getHours() - 7) * 60 + now.getMinutes();
      if (mins >= 0 && mins <= 14 * 60) {
        const tl = document.createElement('div');
        tl.className = 'time-line';
        tl.id = 'timeLine';
        tl.style.top = mins + 'px';
        col.appendChild(tl);
      }
    }

    const dayAppts = appointments.filter(
      a => a.date === fmtDate(d) && visibleDoctors.has(a.doctor),
    );
    dayAppts.forEach(a => col.appendChild(buildApptEl(a)));

    col.addEventListener('click', e => {
      if (e.target.closest('.appt')) return;
      const rect = col.getBoundingClientRect();
      const y = e.clientY - rect.top + col.scrollTop;
      const hour = Math.floor(y / 60) + 7;
      const mins = Math.floor((y % 60) / 15) * 15;
      openModal(fmtDate(d), `${String(hour).padStart(2,'0')}:${String(mins).padStart(2,'0')}`);
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
  document.getElementById('currentPeriod').textContent =
    `${DAYS_FR[currentDate.getDay()]} ${currentDate.getDate()} ${MONTHS_FR[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  const header = document.getElementById('dayHeader');
  header.style.gridTemplateColumns = '60px 1fr';
  header.innerHTML = `<div class="week-header-gutter"></div>
        <div class="week-header-day">
          <div class="week-day-name">${DAYS_SHORT[currentDate.getDay()]}</div>
          <div class="week-day-num${isToday ? ' today' : ''}">${currentDate.getDate()}</div>
        </div>`;

  const body = document.getElementById('dayBody');
  body.style.gridTemplateColumns = '60px 1fr';
  body.innerHTML = '';
  const gutter = document.createElement('div');
  gutter.className = 'time-gutter';
  for (let h = 7; h <= 20; h++) {
    const s = document.createElement('div');
    s.className = 'time-slot-label';
    s.textContent = `${String(h).padStart(2,'0')}:00`;
    gutter.appendChild(s);
  }
  body.appendChild(gutter);

  const col = document.createElement('div');
  col.className = 'day-col' + (isToday ? ' today-col' : '');
  col.dataset.date = fmtDate(currentDate);
  for (let h = 7; h <= 20; h++) {
    const c = document.createElement('div');
    c.className = 'hour-cell';
    col.appendChild(c);
  }
  if (isToday) {
    const now = new Date();
    const mins = (now.getHours() - 7) * 60 + now.getMinutes();
    if (mins >= 0 && mins <= 14 * 60) {
      const tl = document.createElement('div');
      tl.className = 'time-line';
      tl.style.top = mins + 'px';
      col.appendChild(tl);
    }
  }
  appointments
    .filter(a => a.date === fmtDate(currentDate) && visibleDoctors.has(a.doctor))
    .forEach(a => col.appendChild(buildApptEl(a)));
  col.addEventListener('click', e => {
    if (e.target.closest('.appt')) return;
    const rect = col.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hour = Math.floor(y / 60) + 7;
    const mins = Math.floor((y % 60) / 15) * 15;
    openModal(fmtDate(currentDate), `${String(hour).padStart(2,'0')}:${String(mins).padStart(2,'0')}`);
  });
  body.appendChild(col);
}

// ═══════════════════════════════════════════════
// MONTH VIEW
// ═══════════════════════════════════════════════
function renderMonth() {
  document.getElementById('currentPeriod').textContent =
    `${MONTHS_FR[currentDate.getMonth()].charAt(0).toUpperCase() + MONTHS_FR[currentDate.getMonth()].slice(1)} ${currentDate.getFullYear()}`;

  const grid = document.getElementById('monthGrid');
  grid.innerHTML = '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  let start = new Date(first);
  const dow = (first.getDay() + 6) % 7;
  start.setDate(start.getDate() - dow);

  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i);
    const cell = document.createElement('div');
    const isOther = d.getMonth() !== currentDate.getMonth();
    const isToday = d.getTime() === today.getTime();
    cell.className = 'month-cell' + (isOther ? ' other-month' : '') + (isToday ? ' today' : '');

    const dateEl = document.createElement('div');
    dateEl.className = 'month-date';
    dateEl.textContent = d.getDate();
    cell.appendChild(dateEl);

    const dayAppts = appointments.filter(
      a => a.date === fmtDate(d) && visibleDoctors.has(a.doctor),
    );
    dayAppts.slice(0, 3).forEach(a => {
      const el = document.createElement('div');
      el.className = `month-appt appt ${a.color}`;
      el.textContent = `${a.start} ${a.patient}`;
      el.onclick = e => { e.stopPropagation(); showDetail(a, e); };
      cell.appendChild(el);
    });
    if (dayAppts.length > 3) {
      const more = document.createElement('div');
      more.className = 'month-more';
      more.textContent = `+${dayAppts.length - 3} autres`;
      cell.appendChild(more);
    }

    cell.addEventListener('click', () => openModal(fmtDate(d)));
    grid.appendChild(cell);
  }
}

// ═══════════════════════════════════════════════
// BUILD APPOINTMENT ELEMENT
// ═══════════════════════════════════════════════
function buildApptEl(a) {
  const el = document.createElement('div');
  el.className = `appt ${a.color}`;
  const startMins = timeToMins(a.start) - 7 * 60;
  const endMins = timeToMins(a.end) - 7 * 60;
  el.style.top = startMins + 'px';
  el.style.height = Math.max(endMins - startMins, 20) + 'px';
  el.innerHTML = `<div class="appt-title">${a.patient}</div><div class="appt-sub">${a.start} · ${a.type}</div>`;
  el.addEventListener('click', e => {
    e.stopPropagation();
    showDetail(a, e);
  });
  return el;
}

// ═══════════════════════════════════════════════
// MINI CALENDAR
// ═══════════════════════════════════════════════
function renderMiniCal() {
  const y = miniDate.getFullYear(), m = miniDate.getMonth();
  document.getElementById('miniMonth').textContent = `${MONTHS_FR[m]} ${y}`;
  const grid = document.getElementById('miniGrid');
  grid.innerHTML = ['L','M','M','J','V','S','D']
    .map(d => `<div class="mini-day-label">${d}</div>`)
    .join('');

  const first = new Date(y, m, 1);
  const start = new Date(first);
  start.setDate(start.getDate() - ((first.getDay() + 6) % 7));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sel = new Date(currentDate);
  sel.setHours(0, 0, 0, 0);

  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i);
    const hasAppt = appointments.some(a => a.date === fmtDate(d));
    const isToday = d.getTime() === today.getTime();
    const isSel = d.getTime() === sel.getTime();
    const isOther = d.getMonth() !== m;
    const el = document.createElement('div');
    el.className = 'mini-day' +
      (isOther ? ' other-month' : '') +
      (isToday ? ' today' : '') +
      (isSel && !isToday ? ' selected' : '') +
      (hasAppt ? ' has-appt' : '');
    el.textContent = d.getDate();
    el.onclick = () => { currentDate = new Date(d); renderView(); };
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
  const el = document.getElementById('timeLine');
  if (!el) return;
  const now = new Date();
  const mins = (now.getHours() - 7) * 60 + now.getMinutes();
  el.style.top = mins + 'px';
}

// ═══════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════
function openModal(date, startTime) {
  editingId = null;
  selectedStatus = 'Confirmé';
  selectedColor = 'blue';
  document.getElementById('modalTitleText').textContent = 'Nouveau rendez-vous';
  document.getElementById('btnDelete').style.display = 'none';

  document.getElementById('mPatient').value = '';
  document.getElementById('mDoctor').value = '';
  document.getElementById('mType').value = '';
  document.getElementById('mRoom').value = '';
  document.getElementById('mNotes').value = '';
  document.getElementById('mDate').value = date || fmtDate(currentDate);
  document.getElementById('mStart').value = startTime || '09:00';
  document.getElementById('mEnd').value = startTime ? addMins(startTime, 30) : '09:30';

  document.querySelectorAll('.status-opt').forEach(o => {
    o.classList.toggle('sel', o.textContent === 'Confirmé');
  });
  document.querySelectorAll('.color-dot').forEach(d => {
    d.classList.toggle('selected', d.dataset.color === 'blue');
  });

  closeDetail();
  document.getElementById('modalOverlay').classList.add('open');
}

function openEditModal(a) {
  editingId = a.id;
  selectedStatus = a.status;
  selectedColor = a.color;
  document.getElementById('modalTitleText').textContent = 'Modifier le rendez-vous';
  document.getElementById('btnDelete').style.display = 'flex';

  const raw = a._raw;
  document.getElementById('mPatient').value = raw ? raw.id_patient : '';
  document.getElementById('mDoctor').value = raw ? raw.id_staff : '';
  document.getElementById('mType').value = raw && raw.id_appointment_type ? raw.id_appointment_type : '';
  document.getElementById('mRoom').value = raw && raw.id_room ? raw.id_room : '';
  document.getElementById('mNotes').value = a.notes;
  document.getElementById('mDate').value = a.date;
  document.getElementById('mStart').value = a.start;
  document.getElementById('mEnd').value = a.end;

  document.querySelectorAll('.status-opt').forEach(o => {
    o.classList.toggle('sel', o.textContent === a.status);
  });
  document.querySelectorAll('.color-dot').forEach(d => {
    d.classList.toggle('selected', d.dataset.color === a.color);
  });

  closeDetail();
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModalBtn();
}
function closeModalBtn() {
  document.getElementById('modalOverlay').classList.remove('open');
  editingId = null;
}

function selectStatus(el, val) {
  document.querySelectorAll('.status-opt').forEach(o => o.classList.remove('sel'));
  el.classList.add('sel');
  selectedStatus = val;
}

function pickColor(el) {
  document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
  el.classList.add('selected');
  selectedColor = el.dataset.color;
}

async function saveAppt() {
  const idPatient = parseInt(document.getElementById('mPatient').value, 10);
  const idStaff = parseInt(document.getElementById('mDoctor').value, 10);
  const idType = parseInt(document.getElementById('mType').value, 10) || null;
  const idRoom = parseInt(document.getElementById('mRoom').value, 10) || null;
  const date = document.getElementById('mDate').value;
  const start = document.getElementById('mStart').value;
  const end = document.getElementById('mEnd').value;
  const notes = document.getElementById('mNotes').value.trim() || null;

  if (!idPatient || !idStaff || !idType || !date || !start || !end) {
    showToast('Veuillez remplir les champs obligatoires.', false);
    return;
  }

  const body = {
    id_patient: idPatient,
    id_staff: idStaff,
    id_appointment_type: idType,
    id_room: idRoom,
    start_at: `${date}T${start}:00`,
    end_at: `${date}T${end}:00`,
    notes,
    couleur: selectedColor,
  };

  try {
    let res;
    if (editingId) {
      res = await apiFetch(`/api/appointments/${editingId}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      res = await apiFetch('/api/appointments/', { method: 'POST', body: JSON.stringify(body) });
    }

    if (!res || !res.ok) {
      const err = await res.text();
      console.error('Erreur API RDV', err);
      showToast('Erreur lors de l\'enregistrement.', false);
      return;
    }

    showToast(editingId ? 'Rendez-vous modifié avec succès' : 'Rendez-vous ajouté avec succès');
    closeModalBtn();
    await loadAppointments();
    await loadPendingAppointments();
  } catch(e) {
    console.error('Erreur réseau', e);
    showToast('Erreur réseau.', false);
  }
}

async function deleteAppt() {
  if (!editingId) return;

  try {
    const res = await apiFetch(`/api/appointments/${editingId}`, { method: 'DELETE' });

    if (!res || !res.ok) {
      const err = await res.text();
      console.error('Erreur suppression RDV', err);
      showToast('Erreur lors de la suppression.', false);
      return;
    }

    closeModalBtn();
    showToast('Rendez-vous supprimé');
    await loadAppointments();
    await loadPendingAppointments();
  } catch(e) {
    console.error('Erreur réseau', e);
    showToast('Erreur réseau.', false);
  }
}

// ═══════════════════════════════════════════════
// DETAIL POPUP
// ═══════════════════════════════════════════════
function showDetail(a, e) {
  const popup = document.getElementById('detailPopup');
  document.getElementById('dp-title').textContent = a.patient;
  document.getElementById('dp-time').textContent =
    `${a.date ? fmtDateFr(a.date) : ''} · ${a.start} – ${a.end}`;
  document.getElementById('dp-doctor').textContent = a.doctor;
  document.getElementById('dp-type').textContent = a.type;
  const badge = document.getElementById('dp-badge');
  badge.textContent = a.status;
  badge.className = 'detail-badge';
  if (a.status === 'Confirmé') {
    badge.style.background = 'var(--green-pale)';
    badge.style.color = '#065f46';
  } else if (a.status === 'En attente') {
    badge.style.background = 'var(--gold-pale)';
    badge.style.color = '#92400e';
  } else {
    badge.style.background = 'var(--red-pale)';
    badge.style.color = 'var(--red)';
  }

  if (a.notes) {
    document.getElementById('dp-notes').textContent = a.notes;
    document.getElementById('dp-notes-row').style.display = 'flex';
  } else {
    document.getElementById('dp-notes-row').style.display = 'none';
  }

  document.getElementById('dp-edit').onclick = () => openEditModal(a);
  document.getElementById('dp-del').onclick = async () => {
    if (a._raw) {
      try {
        await fetch(`/api/appointments/${a.id}`, {
          method: 'DELETE',
          headers: authHeaders(),
        });
      } catch(ex) {
        console.error('Erreur suppression', ex);
      }
    }
    appointments = appointments.filter(x => x.id !== a.id);
    closeDetail();
    showToast('Rendez-vous supprimé');
    renderView();
    await loadPendingAppointments();
  };

  const x = Math.min(e.clientX + 10, window.innerWidth - 320);
  const y = Math.min(e.clientY + 10, window.innerHeight - 250);
  popup.style.left = x + 'px';
  popup.style.top = y + 'px';
  popup.classList.add('open');
}

function closeDetail() {
  document.getElementById('detailPopup').classList.remove('open');
}

document.addEventListener('click', e => {
  if (
    !e.target.closest('.detail-popup') &&
    !e.target.closest('.appt') &&
    !e.target.closest('.month-appt')
  ) closeDetail();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModalBtn(); closeDetail(); }
});

// ═══════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════
function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ═══════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════
function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmtDateFr(s) {
  const [y, m, d] = s.split('-');
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
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function addMins(t, n) {
  const m = timeToMins(t) + n;
  return `${String(Math.floor(m / 60)).padStart(2,'0')}:${String(m % 60).padStart(2,'0')}`;
}

document.getElementById('mStart').addEventListener('change', function() {
  document.getElementById('mEnd').value = addMins(this.value, 30);
});

init();
