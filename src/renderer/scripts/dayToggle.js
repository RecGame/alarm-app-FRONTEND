// Script para togglear selección de días en el modal de alarma

document.addEventListener('DOMContentLoaded', function () {
  const dayButtons = document.querySelectorAll('.day-toggle');

  dayButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      // Toggle seleccionado
      if (btn.classList.contains('bg-primary')) {
        btn.classList.remove('bg-primary', 'text-white', 'font-semibold');
        btn.classList.add('border', 'text-slate-500');
      } else {
        btn.classList.add('bg-primary', 'text-white', 'font-semibold');
        btn.classList.remove('border', 'text-slate-500');
      }
    });
  });
});
