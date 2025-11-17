document.addEventListener('DOMContentLoaded', function() {
    // Données de test
    const patients = [
        { id: 1, lastName: 'Martin', firstName: 'Pierre', birthDate: '1985-05-15', phone: '0612345678', lastVisit: '2023-10-20' },
        { id: 2, lastName: 'Leroy', firstName: 'Sophie', birthDate: '1990-08-22', phone: '0623456789', lastVisit: '2023-10-18' },
        { id: 3, lastName: 'Dubois', firstName: 'Paul', birthDate: '1978-11-30', phone: '0634567890', lastVisit: '2023-10-15' },
        { id: 4, lastName: 'Bernard', firstName: 'Camille', birthDate: '1982-03-10', phone: '0645678901', lastVisit: '2023-10-10' }
    ];

    // Afficher les patients dans le tableau
    function renderPatients() {
        const tableBody = document.querySelector('#patientsTable tbody');
        tableBody.innerHTML = '';

        patients.forEach(patient => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${patient.id}</td>
                <td>${patient.lastName}</td>
                <td>${patient.firstName}</td>
                <td>${formatDate(patient.birthDate)}</td>
                <td>${patient.phone}</td>
                <td>${formatDate(patient.lastVisit)}</td>
                <td>
                    <button class="btn btn-small btn-primary view-btn" data-id="${patient.id}"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-small btn-warning edit-btn" data-id="${patient.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-small btn-danger delete-btn" data-id="${patient.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Ajouter les événements aux boutons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const patientId = parseInt(e.target.closest('button').getAttribute('data-id'));
                viewPatientDetails(patientId);
            });
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const patientId = parseInt(e.target.closest('button').getAttribute('data-id'));
                editPatient(patientId);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const patientId = parseInt(e.target.closest('button').getAttribute('data-id'));
                if (confirm('Voulez-vous vraiment supprimer ce patient ?')) {
                    deletePatient(patientId);
                }
            });
        });
    }

    // Formater une date (YYYY-MM-DD -> DD/MM/YYYY)
    function formatDate(dateString) {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    // Afficher les détails d'un patient
    function viewPatientDetails(patientId) {
        const patient = patients.find(p => p.id === patientId);
        const modal = document.getElementById('patientDetailsModal');
        const content = document.getElementById('patientDetailsContent');

        content.innerHTML = `
            <div class="patient-details-grid">
                <div>
                    <h3>Informations personnelles</h3>
                    <p><strong>Nom:</strong> ${patient.lastName}</p>
                    <p><strong>Prénom:</strong> ${patient.firstName}</p>
                    <p><strong>Date de naissance:</strong> ${formatDate(patient.birthDate)}</p>
                    <p><strong>Téléphone:</strong> ${patient.phone}</p>
                    <p><strong>Dernière visite:</strong> ${formatDate(patient.lastVisit)}</p>
                </div>
                <div>
                    <h3>Historique médical</h3>
                    <p>Aucun historique disponible pour l'instant.</p>
                </div>
            </div>
        `;

        modal.style.display = 'block';
    }

    // Modifier un patient
    function editPatient(patientId) {
        const patient = patients.find(p => p.id === patientId);
        const modal = document.getElementById('patientModal');
        const form = document.getElementById('patientForm');

        document.getElementById('patientModalTitle').textContent = 'Modifier Patient';
        document.getElementById('lastName').value = patient.lastName;
        document.getElementById('firstName').value = patient.firstName;
        document.getElementById('birthDate').value = patient.birthDate;
        document.getElementById('phone').value = patient.phone;

        modal.style.display = 'block';

        // Gérer la soumission du formulaire de modification
        form.onsubmit = function(e) {
            e.preventDefault();
            const updatedPatient = {
                id: patient.id,
                lastName: document.getElementById('lastName').value,
                firstName: document.getElementById('firstName').value,
                birthDate: document.getElementById('birthDate').value,
                phone: document.getElementById('phone').value
            };

            // Mettre à jour les données (simulation)
            const index = patients.findIndex(p => p.id === patientId);
            patients[index] = updatedPatient;

            alert('Patient mis à jour avec succès !');
            modal.style.display = 'none';
            renderPatients();
        };
    }

    // Supprimer un patient
    function deletePatient(patientId) {
        const index = patients.findIndex(p => p.id === patientId);
        patients.splice(index, 1);
        renderPatients();
    }

    // Gestion du modal pour les patients
    const patientModal = document.getElementById('patientModal');
    const detailsModal = document.getElementById('patientDetailsModal');
    const newPatientBtn = document.getElementById('newPatientBtn');
    const closeButtons = document.querySelectorAll('.close');
    const patientForm = document.getElementById('patientForm');

    newPatientBtn.onclick = function() {
        patientModal.style.display = 'block';
        document.getElementById('patientModalTitle').textContent = 'Nouveau Patient';
        patientForm.reset();
    };

    closeButtons.forEach(btn => {
        btn.onclick = function() {
            patientModal.style.display = 'none';
            detailsModal.style.display = 'none';
        };
    });

    window.onclick = function(event) {
        if (event.target == patientModal) {
            patientModal.style.display = 'none';
        }
        if (event.target == detailsModal) {
            detailsModal.style.display = 'none';
        }
    };

    // Soumission du formulaire pour un nouveau patient
    patientForm.onsubmit = function(e) {
        e.preventDefault();
        const newPatient = {
            id: patients.length + 1,
            lastName: document.getElementById('lastName').value,
            firstName: document.getElementById('firstName').value,
            birthDate: document.getElementById('birthDate').value,
            phone: document.getElementById('phone').value,
            lastVisit: new Date().toISOString().split('T')[0]
        };

        patients.push(newPatient);
        alert('Patient ajouté avec succès !');
        patientModal.style.display = 'none';
        renderPatients();
    };

    // Recherche de patients
    document.getElementById('searchPatient').addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const filteredPatients = patients.filter(patient =>
            patient.lastName.toLowerCase().includes(searchTerm) ||
            patient.firstName.toLowerCase().includes(searchTerm) ||
            patient.phone.includes(searchTerm)
        );

        const tableBody = document.querySelector('#patientsTable tbody');
        tableBody.innerHTML = '';

        filteredPatients.forEach(patient => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${patient.id}</td>
                <td>${patient.lastName}</td>
                <td>${patient.firstName}</td>
                <td>${formatDate(patient.birthDate)}</td>
                <td>${patient.phone}</td>
                <td>${formatDate(patient.lastVisit)}</td>
                <td>
                    <button class="btn btn-small btn-primary view-btn" data-id="${patient.id}"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-small btn-warning edit-btn" data-id="${patient.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-small btn-danger delete-btn" data-id="${patient.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    });

    // Initialisation
    renderPatients();
});