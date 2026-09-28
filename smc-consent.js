/*!
 * SMC Digital — Cookie consent banner (reusable, self-contained)
 * Analytics-opt-out model (analytics on by default; visitor can reject).
 *
 * ADD TO ANY SITE with one tag (ideally just before </body>):
 *   <script src="https://www.smcdigital.com.au/smc-consent.js"
 *           data-ga="G-XXXXXXXXX"          // your GA4 id (optional but recommended)
 *           data-privacy="/privacy"        // privacy policy URL
 *           data-terms="/terms"            // website terms URL (optional)
 *           defer></script>
 *
 * "Cookie settings" link: add anywhere on the page:
 *   <a href="#cookie-settings">Cookie settings</a>
 * (any link to #cookie-settings, or any element with [data-cookie-settings], reopens the banner)
 *
 * On Reject it: disables GA4 (ga-disable), sets Google Consent Mode to denied,
 * revokes the Meta Pixel, and clears analytics cookies. Choice is remembered.
 */
(function () {
  "use strict";
  var s = document.currentScript || (function () { var a = document.getElementsByTagName('script'); return a[a.length - 1]; })();
  var CFG = {
    ga: (s && s.getAttribute('data-ga')) || '',
    privacy: (s && s.getAttribute('data-privacy')) || '/privacy',
    terms: (s && s.getAttribute('data-terms')) || '',
    accent: (s && s.getAttribute('data-accent')) || '#0E9E86',
    accentText: (s && s.getAttribute('data-accent-text')) || '#04211c',
    bg: (s && s.getAttribute('data-bg')) || '#0D0F12',
    key: 'smc_cookie_consent'
  };

  function getChoice() { try { return localStorage.getItem(CFG.key); } catch (e) { return null; } }
  function setChoice(v) { try { localStorage.setItem(CFG.key, v); } catch (e) {} document.cookie = CFG.key + '=' + v + ';path=/;max-age=31536000;SameSite=Lax'; }

  function gtag() { window.dataLayer = window.dataLayer || []; window.dataLayer.push(arguments); }

  function grant() {
    if (CFG.ga) { try { window['ga-disable-' + CFG.ga] = false; } catch (e) {} }
    try { gtag('consent', 'update', { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' }); } catch (e) {}
    try { if (window.fbq) window.fbq('consent', 'grant'); } catch (e) {}
  }

  function deny() {
    if (CFG.ga) { try { window['ga-disable-' + CFG.ga] = true; } catch (e) {} }
    try { gtag('consent', 'update', { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }); } catch (e) {}
    try { if (window.fbq) window.fbq('consent', 'revoke'); } catch (e) {}
    // clear common analytics cookies
    var host = location.hostname.replace(/^www\./, '');
    ['_ga', '_gid', '_gcl_au', '_fbp'].forEach(function (n) {
      document.cookie = n + '=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = n + '=;path=/;domain=.' + host + ';expires=Thu, 01 Jan 1970 00:00:00 GMT';
    });
    // clear per-property GA cookie (_ga_XXXX)
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (name.indexOf('_ga_') === 0) {
        document.cookie = name + '=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = name + '=;path=/;domain=.' + host + ';expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    });
  }

  // apply any stored choice immediately on load
  var stored = getChoice();
  if (stored === 'reject') deny();
  else if (stored === 'accept') grant();

  function injectStyles() {
    if (document.getElementById('smc-consent-style')) return;
    var css = ''
      + '#smc-consent{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:' + CFG.bg + ';color:#fff;'
      + 'font:400 14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Manrope,Roboto,Helvetica,Arial,sans-serif;'
      + 'box-shadow:0 -10px 30px -12px rgba(0,0,0,.5);padding:16px 20px}'
      + '#smc-consent .in{max-width:1120px;margin:0 auto;display:flex;align-items:center;gap:18px;flex-wrap:wrap;justify-content:space-between}'
      + '#smc-consent p{margin:0;flex:1 1 320px;color:#d7dcde}'
      + '#smc-consent a{color:' + CFG.accent + ';text-decoration:underline;font-weight:600}'
      + '#smc-consent .btns{display:flex;gap:10px;flex-wrap:wrap}'
      + '#smc-consent button{cursor:pointer;border-radius:100px;font:600 13.5px inherit;padding:11px 20px;border:1.5px solid transparent;white-space:nowrap}'
      + '#smc-consent .allow{background:' + CFG.accent + ';color:' + CFG.accentText + ';border-color:' + CFG.accent + '}'
      + '#smc-consent .allow:hover{filter:brightness(1.08)}'
      + '#smc-consent .reject{background:transparent;color:#fff;border-color:rgba(255,255,255,.35)}'
      + '#smc-consent .reject:hover{border-color:#fff}'
      + '@media(max-width:640px){#smc-consent .in{gap:12px}#smc-consent .btns{width:100%}#smc-consent button{flex:1}}';
    var st = document.createElement('style');
    st.id = 'smc-consent-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function open() {
    injectStyles();
    var existing = document.getElementById('smc-consent');
    if (existing) { existing.style.display = ''; return; }
    var bar = document.createElement('div');
    bar.id = 'smc-consent';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Cookie consent');
    var links = '<a href="' + CFG.privacy + '">Privacy Policy</a>' + (CFG.terms ? ' &middot; <a href="' + CFG.terms + '">Website Terms</a>' : '');
    bar.innerHTML =
      '<div class="in">'
      + '<p>We use cookies to count page visits and understand how our content is used, so we can improve the site. '
      + 'Analytics are on by default. ' + links + '</p>'
      + '<div class="btns">'
      + '<button type="button" class="reject">Reject analytics</button>'
      + '<button type="button" class="allow">Allow cookies</button>'
      + '</div></div>';
    document.body.appendChild(bar);
    bar.querySelector('.allow').addEventListener('click', function () { grant(); setChoice('accept'); bar.remove(); });
    bar.querySelector('.reject').addEventListener('click', function () { deny(); setChoice('reject'); bar.remove(); });
  }

  window.smcConsent = { open: open, accept: function () { grant(); setChoice('accept'); }, reject: function () { deny(); setChoice('reject'); } };

  // "Cookie settings" triggers
  document.addEventListener('click', function (e) {
    var t = e.target.closest('a[href="#cookie-settings"],[data-cookie-settings]');
    if (t) { e.preventDefault(); open(); }
  });

  // show the banner on first visit
  function boot() { if (!getChoice()) open(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
