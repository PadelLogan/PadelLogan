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
