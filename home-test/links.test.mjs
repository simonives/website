import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ALL_HTML_PAGES = [
  'index.html',
  'now.html',
  'portfolio.html',
  'governance.html',
  'doctrine.html',
  '404.html',
];

const INNER_AND_404_PAGES = [
  'now.html',
  'portfolio.html',
  'governance.html',
  'doctrine.html',
  '404.html',
];

const LLMS_ADDED_LINE =
  '  The homepage opens on a skateboard game; the full site is available from the Menu button, or directly at https://simonives.com/#site.';

const SIMONIVES_ADDED_LINE =
  '- **Site entry:** The homepage opens on a skateboard game; the full site is available from the Menu button, or directly at https://simonives.com/#site.';

function readRoot(filename) {
  return fs.readFileSync(path.join(ROOT, filename), 'utf8');
}

test('every page logo and Home link is /#site', () => {
  for (const page of ALL_HTML_PAGES) {
    const html = readRoot(page);

    const logoMatch = html.match(/<a\s+href="([^"]+)"\s+class="logo">/);
    assert.ok(logoMatch, `${page}: missing logo link`);
    assert.equal(logoMatch[1], '/#site', `${page}: logo href should be /#site`);

    const homeMatch = html.match(
      /<li><a\s+href="([^"]+)"(?:\s+class="active")?>Home<\/a><\/li>/,
    );
    assert.ok(homeMatch, `${page}: missing Home nav link`);
    assert.equal(homeMatch[1], '/#site', `${page}: Home nav href should be /#site`);
  }

  const indexHtml = readRoot('index.html');
  assert.match(
    indexHtml,
    /<li><a href="\/#site" class="active">Home<\/a><\/li>/,
    'index.html: Home nav link must retain class="active"',
  );
});

test('no html page uses href="index.html" for an internal link', () => {
  for (const page of ALL_HTML_PAGES) {
    const html = readRoot(page);
    assert.equal(
      /href=["'](?:\.\/|\/)?index\.html["']/i.test(html),
      false,
      `${page}: must not contain href="index.html"`,
    );
  }
});

test("the five inner pages and the 404 carry a static link to / labelled I'd rather be skating", () => {
  const skateLinkPattern = /<a href="\/" class="skate-link">I'd rather be skating<\/a>/g;

  for (const page of INNER_AND_404_PAGES) {
    const html = readRoot(page);
    const navMatch = html.match(
      /<header class="site-header">[\s\S]*?<nav class="container">([\s\S]*?)<\/nav>[\s\S]*?<\/header>/,
    );
    assert.ok(navMatch, `${page}: missing header nav.container`);

    const navInner = navMatch[1];
    const matches = navInner.match(skateLinkPattern) ?? [];
    assert.equal(
      matches.length,
      1,
      `${page}: expected exactly one static skate-link in header nav`,
    );

    assert.match(
      navInner,
      /<\/div>\s*<a href="\/" class="skate-link">I'd rather be skating<\/a>\s*$/,
      `${page}: skate-link must be the last child of nav.container right after .nav-container`,
    );
  }
});

test('index.html does not carry a static skating link (it is injected by script)', () => {
  const html = readRoot('index.html');
  assert.equal(
    html.includes("I'd rather be skating"),
    false,
    'index.html must not contain static skating link text',
  );
  assert.equal(
    html.includes('skate-link'),
    false,
    'index.html must not contain static skate-link class',
  );
});

test('the 404 Return home link points to /#site', () => {
  const html = readRoot('404.html');
  assert.match(
    html,
    /<a href="\/#site" class="cta-button">Return home<\/a>/,
    '404.html: Return home link must point to /#site',
  );
});

test('llms.txt and simonives.md each mention the skateboard game and /#site', () => {
  for (const file of ['llms.txt', 'simonives.md']) {
    const text = readRoot(file);
    assert.ok(
      text.includes('skateboard game'),
      `${file}: must mention skateboard game`,
    );
    assert.ok(
      text.includes('Menu button'),
      `${file}: must mention the Menu button`,
    );
    assert.ok(
      text.includes('https://simonives.com/#site'),
      `${file}: must mention https://simonives.com/#site`,
    );
  }
});

test('no em dash appears in the lines you added', () => {
  const llmsLines = readRoot('llms.txt').split(/\r?\n/);
  const simonivesLines = readRoot('simonives.md').split(/\r?\n/);

  const llmsIndex = llmsLines.indexOf(LLMS_ADDED_LINE);
  assert.notEqual(llmsIndex, -1, 'llms.txt: expected exact added line to be present');
  assert.match(
    llmsLines[llmsIndex - 1] ?? '',
    /^- \[Home\]\(https:\/\/simonives\.com\/\)/,
    'llms.txt: added line should appear directly after the Home entry',
  );
  assert.equal(
    llmsLines[llmsIndex].includes('—'),
    false,
    'llms.txt: added line must not contain an em dash',
  );

  const simonivesIndex = simonivesLines.indexOf(SIMONIVES_ADDED_LINE);
  assert.notEqual(
    simonivesIndex,
    -1,
    'simonives.md: expected exact added line to be present',
  );
  assert.equal(
    simonivesLines[simonivesIndex].includes('—'),
    false,
    'simonives.md: added line must not contain an em dash',
  );
});

test('sitemap.xml is unchanged', () => {
  const xml = readRoot('sitemap.xml');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.deepEqual(locs, [
    'https://simonives.com/',
    'https://simonives.com/doctrine.html',
    'https://simonives.com/portfolio.html',
    'https://simonives.com/now.html',
    'https://simonives.com/governance.html',
  ]);
});
