/* Laminor Pro — the tools panel shown above the chord sheet. */
(function (root) {
  'use strict';

  const LP = (root.LaminorPro = root.LaminorPro || {});
  const { h, faDigits } = LP.dom;
  const { renderDiagram } = LP.diagram;

  function toggle(button, on) {
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function shiftLabel(transpose) {
    if (transpose === 0) return 'گام اصلی';
    const n = faDigits(Math.abs(transpose));
    return transpose > 0 ? `${n} نیم‌پرده بالاتر` : `${n} نیم‌پرده پایین‌تر`;
  }

  /**
   * actions: { setTranspose, stepTranspose, setCapo, toggleAutoCapo,
   *            toggleSimplify, toggleDiagrams, toggleScroll, toggleDark,
   *            setNotation, save, forget, reset, print, nextVoicing }
   */
  function createPanel(actions) {
    const keys = h('div', { class: 'lp-keys', role: 'group', 'aria-label': 'انتخاب گام' });
    const keyNow = h('strong', { class: 'lp-key-now', dir: 'ltr' });
    const keyShift = h('span', { class: 'lp-muted' });
    const down = h('button', { type: 'button', class: 'lp-btn lp-step', title: 'نیم‌پرده پایین‌تر', onclick: () => actions.stepTranspose(-1) }, '−');
    const up = h('button', { type: 'button', class: 'lp-btn lp-step', title: 'نیم‌پرده بالاتر', onclick: () => actions.stepTranspose(1) }, '+');

    const capoSelect = h(
      'select',
      { class: 'lp-select', 'aria-label': 'کاپو', onchange: (e) => actions.setCapo(Number(e.target.value)) },
      Array.from({ length: 12 }, (_, i) => h('option', { value: String(i) }, i === 0 ? 'بدون کاپو' : `فرت ${faDigits(i)}`))
    );
    const autoCapo = h('button', { type: 'button', class: 'lp-btn lp-toggle lp-auto-capo', onclick: () => actions.toggleAutoCapo() }, '✨ ساده‌سازی با کاپو');
    const capoInfo = h('div', { class: 'lp-capo-info', 'aria-live': 'polite' });

    const diagramsBtn = h('button', { type: 'button', class: 'lp-btn lp-toggle', onclick: () => actions.toggleDiagrams() }, '🎸 راهنمای انگشت‌گذاری');
    const simplifyBtn = h('button', { type: 'button', class: 'lp-btn lp-toggle', title: 'آکوردهای پیچیده (مثل Cmaj7 یا Asus4) به ساده‌ترین شکل قابل‌اجرا تبدیل می‌شوند', onclick: () => actions.toggleSimplify() }, '🔰 آکوردهای ساده');
    const scrollBtn = h('button', { type: 'button', class: 'lp-btn lp-toggle', title: 'صفحه هنگام نواختن خودش پایین می‌رود؛ سرعت را از نوار پایین صفحه تنظیم کنید', onclick: () => actions.toggleScroll() }, '⏬ اسکرول خودکار');
    const notation = h(
      'select',
      { class: 'lp-select', 'aria-label': 'نحوه نوشتن نت‌ها', title: 'نحوه نوشتن نت‌های عرضی', onchange: (e) => actions.setNotation(e.target.value) },
      h('option', { value: 'auto' }, '♯/♭ خودکار'),
      h('option', { value: 'sharp' }, 'همه با دیز (♯)'),
      h('option', { value: 'flat' }, 'همه با بمل (♭)')
    );
    const saveBtn = h('button', { type: 'button', class: 'lp-btn lp-primary', onclick: () => actions.save() }, '💾 ذخیره گام');
    const forgetBtn = h('button', { type: 'button', class: 'lp-btn lp-link', onclick: () => actions.forget() }, 'حذف ذخیره');
    const resetBtn = h('button', { type: 'button', class: 'lp-btn', title: 'بازگشت به آکوردهای اصلی', onclick: () => actions.reset() }, '↺ اصلی');
    const printBtn = h('button', { type: 'button', class: 'lp-btn', onclick: () => actions.print() }, '🖨️ پرینت / PDF');
    const status = h('span', { class: 'lp-status', 'aria-live': 'polite' });
    const themeBtn = h('button', { type: 'button', class: 'lp-btn lp-theme', onclick: () => actions.toggleDark() });

    const diagrams = h('div', { class: 'lp-diagrams' });

    const el = h(
      'section',
      { class: 'lp-panel', dir: 'rtl', 'aria-label': 'ابزارهای لامینور پرو' },
      h('div', { class: 'lp-head' }, h('span', { class: 'lp-brand' }, 'لامینور پرو'), status, themeBtn),
      h(
        'div',
        { class: 'lp-row' },
        h('span', { class: 'lp-label' }, 'تغییر گام'),
        h('div', { class: 'lp-stepper' }, up, h('span', { class: 'lp-key-box' }, keyNow, keyShift), down),
        keys
      ),
      h('div', { class: 'lp-row' }, h('span', { class: 'lp-label' }, 'کاپو'), capoSelect, autoCapo, capoInfo),
      h('div', { class: 'lp-row lp-tools' }, diagramsBtn, simplifyBtn, scrollBtn, notation, h('span', { class: 'lp-spacer' }), saveBtn, forgetBtn, resetBtn, printBtn),
      diagrams
    );

    let statusTimer = null;
    function flash(message) {
      status.textContent = message;
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => (status.textContent = ''), 3500);
    }

    function renderKeys(view) {
      keys.replaceChildren(
        ...view.keyChoices.map((choice) =>
          h(
            'button',
            {
              type: 'button',
              class: 'lp-btn lp-key' + (choice.original ? ' lp-key-original' : ''),
              'aria-pressed': choice.active ? 'true' : 'false',
              title: choice.original ? 'گام اصلی آهنگ' : null,
              onclick: () => actions.setTranspose(choice.transpose),
            },
            choice.name
          )
        )
      );
    }

    function renderCapoInfo(view) {
      const parts = [];
      if (view.capo > 0) {
        parts.push(h('span', null, 'کاپو را روی ', h('b', null, `فرت ${faDigits(view.capo)}`), ' ببندید؛ آکوردها را در گام '));
        parts.push(h('b', { dir: 'ltr' }, view.shapeKeyName));
        parts.push(h('span', null, ' بزنید (صدای واقعی: '), h('b', { dir: 'ltr' }, view.soundingKeyName), h('span', null, ')'));
      } else if (view.capoAuto) {
        parts.push('این آهنگ بدون کاپو در ساده‌ترین حالت است.');
      } else if (view.best.capo > 0 && view.best.average < view.currentDifficulty - 0.3) {
        parts.push(
          h('span', { class: 'lp-muted' }, 'پیشنهاد: کاپو روی '),
          h('b', null, `فرت ${faDigits(view.best.capo)}`),
          h('span', { class: 'lp-muted' }, ' تا آکوردها ساده‌تر شوند')
        );
      }
      capoInfo.replaceChildren(...parts);
    }

    function renderDiagrams(view) {
      diagrams.hidden = !view.diagrams;
      diagrams.classList.toggle('lp-rtl', view.rtl);
      if (!view.diagrams) return;
      if (!view.uniqueChords.length) {
        diagrams.replaceChildren(h('span', { class: 'lp-muted' }, 'آکوردی پیدا نشد.'));
        return;
      }
      diagrams.replaceChildren(
        ...view.uniqueChords.map((item) => {
          const voicing = item.voicings[item.index] || null;
          const count = item.voicings.length;
          const card = h(
            'button',
            {
              type: 'button',
              class: 'lp-dg-card',
              title: count > 1 ? 'برای دیدن حالت دیگر این آکورد کلیک کنید' : item.name,
              onclick: () => actions.nextVoicing(item.name),
            },
            renderDiagram({ name: item.name, voicing, approx: item.approx, leftHanded: view.leftHanded })
          );
          if (count > 1) card.append(h('span', { class: 'lp-dg-count' }, `${faDigits(item.index + 1)}/${faDigits(count)}`));
          if (voicing && voicing.noBass) card.append(h('span', { class: 'lp-dg-note' }, 'بدون نت باس'));
          return card;
        })
      );
    }

    function render(view) {
      themeBtn.textContent = view.dark ? '☀️ حالت روشن' : '🌙 حالت تاریک';
      themeBtn.title = view.dark ? 'برگرداندن رنگ‌های روشن سایت' : 'تیره کردن همه‌ی صفحه‌های لامینور';
      keyNow.textContent = view.soundingKeyName;
      keyShift.textContent = shiftLabel(view.transpose);
      renderKeys(view);

      capoSelect.value = String(view.capo);
      toggle(autoCapo, view.capoAuto);
      renderCapoInfo(view);

      toggle(diagramsBtn, view.diagrams);
      toggle(simplifyBtn, view.simplify);
      toggle(scrollBtn, view.scrolling);
      scrollBtn.textContent = view.scrolling ? '⏸ توقف اسکرول' : '⏬ اسکرول خودکار';
      notation.value = view.notation;

      saveBtn.textContent = view.saved && !view.dirty ? '✓ ذخیره شده' : '💾 ذخیره گام';
      saveBtn.disabled = Boolean(view.saved && !view.dirty);
      forgetBtn.hidden = !view.saved;
      resetBtn.disabled = view.isOriginal;

      renderDiagrams(view);
    }

    return { el, render, flash };
  }

  LP.panel = { createPanel };
})(typeof globalThis !== 'undefined' ? globalThis : this);
