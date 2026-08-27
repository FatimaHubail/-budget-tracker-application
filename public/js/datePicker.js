// Progressively enhances every native <input type="date"> / <input type="month">
// with a custom calendar pop-up styled to match the app, since the browser's
// native calendar pop-up cannot be restyled with CSS. The original input is kept
// in the form (as a hidden field) so nothing on the server needs to change.
(function () {
  const CALENDAR_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
    'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>';

  const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function toISODate(y, m, d) {
    return `${y}-${pad(m)}-${pad(d)}`;
  }

  function toISOMonth(y, m) {
    return `${y}-${pad(m)}`;
  }

  function parseValue(value, isMonth) {
    if (!value) return null;
    const parts = value.split('-').map(Number);
    if (parts.length < 2 || parts.some(Number.isNaN)) return null;
    return isMonth ? { y: parts[0], m: parts[1] } : { y: parts[0], m: parts[1], d: parts[2] };
  }

  function formatLabel(y, m, d, isMonth) {
    const date = new Date(y, m - 1, d || 1);
    return date.toLocaleDateString('en-US', isMonth
      ? { year: 'numeric', month: 'long' }
      : { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function enhance(original) {
    const isMonth = original.type === 'month';
    const id = original.id;
    const required = original.required;
    const maxAttr = original.getAttribute('max');
    const minAttr = original.getAttribute('min');
    const initialValue = original.value;

    const wrapper = document.createElement('div');
    wrapper.className = 'dw-datepicker';
    original.insertAdjacentElement('beforebegin', wrapper);
    wrapper.appendChild(original);
    original.type = 'hidden';
    // re-apply the value: switching type can re-run value sanitization and clear it
    original.value = initialValue;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'dw-datepicker-trigger';
    if (id) {
      // keep the original input's id in case other scripts look it up; the
      // trigger (the actually-clickable element) gets its own id, and any
      // <label for="..."> pointing at the original is repointed to it
      trigger.id = `${id}-trigger`;
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) label.setAttribute('for', trigger.id);
    }
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = '<span class="dw-datepicker-text"></span>' + CALENDAR_ICON;
    wrapper.appendChild(trigger);

    const popup = document.createElement('div');
    popup.className = 'dw-calendar-popup';
    popup.setAttribute('role', 'dialog');
    popup.hidden = true;
    wrapper.appendChild(popup);

    const today = new Date();
    let selected = parseValue(initialValue, isMonth);
    let viewYear = selected ? selected.y : today.getFullYear();
    let viewMonth = selected ? selected.m : today.getMonth() + 1;

    function updateTriggerText() {
      const span = trigger.querySelector('.dw-datepicker-text');
      if (selected) {
        span.textContent = formatLabel(selected.y, selected.m, selected.d, isMonth);
        span.classList.remove('dw-datepicker-placeholder');
      } else {
        span.textContent = isMonth ? 'Select month' : 'Select date';
        span.classList.add('dw-datepicker-placeholder');
      }
    }

    function setValue(next) {
      selected = next;
      original.value = next ? (isMonth ? toISOMonth(next.y, next.m) : toISODate(next.y, next.m, next.d)) : '';
      trigger.classList.remove('dw-datepicker-invalid');
      updateTriggerText();
      original.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function isDisabled(y, m, d) {
      const val = isMonth ? toISOMonth(y, m) : toISODate(y, m, d || 1);
      if (maxAttr && val > maxAttr) return true;
      if (minAttr && val < minAttr) return true;
      return false;
    }

    function buildHeader(label, onPrev, onNext) {
      const header = document.createElement('div');
      header.className = 'dw-calendar-header';

      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'dw-calendar-nav-btn';
      prevBtn.setAttribute('aria-label', 'Previous');
      prevBtn.textContent = '‹';
      prevBtn.addEventListener('click', onPrev);

      const labelEl = document.createElement('span');
      labelEl.className = 'dw-calendar-label';
      labelEl.textContent = label;

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'dw-calendar-nav-btn';
      nextBtn.setAttribute('aria-label', 'Next');
      nextBtn.textContent = '›';
      nextBtn.addEventListener('click', onNext);

      header.append(prevBtn, labelEl, nextBtn);
      return header;
    }

    function renderDateGrid() {
      popup.innerHTML = '';
      const label = new Date(viewYear, viewMonth - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      popup.appendChild(buildHeader(label, () => {
        viewMonth--;
        if (viewMonth < 1) { viewMonth = 12; viewYear--; }
        renderDateGrid();
      }, () => {
        viewMonth++;
        if (viewMonth > 12) { viewMonth = 1; viewYear++; }
        renderDateGrid();
      }));

      const grid = document.createElement('div');
      grid.className = 'dw-calendar-grid dw-calendar-grid-days';

      WEEKDAYS.forEach((label) => {
        const el = document.createElement('span');
        el.className = 'dw-calendar-weekday';
        el.textContent = label;
        grid.appendChild(el);
      });

      const startOffset = new Date(viewYear, viewMonth - 1, 1).getDay();
      const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
      const daysInPrevMonth = new Date(viewYear, viewMonth - 1, 0).getDate();

      const cells = [];
      for (let i = startOffset - 1; i >= 0; i--) {
        cells.push({
          y: viewMonth === 1 ? viewYear - 1 : viewYear,
          m: viewMonth === 1 ? 12 : viewMonth - 1,
          d: daysInPrevMonth - i,
          outside: true,
        });
      }
      for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ y: viewYear, m: viewMonth, d, outside: false });
      }
      let next = 1;
      while (cells.length % 7 !== 0) {
        cells.push({
          y: viewMonth === 12 ? viewYear + 1 : viewYear,
          m: viewMonth === 12 ? 1 : viewMonth + 1,
          d: next++,
          outside: true,
        });
      }

      cells.forEach((cell) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dw-calendar-day';
        btn.textContent = cell.d;
        if (cell.outside) btn.classList.add('dw-calendar-day-outside');

        if (cell.y === today.getFullYear() && cell.m === today.getMonth() + 1 && cell.d === today.getDate()) {
          btn.classList.add('dw-calendar-day-today');
        }
        if (selected && selected.y === cell.y && selected.m === cell.m && selected.d === cell.d) {
          btn.classList.add('dw-calendar-day-selected');
        }

        if (isDisabled(cell.y, cell.m, cell.d)) {
          btn.disabled = true;
          btn.classList.add('dw-calendar-day-disabled');
        } else {
          btn.addEventListener('click', () => {
            setValue({ y: cell.y, m: cell.m, d: cell.d });
            closePopup();
          });
        }

        grid.appendChild(btn);
      });

      popup.appendChild(grid);
    }

    function renderMonthGrid() {
      popup.innerHTML = '';
      popup.appendChild(buildHeader(String(viewYear), () => {
        viewYear--;
        renderMonthGrid();
      }, () => {
        viewYear++;
        renderMonthGrid();
      }));

      const grid = document.createElement('div');
      grid.className = 'dw-calendar-grid dw-calendar-grid-months';

      MONTHS.forEach((label, idx) => {
        const m = idx + 1;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dw-calendar-month-cell';
        btn.textContent = label;

        if (viewYear === today.getFullYear() && m === today.getMonth() + 1) {
          btn.classList.add('dw-calendar-day-today');
        }
        if (selected && selected.y === viewYear && selected.m === m) {
          btn.classList.add('dw-calendar-day-selected');
        }

        if (isDisabled(viewYear, m)) {
          btn.disabled = true;
          btn.classList.add('dw-calendar-day-disabled');
        } else {
          btn.addEventListener('click', () => {
            setValue({ y: viewYear, m });
            closePopup();
          });
        }

        grid.appendChild(btn);
      });

      popup.appendChild(grid);
    }

    function render() {
      if (isMonth) renderMonthGrid();
      else renderDateGrid();
    }

    function onOutsideClick(e) {
      if (!wrapper.contains(e.target)) closePopup();
    }

    function onKeydown(e) {
      if (e.key === 'Escape') {
        closePopup();
        trigger.focus();
      }
    }

    function openPopup() {
      if (selected) {
        viewYear = selected.y;
        viewMonth = selected.m;
      }
      render();
      popup.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      document.addEventListener('click', onOutsideClick);
      document.addEventListener('keydown', onKeydown);
      const focusTarget = popup.querySelector('.dw-calendar-day-selected:not([disabled])')
        || popup.querySelector('.dw-calendar-day-today:not([disabled])')
        || popup.querySelector('button:not([disabled])');
      if (focusTarget) focusTarget.focus();
    }

    function closePopup() {
      popup.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', onOutsideClick);
      document.removeEventListener('keydown', onKeydown);
    }

    trigger.addEventListener('click', () => {
      if (popup.hidden) openPopup();
      else closePopup();
    });

    if (required) {
      const form = wrapper.closest('form');
      if (form) {
        form.addEventListener('submit', (e) => {
          if (!original.value) {
            e.preventDefault();
            trigger.classList.add('dw-datepicker-invalid');
            openPopup();
          }
        });
      }
    }

    updateTriggerText();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('input[type="date"], input[type="month"]').forEach(enhance);
  });
})();
