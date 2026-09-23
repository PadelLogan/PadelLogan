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

/* ── DEFERRED MAP ──────────────────────────────────────────────
   Google Maps costs ~434KB of script. The embed sits well below the fold,
   but loading="lazy" does not hold it back on a slow connection, so it was
   arriving with the landing page. This swaps the placeholder for the real
   iframe once it is genuinely close to the viewport -- the map is unchanged
   for anyone who scrolls to it, and free for everyone who does not.

   Without IntersectionObserver the map is loaded immediately, so an old
   browser still gets it rather than a blank box.
   ------------------------------------------------------------ */
(function () {
    'use strict';
    var slots = document.querySelectorAll('.loc-map-defer[data-map-src]');
    if (!slots.length) return;

    function load(slot) {
        if (slot.dataset.mapLoaded) return;
        slot.dataset.mapLoaded = '1';
        var f = document.createElement('iframe');
        f.src = slot.getAttribute('data-map-src');
        f.title = slot.getAttribute('data-map-title') || 'Map';
        f.setAttribute('allowfullscreen', '');
        f.setAttribute('loading', 'lazy');
        f.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
        slot.appendChild(f);
    }

    if (!('IntersectionObserver' in window)) {
        Array.prototype.forEach.call(slots, load);
        return;
    }
    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            if (e.isIntersecting) { load(e.target); io.unobserve(e.target); }
        });
    }, { rootMargin: '300px 0px' });
    Array.prototype.forEach.call(slots, function (s) { io.observe(s); });
})();


/* ── Hero video ──────────────────────────────────────────────────────────
   The <video> ships with no src on purpose. Nothing downloads until this
   decides what the device should get, so a phone set to "poster" costs the
   visitor zero video bytes and keeps the poster frame it already painted.

   Switch a page between the two behaviours with data-mobile on the element:
     data-mobile="poster"  phones keep the still, desktop plays the video
     data-mobile="video"   phones get the smaller 854px cut as well
   ------------------------------------------------------------------------ */
(function () {
    var v = document.querySelector('.hero-video');
    if (!v) return;

    var isPhone = window.matchMedia('(max-width: 767px)').matches;

    if (isPhone && v.getAttribute('data-mobile') === 'poster') {
        v.setAttribute('poster', '/assets/img/hero-poster-mobile.jpg');
        return;                      // no src, so no download
    }

    v.src = isPhone ? '/assets/video/hero-mobile.mp4' : '/assets/video/hero.mp4';
    v.preload = 'auto';
    v.load();

    /* Autoplay can still be refused (iOS Low Power Mode, data saver). The
       poster stays up in that case, so there is nothing to clean up. */
    var p = v.play();
    if (p && typeof p.catch === 'function') { p.catch(function () {}); }
})();
