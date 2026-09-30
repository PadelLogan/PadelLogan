/* ============================================================
   Play For Free — top banner + pop-up, on every page.

   Both are injected from here rather than written into nine
   HTML files, so the copy lives in one place. The old pop-up
   was markup inside index.html, which is why it only ever
   appeared on the home page.

   The banner teases the offer and sends people to the signup.
   It deliberately does NOT carry the code: if it did, nobody
   would need to hand over an email to get one.

   House rule: no hyphens, en dashes or em dashes in any copy
   below. The discount code keeps its hyphens, same exemption
   as a brand name.
   ============================================================ */
(function () {
    'use strict';

    var COMPANY  = 'Ycnj4g';
    var REVISION = '2025-07-15';
    var LIST     = 'UrR45w';

    /* The offer ends 31 October. Past that both pieces take
       themselves down rather than promise a code that MATCHi
       will refuse. Parsed as local time, not UTC. */
    var OFFER_ENDS = new Date(2026, 10, 1, 0, 0, 0); // 1 Nov 2026, month is 0 based
    if (new Date() >= OFFER_ENDS) return;

    var BAR_KEY = 'pl_offer_bar_dismissed';
    var POP_KEY = 'pl_freegame_popup_seen';   // new key: everyone who dismissed
                                              // the old founding pop-up gets this one

    function get(k) { try { return localStorage.getItem(k) === '1'; } catch (e) { return false; } }
    function set(k) { try { localStorage.setItem(k, '1'); } catch (e) {} }

    function track(source) {
        try {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ event: 'newsletter_signup', signup_source: source });
        } catch (e) {}
    }

    /* Shared subscribe call. `Signup Offer` is written to the profile,
       not just the subscription, because Klaviyo segments filter on
       profile properties. */
    function subscribe(email, source) {
        return fetch('https://a.klaviyo.com/client/subscriptions/?company_id=' + COMPANY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'revision': REVISION },
            body: JSON.stringify({
                data: {
                    type: 'subscription',
                    attributes: {
                        custom_source: source,
                        profile: { data: { type: 'profile', attributes: {
                            email: email,
                            properties: { 'Signup Offer': 'Play For Free' },
                            subscriptions: { email: { marketing: { consent: 'SUBSCRIBED' } } }
                        } } }
                    },
                    relationships: { list: { data: { type: 'list', id: LIST } } }
                }
            })
        }).then(function (res) {
            if (!res.ok) throw new Error('Klaviyo ' + res.status);
            /* Ties this browser to the profile, so a later booking click
               on /book-court can be attributed without them coming back
               through an email link first. */
            try {
                window.klaviyo = window.klaviyo || [];
                window.klaviyo.push(['identify', { email: email }]);
            } catch (e) {}
            return res;
        });
    }

    /* ── banner ─────────────────────────────────────────── */
    function banner() {
        if (get(BAR_KEY)) return;

        var bar = document.createElement('div');
        bar.className = 'plo-bar';
        bar.innerHTML =
            '<a class="plo-bar-link" href="/#newsletter">' +
                '<span>Your first game is on us. Sign up for your free code</span>' +
                '<span class="plo-bar-arrow" aria-hidden="true">&rarr;</span>' +
            '</a>' +
            '<button class="plo-bar-x" type="button" aria-label="Close offer banner">&times;</button>';

        document.body.insertBefore(bar, document.body.firstChild);
        document.documentElement.classList.add('has-plo-bar');

        bar.querySelector('.plo-bar-x').addEventListener('click', function () {
            bar.remove();
            document.documentElement.classList.remove('has-plo-bar');
            set(BAR_KEY);
        });
    }

    /* ── pop-up ─────────────────────────────────────────── */
    function popup() {
        if (get(POP_KEY)) return;

        var wrap = document.createElement('div');
        wrap.className = 'plo-pop-overlay';
        wrap.setAttribute('role', 'dialog');
        wrap.setAttribute('aria-modal', 'true');
        wrap.setAttribute('aria-label', 'Claim a free game at Padel Logan');
        wrap.innerHTML =
            '<div class="plo-pop">' +
                '<button class="plo-pop-x" type="button" aria-label="Close">&times;</button>' +
                '<div class="plo-pop-img">' +
                    '<img src="/assets/img/popup-hero.jpg" alt="Four players on court at Padel Logan">' +
                '</div>' +
                '<div class="plo-pop-body">' +
                    '<div class="plo-pop-eyebrow">Play for free</div>' +
                    '<h2 class="plo-pop-title">Your first game is on us</h2>' +
                    '<p class="plo-pop-sub">Pop your email in and we will send you a code for a free game. Four championship courts at Meadowbrook Golf Club, open 6:00am to 10:00pm.</p>' +
                    '<form class="plo-pop-form" novalidate>' +
                        '<input type="email" id="ploPopEmail" placeholder="Your email address" autocomplete="email" aria-label="Your email address" required>' +
                        '<button type="submit">Send me the code</button>' +
                        '<p class="plo-pop-err" role="alert">Sorry, something went wrong. Please try again.</p>' +
                    '</form>' +
                    '<p class="plo-pop-fine">One per person. Offer ends 31 October. No spam, unsubscribe anytime.</p>' +
                    '<div class="plo-pop-success">Check your inbox. Your code is on its way.</div>' +
                '</div>' +
            '</div>';

        document.body.appendChild(wrap);

        var panel   = wrap.querySelector('.plo-pop');
        var form    = wrap.querySelector('.plo-pop-form');
        var err     = wrap.querySelector('.plo-pop-err');
        var shown   = false;

        function open()  { if (shown || get(POP_KEY)) return; shown = true; wrap.classList.add('open'); }
        function close() { wrap.classList.remove('open'); set(POP_KEY); }

        /* 3 seconds, not 1: the page gets to paint first, so it reads as
           an offer rather than an ambush. Exit intent catches the rest. */
        setTimeout(open, 3000);
        document.addEventListener('mouseout', function (e) { if (e.clientY <= 0) open(); });

        wrap.querySelector('.plo-pop-x').addEventListener('click', close);
        wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && wrap.classList.contains('open')) close();
        });

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var email = form.querySelector('#ploPopEmail').value.trim();
            if (!email) return;
            var btn = form.querySelector('button');
            btn.disabled = true;
            btn.textContent = 'Sending…';
            err.style.display = 'none';

            subscribe(email, 'Padel Logan Website Popup').then(function () {
                track('popup');
                panel.classList.add('done');
                set(POP_KEY);
                setTimeout(close, 3200);
            }).catch(function (e2) {
                console.error('Pop-up signup failed:', e2);
                btn.disabled = false;
                btn.textContent = 'Send me the code';
                err.style.display = 'block';
            });
        });
    }

    function init() { banner(); popup(); }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
