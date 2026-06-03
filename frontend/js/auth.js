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

function openChangePassword() {
  const dropdown = document.getElementById("userDropdown");
  const btn = document.getElementById("userMenuBtn");
  if (dropdown) dropdown.classList.remove("open");
  if (btn) btn.classList.remove("open");

  let overlay = document.getElementById("changePwdOverlay");
  if (!overlay) overlay = _buildChangePwdOverlay();

  const msg = document.getElementById("cp-msg");
  if (msg) msg.textContent = "";
  ["cp-current", "cp-new", "cp-confirm"].forEach((id) => {
    const f = document.getElementById(id);
    if (f) f.value = "";
  });
  overlay.style.display = "flex";
}

function closeChangePassword() {
  const overlay = document.getElementById("changePwdOverlay");
  if (overlay) overlay.style.display = "none";
}

async function submitChangePassword() {
  const cur = document.getElementById("cp-current").value;
  const nw = document.getElementById("cp-new").value;
  const cf = document.getElementById("cp-confirm").value;
  const msg = document.getElementById("cp-msg");
  const btn = document.getElementById("cp-submit");

  msg.style.color = "#ef4444";
  if (!cur || !nw || !cf) {
    msg.textContent = "Veuillez remplir tous les champs.";
    return;
  }
  if (nw.length < 8) {
    msg.textContent = "Le nouveau mot de passe doit faire au moins 8 caractères.";
    return;
  }
  if (nw !== cf) {
    msg.textContent = "Les deux mots de passe ne correspondent pas.";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Modification…";
  try {
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + getToken(),
      },
      body: JSON.stringify({ current_password: cur, new_password: nw }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      msg.textContent = data.detail || "Erreur lors du changement de mot de passe.";
      btn.disabled = false;
      btn.textContent = "Changer le mot de passe";
      return;
    }
    msg.style.color = "#16a34a";
    msg.textContent = "Mot de passe modifié. Un e-mail de confirmation vous a été envoyé.";
    btn.disabled = false;
    btn.textContent = "Changer le mot de passe";
    setTimeout(closeChangePassword, 1700);
  } catch (e) {
    msg.textContent = "Erreur serveur. Vérifiez que le backend est lancé.";
    btn.disabled = false;
    btn.textContent = "Changer le mot de passe";
  }
}

function _buildChangePwdOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "changePwdOverlay";
  overlay.style.cssText =
    "display:none;position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(3px);z-index:3000;align-items:center;justify-content:center;padding:20px";
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeChangePassword();
  });

  const fieldStyle =
    "width:100%;box-sizing:border-box;padding:11px 13px;border:1px solid #d8e2ef;border-radius:10px;font-size:14px;color:#1e2d45;outline:none;margin-top:6px";
  const labelStyle =
    "display:block;font-size:13px;font-weight:600;color:#4a5f7a;margin-top:16px";

  overlay.innerHTML = `
    <div onclick="event.stopPropagation()" style="background:#fff;border-radius:16px;padding:30px 28px 24px;width:100%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,.22)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
        <div style="width:42px;height:42px;background:#eaf1fb;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2c5f9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <div style="font-size:17px;font-weight:700;color:#1e2d45">Changer mon mot de passe</div>
      </div>
      <label style="${labelStyle}">Mot de passe actuel
        <input type="password" id="cp-current" style="${fieldStyle}" autocomplete="current-password">
      </label>
      <label style="${labelStyle}">Nouveau mot de passe
        <input type="password" id="cp-new" style="${fieldStyle}" autocomplete="new-password">
      </label>
      <label style="${labelStyle}">Confirmer le nouveau mot de passe
        <input type="password" id="cp-confirm" style="${fieldStyle}" autocomplete="new-password">
      </label>
      <div id="cp-msg" style="font-size:13px;color:#ef4444;min-height:18px;margin-top:14px"></div>
      <div style="display:flex;gap:10px;margin-top:8px">
        <button onclick="closeChangePassword()" style="flex:1;padding:11px;border:1px solid #d8e2ef;background:#fff;color:#4a5f7a;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer">Annuler</button>
        <button id="cp-submit" onclick="submitChangePassword()" style="flex:1.4;padding:11px;border:none;background:#2c5f9e;color:#fff;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">Changer le mot de passe</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  return overlay;
}

function _injectChangePwdMenuItem() {
  const dropdown = document.getElementById("userDropdown");
  if (!dropdown || document.getElementById("cp-menu-item")) return;
  const item = document.createElement("div");
  item.className = "dropdown-item";
  item.id = "cp-menu-item";
  item.setAttribute("onclick", "openChangePassword()");
  item.style.color = "#2c5f9e";
  item.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    Changer mon mot de passe`;
  dropdown.insertBefore(item, dropdown.firstChild);
}

document.addEventListener("DOMContentLoaded", _injectChangePwdMenuItem);
