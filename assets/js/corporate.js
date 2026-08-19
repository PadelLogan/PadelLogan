/* ============================================================
   PADEL LOGAN — corporate enquiry

   Fires a distinct "Submitted Corporate Enquiry" metric, separate
   from the general "Submitted Enquiry", and writes the qualifying
   answers onto the PROFILE as well as the event. Klaviyo segments
   can only filter on profile properties, so anything we want to
   segment by has to live there, not only in the event payload.

   Corporate leads want different messaging to members, so every
   profile is stamped Lead Type = Corporate.
   ============================================================ */
(function () {
    'use strict';

    var KLAVIYO_COMPANY = 'Ycnj4g';
    var KLAVIYO_REVISION = '2025-07-15';
    var NEWSLETTER_LIST = 'UrR45w';

    var form = document.getElementById('corpForm');
    if (!form) return;

    var btn = document.getElementById('coSubmit');
    var errBox = document.getElementById('coError');
    var success = document.getElementById('coSuccess');

    function val(id) { var e = document.getElementById(id); return e ? (e.value || '').trim() : ''; }
    function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
    function mark(id, bad) {
        var e = document.getElementById('err-' + id);
        if (e) e.classList.toggle('show', !!bad);
        var i = document.getElementById(id);
        if (i) { if (bad) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid'); }
    }
    form.addEventListener('input', function (e) { if (e.target.id) mark(e.target.id, false); });

    // Klaviyo rejects the whole profile on a malformed phone number
    function toE164(raw) {
        var d = (raw || '').replace(/[^\d+]/g, '');
        if (/^\+61[2-478]\d{8}$/.test(d)) return d;
        if (/^0[2-478]\d{8}$/.test(d)) return '+61' + d.slice(1);
        if (/^61[2-478]\d{8}$/.test(d)) return '+' + d;
        return null;
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        errBox.classList.remove('show');

        var name = val('coName'), company = val('coCompany'), email = val('coEmail');
        var bad = [];
        if (!name) { mark('coName', true); bad.push('coName'); }
        if (!company) { mark('coCompany', true); bad.push('coCompany'); }
        if (!isEmail(email)) { mark('coEmail', true); bad.push('coEmail'); }
        if (bad.length) {
            errBox.textContent = 'Please check the highlighted fields and try again.';
            errBox.classList.add('show');
            var first = document.getElementById(bad[0]);
            if (first) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); first.focus({ preventScroll: true }); }
            return;
        }

        if (val('coWebsite')) {                 // honeypot
            form.style.display = 'none';
            success.classList.add('show');
            return;
        }

        var phone = toE164(val('coPhone'));
        var parts = name.split(/\s+/);
        var props = {
            'Lead Type': 'Corporate',
            'Company': company,
            'Event Type': val('coEvent'),
            'Group Size': val('coSize'),
            'Enquiry Timing': val('coWhen')
        };
        var attrs = {
            email: email,
            first_name: parts[0],
            last_name: parts.slice(1).join(' '),
            organization: company,
            properties: props
        };
        if (phone) attrs.phone_number = phone;

        var label = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Sending…';

        var jobs = [fetch('https://a.klaviyo.com/client/events/?company_id=' + KLAVIYO_COMPANY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'revision': KLAVIYO_REVISION },
            body: JSON.stringify({
                data: {
                    type: 'event',
                    attributes: {
                        properties: {
                            Name: name, Company: company, Phone: val('coPhone'),
                            'Event Type': val('coEvent'), 'Group Size': val('coSize'),
                            'Enquiry Timing': val('coWhen'), Message: val('coMessage'),
                            Source: 'Corporate Page Enquiry'
                        },
                        metric: { data: { type: 'metric', attributes: { name: 'Submitted Corporate Enquiry' } } },
                        profile: { data: { type: 'profile', attributes: attrs } }
                    }
                }
            })
        }).then(function (r) { if (!r.ok) throw new Error('Klaviyo event ' + r.status); return true; })];

        // an enquiry is not marketing consent; only the explicit tick subscribes
        if (document.getElementById('coOptin').checked) {
            jobs.push(fetch('https://a.klaviyo.com/client/subscriptions/?company_id=' + KLAVIYO_COMPANY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'revision': KLAVIYO_REVISION },
                body: JSON.stringify({
                    data: {
                        type: 'subscription',
                        attributes: {
                            custom_source: 'Padel Logan Corporate Enquiry',
                            profile: { data: { type: 'profile', attributes: {
                                email: email,
                                subscriptions: { email: { marketing: { consent: 'SUBSCRIBED' } } }
                            } } }
                        },
                        relationships: { list: { data: { type: 'list', id: NEWSLETTER_LIST } } }
                    }
                })
            }));
        }

        Promise.allSettled(jobs).then(function (res) {
            if (res[0].status !== 'fulfilled') {
                console.error('Corporate enquiry failed:', res[0].reason);
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
                    event: 'corporate_enquiry_submitted',
                    event_type: val('coEvent') || 'unspecified',
                    group_size: val('coSize') || 'unspecified'
                });
            } catch (err) { /* tracking must never block the confirmation */ }
            form.style.display = 'none';
            success.classList.add('show');
            success.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });
})();
