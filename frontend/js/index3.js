staffGuard();
function toggleTask(cb) {
  cb.classList.toggle("checked");
  const label = cb.parentElement.querySelector(".task-label");
  label.classList.toggle("done");
}

function addTask() {
  const label = prompt("Nouvelle tâche du secrétariat :");
  if (!label || !label.trim()) return;

  const taskCard = document.querySelector(".card:last-child");
  const footer = taskCard.querySelector(".card-footer");

  const item = document.createElement("div");
  item.className = "task-item";
  item.innerHTML = `
      <div class="task-cb" onclick="toggleTask(this)">
        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <span class="task-label"></span>
    `;
  item.querySelector(".task-label").textContent = label.trim();
  taskCard.insertBefore(item, footer);
}

function newAppointment() {
  alert("Action : ouvrir le formulaire de création de rendez-vous.");
}

function newPatient() {
  alert("Action : ouvrir le formulaire de création de patient.");
}

function checkInPatient() {
  alert("Action : enregistrer l’arrivée du patient.");
}

document.querySelectorAll(".nav-links a, .side-nav a").forEach((a) => {
  a.addEventListener("click", () => {
    const group = a.closest("ul");
    group.querySelectorAll("li").forEach((li) => li.classList.remove("active"));
    group.querySelectorAll("a").forEach((x) => x.classList.remove("active"));
    if (a.closest("li")) a.closest("li").classList.add("active");
    a.classList.add("active");
  });
});
