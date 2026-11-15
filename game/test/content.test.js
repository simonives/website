import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHRASES } from '../content.js';

const EM = '—';

test('at least 8 phrases exist', () => {
  assert.ok(PHRASES.length >= 8);
});

test('every label has 2 to 5 words', () => {
  for (const p of PHRASES) {
    const n = p.label.trim().split(/\s+/).length;
    assert.ok(n >= 2 && n <= 5, `${p.id}: ${n} words`);
  }
});

test('ids are unique', () => {
  assert.equal(new Set(PHRASES.map((p) => p.id)).size, PHRASES.length);
});

test('no sentence is empty', () => {
  for (const p of PHRASES) assert.ok(p.sentence.trim().length > 0, p.id);
});

test('no em dash and no www host in any field', () => {
  for (const p of PHRASES) {
    for (const v of Object.values(p)) {
      assert.ok(!v.includes(EM), `${p.id} has an em dash`);
      assert.ok(!v.includes('www.simonives.com'), `${p.id} has www host`);
    }
  }
});
