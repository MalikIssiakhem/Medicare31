const MONTHS_FR = [
  'janvier','février','mars','avril','mai','juin',
  'juillet','août','septembre','octobre','novembre','décembre'
];
const DAYS_SHORT = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const DAYS_FULL  = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];

let doctors = [];
let selectedDoctor = null;
let currentMonday = null;
let selectedSlot = null;
let weekSlotsData = {};
let myPatientId = null;

function authHeaders() {
  return { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
}

async function init() {
  authGuard();
  initUserNav();
  currentMonday = getMonday(new Date());
  await resolvePatientId();
  await loadDoctors();
  renderDoctors(doctors);
  bindEvents();
}

async function resolvePatientId() {
  try {
    const res = await fetch('/api/auth/me', { headers: authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    myPatientId = data.id_patient || null;
  } catch(e) {
    console.error('Erreur récupération profil', e);
  }
}

async function loadDoctors() {
  try {
    const res = await fetch('/api/appointments/doctors', { headers: authHeaders() });
    if (!res.ok) throw new Error('Erreur serveur');
    doctors = await res.json();
  } catch(e) {
    console.error('Erreur chargement médecins', e);
    doctors = [];
  }
}

function renderDoctors(list) {
  const grid = document.getElementById('doctorGrid');
  if (!list.length) {
    grid.innerHTML = '<p class="no-doctors">Aucun médecin disponible.</p>';
    return;
  }
  grid.innerHTML = list.map(d => {
    const color = d.couleur_agenda || '#3b82f6';
    const initials = ((d.prenom || '')[0] || '') + ((d.nom || '')[0] || '');
    const spec = d.specialite || 'Médecin généraliste';
    return `<div class="doctor-card">
      <div class="doctor-card-header">
        <div class="doctor-avatar" style="background:${color}">${initials.toUpperCase()}</div>
        <div>
          <div class="doctor-info-name">Dr. ${d.prenom} ${d.nom}</div>
          <div class="doctor-info-spec">${spec}</div>
        </div>
        <div class="doctor-color-dot" style="background:${color}"></div>
      </div>
      <button class="btn-choose" onclick="selectDoctor(${d.id_staff})">Choisir</button>
    </div>`;
  }).join('');
}

function selectDoctor(id) {
  selectedDoctor = doctors.find(d => d.id_staff === id);
  if (!selectedDoctor) return;
  document.getElementById('selectedDoctorTitle').textContent =
    `Dr. ${selectedDoctor.prenom} ${selectedDoctor.nom}`;
  showStep(2);
  loadWeekSlots(currentMonday);
}

async function loadWeekSlots(monday) {
  weekSlotsData = {};
  document.getElementById('slotsGrid').innerHTML = '<div class="slots-loading">Chargement des créneaux...</div>';

  const promises = [];
  for (let i = 0; i < 5; i++) {
    const d = addDays(monday, i);
    const dateStr = formatDate(d);
    promises.push(
      fetch(
        `/api/appointments/available-slots?doctor_id=${selectedDoctor.id_staff}&date=${dateStr}`,
        { headers: authHeaders() }
      )
        .then(r => r.json())
        .then(slots => { weekSlotsData[dateStr] = slots; })
        .catch(() => { weekSlotsData[dateStr] = []; })
    );
  }
  await Promise.all(promises);
  updateWeekLabel(monday);
  renderWeekSlots();
}

function updateWeekLabel(monday) {
  const friday = addDays(monday, 4);
  document.getElementById('weekLabel').textContent =
    `${monday.getDate()} – ${friday.getDate()} ${MONTHS_FR[friday.getMonth()]} ${friday.getFullYear()}`;
}

function renderWeekSlots() {
  const dates = [];
  for (let i = 0; i < 5; i++) dates.push(addDays(currentMonday, i));

  const allSlotTimes = getSlotTimes();

  let html = '<div class="slots-grid-header">';
  html += '<div></div>';
  dates.forEach(d => {
    const dow = DAYS_SHORT[d.getDay()];
    html += `<div>${dow} ${d.getDate()}</div>`;
  });
  html += '</div><div class="slots-grid-body">';

  allSlotTimes.forEach(time => {
    html += `<div class="slot-time-label">${time}</div>`;
    dates.forEach(d => {
      const dateStr = formatDate(d);
      const slots = weekSlotsData[dateStr] || [];
      const slot = slots.find(s => s.start === time);
      if (!slot) {
        html += '<div class="slot-cell"><div class="slot-empty"></div></div>';
      } else if (slot.available) {
        html += `<div class="slot-cell">
          <button class="slot-btn available" onclick="selectSlot('${dateStr}','${slot.start}','${slot.end}')">
            ${slot.start}
          </button>
        </div>`;
      } else {
        html += `<div class="slot-cell">
          <button class="slot-btn unavailable" disabled>${slot.start}</button>
        </div>`;
      }
    });
  });

  html += '</div>';
  document.getElementById('slotsGrid').innerHTML = html;
}

function getSlotTimes() {
  const times = [];
  let h = 8, m = 0;
  while (h < 18) {
    times.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
    m += 30;
    if (m >= 60) { h++; m = 0; }
  }
  return times;
}

function selectSlot(dateStr, start, end) {
  selectedSlot = { date: dateStr, start, end };
  const d = new Date(dateStr + 'T00:00:00');
  const dayName = DAYS_FULL[d.getDay()];
  const dateLabel = `${dayName} ${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
  document.getElementById('confirmSummary').innerHTML =
    `<strong>Médecin :</strong> Dr. ${selectedDoctor.prenom} ${selectedDoctor.nom}<br>` +
    `<strong>Date :</strong> ${dateLabel}<br>` +
    `<strong>Horaire :</strong> ${start} – ${end}`;
  showStep(3);
}

async function confirmBooking() {
  if (!selectedSlot || !selectedDoctor) return;

  if (!myPatientId) {
    alert('Impossible de récupérer votre profil patient. Veuillez vous reconnecter.');
    return;
  }

  const notes = document.getElementById('confirmNotes').value.trim();
  const startAt = `${selectedSlot.date}T${selectedSlot.start}:00`;
  const endAt   = `${selectedSlot.date}T${selectedSlot.end}:00`;

  const body = {
    id_patient: myPatientId,
    id_staff: selectedDoctor.id_staff,
    start_at: startAt,
    end_at: endAt,
    notes: notes || null,
    couleur: selectedDoctor.couleur_agenda || 'blue',
  };

  try {
    const res = await fetch('/api/appointments/', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.detail || 'Erreur lors de la création du rendez-vous.');
      return;
    }
    showStep('success');
  } catch(e) {
    console.error('Erreur création RDV', e);
    alert('Erreur réseau. Vérifiez que le serveur est accessible.');
  }
}

function showStep(n) {
  document.querySelectorAll('.step-section').forEach(s => s.classList.add('hidden'));

  const indicators = document.querySelectorAll('.stepper .step');
  indicators.forEach(el => { el.classList.remove('active', 'done'); });

  if (n === 'success') {
    document.getElementById('stepSuccess').classList.remove('hidden');
    indicators.forEach(el => el.classList.add('done'));
    return;
  }

  document.getElementById(`step${n}`).classList.remove('hidden');

  indicators.forEach((el, idx) => {
    if (idx + 1 < n) el.classList.add('done');
    else if (idx + 1 === n) el.classList.add('active');
  });
}

function bindEvents() {
  document.getElementById('doctorSearch').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    const filtered = doctors.filter(d =>
      `${d.nom} ${d.prenom} ${d.specialite || ''}`.toLowerCase().includes(q)
    );
    renderDoctors(filtered);
  });

  document.getElementById('prevWeek').addEventListener('click', () => {
    currentMonday = addDays(currentMonday, -7);
    loadWeekSlots(currentMonday);
  });
  document.getElementById('nextWeek').addEventListener('click', () => {
    currentMonday = addDays(currentMonday, 7);
    loadWeekSlots(currentMonday);
  });
  document.getElementById('backToStep1').addEventListener('click', () => showStep(1));
  document.getElementById('backToStep2').addEventListener('click', () => showStep(2));
  document.getElementById('submitBooking').addEventListener('click', confirmBooking);
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

init();
