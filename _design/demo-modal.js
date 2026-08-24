/* =============================================================================
   demo-modal.js  --  THE 8-STEP "REQUEST A DEMO" WIZARD.

   The source site opens a conversion popup from the header's "Request a Demo"
   button (href="#sgp_2", role="dialog"). The clone captured that popup's
   CONTENT -- all eight questions survive as the flat form on contact.html, with
   the same field names -- but never the modal or its stepping. This is that
   layer, rebuilt in this site's own design system.

   PROGRESSIVE ENHANCEMENT. The triggers are the header's real
   <a href="contact.html"> demo buttons. This file only INTERCEPTS the click. If
   the script fails to load, is blocked, or throws, every button still navigates
   to the contact page and the same eight questions are answerable there. The
   modal is an enhancement over a working path, never the only path.

   SUBMISSION follows the clone's existing convention: `action="thank-you.html"
   method="get"`, exactly what contact.html's form does. There is no backend in
   a static bundle, so a real endpoint is an owner decision -- see DEMO-MODAL
   note in the session log.

   The DOM is built on FIRST OPEN, not at load, so 27 pages pay nothing for a
   dialog most visitors never see.
   ============================================================================= */
(function () {
  'use strict';

  /* The eight steps, in the source's order, with the source's own field names
     so anything wired to the existing contact form keeps working. */
  var STEPS = [
    { name: 'store_type', legend: 'Select Store Type', type: 'radio', required: true,
      options: ['Retail Only', 'Delivery Only', 'Retail & Delivery'] },
    { name: 'first_name', legend: 'First Name', type: 'text', required: true,
      autocomplete: 'given-name' },
    { name: 'last_name', legend: 'Last Name', type: 'text', required: false,
      autocomplete: 'family-name' },
    { name: 'dispensary_name', legend: 'Dispensary Name', type: 'text', required: true,
      autocomplete: 'organization' },
    { name: 'email', legend: 'What is your email?', type: 'email', required: true,
      autocomplete: 'email' },
    { name: 'phone_number', legend: 'What is your phone number?', type: 'tel', required: true,
      autocomplete: 'tel' },
    { name: 'website', legend: 'What is your website URL "www."', type: 'text', required: true,
      autocomplete: 'url', placeholder: 'www.example.com' },
    { name: 'time_to_talk', legend: 'When would you like to talk?', type: 'select', required: true,
      options: ['Select an option...', 'As soon as possible', 'Choose Date & Time'] }
  ];

  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  var root = null;      /* the backdrop, built lazily */
  var dialog = null;
  var form = null;
  var idx = 0;
  var opener = null;    /* the element that opened it, so focus can go home */

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fieldMarkup(step, i) {
    var id = 'dm-f-' + i;
    if (step.type === 'radio') {
      return '<div class="dm-choices" role="radiogroup" aria-labelledby="dm-lg-' + i + '">' +
        step.options.map(function (o, n) {
          return '<label class="dm-choice">' +
                   '<input type="radio" name="' + step.name + '" value="' + esc(o) + '"' +
                     (n === 0 ? ' data-first' : '') + '>' +
                   '<span>' + esc(o) + '</span>' +
                 '</label>';
        }).join('') + '</div>';
    }
    if (step.type === 'select') {
      return '<select class="dm-input" id="' + id + '" name="' + step.name + '">' +
        step.options.map(function (o, n) {
          return '<option value="' + (n === 0 ? '' : esc(o)) + '"' +
                 (n === 0 ? ' selected' : '') + '>' + esc(o) + '</option>';
        }).join('') + '</select>';
    }
    return '<input class="dm-input" id="' + id + '" type="' + step.type + '" name="' + step.name + '"' +
           (step.autocomplete ? ' autocomplete="' + step.autocomplete + '"' : '') +
           (step.placeholder ? ' placeholder="' + esc(step.placeholder) + '"' : '') + '>';
  }

  function build() {
    root = document.createElement('div');
    root.className = 'dm-backdrop';
    root.hidden = true;

    var steps = STEPS.map(function (s, i) {
      var id = 'dm-f-' + i;
      var labelFor = (s.type === 'radio') ? '' : ' for="' + id + '"';
      return '<fieldset class="dm-step" data-step="' + i + '">' +
               '<legend class="dm-legend" id="dm-lg-' + i + '"><label' + labelFor + '>' +
                 esc(s.legend) + (s.required ? ' *' : '') +
               '</label></legend>' +
               fieldMarkup(s, i) +
               '<p class="dm-error" id="dm-err-' + i + '" role="alert"></p>' +
             '</fieldset>';
    }).join('');

    root.innerHTML =
      '<div class="dm-dialog" role="dialog" aria-modal="true" aria-labelledby="dm-title">' +
        '<button type="button" class="dm-close" aria-label="Close">&times;</button>' +
        '<h2 class="dm-title" id="dm-title">Request A Demo</h2>' +
        '<p class="dm-count" aria-live="polite">Step 1/' + STEPS.length + '</p>' +
        '<div class="dm-progress"><div class="dm-progress__fill"></div></div>' +
        '<form class="dm-form" action="thank-you.html" method="get" novalidate>' +
          steps +
          '<div class="dm-hp" aria-hidden="true">' +
            '<label>Leave this empty<input type="text" name="hp" tabindex="-1" autocomplete="off"></label>' +
          '</div>' +
          '<div class="dm-nav">' +
            '<button type="button" class="btn btn--ghost dm-nav__prev" hidden>&lsaquo; Prev</button>' +
            '<button type="button" class="btn btn--solid dm-nav__next">Next &rsaquo;</button>' +
            '<button type="submit" class="btn btn--solid dm-nav__submit" hidden>Submit</button>' +
          '</div>' +
        '</form>' +
      '</div>';

    document.body.appendChild(root);
    dialog = root.querySelector('.dm-dialog');
    form = root.querySelector('.dm-form');

    root.querySelector('.dm-close').addEventListener('click', close);
    root.addEventListener('mousedown', function (e) { if (e.target === root) { close(); } });
    root.querySelector('.dm-nav__prev').addEventListener('click', function () { go(idx - 1); });
    root.querySelector('.dm-nav__next').addEventListener('click', function () {
      if (validate(idx)) { go(idx + 1); }
    });
    form.addEventListener('submit', function (e) {
      if (!validate(idx)) { e.preventDefault(); }
    });
    /* Enter should advance rather than submit, except on the last step. */
    form.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && idx < STEPS.length - 1) {
        e.preventDefault();
        if (validate(idx)) { go(idx + 1); }
      }
    });
  }

  function validate(i) {
    var step = STEPS[i];
    var err = root.querySelector('#dm-err-' + i);
    var val, control;

    if (step.type === 'radio') {
      control = form.querySelector('input[name="' + step.name + '"]:checked');
      val = control ? control.value : '';
    } else {
      control = form.querySelector('[name="' + step.name + '"]');
      val = (control.value || '').trim();
    }

    if (step.required && !val) {
      err.textContent = step.type === 'radio' ? 'Please choose one to continue.'
                                              : 'This one is required.';
      if (control && control.setAttribute) { control.setAttribute('aria-invalid', 'true'); }
      focusStep(i);
      return false;
    }
    if (step.type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) {
      err.textContent = 'That does not look like an email address.';
      control.setAttribute('aria-invalid', 'true');
      focusStep(i);
      return false;
    }
    if (step.type === 'tel' && val && (val.replace(/\D/g, '').length < 7)) {
      err.textContent = 'That does not look like a phone number.';
      control.setAttribute('aria-invalid', 'true');
      focusStep(i);
      return false;
    }

    err.textContent = '';
    if (control && control.removeAttribute) { control.removeAttribute('aria-invalid'); }
    return true;
  }

  function focusStep(i) {
    var f = root.querySelector('.dm-step[data-step="' + i + '"]')
                .querySelector('input:not([type=hidden]),select,textarea');
    if (f) { f.focus(); }
  }

  function go(n) {
    if (n < 0 || n >= STEPS.length) { return; }
    idx = n;
    var all = root.querySelectorAll('.dm-step');
    for (var i = 0; i < all.length; i++) {
      all[i].classList.toggle('is-active', i === idx);
    }
    root.querySelector('.dm-count').textContent = 'Step ' + (idx + 1) + '/' + STEPS.length;
    root.querySelector('.dm-progress__fill').style.width =
      (((idx + 1) / STEPS.length) * 100) + '%';
    root.querySelector('.dm-nav__prev').hidden = (idx === 0);
    root.querySelector('.dm-nav__next').hidden = (idx === STEPS.length - 1);
    root.querySelector('.dm-nav__submit').hidden = (idx !== STEPS.length - 1);
    focusStep(idx);
  }

  function onKey(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') { return; }
    var f = dialog.querySelectorAll(FOCUSABLE);
    var vis = [];
    for (var i = 0; i < f.length; i++) {
      if (f[i].offsetParent !== null) { vis.push(f[i]); }
    }
    if (!vis.length) { return; }
    var first = vis[0], last = vis[vis.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function open(trigger) {
    opener = trigger || document.activeElement;
    if (!root) { build(); }
    root.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    /* next frame so the transition has a start value to animate from */
    requestAnimationFrame(function () { root.classList.add('is-open'); });
    document.addEventListener('keydown', onKey);
    go(0);
  }

  function close() {
    if (!root) { return; }
    root.classList.remove('is-open');
    document.removeEventListener('keydown', onKey);
    document.documentElement.style.overflow = '';
    var done = function () { root.hidden = true; };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); }
    else { setTimeout(done, 220); }
    if (opener && opener.focus) { opener.focus(); }
  }

  /* ---- triggers ------------------------------------------------------------
     The HEADER demo buttons, which are the direct equivalent of the source's
     header "Request a Demo". Delegated from the document so it works for the
     nav rail and the mobile drawer alike, and so nothing breaks if the chrome
     is re-rendered. In-page demo CTAs are deliberately left navigating to
     contact.html -- changing 82 buttons across 27 pages was not asked for. */
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('.rail__actions a.btn, .drawer-cta a.btn') : null;
    if (!t) { return; }
    if (!/demo/i.test(t.textContent || '')) { return; }   /* skip "Call us" */
    e.preventDefault();
    open(t);
  });
}());
