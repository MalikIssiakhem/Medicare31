authGuard();
initUserNav();

function toggleTask(cb) {
  cb.classList.toggle("checked");

  const label = cb.parentElement.querySelector(".task-label");
  if (label) {
    label.classList.toggle("done");
  }
}

function addTask() {
  const label = prompt("Nouvelle tâche :");
  if (!label || !label.trim()) return;

  const taskCard = document.querySelector(".card:last-child");
  if (!taskCard) return;

  const footer = taskCard.querySelector(".task-footer");

  const item = document.createElement("div");
  item.className = "task-item";
  item.innerHTML = `
    <div class="task-cb" onclick="toggleTask(this)">
      <svg viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <span class="task-label">${escapeHtml(label.trim())}</span>
  `;

  if (footer) {
    taskCard.insertBefore(item, footer);
  } else {
    taskCard.appendChild(item);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/*
  Important:
  Do NOT use e.preventDefault() here.
  The sidebar/navbar links need to redirect to:
  calendrier.html, patients.html, messagerie.html, etc.
*/
document.querySelectorAll(".nav-links a, .side-nav a").forEach((a) => {
  a.addEventListener("click", () => {
    const href = a.getAttribute("href");

    if (!href || href === "#") {
      return;
    }

    const group = a.closest("ul");
    if (!group) return;

    group.querySelectorAll("li").forEach((li) => li.classList.remove("active"));
    group.querySelectorAll("a").forEach((link) => link.classList.remove("active"));

    const li = a.closest("li");
    if (li) li.classList.add("active");

    a.classList.add("active");
  });
});