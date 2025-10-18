document.addEventListener("click", (e) => {
  if (e.target.closest('#btn-back')) {
    window.loadView("views/main.html");
  }
});