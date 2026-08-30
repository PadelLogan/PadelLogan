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

    var LIVE_HOSTS = ['padellogan.com.au', 'www.padellogan.com.au'];
    function onLiveSite() { return LIVE_HOSTS.indexOf(window.location.hostname) !== -1; }

    /* ── Stripe Payment Links ──────────────────────────────────
       One hosted Stripe Checkout link per tier, created by
       tools/create-payment-links.py or by hand in the Stripe dashboard.

       Two sets, because they must not be mixed. The live site takes real
       money; everywhere else -- the preview, localhost -- stays on sandbox
       links so the club can demo and test without charging anyone.

       A blank entry is not an error: the payment step simply stays hidden and
       the club arranges payment as it does today, so a half-configured tier
       can never show the applicant a dead button.
       -------------------------------------------------------- */
    var STRIPE_LINKS_LIVE = {
        'Platinum': 'https://buy.stripe.com/14A8wP3EM91sgZCbkV0RG00',
        'Gold': 'https://buy.stripe.com/cNifZhgry3H8bFibkV0RG01',
        'Silver': 'https://buy.stripe.com/7sYcN5b7e0uW38M88J0RG02'
    };
    var STRIPE_LINKS_TEST = {
        'Platinum': 'https://buy.stripe.com/test_14A8wP3EM91sgZCbkV0RG00',
        'Gold': 'https://buy.stripe.com/test_cNifZhgry3H8bFibkV0RG01',
        'Silver': 'https://buy.stripe.com/test_7sYcN5b7e0uW38M88J0RG02'
    };
    var STRIPE_LINKS = onLiveSite() ? STRIPE_LINKS_LIVE : STRIPE_LINKS_TEST;

    /* Reference shared by the application email, the Klaviyo profile and the
       Stripe payment, so a payment can be matched to an applicant rather than
       guessed at by email. Stripe restricts client_reference_id to letters,
       numbers, hyphens and underscores. */
    function makeRef() {
        var t = Date.now().toString(36).toUpperCase().slice(-6);
        var r = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2);
        return 'PL-' + t + (r || 'XX');
    }
    var appRef = makeRef();

    function paymentUrl(tier, email) {
        var base = (STRIPE_LINKS[tier] || '').trim();
        if (!base) return null;
        // A Stripe test link takes no money. Showing one on the live site would
        // hand a real member a checkout that silently does nothing, so treat it
        // as unconfigured there and fall back to arranging payment with the club.
        if (base.indexOf('/test_') !== -1 && onLiveSite()) return null;
        return base + (base.indexOf('?') === -1 ? '?' : '&')
            + 'prefilled_email=' + encodeURIComponent(email)
            + '&client_reference_id=' + encodeURIComponent(appRef);
    }

    /* ── reviewing the payment step before Stripe exists ───────
       The gateway cannot take a real payment until the club has a Stripe
       account, but it still has to be reviewable in place. So on any host that
       is not the live site, the panel renders in an unmistakably marked
       preview state. On padellogan.com.au it appears only with a real Stripe
       link behind it, so a visitor is never shown a button that cannot pay.
       -------------------------------------------------------- */

    var form = document.getElementById('joinForm');
    if (!form) return;

    var submitBtn = document.getElementById('joinSubmit');
    var formError = document.getElementById('formError');
    var success = document.getElementById('joinSuccess');
    var loadedAt = Date.now();

    /* ── preview mode ──────────────────────────────────────────
       With no Formspree ID configured the form cannot deliver. Say so
       up front rather than letting a reviewer fill it in and hit what
       looks like a failure.
       -------------------------------------------------------- */
    if (!formspreeId()) {
        var note = document.createElement('p');
        note.className = 'j-preview-note';
        note.innerHTML = '<strong>Preview.</strong> The layout, wording and every field here are final, '
            + 'but online submissions are not switched on yet, so nothing is sent when you press Submit. '
            + 'Have a look through and send back any changes.';
        form.insertBefore(note, form.firstChild);
    }

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
            'Reference': appRef,
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
            'Marketing Opt In': 'Yes (accepted in membership terms)'
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
            subject: 'Membership Application — ' + tierName() + ' — ' + app['First Name'] + ' ' + app['Surname'] + ' (' + appRef + ')',
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
                'Membership Application Submitted': app['Signed Date'],
                'Application Reference': appRef,
                // set to true by the Stripe -> Klaviyo automation, never by this
                // page: a browser cannot know that a payment actually cleared
                'Membership Paid': false
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

    // Consent to club emails is part of the membership terms, which are a
    // required tick and are quoted in full on the form, so every applicant is
    // subscribed. custom_source records where that consent came from, so the
    // club has an audit trail if it is ever questioned.
    function subscribeToNewsletter(app) {
        return fetch('https://a.klaviyo.com/client/subscriptions/?company_id=' + KLAVIYO_COMPANY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'revision': KLAVIYO_REVISION },
            body: JSON.stringify({
                data: {
                    type: 'subscription',
                    attributes: {
                        custom_source: 'Padel Logan Membership Application — consent given in membership terms',
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

    /* ── payment step ──────────────────────────────────────────
       Revealed on the confirmation screen once the application is safely
       delivered. It is purely a hand-off to Stripe's hosted checkout -- no
       charge is made here and no card data touches this page. Returns false
       when the tier has no link configured, so the caller can fall back to
       the "we will be in touch" wording.
       -------------------------------------------------------- */
    function showPaymentStep(app) {
        var panel = document.getElementById('joinPay');
        var btn = document.getElementById('payBtn');
        if (!panel || !btn) return false;

        var url = paymentUrl(tierName(), app['Email Address']);
        var preview = !url && !onLiveSite();
        if (!url && !preview) return false;

        var amount = (app['Membership Category'].match(/\$[\d,]+/) || [''])[0];
        var tierEl = document.getElementById('payTier');
        var amtEl = document.getElementById('payAmount');
        if (tierEl) tierEl.textContent = 'Founding ' + tierName() + ' Membership';
        if (amtEl) amtEl.textContent = amount;
        btn.textContent = amount ? 'Pay ' + amount + ' Securely' : 'Pay Securely';

        if (url) {
            btn.href = url;
        } else {
            // no live link yet: the button explains itself instead of going nowhere
            panel.classList.add('is-preview');
            var flag = document.getElementById('payPreviewFlag');
            if (flag) flag.hidden = false;
            btn.setAttribute('href', '#');
            btn.setAttribute('aria-describedby', 'payPreviewFlag');
            btn.addEventListener('click', function (ev) {
                ev.preventDefault();
                var note = document.getElementById('payPreviewNote');
                if (note) {
                    note.hidden = false;
                    note.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
        }

        wirePayLater(app);
        panel.hidden = false;
        return true;
    }

    /* Choosing to sort payment out with the club is a real outcome, not a
       drop-off, so it is recorded the same way a payment would be. The club can
       then segment on it and follow up, instead of wondering who went quiet. */
    function wirePayLater(app) {
        var btn = document.getElementById('payLaterBtn');
        var out = document.getElementById('payLaterPanel');
        if (!btn || !out || btn.dataset.wired) return;
        btn.dataset.wired = '1';

        btn.addEventListener('click', function () {
            out.hidden = false;
            btn.hidden = true;
            out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            try {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({
                    event: 'membership_payment_deferred',
                    membership_tier: tierName(),
                    application_reference: appRef
                });
            } catch (e) { /* tracking must never break the confirmation */ }

            // best effort: the application is already delivered, so a failure
            // here costs the club a segment, not an applicant
            fetch('https://a.klaviyo.com/client/events/?company_id=' + KLAVIYO_COMPANY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'revision': KLAVIYO_REVISION },
                body: JSON.stringify({
                    data: {
                        type: 'event',
                        attributes: {
                            properties: {
                                'Membership Category': app['Membership Category'],
                                'Reference': appRef,
                                'Payment Preference': 'Arrange with club'
                            },
                            metric: { data: { type: 'metric', attributes: { name: 'Requested Payment Arrangement' } } },
                            profile: { data: { type: 'profile', attributes: {
                                email: app['Email Address'],
                                properties: { 'Payment Preference': 'Arrange with club' }
                            } } }
                        }
                    }
                })
            }).catch(function () { /* nothing the applicant needs to see */ });
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
        jobs.push(subscribeToNewsletter(app));

        Promise.allSettled(jobs).then(function (results) {
            var delivered = results[0].status === 'fulfilled';
            var stored = results[1].status === 'fulfilled';

            results.forEach(function (r, i) {
                if (r.status === 'rejected') {
                    console.error('Membership application step ' + i + ' failed:', r.reason);
                }
            });

            if (delivered) {
                var payable = showPaymentStep(app);
                var msg = document.getElementById('joinSuccessMsg');
                if (msg) {
                    msg.innerHTML = 'Thanks, we have your Founding Membership application. Your '
                        + 'reference is <strong>' + appRef + '</strong>. '
                        + (payable
                            ? 'There is one step left.'
                            : 'Our team will be in touch shortly to confirm your place and arrange payment.');
                }

                try {
                    window.dataLayer = window.dataLayer || [];
                    window.dataLayer.push({
                        event: 'membership_application_submitted',
                        membership_tier: tierName(),
                        application_reference: appRef,
                        payment_offered: payable,
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
            formError.innerHTML = formspreeId()
                ? 'Sorry, we could not send your application just now. '
                    + '<a href="' + mailtoFallback(app) + '">Send it to us by email instead</a>, '
                    + 'or call <a href="tel:0732996653">07 3299 6653</a> and we will take your details over the phone.'
                : 'This is a preview, so online submissions are not switched on yet and nothing was sent. '
                    + 'Everything you filled in validated correctly.';
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
