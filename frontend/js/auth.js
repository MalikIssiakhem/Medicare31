const AUTH_TOKEN_KEY = "medicare_token";
const AUTH_USER_KEY = "medicare_user";

function authGuard() {
  if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
    window.location.replace("login.html");
  }
}

const _STAFF_ROLES = ["medecin", "secretariat", "admin"];

function staffGuard() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
    window.location.replace("login.html");
    return;
  }
  const user = getUser();
  if (!_STAFF_ROLES.includes(user.role)) {
    window.location.replace("index2.html");
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

function toggleUserMenu(e) {
  e.stopPropagation();
  const dropdown = document.getElementById("userDropdown");
  const btn = document.getElementById("userMenuBtn");
  if (!dropdown) return;
  const isOpen = dropdown.classList.toggle("open");
  if (btn) btn.classList.toggle("open", isOpen);
}

function confirmLogout() {
  const dropdown = document.getElementById("userDropdown");
  const btn = document.getElementById("userMenuBtn");
  if (dropdown) dropdown.classList.remove("open");
  if (btn) btn.classList.remove("open");
  const overlay = document.getElementById("logoutOverlay");
  if (overlay) overlay.classList.add("open");
}

function closeLogoutModal() {
  const overlay = document.getElementById("logoutOverlay");
  if (overlay) overlay.classList.remove("open");
}

document.addEventListener("click", () => {
  const dropdown = document.getElementById("userDropdown");
  const btn = document.getElementById("userMenuBtn");
  if (dropdown) dropdown.classList.remove("open");
  if (btn) btn.classList.remove("open");
});

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
