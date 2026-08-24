/* ============================================================================
   doc-guide.js — the service-page rail, as a SECTION GUIDE over a long scroll.

   Replaces doc-tabs.js, which drove the same rail as a tablist and hid every
   panel but one. The panels now all stay on the page and the rail navigates to
   them, highlighting whichever one you are reading.

   WHY THIS IS LESS FRAGILE THAN WHAT IT REPLACES. doc-tabs.js was fail-open by
   construction — the markup shipped every panel visible and the SCRIPT did the
   hiding, so a failed load degraded to a readable stack rather than to one
   panel and no way to reach the rest. This file inherits that property for
   free and goes further: the rail is now real <a href="#panel"> anchors, so
   with no JavaScript at all the links still jump to their sections. Nothing
   here is load-bearing; it adds smooth scrolling and the active highlight.

   Requires no per-page config: it reads the anchors' own hrefs.
   ============================================================================ */
(function () {
  'use strict';

  function mount(root) {
    var links = [].slice.call(root.querySelectorAll('[data-guide]'));
    if (!links.length) { return; }

    var panels = links.map(function (a) {
      var id = (a.getAttribute('href') || '').replace(/^#/, '');
      return id ? document.getElementById(id) : null;
    });
    /* A half-wired guide is still a working list of anchors, so unlike the
       tablist this does not need to bail wholesale — just skip the strays. */
    var pairs = [];
    links.forEach(function (a, i) { if (panels[i]) { pairs.push({ a: a, panel: panels[i] }); } });
    if (!pairs.length) { return; }

    var current = -1;
    function setCurrent(n) {
      if (n === current) { return; }
      current = n;
      pairs.forEach(function (p, k) {
        if (k === n) { p.a.setAttribute('aria-current', 'true'); }
        else { p.a.removeAttribute('aria-current'); }
      });
    }

    /* --- click: smooth-scroll, then move focus to the section so a keyboard
       user lands where the page just went. The panels carry tabindex="-1" for
       exactly this. preventDefault only when we can honour the jump. */
    pairs.forEach(function (p, k) {
      p.a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) { return; }  /* let new-tab work */
        e.preventDefault();
        setCurrent(k);
        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        p.panel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        /* Move the caret into the section ONLY for a keyboard activation.
           e.detail === 0 is the tell: Enter/Space on a link fires a click with
           no pointer detail. A programmatic focus() on a div trips
           :focus-visible even after a mouse click, which drew a 2px ring around
           the entire panel — correct for a keyboard user, noise for a mouse. */
        if (e.detail === 0) { p.panel.focus({ preventScroll: true }); }
        /* keep the clicked item lit while the smooth scroll is still travelling;
           spy() takes over once it lands and will agree, because the panel is
           then the last one past the line. */
        setTimeout(function () { setCurrent(k); }, 60);
        if (history.replaceState) { history.replaceState(null, '', p.a.getAttribute('href')); }
      });
    });

    /* --- scrollspy, computed from geometry rather than from observer order.
       An IntersectionObserver was tried first and was WRONG TWICE: right after a
       click the outgoing panel could still report a hair of intersection at the
       trip line and, being earlier in document order, won — so the item you had
       just clicked lost aria-current. It also produced a spurious "04" at scroll
       zero, because the first callback batch arrives in observer order, not
       document order.

       The active section is simply the LAST one whose top has passed the line.
       That is a total order over the panels, so there is nothing to disagree
       about. LINE sits below the 74px fixed header, matching scroll-margin-top,
       so a section becomes current exactly when its heading clears the chrome. */
    var LINE = 120;
    var ticking = false;

    function spy() {
      ticking = false;
      var best = 0;
      for (var i = 0; i < pairs.length; i++) {
        if (pairs[i].panel.getBoundingClientRect().top - LINE <= 1) { best = i; }
        else { break; }
      }
      /* at the very bottom the last section may never reach the line */
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        best = pairs.length - 1;
      }
      setCurrent(best);
    }

    function onScroll() {
      if (ticking) { return; }
      ticking = true;
      window.requestAnimationFrame(spy);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    spy();
  }

  function boot() {
    /* The nav carries data-guide-ROOT and each anchor data-guide="N". Distinct
       names on purpose: one attribute for both made [data-guide] match the nav
       as well as its links, which only worked because the nav has no href. */
    [].slice.call(document.querySelectorAll('[data-guide-root]')).forEach(mount);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
