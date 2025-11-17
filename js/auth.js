document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Vérification basique (à remplacer par une requête API réelle)
        if (email === 'admin@cabinet.fr' && password === 'password') {
            // Stockage simulé de l'utilisateur connecté
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('userRole', 'admin');
            localStorage.setItem('userName', 'Dr. Dupont Jean');

            // Redirection vers le tableau de bord
            window.location.href = 'dashboard.html';
        } else {
            alert('Email ou mot de passe incorrect.');
        }
    });

    // Vérifier si l'utilisateur est déjà connecté
    if (localStorage.getItem('isAuthenticated') === 'true') {
        window.location.href = 'dashboard.html';
    }
});