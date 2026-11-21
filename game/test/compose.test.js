import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderTrack } from '../tools/compose.mjs';

test('renderTrack is deterministic, bounded, accurate in length, and continuous at loop seam', () => {
  const bars = 2;
  const run1 = renderTrack({ bars });
  const run2 = renderTrack({ bars });

  const expectedLength = (bars * 60 / 128) * 4 * 44100;
  assert.ok(
    Math.abs(run1.length - expectedLength) <= 1,
    `expected length near ${expectedLength}, got ${run1.length}`
  );
  assert.ok(run1.samples instanceof Float32Array, 'samples must be a Float32Array');
  assert.equal(run1.samples.length, run1.length * 2, 'samples must be interleaved stereo');
  assert.equal(run2.length, run1.length);

  let peak = 0;
  for (let i = 0; i < run1.samples.length; i++) {
    const v = run1.samples[i];
    assert.ok(Number.isFinite(v), `non-finite sample at index ${i}`);
    assert.equal(v, run2.samples[i], `non-deterministic sample at index ${i}`);
    const av = Math.abs(v);
    if (av > peak) peak = av;
  }

  assert.ok(peak > 0.1, `track appears silent (peak ${peak})`);
  assert.ok(peak <= 1.0, `peak ${peak} exceeds 1.0`);

  // Check loop seam continuity across the first and last 20 ms (no click).
  const windowFrames = Math.round(0.02 * 44100);
  const lastFrame = run1.length - 1;
  const seamStepL = Math.abs(run1.samples[0] - run1.samples[lastFrame * 2]);
  const seamStepR = Math.abs(run1.samples[1] - run1.samples[lastFrame * 2 + 1]);

  let maxInternalStep = 0;
  for (let i = 1; i < windowFrames; i++) {
    const dL = Math.abs(run1.samples[i * 2] - run1.samples[(i - 1) * 2]);
    const dR = Math.abs(run1.samples[i * 2 + 1] - run1.samples[(i - 1) * 2 + 1]);
    if (dL > maxInternalStep) maxInternalStep = dL;
    if (dR > maxInternalStep) maxInternalStep = dR;
  }
  for (let i = run1.length - windowFrames + 1; i < run1.length; i++) {
    const dL = Math.abs(run1.samples[i * 2] - run1.samples[(i - 1) * 2]);
    const dR = Math.abs(run1.samples[i * 2 + 1] - run1.samples[(i - 1) * 2 + 1]);
    if (dL > maxInternalStep) maxInternalStep = dL;
    if (dR > maxInternalStep) maxInternalStep = dR;
  }

  const maxAllowedSeamStep = Math.max(0.03, maxInternalStep * 1.5);
  assert.ok(
    seamStepL <= maxAllowedSeamStep && seamStepR <= maxAllowedSeamStep,
    `loop seam discontinuity too large: L=${seamStepL}, R=${seamStepR}, allowed=${maxAllowedSeamStep}`
  );
});
