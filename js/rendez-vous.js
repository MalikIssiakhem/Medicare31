document.addEventListener('DOMContentLoaded', function() {
    // Initialisation du calendrier
    const calendarEl = document.getElementById('calendar');
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        locale: 'fr',
        slotMinTime: '08:00:00',
        slotMaxTime: '20:00:00',
        allDaySlot: false,
        events: [
            // Exemple de données - à remplacer par une requête API
            {
                title: 'Consultation - M. Martin',
                start: new Date(new Date().setHours(9, 0, 0)),
                end: new Date(new Date().setHours(9, 30, 0)),
                extendedProps: {
                    patient: 'Martin Pierre',
                    practitioner: 'Dr. Dupont',
                    room: 'Salle 1',
                    status: 'confirmé'
                },
                backgroundColor: '#3498db',
                borderColor: '#2980b9'
            },
            {
                title: 'Kinésithérapie - Mme Leroy',
                start: new Date(new Date().setHours(10, 0, 0)),
                end: new Date(new Date().setHours(11, 0, 0)),
                extendedProps: {
                    patient: 'Leroy Sophie',
                    practitioner: 'M. Lefèvre (Kiné)',
                    room: 'Salle 2',
                    status: 'confirmé'
                },
                backgroundColor: '#2ecc71',
                borderColor: '#27ae60'
            }
        ],
        eventClick: function(info) {
            // Afficher les détails du RDV dans un modal
            const event = info.event;
            alert(`Rendez-vous: ${event.title}\n`
                + `Patient: ${event.extendedProps.patient}\n`
                + `Praticien: ${event.extendedProps.practitioner}\n`
                + `Salle: ${event.extendedProps.room}\n`
                + `Statut: ${event.extendedProps.status}`);
        },
        dateClick: function(info) {
            // Ouvrir le modal pour créer un nouveau RDV
            openAppointmentModal(info.dateStr);
        }
    });
    calendar.render();

    // Gestion du modal
    const modal = document.getElementById('appointmentModal');
    const btn = document.getElementById('newAppointmentBtn');
    const span = document.getElementsByClassName('close')[0];
    const form = document.getElementById('appointmentForm');

    btn.onclick = function() {
        modal.style.display = 'block';
        document.getElementById('modalTitle').textContent = 'Nouveau Rendez-vous';
        form.reset();
    };

    span.onclick = function() {
        modal.style.display = 'none';
    };

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };

    function openAppointmentModal(date) {
        modal.style.display = 'block';
        document.getElementById('modalTitle').textContent = 'Nouveau Rendez-vous';
        document.getElementById('date').value = date;
        form.reset();
    }

    // Soumission du formulaire
    form.onsubmit = function(e) {
        e.preventDefault();
        const formData = {
            patient: document.getElementById('patient').value,
            practitioner: document.getElementById('practitioner').value,
            room: document.getElementById('room').value,
            date: document.getElementById('date').value,
            time: document.getElementById('time').value,
            duration: document.getElementById('duration').value,
            notes: document.getElementById('notes').value
        };

        // Ici, vous enverriez les données à votre backend
        console.log('Nouveau RDV:', formData);
        alert('Rendez-vous enregistré avec succès !');
        modal.style.display = 'none';

        // Rafraîchir le calendrier (simulation)
        calendar.refetchEvents();
    };

    // Remplir les listes déroulantes (exemple statique)
    function populateSelects() {
        const patients = ['Martin Pierre', 'Leroy Sophie', 'Dubois Paul', 'Bernard Camille'];
        const practitioners = ['Dr. Dupont (Médecin)', 'M. Lefèvre (Kinésithérapeute)', 'Mme Petit (Infirmière)'];
        const rooms = ['Salle 1', 'Salle 2', 'Salle 3', 'Salle 4'];

        const patientSelect = document.getElementById('patient');
        const practitionerSelect = document.getElementById('practitioner');
        const roomSelect = document.getElementById('room');

        patients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient;
            option.textContent = patient;
            patientSelect.appendChild(option);
        });

        practitioners.forEach(practitioner => {
            const option = document.createElement('option');
            option.value = practitioner;
            option.textContent = practitioner;
            practitionerSelect.appendChild(option);
        });

        rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room;
            option.textContent = room;
            roomSelect.appendChild(option);
        });
    }

    populateSelects();
});