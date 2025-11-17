document.addEventListener('DOMContentLoaded', function() {
    // Données de test pour le tableau de bord
    const todayAppointments = 12;
    const activePatients = 89;
    const busyRooms = '3/5';
    const pendingInvoices = 5;

    // Mettre à jour les cartes
    document.getElementById('todayAppointments').textContent = todayAppointments;
    document.getElementById('activePatients').textContent = activePatients;
    document.getElementById('busyRooms').textContent = busyRooms;
    document.getElementById('pendingInvoices').textContent = pendingInvoices;

    // Remplir le tableau des prochains rendez-vous
    const upcomingAppointments = [
        { time: '09:00', patient: 'Martin Pierre', practitioner: 'Dr. Dupont', room: 'Salle 1', status: 'Confirmé' },
        { time: '10:00', patient: 'Leroy Sophie', practitioner: 'M. Lefèvre', room: 'Salle 2', status: 'Confirmé' },
        { time: '11:00', patient: 'Dubois Paul', practitioner: 'Dr. Dupont', room: 'Salle 1', status: 'En attente' },
        { time: '14:00', patient: 'Bernard Camille', practitioner: 'Mme Petit', room: 'Salle 3', status: 'Confirmé' },
        { time: '15:30', patient: 'Moreau Luc', practitioner: 'Dr. Martin', room: 'Salle 1', status: 'Annulé' }
    ];

    const tableBody = document.querySelector('#upcomingAppointments tbody');
    upcomingAppointments.forEach(appointment => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${appointment.time}</td>
            <td>${appointment.patient}</td>
            <td>${appointment.practitioner}</td>
            <td>${appointment.room}</td>
            <td><span class="status-badge ${appointment.status.toLowerCase()}">${appointment.status}</span></td>
        `;
        tableBody.appendChild(row);
    });

    // Graphique d'activité mensuelle (avec Chart.js)
    const ctx = document.getElementById('activityChart').getContext('2d');
    const activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct'],
            datasets: [{
                label: 'Nombre de consultations',
                data: [45, 55, 60, 50, 70, 65, 80, 75, 85, 90],
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 2,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.raw} consultations`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Déconnexion
    document.getElementById('logoutBtn').addEventListener('click', function() {
        if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
            window.location.href = 'index.html';
        }
    });
});