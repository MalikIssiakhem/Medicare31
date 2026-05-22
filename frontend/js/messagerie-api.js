let conversations = [];
let users = [];
let currentUser = null;
let currentConv = null;
let currentFilter = "all";
let currentFolder = "inbox";
let replyMsg = null;
let selectedContact = null;

window.__blockConvClick = false;

function token() {
  return localStorage.getItem("medicare_token") || localStorage.getItem("access_token");
}

function authHeaders(extra = {}) {
  return {
    ...extra,
    Authorization: "Bearer " + token()
  };
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: authHeaders(options.headers || {})
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    localStorage.clear();
    window.location.href = "login.html";
    throw new Error("Not authenticated");
  }

  if (!response.ok) {
    throw new Error(data.detail || "Erreur API");
  }

  return data;
}

function displayName(user) {
  if (!user) return "Utilisateur";

  const full = `${user.prenom || ""} ${user.nom || ""}`.trim();
  return full || user.email || "Utilisateur";
}

function initials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .map(word => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "??";
}

function roleLabel(role) {
  if (role === "medecin") return "Médecin";
  if (role === "secretariat") return "Secrétariat";
  if (role === "patient") return "Patient";
  if (role === "admin") return "Admin";
  if (role === "patients") return "Patient";
  if (role === "equipe") return "Équipe";
  return role || "Utilisateur";
}

function avatarColor(id) {
  const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#14b8a6", "#ef4444", "#6366f1"];
  return colors[Math.abs(Number(id || 1)) % colors.length];
}

function formatTime(value) {
  if (!value) return "";

  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function messageTime(value) {
  if (!value) return "";

  return new Date(value).toLocaleString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function messageDate(value) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function otherParticipants(conv) {
  if (!currentUser) return conv.participants || [];
  return (conv.participants || []).filter(p => p.id_user !== currentUser.id_user);
}

function convName(conv) {
  const others = otherParticipants(conv);

  if (!others.length) return "Moi";

  return others.map(displayName).join(", ");
}

function convRole(conv) {
  const others = otherParticipants(conv);

  if (!others.length) return "";

  return roleLabel(others[0].role);
}

function convAvatar(conv) {
  const name = convName(conv);
  const first = otherParticipants(conv)[0] || currentUser || { id_user: 1 };

  return {
    initials: initials(name),
    color: avatarColor(first.id_user || 1)
  };
}

function isUnread(conv) {
  return (conv.unread_count || 0) > 0;
}

function isPatientConversation(conv) {
  const others = otherParticipants(conv);

  if (others.length > 0) {
    return others.some(user => user.role === "patient");
  }

  return conv.category === "patients";
}

function isEquipeConversation(conv) {
  const others = otherParticipants(conv);

  if (others.length > 0) {
    return others.some(user =>
      user.role === "medecin" ||
      user.role === "secretariat" ||
      user.role === "admin"
    );
  }

  return conv.category === "equipe";
}

async function init() {
  if (!token()) {
    window.location.href = "login.html";
    return;
  }

  try {
    currentUser = await api("/api/auth/me");
  } catch (error) {
    console.error("Erreur auth/me:", error);
    showToast(error.message || "Erreur d'authentification");
    return;
  }

  updateLoggedUserUI();

  try {
    users = await api("/api/messages/users");
  } catch (error) {
    console.error("Erreur chargement utilisateurs:", error);
  }

  try {
    await loadConversations(false);
  } catch (error) {
    console.error("Erreur chargement conversations:", error);
    showToast(error.message || "Erreur de chargement");
  }
}

function updateLoggedUserUI() {
  const chipName = document.querySelector(".user-chip span");
  const avatar = document.querySelector(".user-chip .u-avatar");

  if (!currentUser) return;

  const name = displayName(currentUser);

  if (chipName) {
    chipName.textContent = currentUser.role === "medecin" ? `Dr. ${name}` : name;
  }

  if (avatar) {
    avatar.textContent = initials(name);
  }
}

async function loadConversations(archived = false) {
  currentFolder = archived ? "archive" : "inbox";
  currentConv = null;

  conversations = await api(`/api/messages/conversations?archived=${archived ? "true" : "false"}`);
  conversations.sort(sortConversations);

  await updateFolderCounts();
  renderConvList(getFilteredConvs());
  showEmptyChat();
}

function sortConversations(a, b) {
  const dateA = new Date(a.last_message_at || a.updated_at || a.created_at || 0).getTime();
  const dateB = new Date(b.last_message_at || b.updated_at || b.created_at || 0).getTime();

  return dateB - dateA;
}

function getContactsForCurrentUser() {
  if (!currentUser) return [];
  if (currentUser.role === "patient") {
    return users.filter(u => u.role === "medecin" || u.role === "secretariat");
  }
  return users;
}

function renderContactList(search = "") {
  const el = document.getElementById("contactList");
  if (!el) return;

  const lSearch = search.trim().toLowerCase();
  let contacts = getContactsForCurrentUser();

  if (lSearch) {
    contacts = contacts.filter(u => {
      return displayName(u).toLowerCase().includes(lSearch) ||
             (u.email || "").toLowerCase().includes(lSearch);
    });
  }

  if (!contacts.length) {
    el.innerHTML = `<div class="contact-empty">Aucun contact trouvé</div>`;
    return;
  }

  const roleOrder = ["medecin", "secretariat", "admin", "patient"];
  const groups = {};
  contacts.forEach(u => {
    const r = u.role || "other";
    if (!groups[r]) groups[r] = [];
    groups[r].push(u);
  });

  const sortedRoles = Object.keys(groups).sort((a, b) => {
    const ia = roleOrder.indexOf(a);
    const ib = roleOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  let html = "";
  sortedRoles.forEach(role => {
    html += `<div class="contact-group-title">${escapeHtml(roleLabel(role))}</div>`;
    groups[role].forEach(u => {
      const name = displayName(u);
      const color = avatarColor(u.id_user);
      const isSelected = selectedContact && selectedContact.id_user === u.id_user;
      html += `
        <div class="contact-item${isSelected ? " selected" : ""}" onclick="selectContact(${u.id_user})">
          <div class="contact-avatar" style="background:${color}">${escapeHtml(initials(name))}</div>
          <div class="contact-info">
            <div class="contact-name">${escapeHtml(name)}</div>
            <div class="contact-role-label">${escapeHtml(roleLabel(u.role))}</div>
          </div>
          ${isSelected ? `<svg class="contact-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>` : ""}
        </div>
      `;
    });
  });

  el.innerHTML = html;
}

function selectContact(userId) {
  const user = users.find(u => u.id_user === userId);
  if (!user) return;

  selectedContact = user;

  const cTo = document.getElementById("cTo");
  if (cTo) cTo.value = displayName(user);

  filterContactList();
}

function filterContactList() {
  const search = document.getElementById("contactSearch")?.value || "";
  renderContactList(search);
}

function onComposeToClear() {
  selectedContact = null;
  filterContactList();
}

async function getActiveAndArchivedConversationsForCounts() {
  const activePromise = currentFolder === "archive"
    ? api("/api/messages/conversations?archived=false")
    : Promise.resolve(conversations);

  const archivedPromise = currentFolder === "archive"
    ? Promise.resolve(conversations)
    : api("/api/messages/conversations?archived=true");

  const [active, archived] = await Promise.all([activePromise, archivedPromise]);

  return { active, archived };
}

async function updateFolderCounts() {
  try {
    const { active, archived } = await getActiveAndArchivedConversationsForCounts();

    const activeUnreadCount = active.filter(isUnread).length;
    const archivedUnreadCount = archived.filter(isUnread).length;
    const urgentCount = active.filter(c => c.priority === "urgent").length;
    const sentCount = active.filter(c => currentUser && c.created_by_user_id === currentUser.id_user).length;

    setFolderCount("inbox", active.length, true);
    setFolderCount("sent", sentCount, true);
    setFolderCount("urgent", urgentCount, true);
    setFolderCount("archive", archivedUnreadCount, false);

    updateUnreadFolderLabel(activeUnreadCount);
    updateSideMessageBadge(activeUnreadCount);
  } catch (error) {
    console.error("Counts error:", error);
  }
}

function setFolderCount(folder, count, showZero = true) {
  const item = document.querySelector(`.folder-item[onclick*="'${folder}'"] .folder-count`);

  if (!item) return;

  item.textContent = count;
  item.style.display = count > 0 || showZero ? "inline-flex" : "none";
}

function updateUnreadFolderLabel(count) {
  const item = document.querySelector(`.folder-item[onclick*="'unread'"] .folder-count`);

  if (!item) return;

  item.textContent = count;
  item.style.display = count > 0 ? "inline-flex" : "none";
}

function updateSideMessageBadge(count) {
  const badges = document.querySelectorAll(".side-badges");

  badges.forEach(badge => {
    badge.textContent = count;
    badge.style.display = count > 0 ? "inline-flex" : "none";
  });
}

function renderConvList(list) {
  const el = document.getElementById("convList");
  if (!el) return;

  if (!list.length) {
    el.innerHTML = `
      <div style="padding:30px;text-align:center;color:var(--text-light);font-size:.84rem">
        Aucune conversation trouvée
      </div>
    `;
    return;
  }

  el.innerHTML = list.map(c => {
    const av = convAvatar(c);
    const name = convName(c);
    const unread = c.unread_count || 0;
    const preview = c.last_message || "Aucun message";
    const time = formatTime(c.last_message_at || c.updated_at || c.created_at);
    const tagClass = c.priority === "urgent" ? "tag-red" : "tag-blue";
    const other = otherParticipants(c)[0];
    const tagText = c.priority === "urgent" ? "Urgent" : roleLabel(other?.role || c.category);
    const active = currentConv?.id_thread === c.id_thread ? "active" : "";
    const unreadClass = unread > 0 ? "unread" : "";

    const actionButton = currentFolder === "archive"
      ? `<button type="button" onclick="unarchiveConversationById(${c.id_thread})">Restaurer</button>`
      : `<button type="button" onclick="archiveConversationById(${c.id_thread})">Archiver</button>`;

    return `
      <div class="conv-item ${active} ${unreadClass}"
           onclick="openConv(${c.id_thread})"
           data-id="${c.id_thread}">

        <div class="conv-avatar" style="background:${av.color}">
          ${escapeHtml(av.initials)}
          <div class="online-dot"></div>
        </div>

        <div class="conv-body">
          <div class="conv-top">
            <div class="conv-name">${escapeHtml(name)}</div>
            <div class="conv-time ${unread > 0 ? "bold" : ""}">${escapeHtml(time)}</div>
          </div>

          <div class="conv-preview">${escapeHtml(preview)}</div>

          <div class="conv-tags">
            <span class="tag ${tagClass}">${escapeHtml(tagText)}</span>
          </div>
        </div>

        ${unread > 0 ? `<div class="unread-badge">${unread}</div>` : ""}

        <div class="conv-menu-wrap" onclick="event.stopPropagation()">
          <button type="button" class="conv-menu-btn" onclick="toggleConvMenu(event, ${c.id_thread})">⋮</button>

          <div class="conv-menu" id="conv-menu-${c.id_thread}">
            ${actionButton}
            <button type="button" class="danger" onclick="deleteConversationById(${c.id_thread})">Supprimer</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function toggleConvMenu(event, threadId) {
  event.stopPropagation();

  document.querySelectorAll(".conv-menu").forEach(menu => {
    if (menu.id !== `conv-menu-${threadId}`) {
      menu.classList.remove("show");
    }
  });

  const menu = document.getElementById(`conv-menu-${threadId}`);
  if (menu) menu.classList.toggle("show");
}

document.addEventListener("click", () => {
  document.querySelectorAll(".conv-menu").forEach(menu => {
    menu.classList.remove("show");
  });
});


async function archiveConversationById(threadId) {
  try {
    await api(`/api/messages/conversations/${threadId}/archive`, {
      method: "PATCH"
    });

    conversations = conversations.filter(c => c.id_thread !== threadId);

    if (currentConv && currentConv.id_thread === threadId) {
      currentConv = null;
      showEmptyChat();
    }

    await updateFolderCounts();
    renderConvList(getFilteredConvs());

    showToast("Conversation archivée");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Erreur archivage");
  }
}

async function unarchiveConversationById(threadId) {
  try {
    await api(`/api/messages/conversations/${threadId}/archive?archived=false`, {
      method: "PATCH"
    });

    conversations = conversations.filter(c => c.id_thread !== threadId);

    if (currentConv && currentConv.id_thread === threadId) {
      currentConv = null;
      showEmptyChat();
    }

    await updateFolderCounts();
    renderConvList(getFilteredConvs());

    showToast("Conversation restaurée");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Erreur restauration");
  }
}

async function deleteConversationById(threadId) {
  const ok = confirm("Voulez-vous vraiment supprimer cette conversation ?");
  if (!ok) return;

  try {
    await api(`/api/messages/conversations/${threadId}`, {
      method: "DELETE"
    });

    conversations = conversations.filter(c => c.id_thread !== threadId);

    if (currentConv && currentConv.id_thread === threadId) {
      currentConv = null;
      showEmptyChat();
    }

    await updateFolderCounts();
    renderConvList(getFilteredConvs());

    showToast("Conversation supprimée");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Erreur suppression");
  }
}

async function openConv(threadId) {
  try {
    const conv = await api(`/api/messages/conversations/${threadId}`);
    currentConv = conv;

    const index = conversations.findIndex(c => c.id_thread === threadId);

    if (index !== -1) {
      conversations[index] = {
        ...conversations[index],
        ...conv,
        unread_count: 0
      };
    }

    await updateFolderCounts();
    renderConvList(getFilteredConvs());

    const empty = document.getElementById("chatEmpty");
    const chatActive = document.getElementById("chatActive");

    if (empty) empty.style.display = "none";

    if (chatActive) {
      chatActive.style.display = "flex";
      chatActive.style.flexDirection = "column";
      chatActive.style.flex = "1";
      chatActive.style.overflow = "hidden";
    }

    renderChatHeader(conv);
    renderMessages(conv);
    renderInfoPanel(conv);
  } catch (error) {
    console.error(error);
    showToast(error.message || "Erreur ouverture conversation");
  }
}

function showEmptyChat() {
  const active = document.getElementById("chatActive");
  const empty = document.getElementById("chatEmpty");

  if (active) active.style.display = "none";
  if (empty) empty.style.display = "flex";
}

function renderChatHeader(conv) {
  const av = convAvatar(conv);
  const name = convName(conv);
  const role = convRole(conv);

  const header = document.getElementById("chatHeader");

  if (!header) return;

  const archiveButton = currentFolder === "archive"
    ? `<button class="icon-btn" title="Restaurer" onclick="unarchiveConversationById(${conv.id_thread})">
         <svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
       </button>`
    : `<button class="icon-btn" title="Archiver" onclick="archiveCurrentConversation()">
         <svg viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
       </button>`;

  header.innerHTML = `
    <div class="chat-header-avatar" style="background:${av.color}">
      ${escapeHtml(av.initials)}
      <div class="online-dot"></div>
    </div>

    <div class="chat-header-info">
      <div class="chat-header-name">${escapeHtml(name)}</div>
      <div class="chat-header-sub">${escapeHtml(role)} · <span style="color:var(--green);font-weight:600">En ligne</span></div>
    </div>

    <div class="chat-header-actions">
      <button class="icon-btn" title="Rechercher" onclick="showToast('Recherche bientôt disponible')">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </button>

      ${archiveButton}

      <button class="icon-btn" title="Infos" onclick="toggleInfo()">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </button>
    </div>
  `;
}

function renderMessages(conv) {
  const body = document.getElementById("chatBody");

  if (!body) return;

  let lastDate = null;
  let html = "";
  const messages = conv.messages || [];

  messages.forEach(m => {
    const isMe = m.sender_user_id === currentUser.id_user;
    const senderName = isMe ? "Moi" : displayName(m.sender);
    const av = {
      initials: initials(senderName),
      color: isMe ? "#2c5f9e" : avatarColor(m.sender_user_id)
    };

    const d = messageDate(m.sent_at);

    if (d !== lastDate) {
      html += `<div class="date-sep"><span>${escapeHtml(d)}</span></div>`;
      lastDate = d;
    }

    html += `
      <div class="msg-group ${isMe ? "outgoing" : "incoming"}">
        ${!isMe ? `<div class="msg-sender-name">${escapeHtml(senderName)}</div>` : ""}

        <div class="msg-row">
          <div class="msg-avatar-sm" style="background:${av.color}">${escapeHtml(av.initials)}</div>

          <div>
            <div class="bubble">${escapeHtml(m.body)}</div>
            <div class="msg-time-small">
              ${escapeHtml(messageTime(m.sent_at))}
              ${isMe ? '<span class="msg-status">✓✓</span>' : ""}
            </div>
          </div>
        </div>
      </div>
    `;
  });

  if (!html) {
    html = `<div style="padding:30px;text-align:center;color:var(--text-light)">Aucun message dans cette conversation.</div>`;
  }

  body.innerHTML = html;
  body.scrollTop = body.scrollHeight;
}

function renderInfoPanel(conv) {
  const av = convAvatar(conv);
  const name = convName(conv);
  const role = convRole(conv);
  const others = otherParticipants(conv);
  const main = others[0];

  const infoProfile = document.getElementById("infoProfile");

  if (infoProfile) {
    infoProfile.innerHTML = `
      <div class="info-avatar" style="background:${av.color}">${escapeHtml(av.initials)}</div>
      <div class="info-name">${escapeHtml(name)}</div>
      <div class="info-role">${escapeHtml(role)}</div>
      <div class="info-online"><span></span> En ligne maintenant</div>
    `;
  }

  const infoDetails = document.getElementById("infoDetails");

  if (infoDetails) {
    infoDetails.innerHTML = `
      <div class="info-section-title">Coordonnées</div>

      <div class="info-row">
        <svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/><polyline points="22,6 12,13 2,6"/></svg>
        ${escapeHtml(main?.email || "—")}
      </div>

      <div class="info-row">
        <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
        Conversation #${conv.id_thread}
      </div>
    `;
  }

  const files = document.getElementById("sharedFilesList");

  if (files) {
    files.innerHTML = `<div style="font-size:.78rem;color:var(--text-light)">Aucun fichier partagé</div>`;
  }
}

async function sendMessage() {
  const input = document.getElementById("msgInput");

  if (!input) return;

  const text = input.value.trim();

  if (!text || !currentConv) return;

  try {
    await api(`/api/messages/conversations/${currentConv.id_thread}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: text,
        is_urgent: false
      })
    });

    input.value = "";
    input.style.height = "auto";
    closeReply();

    await openConv(currentConv.id_thread);
    await refreshConversationsKeepCurrent();

    showToast("Message envoyé");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Erreur envoi message");
  }
}

async function sendComposed() {
  const toRaw = document.getElementById("cTo").value.trim().toLowerCase();
  const subject = document.getElementById("cSubject").value.trim() || "Nouvelle conversation";
  const body = document.getElementById("cBody").value.trim();
  const priority = document.getElementById("cPriority").value || "normal";

  if (!toRaw || !body) {
    showToast("Veuillez remplir les champs requis.");
    return;
  }

  const recipient = selectedContact || users.find(u =>
    String(u.email || "").toLowerCase() === toRaw ||
    displayName(u).toLowerCase() === toRaw
  );

  if (!recipient) {
    showToast("Destinataire introuvable. Sélectionnez un contact dans la liste.");
    return;
  }

  try {
    await api("/api/messages/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participant_ids: [recipient.id_user],
        sujet: subject,
        body: body,
        priority: priority,
        category: recipient.role === "patient" ? "patients" : "equipe"
      })
    });

    document.getElementById("composeModal").classList.remove("open");
    document.getElementById("cTo").value = "";
    document.getElementById("cSubject").value = "";
    document.getElementById("cBody").value = "";
    document.getElementById("cPriority").value = "normal";

    selectedContact = null;
    currentFolder = "inbox";
    currentFilter = "all";

    activateFilterButton("all");

    await loadConversations(false);

    showToast("Message envoyé avec succès. Cliquez sur la conversation pour l’ouvrir.");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Erreur création conversation");
  }
}

async function refreshConversationsKeepCurrent() {
  const archived = currentFolder === "archive";

  conversations = await api(`/api/messages/conversations?archived=${archived ? "true" : "false"}`);
  conversations.sort(sortConversations);

  await updateFolderCounts();
  renderConvList(getFilteredConvs());
}

async function archiveCurrentConversation() {
  if (!currentConv) return;

  await archiveConversationById(currentConv.id_thread);
}

function handleKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResize(ta) {
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
}

function getFilteredConvs() {
  const search = (document.getElementById("searchInput")?.value || "").toLowerCase();

  return conversations.filter(c => {
    const name = convName(c).toLowerCase();
    const preview = (c.last_message || "").toLowerCase();
    const subject = (c.sujet || "").toLowerCase();

    const matchSearch =
      !search ||
      name.includes(search) ||
      preview.includes(search) ||
      subject.includes(search);

    let matchFilter = true;

    if (currentFilter === "unread") {
      matchFilter = isUnread(c);
    }

    if (currentFilter === "patients") {
      matchFilter = isPatientConversation(c);
    }

    if (currentFilter === "equipe") {
      matchFilter = isEquipeConversation(c);
    }

    if (currentFolder === "sent") {
      matchFilter = matchFilter && currentUser && c.created_by_user_id === currentUser.id_user;
    }

    if (currentFolder === "urgent") {
      matchFilter = matchFilter && c.priority === "urgent";
    }

    return matchSearch && matchFilter;
  });
}

function filterConvs() {
  renderConvList(getFilteredConvs());
}

function filterPill(el, filter) {
  document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
  el.classList.add("active");

  currentFilter = filter;
  renderConvList(getFilteredConvs());
}

function activateFilterButton(filter) {
  document.querySelectorAll(".filter-pill").forEach(button => {
    button.classList.remove("active");

    if (button.getAttribute("onclick")?.includes(`'${filter}'`)) {
      button.classList.add("active");
    }
  });
}

async function setFolder(el, folder) {
  document.querySelectorAll(".folder-item").forEach(f => f.classList.remove("active"));
  el.classList.add("active");

  currentFolder = folder;
  currentConv = null;

  showEmptyChat();

  const archived = folder === "archive";

  conversations = await api(`/api/messages/conversations?archived=${archived ? "true" : "false"}`);
  conversations.sort(sortConversations);

  await updateFolderCounts();
  renderConvList(getFilteredConvs());
}

async function openCompose() {
  const modal = document.getElementById("composeModal");
  if (modal) modal.classList.add("open");

  selectedContact = null;

  const contactSearch = document.getElementById("contactSearch");
  if (contactSearch) contactSearch.value = "";

  if (!currentUser) {
    try {
      currentUser = await api("/api/auth/me");
      updateLoggedUserUI();
    } catch (error) {
      console.error("Erreur chargement utilisateur courant:", error);
    }
  }

  if (!users.length) {
    try {
      users = await api("/api/messages/users");
    } catch (error) {
      console.error("Erreur chargement contacts:", error);
    }
  }

  renderContactList();
}

function closeCompose(e) {
  if (e.target === document.getElementById("composeModal")) {
    document.getElementById("composeModal").classList.remove("open");
  }
}

function closeReply() {
  const el = document.getElementById("replyBanner");

  if (el) el.classList.remove("show");

  replyMsg = null;
}

function toggleInfo() {
  const panel = document.getElementById("infoPanel");

  if (panel) panel.classList.toggle("hidden");
}

function simulateAttach() {
  showToast("Pièces jointes bientôt disponibles avec l'API");
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toastMsg");

  if (!toast || !toastMsg) {
    alert(msg);
    return;
  }

  toastMsg.textContent = msg;
  toast.classList.add("show");

  setTimeout(() => toast.classList.remove("show"), 3000);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    const modal = document.getElementById("composeModal");

    if (modal) modal.classList.remove("open");
  }
});

document.addEventListener("DOMContentLoaded", init);