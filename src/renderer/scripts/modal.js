
//CODIGO PARA APARECER EL MODAL
  document.addEventListener('DOMContentLoaded', function() {

    // Elementos del DOM
    const openBtn = document.getElementById('btn-nueva-alarma');
    const modal = document.getElementById('modal-alarm');
    const closeBtn = document.getElementById('close-modal-alarm');
    const cancelBtn = document.getElementById('cancel-modal-alarm');
    const form = document.getElementById('alarm-form');
    
    function focusAlarmModalInputs() {
      const notificationsPanel = document.getElementById('notifications-panel');
      const sidebarOverlay = document.getElementById('sidebar-overlay');
      const sidebar = document.getElementById('sidebar');

      if (notificationsPanel) notificationsPanel.classList.add('hidden');
      if (sidebarOverlay) sidebarOverlay.classList.add('hidden');
      if (sidebar) sidebar.classList.add('-translate-x-full');

      const firstInput = modal ? modal.querySelector('input, textarea, select, button') : null;
      if (firstInput) firstInput.focus();
    }

    window.focusAlarmModalInputs = focusAlarmModalInputs;

    if (openBtn && modal) {
      openBtn.addEventListener('click', () => {
        // Establecer texto para crear nueva alarma
        const modalTitle = document.getElementById('modal-title');
        const modalSubtitle = document.getElementById('modal-subtitle');
        const submitBtn = document.getElementById('submit-alarm-btn');
        if (modalTitle) {
          modalTitle.textContent = 'Crear nueva alarma';
        }
        if (modalSubtitle) {
          modalSubtitle.textContent = 'Configura los parámetros de la nueva alarma para las estaciones de trabajo.';
        }
        if (submitBtn) {
          submitBtn.textContent = 'Guardar alarma';
        }
        
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(focusAlarmModalInputs);
      });
    }
    
    function closeModal() {
      modal.style.display = 'none';
      document.body.style.overflow = '';
      
      // Resetear formulario
      if (form) {
        form.reset();
      }
      
      // Limpiar días seleccionados
      const dayButtons = document.querySelectorAll('.day-toggle');
      dayButtons.forEach(btn => {
        btn.classList.remove('bg-primary', 'text-white', 'font-semibold');
        btn.classList.add('border', 'text-slate-500');
      });
      
      // Ocultar mensaje de error de días
      const daysError = document.getElementById('days-error');
      if (daysError) {
        daysError.classList.add('hidden');
      }
      
      // Resetear título del modal a modo crear
      const modalTitle = document.getElementById('modal-title');
      const modalSubtitle = document.getElementById('modal-subtitle');
      const submitBtn = document.getElementById('submit-alarm-btn');
      if (modalTitle) {
        modalTitle.textContent = 'Crear nueva alarma';
      }
      if (modalSubtitle) {
        modalSubtitle.textContent = 'Configura los parámetros de la nueva alarma para las estaciones de trabajo.';
      }
      if (submitBtn) {
        submitBtn.textContent = 'Guardar alarma';
      }
      
      // Resetear modo edición usando evento personalizado
      window.dispatchEvent(new CustomEvent('resetEditMode'));
    }
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    // Cerrar modal al hacer click fuera del contenido
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeModal();
    });
  });