/* ============================================================
   PADEL LOGAN — contact enquiry

   Posts a "Submitted Enquiry" event to Klaviyo, the same public
   client endpoint the homepage form already uses. Deliberately NOT
   on Formspree: the free plan allows 50 submissions a month across
   the whole account, and enquiry volume could exhaust that and start
   rejecting membership applications.

   Two destinations, fired together: Formspree emails info@, Klaviyo
   stores the profile and event so enquiries are segmentable.
   ============================================================ */
(function () {
    'use strict';

    var KLAVIYO_COMPANY = 'Ycnj4g';
    var KLAVIYO_REVISION = '2025-07-15';

    var form = document.getElementById('contactForm');
    if (!form) return;

    // Formspree delivers the enquiry to info@padellogan.com.au. The ID lives on
    // the form's data-formspree attribute so it is one line to change.
    function formspreeId() { return (form.getAttribute('data-formspree') || '').trim(); }
    function sendToFormspree(fields, subject) {
        var id = formspreeId();
        if (!id) return Promise.reject(new Error('Formspree form ID is not configured'));
        var body = { subject: subject };
        Object.keys(fields).forEach(function (k) { body[k] = fields[k]; });
        return fetch('https://formspree.io/f/' + id, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(body)
        }).then(function (r) { if (!r.ok) throw new Error('Formspree ' + r.status); return true; });
    }


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

        var fields = {
            name: name, email: email, phone: phone,
            Topic: topic || 'Not specified', Message: message,
            Source: 'Website Contact Page'
        };
        var subject = 'Website Enquiry — ' + (topic || 'General') + ' — ' + name;

        var klaviyo = fetch('https://a.klaviyo.com/client/events/?company_id=' + KLAVIYO_COMPANY, {
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
                        // segments filter on PROFILE properties, not event
                        // payloads, so anything worth segmenting by lives here
                        profile: { data: { type: 'profile', attributes: {
                            email: email,
                            first_name: name.split(/\s+/)[0],
                            last_name: name.split(/\s+/).slice(1).join(' '),
                            properties: {
                                'Lead Type': 'Website Enquiry',
                                'Enquiry Topic': topic || 'Not specified'
                            }
                        } } }
                    }
                }
            })
        }).then(function (res) { if (!res.ok) throw new Error('Klaviyo ' + res.status); return true; });

        Promise.allSettled([sendToFormspree(fields, subject), klaviyo]).then(function (r) {
            var delivered = r[0].status === 'fulfilled';
            r.forEach(function (x, i) {
                if (x.status === 'rejected') console.error('Contact step ' + i + ' failed:', x.reason);
            });
            if (!delivered) {
                // the club did not get the enquiry, so never claim success
                btn.disabled = false;
                btn.textContent = label;
                errBox.innerHTML = 'Sorry, we could not send that just now. Please email '
                    + '<a href="mailto:info@padellogan.com.au">info@padellogan.com.au</a> or call '
                    + '<a href="tel:0732996653">07 3299 6653</a>.';
                errBox.classList.add('show');
                return;
            }
            try {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({
                    event: 'contact_enquiry_submitted', topic: topic || 'unspecified',
                    klaviyo_stored: r[1].status === 'fulfilled'
                });
            } catch (err) { /* tracking must never block the confirmation */ }
            form.style.display = 'none';
            success.classList.add('show');
            success.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });
})();
