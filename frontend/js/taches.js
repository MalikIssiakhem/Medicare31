authGuard();
initUserNav();
accessGuard();

function accessGuard() {
  const user = getUser();
  const role = (user.role || "").toLowerCase();
  if (
    role &&
    !["secretaire", "secretariat", "secretaria", "secretary", "secret"].some(
      (keyword) => role.includes(keyword),
    )
  ) {
    window.location.href = "index.html";
  }
}

function toggleTask(cb) {
  const task = cb.parentElement;
  const isDone = !cb.classList.contains("checked");

  cb.classList.toggle("checked");
  task.dataset.status = isDone ? "done" : "pending";

  const label = task.querySelector(".task-label");
  if (label) {
    label.classList.toggle("done", isDone);
  }

  const badge = task.querySelector(".badge");
  if (badge) {
    if (isDone) {
      badge.textContent = "Fait";
      badge.classList.add("badge-green");
      badge.classList.remove("badge-blue", "badge-gold");
    } else {
      badge.textContent = badge.dataset.original || badge.textContent;
      badge.classList.toggle("badge-blue", badge.dataset.priority !== "urgent");
      badge.classList.toggle("badge-gold", badge.dataset.priority === "urgent");
      badge.classList.remove("badge-green");
    }
  }

  updateSummary();
}

function addTask() {
  const label = prompt("Nouvelle tâche secrétariat :");
  if (!label || !label.trim()) return;

  const list = document.querySelector(".task-list");
  if (!list) return;

  const item = document.createElement("div");
  item.className = "task-item";
  item.dataset.status = "pending";
  item.dataset.priority = "normal";
  item.innerHTML = `
    <div class="task-cb" onclick="toggleTask(this)">
      <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
    </div>
    <div class="task-content">
      <span class="task-label">${escapeHtml(label.trim())}</span>
      <span class="task-meta">Ajoutée manuellement</span>
    </div>
    <span class="badge badge-blue" data-priority="normal" data-original="Normal">Normal</span>
  `;
  list.appendChild(item);
  updateSummary();
}

function markAllDone() {
  document.querySelectorAll(".task-item").forEach((task) => {
    const cb = task.querySelector(".task-cb");
    if (cb && !cb.classList.contains("checked")) {
      cb.classList.add("checked");
      task.dataset.status = "done";
      const label = task.querySelector(".task-label");
      if (label) label.classList.add("done");
      const badge = task.querySelector(".badge");
      if (badge) {
        badge.textContent = "Fait";
        badge.classList.add("badge-green");
        badge.classList.remove("badge-blue", "badge-gold");
      }
    }
  });
  updateSummary();
}

function filterTasks(filter) {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });

  document.querySelectorAll(".task-item").forEach((task) => {
    const status = task.dataset.status || "pending";
    const priority = task.dataset.priority || "normal";
    let visible = true;

    if (filter === "pending") {
      visible = status === "pending";
    } else if (filter === "done") {
      visible = status === "done";
    } else if (filter === "urgent") {
      visible = priority === "urgent";
    }

    task.classList.toggle("hidden", !visible);
  });
}

function updateSummary() {
  const tasks = Array.from(document.querySelectorAll(".task-item"));
  const doneCount = tasks.filter((task) =>
    task.querySelector(".task-cb").classList.contains("checked"),
  ).length;
  const urgentCount = tasks.filter(
    (task) => task.dataset.priority === "urgent",
  ).length;
  const total = tasks.length;
  const pending = total - doneCount;

  document.getElementById("totalTasks").textContent = total;
  document.getElementById("pendingTasks").textContent = pending;
  document.getElementById("urgentTasks").textContent = urgentCount;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.addEventListener("DOMContentLoaded", updateSummary);
