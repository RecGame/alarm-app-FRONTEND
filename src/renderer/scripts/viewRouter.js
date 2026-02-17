// ESTO HACE EL CAMBIO DE VISTA ENTRE ALARMAS Y REGISTROS, ASÍ COMO LA ACTUALIZACIÓN DEL TÍTULO DE LA PÁGINA
document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll("[data-view-target]");
  const views = document.querySelectorAll("[data-view]");
  const pageTitle = document.getElementById("page-title");

  function setActiveView(target) {
    views.forEach((view) => {
      view.classList.toggle("hidden", view.dataset.view !== target);
    });

    links.forEach((link) => {
      const isActive = link.dataset.viewTarget === target;
      link.classList.toggle("text-primary", isActive);
      link.classList.toggle("bg-primary/10", isActive);
      link.classList.toggle("font-medium", isActive);
      link.classList.toggle("text-slate-600", !isActive);
      link.classList.toggle("dark:text-slate-400", !isActive);
    });

    if (pageTitle) {
      pageTitle.textContent = target === "registros" ? "REGISTROS" : "ALARMAS REGISTRADAS";
    }
    
    // Cargar equipos cuando se cambia a la vista de registros
    if (target === "registros" && window.loadRegisteredEquipment) {
      window.loadRegisteredEquipment();
    }
  }

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      setActiveView(link.dataset.viewTarget);
    });
  });

  setActiveView("alarms");
});
