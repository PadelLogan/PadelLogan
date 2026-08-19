/* ============================================================
   PADEL LOGAN — shared site behaviour
   Loaded by every page built on site.css.
   ============================================================ */
(function () {
    'use strict';

    /* Solid navy nav bar once the page scrolls off the hero.
       The wordmark is white artwork, so without this it disappears
       the moment the nav sits over a white section. */
    var navEl = document.querySelector('nav');
    if (navEl) {
        var onScroll = function () {
            navEl.classList.toggle('scrolled', window.scrollY > 80);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }
})();
