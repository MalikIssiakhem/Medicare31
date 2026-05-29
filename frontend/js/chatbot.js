(function () {
  const STORAGE_KEY = "medicare_chatbot_history";
  const WELCOME = "Bonjour, je suis l'assistant MediCare31. Je peux aider avec l'agenda, les patients, les messages et les documents.";

  function token() {
    if (typeof getToken === "function") return getToken();
    return localStorage.getItem("medicare_token") || localStorage.getItem("access_token");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function history() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveHistory(items) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-20)));
  }

  function addMessage(role, text, actions, persist = true) {
    const log = document.getElementById("mc-chat-log");
    if (!log) return;

    const row = document.createElement("div");
    row.className = `mc-message ${role}`;
    row.innerHTML = `<div class="mc-bubble">${escapeHtml(text)}</div>`;

    if (actions && actions.length) {
      const actionWrap = document.createElement("div");
      actionWrap.className = "mc-actions";
      actions.forEach((action) => {
        const link = document.createElement("a");
        link.href = action.path;
        link.textContent = action.label;
        actionWrap.appendChild(link);
      });
      row.appendChild(actionWrap);
    }

    log.appendChild(row);
    log.scrollTop = log.scrollHeight;

    if (persist) {
      const items = history();
      items.push({ role, text, actions: actions || [] });
      saveHistory(items);
    }
  }

  function renderSuggestions(items) {
    const wrap = document.getElementById("mc-suggestions");
    if (!wrap) return;
    wrap.innerHTML = "";
    (items || []).slice(0, 3).forEach((label) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.addEventListener("click", () => send(label));
      wrap.appendChild(btn);
    });
  }

  function setBusy(isBusy) {
    const sendBtn = document.getElementById("mc-send");
    const input = document.getElementById("mc-input");
    if (sendBtn) sendBtn.disabled = isBusy;
    if (input) input.disabled = isBusy;
  }

  async function send(value) {
    const input = document.getElementById("mc-input");
    const text = String(value || (input && input.value) || "").trim();
    if (!text) return;
    if (input) input.value = "";

    addMessage("user", text);
    renderSuggestions([]);
    setBusy(true);

    try {
      const res = await fetch("/api/chatbot/message", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text }),
      });

      if (res.status === 401 && typeof logout === "function") {
        logout();
        return;
      }
      if (!res.ok) throw new Error("Erreur chatbot");

      const data = await res.json();
      addMessage("bot", data.reply || "Je n'ai pas trouvé de réponse.", data.actions || []);
      renderSuggestions(data.suggestions || []);
    } catch (error) {
      addMessage("bot", "Je n'arrive pas à répondre pour le moment. Réessayez dans un instant.");
      renderSuggestions(["Mon prochain rendez-vous", "Ouvrir l'agenda", "Messagerie"]);
    } finally {
      setBusy(false);
      if (input) input.focus();
    }
  }

  function mount() {
    if (!token() || document.getElementById("mc-chatbot")) return;

    const root = document.createElement("div");
    root.id = "mc-chatbot";
    root.innerHTML = `
      <button class="mc-launcher" id="mc-launcher" type="button" aria-label="Ouvrir l'assistant">AI</button>
      <section class="mc-panel" id="mc-panel" aria-label="Assistant MediCare31">
        <header class="mc-header">
          <div>
            <strong>Assistant</strong>
            <span>MediCare31</span>
          </div>
          <button type="button" id="mc-close" aria-label="Fermer">×</button>
        </header>
        <div class="mc-log" id="mc-chat-log"></div>
        <div class="mc-suggestions" id="mc-suggestions"></div>
        <form class="mc-form" id="mc-form">
          <input id="mc-input" type="text" autocomplete="off" placeholder="Écrire une question..." />
          <button id="mc-send" type="submit">Envoyer</button>
        </form>
      </section>
    `;
    document.body.appendChild(root);

    const panel = document.getElementById("mc-panel");
    const launcher = document.getElementById("mc-launcher");
    const close = document.getElementById("mc-close");
    const form = document.getElementById("mc-form");

    launcher.addEventListener("click", () => {
      panel.classList.toggle("open");
      if (panel.classList.contains("open")) document.getElementById("mc-input").focus();
    });
    close.addEventListener("click", () => panel.classList.remove("open"));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      send();
    });

    const items = history();
    if (items.length) {
      items.forEach((item) => addMessage(item.role, item.text, item.actions, false));
    } else {
      addMessage("bot", WELCOME);
    }
    renderSuggestions(["Mon prochain rendez-vous", "Créer un rendez-vous", "Ouvrir la messagerie"]);
  }

  window.addEventListener("DOMContentLoaded", mount);
})();
