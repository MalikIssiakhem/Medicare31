authGuard();
/* Nav / sidebar active state */
document.querySelectorAll(".nav-links a, .side-nav a").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const ul = a.closest("ul");
    ul.querySelectorAll("li").forEach((li) => li.classList.remove("active"));
    ul.querySelectorAll("a").forEach((x) => x.classList.remove("active"));
    if (a.closest("li")) a.closest("li").classList.add("active");
    a.classList.add("active");
  });
});

/* Quick access toggle */
document.querySelectorAll(".quick-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".quick-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
});
