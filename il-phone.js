/* il-phone.js - one rule for every phone field on the site.
 *
 * People type their number in every shape: "052 1234567", "+972-52-123-4567", "972521234567",
 * "521234567" (leading 0 dropped), or a typo one digit short. The old check was "at least nine
 * digits", so a number nobody can dial reached the Monday board and the callback went nowhere.
 *
 * For every <input type="tel"> on the page, present at load or rendered later:
 *   - while typing: only digits, +, -, space and ( ) stay in the field
 *   - on blur: an Israeli number is rewritten to one shape (050-1234567 / 03-1234567); anything
 *     else marks the field invalid and shows a short message under it
 *   - on submit, in the capture phase (before the form's own handler): a non-empty invalid phone
 *     stops the submit and focuses the field. An empty field is not this file's business -
 *     "required" stays with each form, because some forms take phone OR email.
 *
 * Accepted: 05X-XXXXXXX (mobile), 07X-XXXXXXX (VoIP), 0[2-4,8-9]-XXXXXXX (landline), each also
 * with +972 / 972 / 00972 in front or the leading 0 dropped. A full international number that
 * starts with + and is not Israeli passes through untouched - the English pages get tourists.
 * Rejected: everything else, plus a number whose last seven digits are all the same digit (the
 * placeholder "050-0000000" typed back at us).
 *
 * Exposed as window.EzraPhone = { parse, isValid, okOrEmpty, normalize, message, check, attach }
 * for pages that gate a button on their own state instead of a <form> submit (company-events-v2)
 * and for the home page, which draws its own error rows.
 *
 * The worker applies the same normalisation server-side (normalizeIlPhone) so an old cached page
 * or a direct POST still stores one shape. The worker does not refuse: a lead with an odd phone
 * is still a lead.
 */
(function () {
  'use strict';

  var HE = 'המספר לא נראה תקין. מספר ישראלי, למשל 050-1234567';
  var EN = 'That number does not look right. Israeli format, e.g. 050-1234567, or a full international number starting with +';

  function message() {
    var lang = (document.documentElement.getAttribute('lang') || 'he').toLowerCase();
    return lang.indexOf('he') === 0 ? HE : EN;
  }

  // -> { ok: true, value: canonical } | { ok: false, empty?: true }
  function parse(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return { ok: false, empty: true };
    var plus = s.charAt(0) === '+';
    var d = s.replace(/\D/g, '');
    if (!d) return { ok: false };

    // international, not Israel: keep the digits, + in front. 8-15 digits is E.164.
    if (plus && d.indexOf('972') !== 0) {
      return (d.length >= 8 && d.length <= 15) ? { ok: true, value: '+' + d, intl: true } : { ok: false };
    }

    if (d.indexOf('00972') === 0) d = '0' + d.slice(5);
    else if (d.indexOf('972') === 0) d = '0' + d.slice(3);
    if (d.indexOf('00') === 0) d = d.slice(1);                      // "+972 052..." keeps its 0
    if (d.charAt(0) !== '0' && (d.length === 9 || d.length === 8)) d = '0' + d;   // dropped 0

    var m = /^(05\d|07[2-9])(\d{7})$/.exec(d) || /^(0[23489])(\d{7})$/.exec(d);
    if (!m) return { ok: false };
    if (/^(\d)\1{6}$/.test(m[2])) return { ok: false };              // 050-0000000, 052-1111111
    return { ok: true, value: m[1] + '-' + m[2] };
  }

  var STYLE =
    '.il-phone-err{display:block;font-size:.85em;line-height:1.35;color:#c0392b;margin-block-start:.35em}' +
    'input[type="tel"][data-il-phone="bad"]{border-color:#c0392b!important;box-shadow:0 0 0 1px #c0392b}';

  function injectStyle() {
    if (document.getElementById('ilPhoneStyle')) return;
    var st = document.createElement('style');
    st.id = 'ilPhoneStyle';
    st.textContent = STYLE;
    document.head.appendChild(st);
  }

  function errEl(inp, create) {
    var next = inp.nextElementSibling;
    if (next && next.classList && next.classList.contains('il-phone-err')) return next;
    if (!create) return null;
    var el = document.createElement('div');
    el.className = 'il-phone-err';
    el.setAttribute('role', 'alert');
    inp.insertAdjacentElement('afterend', el);
    return el;
  }

  function setBad(inp, bad) {
    // data-phone-hint="none": the page draws its own message row (home page). Field state only.
    var quiet = inp.getAttribute('data-phone-hint') === 'none';
    if (bad) {
      inp.setAttribute('data-il-phone', 'bad');
      inp.setAttribute('aria-invalid', 'true');
      try { inp.setCustomValidity(message()); } catch (e) {}
      if (!quiet) { var el = errEl(inp, true); el.textContent = message(); el.hidden = false; }
    } else {
      inp.removeAttribute('data-il-phone');
      if (inp.getAttribute('aria-invalid') === 'true') inp.setAttribute('aria-invalid', 'false');
      try { inp.setCustomValidity(''); } catch (e) {}
      var old = errEl(inp, false);
      if (old) old.hidden = true;
    }
  }

  // Validate one field, canonicalise it when asked. True = may submit (empty counts as fine).
  function check(inp, rewrite) {
    var r = parse(inp.value);
    if (r.empty) { setBad(inp, false); return true; }
    if (!r.ok) { setBad(inp, true); return false; }
    if (rewrite && inp.value !== r.value) {
      inp.value = r.value;
      // pages mirror the field into their own state on 'input' - keep them in step
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    }
    setBad(inp, false);
    return true;
  }

  function attach(inp) {
    if (inp.__ilPhone) return;
    inp.__ilPhone = true;
    if (!inp.getAttribute('inputmode')) inp.setAttribute('inputmode', 'tel');
    inp.addEventListener('input', function () {
      var v = inp.value, c = v.replace(/[^\d+\-() ]/g, '');
      if (c !== v) {
        var p = inp.selectionStart;
        inp.value = c;
        try { inp.setSelectionRange(p - 1, p - 1); } catch (e) {}
      }
      // clear the mark as soon as the number becomes valid; never mark while still typing
      if (inp.getAttribute('data-il-phone') === 'bad' && parse(inp.value).ok) setBad(inp, false);
    });
    inp.addEventListener('blur', function () { check(inp, true); });
  }

  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.matches && root.matches('input[type="tel"]')) attach(root);
    var list = root.querySelectorAll ? root.querySelectorAll('input[type="tel"]') : [];
    for (var i = 0; i < list.length; i++) attach(list[i]);
  }

  function boot() {
    injectStyle();
    scan(document.documentElement);
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) scan(added[j]);
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  // Submit gate. Capture on document runs before the form's own 'submit' listener, and
  // stopImmediatePropagation keeps that listener (and its fetch) from running at all.
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || form.nodeType !== 1 || !form.querySelectorAll) return;
    var tels = form.querySelectorAll('input[type="tel"]'), bad = null;
    for (var i = 0; i < tels.length; i++) {
      var inp = tels[i];
      if (inp.disabled || inp.getClientRects().length === 0) continue;   // hidden row (email mode)
      if (!check(inp, true) && !bad) bad = inp;
    }
    if (!bad) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    try { bad.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (x) {}
    try { bad.focus({ preventScroll: true }); } catch (x) { bad.focus(); }
  }, true);

  window.EzraPhone = {
    parse: parse,
    isValid: function (v) { return parse(v).ok; },
    okOrEmpty: function (v) { var r = parse(v); return !!(r.ok || r.empty); },
    normalize: function (v) { var r = parse(v); return r.ok ? r.value : String(v == null ? '' : v).trim(); },
    message: message,
    check: check,
    attach: attach
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
