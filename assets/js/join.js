/* ============================================================
   PADEL LOGAN — membership application submission

   Two destinations, fired together:
     1. Formspree  -> emails the application to info@padellogan.com.au
     2. Klaviyo    -> stores the applicant as a profile + event so they
                      are segmentable and reachable later

   Delivery to the club is what counts, so the success screen is shown
   only when Formspree accepts. If it fails we surface a mailto fallback
   rather than swallowing the application.
   ============================================================ */
(function () {
    'use strict';

    // The Formspree form ID for info@padellogan.com.au lives on the form's
    // data-formspree attribute in join.html, so it is one line to configure
    // and never buried in this file. Read lazily at submit time.
    function formspreeId() {
        return (form.getAttribute('data-formspree') || '').trim();
    }

    var KLAVIYO_COMPANY = 'Ycnj4g';
    var KLAVIYO_REVISION = '2025-07-15';
    var NEWSLETTER_LIST = 'UrR45w';
    var MIN_FILL_SECONDS = 6;   // anything faster than this is a bot

    var form = document.getElementById('joinForm');
    if (!form) return;

    var submitBtn = document.getElementById('joinSubmit');
    var formError = document.getElementById('formError');
    var success = document.getElementById('joinSuccess');
    var loadedAt = Date.now();

    /* ── date stamp on the signature ── */
    var signDate = document.getElementById('signDate');
    var todayStr = new Date().toLocaleDateString('en-AU', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Brisbane'
    });
    if (signDate) signDate.value = todayStr;

    /* ── preselect a tier from /join?tier=platinum ── */
    try {
        var wanted = (new URLSearchParams(window.location.search).get('tier') || '').toLowerCase();
        if (wanted) {
            document.querySelectorAll('input[name="membershipCategory"]').forEach(function (r) {
                if (r.value.toLowerCase().indexOf(wanted) === 0) r.checked = true;
            });
        }
    } catch (e) { /* preselect is a nicety, never block the form for it */ }

    /* ── validation ── */
    var REQUIRED_TEXT = [
        'firstName', 'surname', 'dob', 'email', 'mobile', 'address',
        'suburb', 'state', 'postcode', 'ecName', 'ecRel', 'ecMobile',
        'matchiEmail', 'shirtSize', 'signature'
    ];
    var REQUIRED_RADIO = ['membershipCategory', 'playedBefore', 'mgcMember', 'gaHandicap'];
    var REQUIRED_CHECK = ['agreeTerms', 'declarationCheck'];

    function showError(id, on) {
        var el = document.getElementById('err-' + id);
        if (el) el.classList.toggle('show', !!on);
        var input = document.getElementById(id);
        if (input) {
            if (on) input.setAttribute('aria-invalid', 'true');
            else input.removeAttribute('aria-invalid');
        }
    }

    function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

    function validate() {
        var bad = [];

        REQUIRED_TEXT.forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            var v = (el.value || '').trim();
            var invalid = !v;
            if (!invalid && (id === 'email' || id === 'matchiEmail')) invalid = !isEmail(v);
            if (!invalid && id === 'postcode') invalid = !/^\d{4}$/.test(v);
            showError(id, invalid);
            if (invalid) bad.push(el);
        });

        REQUIRED_RADIO.forEach(function (name) {
            var picked = form.querySelector('input[name="' + name + '"]:checked');
            showError(name, !picked);
            if (!picked) bad.push(form.querySelector('input[name="' + name + '"]'));
        });

        REQUIRED_CHECK.forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            showError(id, !el.checked);
            if (!el.checked) bad.push(el);
        });

        return bad;
    }

    /* ── payload ── */
    function val(id) { var e = document.getElementById(id); return e ? (e.value || '').trim() : ''; }
    function radio(name) {
        var e = form.querySelector('input[name="' + name + '"]:checked');
        return e ? e.value : '';
    }
    function interests() {
        return Array.prototype.map.call(
            form.querySelectorAll('input[name="interests"]:checked'), function (c) { return c.value; }
        );
    }
    function tierName() { return (radio('membershipCategory').split(' Membership')[0] || '').trim(); }

    // Klaviyo rejects a profile outright on a malformed phone number, so only
    // send one when it converts cleanly to E.164. The raw value always travels
    // in the properties regardless.
    function toE164(raw) {
        var d = (raw || '').replace(/[^\d+]/g, '');
        if (/^\+61[2-478]\d{8}$/.test(d)) return d;
        if (/^0[2-478]\d{8}$/.test(d)) return '+61' + d.slice(1);
        if (/^61[2-478]\d{8}$/.test(d)) return '+' + d;
        return null;
    }

    function buildApplication() {
        return {
            'Membership Category': radio('membershipCategory'),
            'First Name': val('firstName'),
            'Surname': val('surname'),
            'Date of Birth': val('dob'),
            'Gender': val('gender'),
            'Email Address': val('email'),
            'Mobile Number': val('mobile'),
            'Residential Address': val('address'),
            'Suburb': val('suburb'),
            'State': val('state'),
            'Postcode': val('postcode'),
            'Emergency Contact Name': val('ecName'),
            'Emergency Contact Relationship': val('ecRel'),
            'Emergency Contact Mobile': val('ecMobile'),
            'Played Padel Before': radio('playedBefore'),
            'Player Level': val('playerLevel'),
            'MATCHi Account Email': val('matchiEmail'),
            'Club Shirt Size': val('shirtSize'),
            'Interests': interests().join(', '),
            'Meadowbrook Golf Club Member': radio('mgcMember'),
            'Meadowbrook Membership Number': val('mgcNumber'),
            'Golf Australia Handicap': radio('gaHandicap'),
            'GolfLink Number': val('golfLink'),
            'Current Golf Handicap': val('handicap'),
            'Home Golf Club': val('homeClub'),
            'How They Heard About Us': val('heardAbout'),
            'Agreed To Terms': document.getElementById('agreeTerms').checked ? 'Yes' : 'No',
            'Declaration Confirmed': document.getElementById('declarationCheck').checked ? 'Yes' : 'No',
            'Signature': val('signature'),
            'Signed Date': val('signDate'),
            'Marketing Opt In': document.getElementById('optin').checked ? 'Yes' : 'No'
        };
    }

    /* ── destinations ── */
    function sendToFormspree(app) {
        var id = formspreeId();
        if (!id) return Promise.reject(new Error('Formspree form ID is not configured'));
        var body = {
            // Formspree reads these plain names for the reply-to and subject line
            name: app['First Name'] + ' ' + app['Surname'],
            email: app['Email Address'],
            subject: 'Membership Application — ' + tierName() + ' — ' + app['First Name'] + ' ' + app['Surname'],
            _gotcha: val('_gotcha')
        };
        Object.keys(app).forEach(function (k) { body[k] = app[k]; });

        return fetch('https://formspree.io/f/' + id, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(body)
        }).then(function (res) {
            if (!res.ok) throw new Error('Formspree ' + res.status);
            return true;
        });
    }

    function sendToKlaviyo(app) {
        var phone = toE164(app['Mobile Number']);
        var attrs = {
            email: app['Email Address'],
            first_name: app['First Name'],
            last_name: app['Surname'],
            location: {
                address1: app['Residential Address'],
                city: app['Suburb'],
                region: app['State'],
                zip: app['Postcode'],
                country: 'Australia'
            },
            properties: {
                'Membership Tier': tierName(),
                'Membership Category': app['Membership Category'],
                'Player Level': app['Player Level'],
                'Played Padel Before': app['Played Padel Before'],
                'MATCHi Account Email': app['MATCHi Account Email'],
                'Club Shirt Size': app['Club Shirt Size'],
                'Padel Interests': interests(),
                'Meadowbrook Golf Club Member': app['Meadowbrook Golf Club Member'],
                'Golf Australia Handicap': app['Golf Australia Handicap'],
                'Current Golf Handicap': app['Current Golf Handicap'],
                'Home Golf Club': app['Home Golf Club'],
                'Date of Birth': app['Date of Birth'],
                'Gender': app['Gender'],
                'How They Heard About Us': app['How They Heard About Us'],
                'Mobile Number': app['Mobile Number'],
                'Membership Application Submitted': app['Signed Date']
            }
        };
        if (phone) attrs.phone_number = phone;

        return fetch('https://a.klaviyo.com/client/events/?company_id=' + KLAVIYO_COMPANY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'revision': KLAVIYO_REVISION },
            body: JSON.stringify({
                data: {
                    type: 'event',
                    attributes: {
                        properties: app,
                        value: Number((radio('membershipCategory').match(/[\d,]+/) || ['0'])[0].replace(/,/g, '')),
                        metric: { data: { type: 'metric', attributes: { name: 'Submitted Membership Application' } } },
                        profile: { data: { type: 'profile', attributes: attrs } }
                    }
                }
            })
        }).then(function (res) {
            if (!res.ok) throw new Error('Klaviyo event ' + res.status);
            return true;
        });
    }

    // Accepting the membership T&Cs is not marketing consent — this only runs
    // when the separate optional checkbox is ticked.
    function subscribeToNewsletter(app) {
        return fetch('https://a.klaviyo.com/client/subscriptions/?company_id=' + KLAVIYO_COMPANY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'revision': KLAVIYO_REVISION },
            body: JSON.stringify({
                data: {
                    type: 'subscription',
                    attributes: {
                        custom_source: 'Padel Logan Membership Application',
                        profile: {
                            data: {
                                type: 'profile',
                                attributes: {
                                    email: app['Email Address'],
                                    subscriptions: { email: { marketing: { consent: 'SUBSCRIBED' } } }
                                }
                            }
                        }
                    },
                    relationships: { list: { data: { type: 'list', id: NEWSLETTER_LIST } } }
                }
            })
        }).then(function (res) {
            if (!res.ok) throw new Error('Klaviyo subscribe ' + res.status);
            return true;
        });
    }

    function mailtoFallback(app) {
        var lines = Object.keys(app).map(function (k) { return k + ': ' + app[k]; });
        return 'mailto:info@padellogan.com.au'
            + '?subject=' + encodeURIComponent('Membership Application — ' + tierName())
            + '&body=' + encodeURIComponent(lines.join('\n'));
    }

    /* ── submit ── */
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        formError.classList.remove('show');

        var bad = validate();
        if (bad.length) {
            formError.textContent = 'Please check the ' + bad.length + ' highlighted '
                + (bad.length === 1 ? 'field' : 'fields') + ' and try again.';
            formError.classList.add('show');
            if (bad[0] && bad[0].scrollIntoView) {
                bad[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (bad[0].focus) bad[0].focus({ preventScroll: true });
            }
            return;
        }

        // spam traps: filled honeypot, or submitted implausibly fast
        var elapsed = (Date.now() - loadedAt) / 1000;
        if (val('_gotcha') || elapsed < MIN_FILL_SECONDS) {
            form.style.display = 'none';
            success.classList.add('show');
            return;
        }

        var app = buildApplication();
        var label = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';

        var jobs = [sendToFormspree(app), sendToKlaviyo(app)];
        if (document.getElementById('optin').checked) jobs.push(subscribeToNewsletter(app));

        Promise.allSettled(jobs).then(function (results) {
            var delivered = results[0].status === 'fulfilled';
            var stored = results[1].status === 'fulfilled';

            results.forEach(function (r, i) {
                if (r.status === 'rejected') {
                    console.error('Membership application step ' + i + ' failed:', r.reason);
                }
            });

            if (delivered) {
                try {
                    window.dataLayer = window.dataLayer || [];
                    window.dataLayer.push({
                        event: 'membership_application_submitted',
                        membership_tier: tierName(),
                        klaviyo_stored: stored
                    });
                } catch (err) { /* tracking must never block the confirmation */ }

                form.style.display = 'none';
                success.classList.add('show');
                success.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }

            // The club did not get the application. Never claim success here.
            submitBtn.disabled = false;
            submitBtn.textContent = label;
            formError.innerHTML = 'Sorry, we could not send your application just now. '
                + '<a href="' + mailtoFallback(app) + '">Send it to us by email instead</a>, '
                + 'or call <a href="tel:0732996653">07 3299 6653</a> and we will take your details over the phone.';
            formError.classList.add('show');
            formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });

    /* clear a field's error as soon as the visitor starts fixing it */
    form.addEventListener('input', function (e) {
        if (e.target.id) showError(e.target.id, false);
    });
    form.addEventListener('change', function (e) {
        if (e.target.name) showError(e.target.name, false);
        if (e.target.id) showError(e.target.id, false);
    });
})();
