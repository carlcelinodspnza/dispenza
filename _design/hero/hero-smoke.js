/* =============================================================================
   hero-smoke.js  --  VIOLET SMOKE BEHIND THE HERO COPY, PUSHED BY THE CURSOR.

   The physics lives in _design/smoke-engine.js, shared with the section band.
   This file supplies only what is HERO-specific: the element that defines the
   field, and an emitter anchored to the hero's visual mass.

   That anchor USED TO BE THE COIN. The coin was removed (it was 86% of the page
   weight) and the copy was re-centred, so the plume now tracks .mc-hero__content
   -- it stays behind the headline the same way it used to sit behind the token.

   This guard is why the change mattered: the old one required .mc-coin, so
   deleting the coin returned here at line one and killed the smoke outright.
   The engine constants below are untouched, so the plume is the same object.
   ============================================================================= */
(function () {
  'use strict';

  var cv      = document.querySelector('.mc-smoke');
  var content = document.querySelector('.mc-hero__content');
  var hero    = document.querySelector('.mc-hero');
  var pin     = document.querySelector('.mc-hero__pin');
  if (!cv || !hero || !pin) { return; }
  if (!window.DispenzaSmoke) { return; }

  window.DispenzaSmoke.create({
    canvas: cv,
    box: pin,
    observe: hero,
    emitter: 'point',
    density: 9000,
    min: 60,
    max: 190,
    seed: 0x2f6e2b1,

    /* Anchor on the copy block, falling back to the centre of the pin if it is
       ever absent -- never to (0,0), which would strand the plume in the corner
       (the exact failure the previous comment here recorded). */
    source: function () {
      var pr = pin.getBoundingClientRect();
      var b = null;
      if (content) {
        try { b = content.getBoundingClientRect(); } catch (e) { b = null; }
      }
      if (!b || !b.width) {
        return { x: pr.width / 2, y: pr.height / 2, r: Math.max(120, pr.width * 0.16) };
      }
      return {
        x: b.left - pr.left + b.width / 2,
        y: b.top - pr.top + b.height / 2,
        /* Was min(w,h)*0.55 off a square coin. The copy block is wide and short,
           so that would collapse the plume; scale off width and clamp instead,
           which lands within ~4% of the radius the coin produced at 1440. */
        r: Math.max(120, Math.min(b.width * 0.28, 320))
      };
    }
  });
}());
