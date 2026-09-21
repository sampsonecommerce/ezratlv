/* consent.js - the cookie notice, the settings panel, and the footer link that reopens it.
 *
 * Model (same as the notice it replaces): notice with implied consent. Trackers run unless the
 * visitor has switched a category off. What is new is that the choice is per category, it is
 * honoured by every tracker, and it can be changed at any time from "הגדרות עוגיות" in the footer.
 *
 * The switch itself lives in each page's <head> (window.ezraConsent, read before any tracker
 * loads). This file only draws the UI and writes the choice:
 *
 *   localStorage.ezra_consent = {"a":0|1,"m":0|1,"t":<ms>}
 *     a = analytics  : Google Analytics 4, Microsoft Clarity
 *     m = marketing  : Meta Pixel, Google Ads
 *   essential storage (this choice, form drafts, ad attribution for the lead you send) is not
 *   switchable.
 *
 * The older key ezra_cookie_ok ('1' | 'essential') is still read by the head switch so a choice
 * made before this file existed keeps its meaning; saving here writes both.
 *
 * A change only takes full effect on a fresh load (a tracker already running cannot be unloaded),
 * so saving a changed choice reloads the page.
 */
(function () {
  'use strict';
  var KEY = 'ezra_consent', OLD = 'ezra_cookie_ok';
  var he = ((document.documentElement.getAttribute('lang') || 'he').toLowerCase().indexOf('he') === 0);
  var T = he ? {
    region: 'הודעת עוגיות',
    text: 'אנחנו משתמשים בעוגיות כדי שהאתר יעבוד כמו שצריך, לנתח שימוש ולהתאים פרסום. המשך הגלישה מהווה הסכמה, ואפשר לשנות את הבחירה בכל רגע.',
    policy: 'למדיניות העוגיות', policyHref: 'privacy',
    all: 'מאשר/ת הכל', essential: 'הכרחיות בלבד', settings: 'הגדרות', close: 'סגירה',
    title: 'הגדרות עוגיות',
    intro: 'כאן בוחרים מה פועל בזמן הגלישה. אפשר לחזור לכאן בכל רגע דרך "הגדרות עוגיות" בתחתית כל עמוד.',
    nTitle: 'הכרחיות', nBody: 'שמירת הבחירה הזו, טיוטות של טפסים, ומקור ההגעה שמצורף לפנייה שאתם שולחים. בלעדיהן האתר לא עובד כמו שצריך.', always: 'פעיל תמיד',
    aTitle: 'ניתוח שימוש', aBody: 'Google Analytics ו-Microsoft Clarity. עוזרים לנו להבין איפה האתר לא ברור. Clarity מקליט את הגלישה באתר בלי לשמור את מה שמקלידים בשדות.',
    mTitle: 'שיווק ופרסום', mBody: 'Meta Pixel ו-Google Ads. מודדים אילו מודעות הביאו פניות ומאפשרים להציג לכם פרסום של עזרא.',
    save: 'שמירת הבחירה', footer: 'הגדרות עוגיות'
  } : {
    region: 'Cookie notice',
    text: 'We use cookies to keep the site working, to understand how it is used and to tailor advertising. Continuing to browse counts as consent, and you can change your choice at any time.',
    policy: 'Cookie policy', policyHref: 'english-privacy',
    all: 'Accept all', essential: 'Essential only', settings: 'Settings', close: 'Close',
    title: 'Cookie settings',
    intro: 'Choose what runs while you browse. You can come back here at any time from "Cookie settings" at the bottom of every page.',
    nTitle: 'Essential', nBody: 'Remembering this choice, form drafts, and the referral source attached to an enquiry you send. The site does not work properly without them.', always: 'Always on',
    aTitle: 'Analytics', aBody: 'Google Analytics and Microsoft Clarity. They show us where the site is unclear. Clarity records browsing on the site without keeping what is typed into fields.',
    mTitle: 'Marketing', mBody: 'Meta Pixel and Google Ads. They measure which ads brought enquiries and let us show you Ezra advertising.',
    save: 'Save my choice', footer: 'Cookie settings'
  };

  function stored() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (c && typeof c === 'object') return { a: c.a ? 1 : 0, m: c.m ? 1 : 0, chosen: true };
      var o = localStorage.getItem(OLD);
      if (o === 'essential') return { a: 0, m: 0, chosen: true };
      if (o === '1') return { a: 1, m: 1, chosen: true };
    } catch (e) {}
    return { a: 1, m: 1, chosen: false };
  }
  function save(a, m) {
    var before = window.ezraConsent || { a: 1, m: 1 };
    try {
      localStorage.setItem(KEY, JSON.stringify({ a: a ? 1 : 0, m: m ? 1 : 0, t: Date.now() }));
      localStorage.setItem(OLD, (a && m) ? '1' : ((!a && !m) ? 'essential' : 'custom'));
    } catch (e) {}
    if (!a) { try { if (window.clarity) window.clarity('stop'); } catch (e) {} }
    var changed = (!!before.a !== !!a) || (!!before.m !== !!m);
    window.ezraConsent = { a: a ? 1 : 0, m: m ? 1 : 0 };
    return changed;
  }

  var css = ''
    + 'body:has(.book-modal.open) .ck-bar{display:none !important}'
    + '.ck-bar{position:fixed;inset-inline:0;inset-block-end:0;z-index:9000;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.7rem 1.2rem;padding:.9rem clamp(1rem,4vw,2rem);background:rgba(15,13,11,.96);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border-block-start:1px solid rgba(196,154,60,.35);box-shadow:0 -10px 30px -12px rgba(0,0,0,.6);font-family:Heebo,system-ui,sans-serif;transform:translateY(115%);transition:transform .5s cubic-bezier(.22,1,.36,1)}'
    + '.ck-bar.show{transform:translateY(0)}'
    + '.ck-bar__text{margin:0;color:#d8cfbf;font-size:.85rem;line-height:1.55;max-width:64ch;text-align:center}'
    + '.ck-bar__text a{color:#f5d98a;text-decoration:underline}'
    + '.ck-bar__row{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;align-items:center}'
    + '.ck-btn{cursor:pointer;border:0;border-radius:50px;padding:.62rem 1.35rem;min-height:44px;font:inherit;font-family:Heebo,system-ui,sans-serif;font-weight:600;font-size:.85rem;color:#1a140c;background:linear-gradient(110deg,#c49a3c,#f5d98a);transition:filter .25s ease}'
    + '.ck-btn:hover{filter:brightness(1.07)}'
    + '.ck-btn--ghost{background:transparent;border:1px solid rgba(240,235,224,.3);color:#d8cfbf;font-weight:500}'
    + '.ck-btn--ghost:hover{filter:none;border-color:rgba(240,235,224,.55);color:#f0ebe0}'
    + '.ck-barx{flex:none;width:36px;height:36px;border:0;background:transparent;color:#fff;font-size:1rem;font-weight:700;cursor:pointer;opacity:.85}.ck-barx:hover{opacity:1}'
    + '.ck-btn--link{background:transparent;color:#f5d98a;text-decoration:underline;padding-inline:.6rem;font-weight:500}'
    + '.ck-btn:focus-visible,.ck-switch input:focus-visible+span,.ck-x:focus-visible,.ck-footlink:focus-visible{outline:2px solid #f5d98a;outline-offset:2px}'
    + '.ck-scrim{position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;padding:1rem;background:rgba(8,6,4,.72);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);font-family:Heebo,system-ui,sans-serif}'
    + '.ck-scrim[hidden]{display:none}'
    + '.ck-panel{position:relative;width:min(100%,520px);max-height:min(88vh,88svh);overflow:auto;background:#15110d;color:#f0ebe0;border:1px solid rgba(196,154,60,.4);border-radius:18px;padding:1.6rem 1.4rem 1.3rem;box-shadow:0 30px 80px -20px rgba(0,0,0,.8)}'
    + '.ck-panel h2{margin:0 0 .5rem;font-size:1.35rem;font-weight:700;color:#fff;padding-inline-end:2.4rem}'
    + '.ck-panel p{margin:0;color:#cfc5b3;font-size:.9rem;line-height:1.6}'
    + '.ck-x{position:absolute;inset-block-start:.9rem;inset-inline-end:.9rem;width:40px;height:40px;border-radius:50%;border:1px solid rgba(240,235,224,.25);background:transparent;color:#fff;font-size:1rem;cursor:pointer}'
    + '.ck-cat{display:flex;gap:1rem;align-items:flex-start;justify-content:space-between;padding:1rem 0;border-block-start:1px solid rgba(240,235,224,.12)}'
    + '.ck-cat:first-of-type{margin-block-start:1.1rem}'
    + '.ck-cat h3{margin:0 0 .25rem;font-size:1rem;font-weight:600;color:#fff}'
    + '.ck-cat p{font-size:.84rem}'
    + '.ck-always{flex:none;font-size:.78rem;color:#f5d98a;white-space:nowrap;padding-block-start:.2rem}'
    + '.ck-switch{flex:none;position:relative;display:inline-block;width:48px;height:28px;cursor:pointer}'
    + '.ck-switch input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer}'
    + '.ck-switch span{position:absolute;inset:0;border-radius:999px;background:rgba(240,235,224,.2);transition:background .2s ease}'
    + '.ck-switch span::after{content:"";position:absolute;inset-block-start:3px;inset-inline-start:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:transform .2s ease}'
    + '.ck-switch input:checked+span{background:#c49a3c}'
    + '.ck-switch input:checked+span::after{transform:translateX(20px)}'
    + '[dir="rtl"] .ck-switch input:checked+span::after{transform:translateX(-20px)}'
    + '.ck-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-block-start:1.1rem}'
    + '.ck-actions .ck-btn{flex:1 1 8.5rem}'
    + '.ck-footlink{display:block;width:fit-content;margin:0 auto;padding:.9rem 1rem 1.2rem;background:transparent;border:0;cursor:pointer;font:inherit;font-family:Heebo,system-ui,sans-serif;font-size:.82rem;color:rgba(240,235,224,.6);text-decoration:underline}'
    + '.ck-footlink:hover{color:#f5d98a}'
    + '@media (prefers-reduced-motion:reduce){.ck-bar,.ck-switch span,.ck-switch span::after{transition:none}}';

  function el(tag, attrs, html) {
    var n = document.createElement(tag), k;
    for (k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    if (html != null) n.innerHTML = html;
    return n;
  }

  function init() {
    if (document.getElementById('ckBar')) return;
    document.head.appendChild(el('style', { id: 'ckStyle' }, css));
    var dir = he ? 'rtl' : 'ltr';

    var bar = el('div', { 'class': 'ck-bar', id: 'ckBar', role: 'region', 'aria-label': T.region, dir: dir, hidden: '' },
      '<p class="ck-bar__text">' + T.text + ' <a href="' + T.policyHref + '">' + T.policy + '</a></p>'
      + '<div class="ck-bar__row">'
      + '<button type="button" class="ck-btn ck-btn--link" id="ckOpen">' + T.settings + '</button>'
      + '<button type="button" class="ck-btn ck-btn--ghost" id="ckEssential">' + T.essential + '</button>'
      + '<button type="button" class="ck-btn" id="ckAll">' + T.all + '</button>'
      + '<button type="button" class="ck-barx" id="ckBarX" aria-label="' + T.close + '">&#10005;</button>'
      + '</div>');

    var scrim = el('div', { 'class': 'ck-scrim', id: 'ckScrim', hidden: '', dir: dir },
      '<div class="ck-panel" role="dialog" aria-modal="true" aria-labelledby="ckTitle">'
      + '<button type="button" class="ck-x" id="ckClose" aria-label="' + T.close + '">&#10005;</button>'
      + '<h2 id="ckTitle">' + T.title + '</h2><p>' + T.intro + ' <a href="' + T.policyHref + '" style="color:#f5d98a">' + T.policy + '</a></p>'
      + '<div class="ck-cat"><div><h3>' + T.nTitle + '</h3><p>' + T.nBody + '</p></div><span class="ck-always">' + T.always + '</span></div>'
      + '<div class="ck-cat"><div><h3 id="ckALabel">' + T.aTitle + '</h3><p>' + T.aBody + '</p></div><label class="ck-switch"><input type="checkbox" id="ckA" role="switch" aria-labelledby="ckALabel"><span></span></label></div>'
      + '<div class="ck-cat"><div><h3 id="ckMLabel">' + T.mTitle + '</h3><p>' + T.mBody + '</p></div><label class="ck-switch"><input type="checkbox" id="ckM" role="switch" aria-labelledby="ckMLabel"><span></span></label></div>'
      + '<div class="ck-actions">'
      + '<button type="button" class="ck-btn ck-btn--ghost" id="ckPanelEssential">' + T.essential + '</button>'
      + '<button type="button" class="ck-btn ck-btn--ghost" id="ckSave">' + T.save + '</button>'
      + '<button type="button" class="ck-btn" id="ckPanelAll">' + T.all + '</button>'
      + '</div></div>');

    document.body.appendChild(bar);
    document.body.appendChild(scrim);

    var footlink = el('button', { type: 'button', 'class': 'ck-footlink', id: 'ckFootLink' }, T.footer);
    var footer = document.querySelector('footer');
    (footer || document.body).appendChild(footlink);

    var lastFocus = null;
    function showBar() { bar.hidden = false; requestAnimationFrame(function () { requestAnimationFrame(function () { bar.classList.add('show'); }); }); }
    function hideBar() { bar.classList.remove('show'); setTimeout(function () { bar.hidden = true; }, 500); }
    function openPanel() {
      var s = stored();
      document.getElementById('ckA').checked = !!s.a;
      document.getElementById('ckM').checked = !!s.m;
      lastFocus = document.activeElement;
      scrim.hidden = false;
      document.getElementById('ckClose').focus();
    }
    function closePanel() { scrim.hidden = true; if (lastFocus) { try { lastFocus.focus(); } catch (e) {} } }
    function choose(a, m) {
      var changed = save(a, m);
      closePanel(); hideBar();
      if (changed) location.reload();
    }

    document.getElementById('ckAll').addEventListener('click', function () { choose(1, 1); });
    document.getElementById('ckEssential').addEventListener('click', function () { choose(0, 0); });
    document.getElementById('ckOpen').addEventListener('click', openPanel);
    // X = dismiss without choosing: gone for this visit, back on the next one
    document.getElementById('ckBarX').addEventListener('click', function () { try { sessionStorage.setItem('ezra_ck_dismissed', '1'); } catch (e) {} hideBar(); });
    document.getElementById('ckPanelAll').addEventListener('click', function () { choose(1, 1); });
    document.getElementById('ckPanelEssential').addEventListener('click', function () { choose(0, 0); });
    document.getElementById('ckSave').addEventListener('click', function () {
      choose(document.getElementById('ckA').checked ? 1 : 0, document.getElementById('ckM').checked ? 1 : 0);
    });
    document.getElementById('ckClose').addEventListener('click', closePanel);
    footlink.addEventListener('click', openPanel);
    scrim.addEventListener('click', function (e) { if (e.target === scrim) closePanel(); });
    document.addEventListener('keydown', function (e) {
      if (scrim.hidden) return;
      if (e.key === 'Escape') { closePanel(); return; }
      if (e.key !== 'Tab') return;
      var f = scrim.querySelectorAll('button, input, a[href]'), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    window.EzraConsent = { open: openPanel, get: stored };
    var dismissed = false; try { dismissed = sessionStorage.getItem('ezra_ck_dismissed') === '1'; } catch (e) {}
    if (!stored().chosen && !dismissed) showBar();
    if (location.hash === '#cookie-settings') openPanel();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
