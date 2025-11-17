// Formater une date en français (ex: "Lundi 10 octobre 2023")
function formatFrenchDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
}

// Calculer l'âge à partir d'une date de naissance
function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
}

// Générer un identifiant unique
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Vérifier si un utilisateur est connecté
function isAuthenticated() {
    return localStorage.getItem('isAuthenticated') === 'true';
}

// Récupérer le rôle de l'utilisateur
function getUserRole() {
    return localStorage.getItem('userRole') || 'user';
}

// Récupérer le nom de l'utilisateur
function getUserName() {
    return localStorage.getItem('userName') || 'Utilisateur';
}

// Déconnecter l'utilisateur
function logout() {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    window.location.href = 'index.html';
}