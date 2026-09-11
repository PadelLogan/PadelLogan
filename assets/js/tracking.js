/* ============================================================
   PADEL LOGAN — Meta pixel and GA4

   Deployed directly rather than through Google Tag Manager. The GTM
   container GTM-K9WSRXHC is on every page but has never been published:
   its tags array is empty, so nothing has ever fired. Meta ads are
   running now, so tracking goes in where it is guaranteed to work.

   IMPORTANT: do not add a GA4 or Meta tag to GTM as well, or every
   pageview and conversion is counted twice.

   The site already pushes two events to dataLayer from join.js and
   welcome.html. This file listens for them rather than touching that
   code, and maps them to the Meta and GA4 equivalents.
   ============================================================ */
(function () {
    'use strict';

    var META_PIXEL = '1595488432087455';
    var GA4_ID = 'G-SZMKKHPD57';

    /* ── Meta pixel ─────────────────────────────────────────── */
    !function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () {
            n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
        t = b.createElement(e); t.async = !0; t.src = v;
        s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', META_PIXEL);
    fbq('track', 'PageView');

    /* ── GA4 ────────────────────────────────────────────────── */
    var g = document.createElement('script');
    g.async = true;
    g.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(g);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA4_ID);

    /* ── map the site's own events ──────────────────────────────
       join.js pushes membership_application_submitted with the tier and
       reference; welcome.html pushes membership_payment_returned when
       Stripe sends the payer back. Both already carry what we need.
       -------------------------------------------------------- */
    var VALUE = { Platinum: 2750, Gold: 2150, Silver: 1500 };

    function handle(ev) {
        if (!ev || !ev.event) return;

        if (ev.event === 'membership_application_submitted') {
            var v = VALUE[ev.membership_tier] || 0;
            // an application is a qualified lead, not a sale: the money
            // only moves once Stripe confirms
            fbq('track', 'Lead', {
                content_name: ev.membership_tier || 'Founding Membership',
                content_category: 'Membership Application',
                value: v, currency: 'AUD'
            });
            gtag('event', 'generate_lead', {
                currency: 'AUD', value: v,
                membership_tier: ev.membership_tier || '',
                application_reference: ev.application_reference || ''
            });
        }

        if (ev.event === 'membership_payment_returned') {
            // fired on /welcome, which is a shareable URL, so this can
            // over count. Stripe stays the source of truth for revenue.
            fbq('track', 'Purchase', { value: 0, currency: 'AUD',
                                       content_category: 'Founding Membership' });
            gtag('event', 'purchase', { currency: 'AUD', value: 0,
                                        transaction_id: 'welcome-return' });
        }

        if (ev.event === 'membership_payment_deferred') {
            fbq('trackCustom', 'PaymentArrangementRequested',
                { content_name: ev.membership_tier || '' });
            gtag('event', 'payment_arrangement_requested',
                 { membership_tier: ev.membership_tier || '' });
        }
    }

    // anything already queued before this file ran
    (window.dataLayer || []).forEach(handle);

    // and everything pushed from here on
    var push = window.dataLayer.push;
    window.dataLayer.push = function () {
        var r = push.apply(window.dataLayer, arguments);
        try { Array.prototype.forEach.call(arguments, handle); } catch (e) { /* never break the page */ }
        return r;
    };
})();
