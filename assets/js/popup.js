(function () {
    var STORE = 'pl_founding_popup_seen';
    var overlay = document.getElementById('plPop');
    if (!overlay) return;
    var navLogo = document.querySelector('.nav-logo');
    var popLogo = overlay.querySelector('.pl-pop-logo');
    if (navLogo && popLogo) popLogo.src = navLogo.src;

    var shown = false;
    function seen() { try { return localStorage.getItem(STORE) === '1'; } catch (e) { return false; } }
    function markSeen() { try { localStorage.setItem(STORE, '1'); } catch (e) {} }
    function open() { if (shown || seen()) return; shown = true; overlay.classList.add('open'); }
    function close() { overlay.classList.remove('open'); markSeen(); }

    if (!seen()) {
        setTimeout(open, 8000);
        document.addEventListener('mouseout', function (e) { if (e.clientY <= 0) open(); });
    }
    document.getElementById('plPopClose').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && overlay.classList.contains('open')) close(); });

    document.getElementById('plPopForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var email = document.getElementById('plPopEmail').value.trim();
        if (!email) return;
        var pop = overlay.querySelector('.pl-pop');
        var btn = this.querySelector('button');
        btn.disabled = true; btn.textContent = 'Subscribing…';
        fetch('https://a.klaviyo.com/client/subscriptions/?company_id=Ycnj4g', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'revision': '2025-07-15' },
            body: JSON.stringify({
                data: { type: 'subscription', attributes: {
                    custom_source: 'Padel Logan Website Popup',
                    profile: { data: { type: 'profile', attributes: {
                        email: email, subscriptions: { email: { marketing: { consent: 'SUBSCRIBED' } } }
                    } } }
                }, relationships: { list: { data: { type: 'list', id: 'UrR45w' } } } }
            })
        }).then(function (res) {
            if (!res.ok) throw new Error('Klaviyo ' + res.status);
            pop.classList.add('done'); markSeen();
            setTimeout(close, 2800);
        }).catch(function (err) {
            console.error('Popup signup failed:', err);
            btn.disabled = false; btn.textContent = 'Subscribe to Our Newsletter';
            document.getElementById('plPopErr').style.display = 'block';
        });
    });
})();
