import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extend, relay } from '../lib/feed.js';
import { PHRASES } from '../content.js';

test('extend lays obstacles ahead and culls only far behind', () => {
  let s = extend({ obstacles: [], genTo: 0 }, 0, PHRASES, false);
  assert.ok(s.obstacles.length > 5);
  s = extend(s, 5000, PHRASES, false);
  assert.ok(s.obstacles.every((o) => o.x + o.width > 5000 - 800));
});

test('relay after a reduced-motion switch keeps what is within 600 ahead and keeps obstacles coming', () => {
  let s = extend({ obstacles: [], genTo: 0 }, 4000, PHRASES, false);
  const near = s.obstacles.filter((o) => o.x <= 4600 && o.x + o.width > 3200).length;
  assert.ok(near > 0);
  const r = relay(s, 4000, PHRASES, true);
  assert.equal(r.obstacles.filter((o) => o.x <= 4600 && o.x + o.width > 3200).length, near, 'nothing near the rider vanishes');
  assert.ok(r.obstacles.some((o) => o.x > 4600), 'new obstacles are laid ahead');
  assert.ok(r.obstacles.some((o) => o.x > 4000 + 2500), 'and keep going well ahead');
});
