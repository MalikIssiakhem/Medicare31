const AUTH_TOKEN_KEY = "medicare_token";
const AUTH_USER_KEY = "medicare_user";

function authGuard() {
  if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
    window.location.replace("login.html");
  }
}

function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USER_KEY) || "{}");
  } catch {
    return {};
  }
}

function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  window.location.replace("login.html");
}

function initUserNav() {
  const user = getUser();
  if (!user.nom) return;
  const nameEl = document.getElementById("user-nav-name");
  const avatarEl = document.getElementById("user-nav-avatar");
  if (nameEl) {
    const prefix = user.role === "medecin" ? "Dr. " : "";
    nameEl.textContent = prefix + user.prenom + " " + user.nom;
  }
  if (avatarEl) {
    avatarEl.textContent = (user.prenom[0] || "") + (user.nom[0] || "");
  }
}
