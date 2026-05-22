authGuard();
initUserNav();

function toggleTask(cb) {
  cb.classList.toggle("checked");
  const label = cb.parentElement.querySelector(".task-label");
  label.classList.toggle("done");
}

function addTask() {
  const label = prompt("Nouvelle tâche :");
  if (!label || !label.trim()) return;

  const taskCard = document.querySelector(".card:last-child");
  const footer = taskCard.querySelector(".task-footer");

  const item = document.createElement("div");
  item.className = "task-item";
  item.innerHTML = `
      <div class="task-cb" onclick="toggleTask(this)">
        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <span class="task-label">${label.trim()}</span>
    `;
  taskCard.insertBefore(item, footer);
}

/* Nav active link */
document.querySelectorAll(".nav-links a, .side-nav a").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const group = a.closest("ul");
    group.querySelectorAll("li").forEach((li) => li.classList.remove("active"));
    group.querySelectorAll("a").forEach((x) => x.classList.remove("active"));
    if (a.closest("li")) a.closest("li").classList.add("active");
    a.classList.add("active");
  });
});
