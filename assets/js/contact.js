/* ============================================================
   PADEL LOGAN — contact enquiry

   Posts a "Submitted Enquiry" event to Klaviyo, the same public
   client endpoint the homepage form already uses. Deliberately NOT
   on Formspree: the free plan allows 50 submissions a month across
   the whole account, and enquiry volume could exhaust that and start
   rejecting membership applications.

   NOTE: this stores the enquiry in Klaviyo but does not email
   anyone. Enquiries are only seen by someone checking Klaviyo.
   ============================================================ */
(function () {
    'use strict';

    var KLAVIYO_COMPANY = 'Ycnj4g';
    var KLAVIYO_REVISION = '2025-07-15';

    var form = document.getElementById('contactForm');
    if (!form) return;

    var btn = document.getElementById('cSubmit');
    var errBox = document.getElementById('cError');
    var success = document.getElementById('cSuccess');

    function val(id) { var e = document.getElementById(id); return e ? (e.value || '').trim() : ''; }
    function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

    function mark(id, bad) {
        var e = document.getElementById('err-' + id);
        if (e) e.classList.toggle('show', !!bad);
        var i = document.getElementById(id);
        if (i) { if (bad) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid'); }
    }

    form.addEventListener('input', function (e) { if (e.target.id) mark(e.target.id, false); });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        errBox.classList.remove('show');

        var name = val('cName'), email = val('cEmail');
        var phone = val('cPhone'), topic = val('cTopic'), message = val('cMessage');

        var bad = [];
        if (!name) { mark('cName', true); bad.push('cName'); }
        if (!isEmail(email)) { mark('cEmail', true); bad.push('cEmail'); }
        if (!message) { mark('cMessage', true); bad.push('cMessage'); }
        if (bad.length) {
            errBox.textContent = 'Please check the highlighted fields and try again.';
            errBox.classList.add('show');
            var first = document.getElementById(bad[0]);
            if (first) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); first.focus({ preventScroll: true }); }
            return;
        }

        if (val('cCompany')) {              // honeypot
            form.style.display = 'none';
            success.classList.add('show');
            return;
        }

        var label = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Sending…';

        fetch('https://a.klaviyo.com/client/events/?company_id=' + KLAVIYO_COMPANY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'revision': KLAVIYO_REVISION },
            body: JSON.stringify({
                data: {
                    type: 'event',
                    attributes: {
                        properties: {
                            Name: name, Phone: phone, Topic: topic, Message: message,
                            Source: 'Website Contact Page'
                        },
                        metric: { data: { type: 'metric', attributes: { name: 'Submitted Enquiry' } } },
                        profile: { data: { type: 'profile', attributes: { email: email, first_name: name } } }
                    }
                }
            })
        }).then(function (res) {
            if (!res.ok) throw new Error('Klaviyo ' + res.status);
            try {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({ event: 'contact_enquiry_submitted', topic: topic || 'unspecified' });
            } catch (err) { /* tracking must never block the confirmation */ }
            form.style.display = 'none';
            success.classList.add('show');
            success.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }).catch(function (err) {
            console.error('Contact enquiry failed:', err);
            btn.disabled = false;
            btn.textContent = label;
            errBox.innerHTML = 'Sorry, we could not send that just now. Please email '
                + '<a href="mailto:info@padellogan.com.au">info@padellogan.com.au</a> or call '
                + '<a href="tel:0732996653">07 3299 6653</a>.';
            errBox.classList.add('show');
        });
    });
})();
