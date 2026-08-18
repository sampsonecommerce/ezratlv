// Pre-push gate for the public site.
//
// This repository had no gate at all: no script, no package.json, no workflow.
// A push goes straight to Cloudflare Pages and straight to ezratlv.com, and
// nothing in between would notice a broken link, a page that lost its analytics
// tag, or an English page that shipped with dir="rtl".
//
// Node built-ins only, and no install step, because there is no package.json
// here and adding one to run a checker would be the tail wagging the dog.
//
//     node check-site.mjs
//
// Exits non-zero on any error, which is what fails the workflow.
//
// Scope is deliberately narrow. It checks the things that are cheap to state
// and expensive to discover in production. It is NOT an HTML validator and does
// not pretend to be: a checker that flags style is a checker people stop
// reading, and this one has to stay worth its red X.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, normalize } from 'node:path';

const ROOT = process.cwd();

/* Commercial pages. These are the ones that carry tracking, and the reason
 * they are listed by name rather than detected is that the legal pages
 * deliberately carry none - so "every page has a tag" would be a false rule and
 * "some pages have tags" would catch nothing. */
const TRACKED_PAGES = [
    'index.html',
    'company-events.html',
    'company-events-v2.html',
    'english-index.html',
    'english-company-events.html',
    'english-company-events-v2.html',
];

/* The live ids. G-B8RHLY5VJK is listed as forbidden, not merely absent: it is
 * a dead GA4 property that silently collected nothing - including for Google
 * Ads - from whenever it was introduced until 2026-07-21. Nothing on the site
 * looked wrong the whole time. If it ever reappears in a copy-paste, this is
 * the only thing that would say so. */
const LIVE_GA4 = 'G-95JJX7T6CY';
const DEAD_GA4 = 'G-B8RHLY5VJK';
const LIVE_ADS = 'AW-18310736783';

const errors = [];
const warnings = [];
const fail = (file, msg) => errors.push(`${file}: ${msg}`);
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);

/** Root-level pages only. `_archive/` is never served and `en/` is generated. */
function livePages() {
    return readdirSync(ROOT)
        .filter(f => f.endsWith('.html'))
        .filter(f => statSync(join(ROOT, f)).isFile())
        .sort();
}

// ------------------------------------------------------------------ structure

function checkStructure(file, html) {
    const htmlTag = /<html\b([^>]*)>/i.exec(html);
    if (!htmlTag) { fail(file, 'no <html> tag'); return; }

    const attrs = htmlTag[1];
    const lang = /\blang\s*=\s*"([^"]*)"/i.exec(attrs);
    const dir = /\bdir\s*=\s*"([^"]*)"/i.exec(attrs);

    if (!lang) fail(file, 'no lang attribute on <html>');
    if (!dir) fail(file, 'no dir attribute on <html>');

    /* The filename is the contract. `english-` files are the English set and
     * everything else is Hebrew, so a page that ships with the wrong pair is a
     * page whose text runs the wrong way for its readers. */
    const isEnglish = file.startsWith('english-') || file === 'accessibility-en.html';
    const wantLang = isEnglish ? 'en' : 'he';
    const wantDir = isEnglish ? 'ltr' : 'rtl';

    if (lang && lang[1] !== wantLang) fail(file, `lang="${lang[1]}", expected "${wantLang}"`);
    if (dir && dir[1] !== wantDir) fail(file, `dir="${dir[1]}", expected "${wantDir}"`);

    if (!/<title>\s*\S[\s\S]*?<\/title>/i.test(html)) {
        /* An error on a page people navigate to, a warning on the ad and
         * calculator exports that live at the root without being pages anyone
         * lands on from search. */
        if (TRACKED_PAGES.includes(file)) fail(file, 'no <title>, or it is empty');
        else warn(file, 'no <title>, or it is empty');
    }

    /* Not a parser. Counting these two catches the one failure that actually
     * happens - a paste that drops a closing tag and silently swallows the rest
     * of the page - without pretending to understand the document.
     *
     * Scripts are stripped first. Half these pages build markup by string
     * concatenation, so a `<div>` inside a JavaScript string is not an open tag
     * and counting it made the check fire on healthy files. */
    const markup = stripScripts(html);
    const open = (markup.match(/<div\b[^>]*>/gi) || []).length;
    const close = (markup.match(/<\/div>/gi) || []).length;
    if (open !== close) fail(file, `${open} <div> against ${close} </div>`);
}

/** Markup only: no <script> or <style> bodies. */
function stripScripts(html) {
    return html
        .replace(/<script\b[\s\S]*?<\/script>/gi, '')
        .replace(/<style\b[\s\S]*?<\/style>/gi, '');
}

// ---------------------------------------------------------------------- links

/**
 * Every local href/src points at something that exists.
 *
 * Clean URLs are how this site actually links: `href="privacy"` is served from
 * `privacy.html`, because Cloudflare Pages resolves an extensionless request
 * that way. A checker that demanded the extension would have flagged nearly
 * every internal link on the site as broken, which is how a gate teaches people
 * to ignore it on its first run.
 */
function checkLinks(file, html) {
    const refs = [...stripScripts(html).matchAll(/(?:href|src)\s*=\s*"([^"]+)"/gi)].map(m => m[1]);

    for (const raw of refs) {
        const ref = raw.trim();
        if (!ref) continue;
        // Off-site, in-page, or not a file request at all.
        if (/^(https?:)?\/\//i.test(ref)) continue;
        if (/^(#|mailto:|tel:|data:|javascript:|whatsapp:)/i.test(ref)) continue;

        const path = ref.split('#')[0].split('?')[0];
        if (!path) continue;

        const target = path.startsWith('/')
            ? join(ROOT, path.slice(1))
            : resolve(dirname(join(ROOT, file)), path);

        // Stay inside the repository; a ../ that escapes it is a bug by itself.
        if (!normalize(target).startsWith(ROOT)) { fail(file, `link escapes the repo: ${ref}`); continue; }

        /* An archive link is its own finding, and reporting it as broken as
         * well says the same thing twice in different words. */
        if (/(^|\/)_archive\//.test(path)) {
            fail(file, `links into _archive/, which is never served: ${ref}`);
            continue;
        }

        // Resolved the way the host resolves it: exact file, then `.html`,
        // then a directory's index.html.
        const ok = existsSync(target)
            || existsSync(target + '.html')
            || existsSync(join(target, 'index.html'));
        if (!ok) fail(file, `broken local link: ${ref}`);
    }
}

// ------------------------------------------------------------------ analytics

function checkAnalytics(file, html) {
    if (html.includes(DEAD_GA4)) {
        fail(file, `carries the dead GA4 id ${DEAD_GA4}, which collects nothing`);
    }

    const ga4 = [...new Set([...html.matchAll(/\bG-[A-Z0-9]{6,}\b/g)].map(m => m[0]))];
    const ads = [...new Set([...html.matchAll(/\bAW-\d{6,}\b/g)].map(m => m[0]))];

    // The dead id already reported itself above, with the reason attached.
    for (const id of ga4) if (id !== LIVE_GA4 && id !== DEAD_GA4) fail(file, `unknown GA4 id ${id}`);
    for (const id of ads) if (id !== LIVE_ADS) fail(file, `unknown Google Ads id ${id}`);

    if (TRACKED_PAGES.includes(file) && ga4.length === 0) {
        fail(file, `is a tracked page but carries no GA4 tag (${LIVE_GA4})`);
    }
    if (!TRACKED_PAGES.includes(file) && ga4.length > 0) {
        /* Not an error. A legal page picking up a tag is a decision someone may
         * have made on purpose; it is just worth saying out loud, because the
         * tracked-page list is what this check is measured against. */
        warn(file, 'carries a GA4 tag but is not in the tracked-page list');
    }
}

// ----------------------------------------------------------------- production

/* These files ARE the production configuration. A missing one does not error
 * anywhere; the site just quietly loses its domain, its headers or its
 * sitemap. */
function checkProductionFiles() {
    for (const f of ['CNAME', '_headers', '_redirects', 'robots.txt', 'sitemap.xml']) {
        if (!existsSync(join(ROOT, f))) fail(f, 'is missing, and it is live production config');
    }

    if (existsSync(join(ROOT, 'CNAME'))) {
        const cname = readFileSync(join(ROOT, 'CNAME'), 'utf8').trim();
        if (cname !== 'ezratlv.com') fail('CNAME', `says "${cname}", expected "ezratlv.com"`);
    }
}

// ---------------------------------------------------------------------- entry

const pages = livePages();
console.log(`Checking ${pages.length} pages at the repository root...`);

for (const file of pages) {
    const html = readFileSync(join(ROOT, file), 'utf8');
    checkStructure(file, html);
    checkLinks(file, html);
    checkAnalytics(file, html);
}
checkProductionFiles();

for (const w of warnings) console.log(`  warn  ${w}`);

if (errors.length) {
    console.error('');
    for (const e of errors) console.error(`  FAIL  ${e}`);
    console.error(`\n${errors.length} problem(s). Fix the cause and run again.`);
    console.error('Do not delete or narrow a check to make this pass - each one is here');
    console.error('because the thing it catches reaches the public site otherwise.');
    process.exit(1);
}

console.log(`  ok  ${pages.length} pages, links resolve, tags consistent, production files present`);
if (warnings.length) console.log(`  ${warnings.length} warning(s) above, not blocking`);
