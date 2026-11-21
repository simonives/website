import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stateFromLocation } from '../home-machine.js';

const BOOT_URL = new URL('../home-boot.js', import.meta.url);

const LOCATION_TABLE = [
  { label: 'root path "/" with empty hash', pathname: '/', hash: '', expected: 'game' },
  { label: 'empty pathname "" with empty hash', pathname: '', hash: '', expected: 'game' },
  { label: '/index.html with empty hash', pathname: '/index.html', hash: '', expected: 'game' },
  { label: 'root path "/" with #site hash', pathname: '/', hash: '#site', expected: 'site' },
  { label: '/index.html with #site hash', pathname: '/index.html', hash: '#site', expected: 'site' },
  { label: 'empty pathname "" with #site hash', pathname: '', hash: '#site', expected: 'site' },
  { label: 'root path "/" with non-site hash', pathname: '/', hash: '#about', expected: 'game' },
  { label: '/now.html with empty hash', pathname: '/now.html', hash: '', expected: 'site' },
  { label: '/doctrine.html with empty hash', pathname: '/doctrine.html', hash: '', expected: 'site' },
  { label: '/404.html with empty hash', pathname: '/404.html', hash: '', expected: 'site' },
  { label: '/now.html with #site hash', pathname: '/now.html', hash: '#site', expected: 'site' },
];

function runBoot(location) {
  const source = fs.readFileSync(BOOT_URL, 'utf8');
  const calls = [];
  const attrs = new Map();
  const context = {
    location,
    document: {
      documentElement: {
        setAttribute(name, value) {
          calls.push([name, value]);
          attrs.set(name, value);
        },
      },
    },
  };
  vm.runInNewContext(source, context, { filename: 'home-boot.js' });
  return { calls, attrs };
}

describe('home-boot.js', () => {
  describe('sets data-home and maintains parity with stateFromLocation', () => {
    for (const { label, pathname, hash, expected } of LOCATION_TABLE) {
      it(`${label} -> ${expected}`, () => {
        const { calls, attrs } = runBoot({ pathname, hash });
        assert.deepEqual(calls, [['data-home', expected]]);
        assert.equal(attrs.get('data-home'), expected);
        assert.equal(attrs.get('data-home'), stateFromLocation(pathname, hash));
      });
    }
  });

  it('does not throw and leaves no attribute set when location getter throws', () => {
    const source = fs.readFileSync(BOOT_URL, 'utf8');
    const calls = [];
    const context = {
      document: {
        documentElement: {
          setAttribute(name, value) {
            calls.push([name, value]);
          },
        },
      },
    };
    Object.defineProperty(context, 'location', {
      get() {
        throw new Error('location unavailable');
      },
    });

    assert.doesNotThrow(() => {
      vm.runInNewContext(source, context, { filename: 'home-boot.js' });
    });
    assert.deepEqual(calls, []);
  });

  it('does not throw and leaves no attribute set when location.pathname getter throws', () => {
    const throwingLocation = {};
    Object.defineProperty(throwingLocation, 'pathname', {
      get() {
        throw new Error('pathname blocked');
      },
    });

    let result;
    assert.doesNotThrow(() => {
      result = runBoot(throwingLocation);
    });
    assert.deepEqual(result.calls, []);
  });

  it('is a classic script with no statement-level import or export keywords', () => {
    const source = fs.readFileSync(BOOT_URL, 'utf8');
    assert.doesNotMatch(source, /^\s*(import|export)\b/m);
    assert.doesNotThrow(() => {
      new vm.Script(source, { filename: 'home-boot.js' });
    });
  });
});
