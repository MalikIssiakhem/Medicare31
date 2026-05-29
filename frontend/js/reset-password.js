function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

const alertBox = document.getElementById("alertBox");
const alertText = document.getElementById("alertText");
const form = document.getElementById("resetPasswordForm");

function showError(message) {
  alertText.textContent = message;
  alertBox.classList.add("show");
}

function clearError() {
  alertBox.classList.remove("show");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  const password = document.getElementById("password").value.trim();
  const confirmPassword = document
    .getElementById("confirmPassword")
    .value.trim();
  const token = getQueryParam("token");

  if (!token) {
    showError("Lien invalide : aucun token trouvé.");
    return;
  }

  if (password.length < 8) {
    showError("Le mot de passe doit contenir au moins 8 caractères.");
    return;
  }

  if (password !== confirmPassword) {
    showError("Les mots de passe ne correspondent pas.");
    return;
  }

  try {
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    if (!response.ok) {
      const body = await response.json();
      showError(body.detail || "Impossible de réinitialiser le mot de passe.");
      return;
    }

    window.location.href = "login.html?reset=success";
  } catch (error) {
    showError("Impossible de contacter le serveur. Réessayez plus tard.");
  }
});
