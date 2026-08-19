// Scroll reveal
    const revealEls = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('visible');
                io.unobserve(e.target);
            }
        });
    }, { threshold: 0.1 });
    revealEls.forEach(el => io.observe(el));

    // Newsletter form
    document.getElementById('wlForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const form = this;
        const email = document.getElementById('wlEmail').value.trim();
        if (!email) return;
        const btn = form.querySelector('.wl-btn');
        const label = btn ? btn.textContent : '';
        if (btn) { btn.disabled = true; btn.textContent = 'Subscribing…'; }

        // Subscribe to Klaviyo "Padel Logan — Newsletter" list (public client endpoint — no secret exposed)
        fetch('https://a.klaviyo.com/client/subscriptions/?company_id=Ycnj4g', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'revision': '2025-07-15' },
            body: JSON.stringify({
                data: {
                    type: 'subscription',
                    attributes: {
                        custom_source: 'Padel Logan Website – Newsletter',
                        profile: { data: { type: 'profile', attributes: {
                            email: email,
                            subscriptions: { email: { marketing: { consent: 'SUBSCRIBED' } } }
                        } } }
                    },
                    relationships: { list: { data: { type: 'list', id: 'UrR45w' } } }
                }
            })
        }).then(function(res) {
            if (!res.ok) throw new Error('Klaviyo ' + res.status);
            form.style.display = 'none';
            document.getElementById('wlSuccess').style.display = 'block';
        }).catch(function(err) {
            console.error('Newsletter signup failed:', err);
            if (btn) { btn.disabled = false; btn.textContent = label; }
            var note = form.querySelector('.wl-error');
            if (!note) {
                note = document.createElement('p');
                note.className = 'wl-error';
                note.style.cssText = 'margin-top:0.9rem;font-size:0.8rem;color:#c0392b;';
                form.appendChild(note);
            }
            note.textContent = 'Sorry — something went wrong. Please try again in a moment.';
        });
    });

    // Contact form -> Klaviyo "Submitted Enquiry" lead event (public client endpoint)
    document.getElementById('contactForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const form = this;
        const name = document.getElementById('cfName').value.trim();
        const email = document.getElementById('cfEmail').value.trim();
        const phone = document.getElementById('cfPhone').value.trim();
        const message = document.getElementById('cfMessage').value.trim();
        if (!name || !email || !message) return;
        const btn = form.querySelector('.cf-btn');
        const label = btn ? btn.textContent : '';
        if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

        fetch('https://a.klaviyo.com/client/events/?company_id=Ycnj4g', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'revision': '2025-07-15' },
            body: JSON.stringify({
                data: {
                    type: 'event',
                    attributes: {
                        properties: { Name: name, Phone: phone, Message: message, Source: 'Website Contact Form' },
                        metric: { data: { type: 'metric', attributes: { name: 'Submitted Enquiry' } } },
                        profile: { data: { type: 'profile', attributes: { email: email, first_name: name } } }
                    }
                }
            })
        }).then(function(res) {
            if (!res.ok) throw new Error('Klaviyo ' + res.status);
            form.querySelectorAll('.cf-row, .cf-input, .cf-textarea, .cf-btn').forEach(el => el.style.display = 'none');
            document.getElementById('cfSuccess').style.display = 'block';
        }).catch(function(err) {
            console.error('Contact form failed:', err);
            if (btn) { btn.disabled = false; btn.textContent = label; }
            var note = form.querySelector('.cf-error');
            if (!note) {
                note = document.createElement('p');
                note.className = 'cf-error';
                note.style.cssText = 'margin-top:0.9rem;font-size:0.8rem;color:#c0392b;';
                form.appendChild(note);
            }
            note.textContent = 'Sorry — something went wrong. Please try again in a moment.';
        });
    });

    // Solid header after scrolling off the hero
    (function () {
        const navEl = document.querySelector('nav');
        const onScroll = () => navEl.classList.toggle('scrolled', window.scrollY > 80);
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    })();
