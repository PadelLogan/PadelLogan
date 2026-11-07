// Solid nav once scrolled past the hero
    const navEl = document.querySelector('nav');
    const onScroll = () => navEl.classList.toggle('scrolled', window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Inclusions accordion: open in the markup, collapsed only on small screens.
    // JS can only ever close these, so a script failure leaves the content visible.
    if (window.matchMedia('(max-width: 960px)').matches) {
        document.querySelectorAll('.incl-acc').forEach(d => { d.open = false; });
    }

    // Track membership email clicks in GTM / GA4
    document.querySelectorAll('a[href^="mailto:info@padellogan.com.au"]').forEach(a => {
        a.addEventListener('click', () => {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ event: 'membership_email_click', membership: 'founding' });
        });
    });

    /* ── Klaviyo intent signals ──────────────────────────────────
       Same pattern as 'Started a Booking' on book-court.html: klaviyo.js
       resolves who this is from its own cookie, set when someone signs up
       on the site or clicks through from one of our emails. Anonymous
       visitors record nothing, which is why the memberships flow only
       ever reaches people already on the list. */
    function plTrack(name, props) {
        try {
            window.klaviyo = window.klaviyo || [];
            window.klaviyo.push(['track', name, props || {}]);
        } catch (e) {}
    }

    plTrack('Viewed Memberships', { Source: 'Memberships page' });

    /* Which tier they reached for. The founding CTAs carry ?tier= in the
       href, Bronze goes straight out to MATCHi. */
    document.querySelectorAll('a[href*="/join?tier="], a[href*="matchi.se"]').forEach(function (a) {
        a.addEventListener('click', function () {
            var href = a.getAttribute('href') || '';
            var m = href.match(/[?&]tier=([a-z]+)/i);
            var tier = m ? m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() : 'Bronze';
            plTrack('Clicked Membership Signup', { Tier: tier, Source: 'Memberships page' });
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ event: 'membership_cta_click', membership_tier: tier });
        });
    });
