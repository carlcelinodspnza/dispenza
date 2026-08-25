#!/usr/bin/env node
/* ============================================================================
   bump-asset-versions.mjs — regenerate the ?v= cache-busters in every page.

   WHY THIS EXISTS. Pages reference _design assets with a content hash
   (dispenza-structural.css?v=063d0c7b). On 2026-08-25 that hash went a full day
   without being updated while the stylesheet was edited a dozen times: every
   page kept requesting the SAME URL, browsers served their cached copy under
   cache-control: max-age=600, and the owner was shown stale CSS while being
   told the fix was live. The JS was worse -- 93 references with no query at all,
   which would have served a stale demo-modal.js and left the booking button
   dead rather than merely mis-styled.

   The scheme is md5[:8] of the file's bytes. That was not invented here: it was
   reverse-engineered from the two files whose hashes were still correct
   (chrome.css -> c338a3e6, tokens.css -> bf07bcdb) and matched exactly.

   RUN THIS AFTER ANY EDIT UNDER _design/. It is idempotent -- a clean tree
   reports "0 changed" -- so it is safe to run on every commit.

       node _design/bump-asset-versions.mjs          # rewrite + report
       node _design/bump-asset-versions.mjs --check  # report only, exit 1 if stale
   ============================================================================ */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');

const hashes = new Map();
const hashOf = (name) => {
  if (!hashes.has(name)) {
    const p = join(root, '_design', name);
    if (!existsSync(p)) return null;
    hashes.set(name, createHash('md5').update(readFileSync(p)).digest('hex').slice(0, 8));
  }
  return hashes.get(name);
};

/* matches both an existing ?v=... and a bare reference, so newly added assets
   get versioned rather than silently staying unversioned. */
const REF = /(_design\/([a-z0-9-]+\.(?:css|js)))(\?v=[0-9a-f]+)?/g;

/* HTML COMMENTS MUST BE SKIPPED. These pages carry long explanatory comments
   that MENTION asset paths in prose ("_design/smoke-engine.js holds the model").
   A naive pass rewrote seven of those sentences into
   "_design/smoke-engine.js?v=b02cdb26 holds the model" -- corrupting the
   documentation while reporting a successful fix. Caught because the first
   --check run flagged files whose real <script> tags were already correct.
   Build the comment ranges once per file and ignore any match inside one. */
const commentRanges = (src) => {
  const out = [];
  for (let i = src.indexOf('<!--'); i !== -1; i = src.indexOf('<!--', i + 4)) {
    const end = src.indexOf('-->', i + 4);
    if (end === -1) { out.push([i, src.length]); break; }
    out.push([i, end + 3]);
    i = end;
  }
  return out;
};
const inside = (ranges, at) => ranges.some(([a, b]) => at >= a && at < b);

let filesChanged = 0, refsSeen = 0, refsStale = 0;
const stale = [];

for (const f of readdirSync(root).filter((f) => f.endsWith('.html'))) {
  const p = join(root, f);
  const src = readFileSync(p, 'utf8');
  const comments = commentRanges(src);
  const out = src.replace(REF, (m, path, name, ver, at) => {
    const h = hashOf(name);
    if (!h) return m;                    // referenced file does not exist; leave alone
    if (inside(comments, at)) return m;  // prose inside a comment, not a real reference
    refsSeen++;
    const want = `${path}?v=${h}`;
    if (m !== want) { refsStale++; stale.push(`${f}  ${name}  ${ver ? ver.slice(3) : '(none)'} -> ${h}`); }
    return want;
  });
  if (out !== src && !checkOnly) { writeFileSync(p, out); filesChanged++; }
  else if (out !== src) filesChanged++;
}

console.log(`refs: ${refsSeen}   stale: ${refsStale}   files ${checkOnly ? 'needing update' : 'changed'}: ${filesChanged}`);
for (const s of stale.slice(0, 20)) console.log('  ' + s);
if (stale.length > 20) console.log(`  ... and ${stale.length - 20} more`);
if (checkOnly && refsStale) process.exit(1);
