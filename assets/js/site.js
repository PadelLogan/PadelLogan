/* ============================================================
   PADEL LOGAN — shared site behaviour
   Loaded by every page. Everything here is an enhancement:
   the nav is fully usable with this file absent.
   ============================================================ */
(function () {
    'use strict';

    /* Solid navy bar once the page scrolls off the hero. The wordmark is
       white artwork, so without this it disappears the moment the nav
       sits over a white section. */
    var navEl = document.querySelector('.plnav') || document.querySelector('nav');
    if (navEl) {
        var onScroll = function () {
            navEl.classList.toggle('scrolled', window.scrollY > 80);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    var toggle = document.getElementById('plnav-toggle');
    var groups = document.querySelectorAll('.plnav-drop');

    /* The nav groups ship <details open> so the desktop hover reveal has
       something to show and so a script failure leaves every link
       reachable. Collapse them only on small screens, where the menu is
       an accordion. This can only ever close, never hide. */
    function collapseForMobile() {
        if (window.matchMedia('(max-width: 900px)').matches) {
            groups.forEach(function (d) { d.open = false; });
        } else {
            groups.forEach(function (d) { d.open = true; });
        }
    }
    if (groups.length) {
        collapseForMobile();
        window.addEventListener('resize', collapseForMobile);
    }

    if (toggle) {
        /* Lock the page behind the open mobile panel. */
        toggle.addEventListener('change', function () {
            document.body.style.overflow = toggle.checked ? 'hidden' : '';
        });

        /* Escape closes it, and so does following a link. */
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && toggle.checked) {
                toggle.checked = false;
                document.body.style.overflow = '';
            }
        });
        document.querySelectorAll('.plnav-panel a').forEach(function (a) {
            a.addEventListener('click', function () {
                toggle.checked = false;
                document.body.style.overflow = '';
            });
        });
    }
})();
