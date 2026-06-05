authGuard();
initUserNav();

const _EDITABLE = [
  "civilite", "prenom", "nom", "sexe", "numero_securite_sociale",
  "groupe_sanguin", "allergie_resume",
  "email", "telephone_principal", "telephone_secondaire",
  "adresse_ligne1", "adresse_ligne2", "code_postal", "ville", "pays",
];
const _MAX_PHOTO = 3 * 1024 * 1024;

let _initials = "MC";

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${getToken()}`, ...extra };
}

function _setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

function _msg(text, ok) {
  const el = document.getElementById("profileMsg");
  el.textContent = text;
  el.className = "profile-msg " + (ok ? "ok" : "err");
}

async function loadProfile() {
  try {
    const res = await fetch("/api/profile", { headers: authHeaders() });
    if (!res.ok) throw new Error("profil");
    const p = await res.json();

    _EDITABLE.forEach((f) => _setVal(f, p[f]));
    _setVal("date_naissance", p.date_naissance);
    _setVal("numero_dossier", p.numero_dossier);

    _initials = (((p.prenom || "")[0] || "") + ((p.nom || "")[0] || "")).toUpperCase() || "MC";

    _msg("", true);
    loadPhoto(p.has_photo);
  } catch (e) {
    _msg("Impossible de charger votre profil.", false);
  }
}

async function loadPhoto(hasPhoto) {
  const av = document.getElementById("avatarLg");
  if (!av) return;
  if (!hasPhoto) {
    av.textContent = _initials;
    return;
  }
  try {
    const res = await fetch("/api/profile/photo", { headers: authHeaders() });
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    av.innerHTML = `<img src="${url}" alt="Photo de profil">`;
  } catch (e) {
    av.textContent = _initials;
  }
}

async function saveProfile() {
  const nom = document.getElementById("nom").value.trim();
  const prenom = document.getElementById("prenom").value.trim();
  if (!nom || !prenom) {
    _msg("Le nom et le prénom sont obligatoires.", false);
    return;
  }

  const payload = {};
  _EDITABLE.forEach((f) => {
    payload[f] = document.getElementById(f).value;
  });
  const dn = document.getElementById("date_naissance").value;
  if (dn) payload.date_naissance = dn;

  const btn = document.getElementById("saveBtn");
  btn.disabled = true;
  btn.textContent = "Enregistrement…";
  try {
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      _msg(data.detail || "Erreur lors de l'enregistrement.", false);
    } else {
      _msg("Profil enregistré.", true);
      // rafraîchit le nom affiché dans la navbar
      const user = getUser();
      user.nom = data.nom;
      user.prenom = data.prenom;
      localStorage.setItem("medicare_user", JSON.stringify(user));
      initUserNav();
    }
  } catch (e) {
    _msg("Erreur serveur. Réessayez.", false);
  } finally {
    btn.disabled = false;
    btn.textContent = "Enregistrer";
  }
}

async function uploadPhoto(file) {
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    _msg("Format non supporté (JPEG, PNG ou WEBP).", false);
    return;
  }
  if (file.size > _MAX_PHOTO) {
    _msg("Image trop volumineuse (max 3 Mo).", false);
    return;
  }
  const fd = new FormData();
  fd.append("file", file);
  try {
    const res = await fetch("/api/profile/photo", {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      _msg(data.detail || "Échec de l'import de la photo.", false);
      return;
    }
    _msg("Photo mise à jour.", true);
    loadPhoto(true);
  } catch (e) {
    _msg("Erreur lors de l'import de la photo.", false);
  }
}

async function loadVitals() {
  const note = document.getElementById("vitalsNote");
  try {
    const res = await fetch("/api/medical/vitals", { headers: authHeaders() });
    const v = res.ok ? await res.json() : {};
    _setVal("v_taille", v.taille_cm ? `${(v.taille_cm / 100).toFixed(2).replace(".", ",")} m` : "Non renseigné");
    _setVal("v_poids", v.poids_kg ? `${v.poids_kg} kg` : "Non renseigné");
    _setVal("v_tension", v.tension_arterielle ? `${v.tension_arterielle} mmHg` : "Non renseigné");
    if (v.date_mesure) {
      const d = new Date(v.date_mesure);
      note.textContent = `Dernière mesure le ${d.toLocaleDateString("fr-FR")}, relevée en consultation.`;
    } else {
      note.textContent = "Aucune mesure enregistrée. Vos constantes seront relevées lors de votre prochaine consultation.";
    }
  } catch (e) {
    if (note) note.textContent = "";
  }
}

document.getElementById("photoInput").addEventListener("change", (e) => {
  uploadPhoto(e.target.files[0]);
  e.target.value = "";
});

loadProfile();
loadVitals();
