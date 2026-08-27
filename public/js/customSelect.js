// Progressively enhances every native <select> with a custom, themed dropdown,
// since the browser's native open options list cannot be restyled with CSS.
// The original <select> stays in the DOM (visually hidden) as the real form
// field, so existing app scripts (e.g. categoryProcessor.js) and inline
// onchange handlers keep working untouched.
(function () {
  const CHEVRON =
    '<svg viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" ' +
    'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M1 1l4 4 4-4"/></svg>';

  function interceptProperty(el, prop, onChange) {
    const proto = Object.getPrototypeOf(el);
    const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
    if (!descriptor || !descriptor.set) return;
    Object.defineProperty(el, prop, {
      configurable: true,
      get() {
        return descriptor.get.call(el);
      },
      set(v) {
        descriptor.set.call(el, v);
        onChange();
      },
    });
  }

  function enhance(select) {
    const id = select.id;

    const wrapper = document.createElement('div');
    wrapper.className = 'dw-select';
    select.insertAdjacentElement('beforebegin', wrapper);
    wrapper.appendChild(select);

    select.classList.add('dw-select-native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    // keep the select's own id intact: other scripts (e.g. categoryProcessor.js)
    // look it up by id, so the trigger gets a separate id and the <label> is
    // repointed to it instead of stealing the select's id

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'dw-select-trigger';
    if (id) {
      trigger.id = `${id}-trigger`;
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) label.setAttribute('for', trigger.id);
    }
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = '<span class="dw-select-text"></span>' + CHEVRON;
    wrapper.appendChild(trigger);

    const popup = document.createElement('div');
    popup.className = 'dw-select-popup';
    popup.setAttribute('role', 'listbox');
    popup.hidden = true;
    wrapper.appendChild(popup);

    function syncTrigger() {
      const opt = select.options[select.selectedIndex];
      trigger.querySelector('.dw-select-text').textContent = opt ? opt.textContent.trim() : '';
      trigger.disabled = select.disabled;
      trigger.classList.toggle('dw-select-trigger-disabled', select.disabled);
    }

    // catch value/disabled changes made by other scripts (e.g. categoryProcessor.js)
    interceptProperty(select, 'value', syncTrigger);
    interceptProperty(select, 'disabled', syncTrigger);
    select.addEventListener('change', syncTrigger);

    function onOutsideClick(e) {
      if (!wrapper.contains(e.target)) closePopup();
    }

    function onKeydown(e) {
      if (e.key === 'Escape') {
        closePopup();
        trigger.focus();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const options = Array.from(popup.querySelectorAll('.dw-select-option:not(:disabled)'));
        const currentIndex = options.indexOf(document.activeElement);
        let nextIndex = currentIndex === -1 ? 0
          : e.key === 'ArrowDown' ? Math.min(currentIndex + 1, options.length - 1)
          : Math.max(currentIndex - 1, 0);
        if (options[nextIndex]) options[nextIndex].focus();
      }
    }

    function closePopup() {
      popup.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', onOutsideClick);
      document.removeEventListener('keydown', onKeydown);
    }

    function buildOptions() {
      popup.innerHTML = '';
      Array.from(select.options).forEach((opt) => {
        if (opt.hidden) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dw-select-option';
        btn.setAttribute('role', 'option');
        btn.textContent = opt.textContent.trim();

        const isSelected = opt.index === select.selectedIndex;
        btn.setAttribute('aria-selected', String(isSelected));
        if (isSelected) btn.classList.add('dw-select-option-selected');

        if (opt.disabled) {
          btn.disabled = true;
          btn.classList.add('dw-select-option-disabled');
        } else {
          btn.addEventListener('click', () => {
            select.value = opt.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            closePopup();
            trigger.focus();
          });
        }

        popup.appendChild(btn);
      });
    }

    function openPopup() {
      if (select.disabled) return;
      buildOptions();
      popup.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      document.addEventListener('click', onOutsideClick);
      document.addEventListener('keydown', onKeydown);
      const focusTarget = popup.querySelector('.dw-select-option-selected')
        || popup.querySelector('.dw-select-option:not(:disabled)');
      if (focusTarget) focusTarget.focus();
    }

    trigger.addEventListener('click', () => {
      if (select.disabled) return;
      if (popup.hidden) openPopup();
      else closePopup();
    });

    syncTrigger();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('select').forEach(enhance);
  });
})();
