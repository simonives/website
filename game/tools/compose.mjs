#!/usr/bin/env node
// Pure-JS deterministic electronic track composer (128 BPM, A minor, 32 bars = 60 s).
// Spirit: minimal-to-driving live-coded acid/techno/trance with punchy kick, off-beat hat,
// rolling 16th resonant acid bassline, bright arpeggio with ping-pong delay, and light pad.
// No external npm packages. Uses ffmpeg solely for encoding WAV to M4A and MP3.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const SAMPLE_RATE = 44100;
export const BPM = 128;
const BEATS_PER_BAR = 4;
const STEPS_PER_BAR = 16;
const BAR_SECONDS = (60 / BPM) * BEATS_PER_BAR; // 1.875 s
const STEP_SECONDS = BAR_SECONDS / STEPS_PER_BAR; // 0.1171875 s
const TAIL_SECONDS = 3.0;
const TARGET_PEAK = Math.pow(10, -3 / 20); // -3 dBFS (~0.7079)

// Seeded Mulberry32 PRNG (deterministic, no Math.random).
function createPrng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function midiToHz(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

function polyBlep(t, dt) {
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
}

// Cytomic TPT state-variable filter (unconditionally stable at high resonance).
function createSvf() {
  let ic1eq = 0;
  let ic2eq = 0;
  return {
    step(input, cutoffHz, q) {
      const fc = Math.max(25, Math.min(cutoffHz, SAMPLE_RATE * 0.44));
      const g = Math.tan((Math.PI * fc) / SAMPLE_RATE);
      const k = 1 / Math.max(0.5, q);
      const a1 = 1 / (1 + g * (g + k));
      const a2 = g * a1;
      const a3 = g * a2;
      const v3 = input - ic2eq;
      const v1 = a1 * ic1eq + a2 * v3;
      const v2 = ic2eq + a2 * ic1eq + a3 * v3;
      ic1eq = 2 * v1 - ic1eq;
      ic2eq = 2 * v2 - ic2eq;
      return { lp: v2, bp: v1, hp: input - k * v1 - v2 };
    },
  };
}

function smoothstep(edge0, edge1, x) {
  if (edge1 === edge0) return x < edge0 ? 0 : 1;
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Original A minor rolling 16th acid bass patterns (MIDI note, accent, slide).
// Pattern A: hypnotic root-octave acid drive on A1/A2/G2/E2/C2
const BASS_PATTERN_A = [
  { n: 33, a: 1.0, s: false }, // A1
  { n: 33, a: 0.55, s: false },
  { n: 45, a: 0.85, s: true }, // A2 slide
  { n: 43, a: 0.65, s: false }, // G2
  { n: 33, a: 0.9, s: false }, // A1
  { n: 36, a: 0.6, s: false }, // C2
  { n: 40, a: 0.8, s: false }, // E2
  { n: 33, a: 0.5, s: false },
  { n: 33, a: 0.95, s: false },
  { n: 45, a: 0.7, s: false }, // A2
  { n: 48, a: 0.9, s: true }, // C3 slide
  { n: 45, a: 0.6, s: false },
  { n: 40, a: 0.85, s: false }, // E2
  { n: 43, a: 0.7, s: true }, // G2 slide
  { n: 41, a: 0.6, s: false }, // F2
  { n: 40, a: 0.75, s: false }, // E2
];

// Pattern B: harmonic lift variation on bar 4 / 8 / 12 / 16...
const BASS_PATTERN_B = [
  { n: 33, a: 1.0, s: false },
  { n: 40, a: 0.6, s: false },
  { n: 45, a: 0.9, s: true },
  { n: 48, a: 0.75, s: false },
  { n: 41, a: 0.9, s: false }, // F2
  { n: 41, a: 0.55, s: false },
  { n: 48, a: 0.85, s: true }, // C3
  { n: 45, a: 0.6, s: false },
  { n: 43, a: 0.95, s: false }, // G2
  { n: 43, a: 0.6, s: false },
  { n: 50, a: 0.9, s: true }, // D3
  { n: 47, a: 0.7, s: false }, // B2
  { n: 40, a: 0.9, s: false }, // E2
  { n: 43, a: 0.75, s: false },
  { n: 45, a: 0.85, s: true },
  { n: 43, a: 0.65, s: false },
];

// Original bright arpeggio 16-step motifs in A minor (0 = rest).
const ARP_MOTIFS = [
  [57, 60, 64, 67, 64, 60, 69, 64, 57, 64, 67, 71, 69, 67, 64, 60], // Am9 shimmer
  [53, 57, 60, 64, 69, 64, 60, 57, 53, 60, 64, 67, 69, 64, 60, 57], // Fmaj7
  [55, 59, 62, 67, 64, 62, 59, 62, 55, 62, 67, 71, 69, 67, 62, 59], // G6
  [52, 55, 59, 64, 67, 64, 59, 55, 52, 59, 62, 67, 64, 62, 59, 55], // Em7
];

// Light atmospheric pad voicings (4-bar cycle matching arp harmony).
const PAD_CHORDS = [
  [57, 60, 64, 71], // Am9
  [53, 57, 60, 64], // Fmaj7
  [55, 59, 62, 67], // G
  [52, 55, 59, 62], // Em7
];

// Simple deterministic stereo Schroeder reverb (4 parallel combs + 2 allpasses per channel).
function createStereoReverb() {
  const combLensL = [1557, 1617, 1491, 1422];
  const combLensR = [1580, 1640, 1514, 1445];
  const apLensL = [225, 556];
  const apLensR = [248, 579];

  function makeChannel(cLens, aLens) {
    const combs = cLens.map((len) => ({
      buf: new Float32Array(len),
      idx: 0,
      lp: 0,
    }));
    const aps = aLens.map((len) => ({
      buf: new Float32Array(len),
      idx: 0,
    }));
    return (input) => {
      let sum = 0;
      for (let c = 0; c < combs.length; c++) {
        const cb = combs[c];
        const y = cb.buf[cb.idx];
        cb.lp = y * 0.72 + cb.lp * 0.28;
        cb.buf[cb.idx] = input + cb.lp * 0.76;
        cb.idx = (cb.idx + 1) % cb.buf.length;
        sum += y;
      }
      let out = sum * 0.25;
      for (let a = 0; a < aps.length; a++) {
        const ap = aps[a];
        const bufOut = ap.buf[ap.idx];
        const v = out + bufOut * 0.5;
        ap.buf[ap.idx] = v;
        out = bufOut - v * 0.5;
        ap.idx = (ap.idx + 1) % ap.buf.length;
      }
      return out;
    };
  }

  return {
    stepL: makeChannel(combLensL, apLensL),
    stepR: makeChannel(combLensR, apLensR),
  };
}

export function renderTrack({ bars = 32 } = {}) {
  const numBars = Math.max(1, Math.floor(bars));
  const loopLength = Math.round(numBars * BAR_SECONDS * SAMPLE_RATE);
  const tailLength = Math.round(TAIL_SECONDS * SAMPLE_RATE);
  const totalLength = loopLength + tailLength;

  const rawL = new Float32Array(totalLength);
  const rawR = new Float32Array(totalLength);

  const rand = createPrng(0x5a17e128);

  // Voice states
  // 1. Kick
  let kickAge = 999;
  let kickPhase = 0;
  let kickClickEnv = 0;

  // 2. Hi-hat + subtle clap accent
  let hatAge = 999;
  let hatDecay = 0.045;
  let hatAmp = 0;
  let hatPan = 0;
  const hatHp = createSvf();
  const hatBp = createSvf();

  // 3. Acid bassline (saw + sub-square blend -> resonant TPT SVF -> overdrive)
  let bassPhase = 0;
  let bassSubPhase = 0;
  let bassFreq = midiToHz(33);
  let bassTargetFreq = bassFreq;
  let bassEnv = 0;
  let bassFilterEnv = 0;
  let bassAccent = 0;
  let bassSlide = false;
  let bassStepAge = 999;
  const bassFilter1 = createSvf();
  const bassFilter2 = createSvf();

  // 4. Bright arpeggio (detuned pulse/saw -> bright SVF -> ping-pong delay)
  let arpPhase1 = 0;
  let arpPhase2 = 0;
  let arpFreq = midiToHz(57);
  let arpEnv = 0;
  let arpStepAge = 999;
  let arpVel = 0;
  const arpFilter = createSvf();

  // Stereo ping-pong delay buffers (dotted-8th left, 8th right)
  const delaySamplesL = Math.round(3 * STEP_SECONDS * SAMPLE_RATE);
  const delaySamplesR = Math.round(2 * STEP_SECONDS * SAMPLE_RATE);
  const delayBufL = new Float32Array(delaySamplesL);
  const delayBufR = new Float32Array(delaySamplesR);
  let delayIdxL = 0;
  let delayIdxR = 0;
  let delayLpL = 0;
  let delayLpR = 0;

  // 5. Light atmospheric pad (4 chord notes x 2 detuned oscillators)
  const padPhasesA = new Float64Array(4);
  const padPhasesB = new Float64Array(4);
  const padFreqs = new Float64Array(4);
  for (let k = 0; k < 4; k++) padFreqs[k] = midiToHz(PAD_CHORDS[0][k]);
  const padFilterL = createSvf();
  const padFilterR = createSvf();
  let padEnv = 0;

  // Stereo reverb for pad + arp send
  const reverb = createStereoReverb();

  // Arrangement envelope helper across 32 bars (gracefully handles shorter bar counts too).
  function arrangementAt(barFloat) {
    // Bass macro cutoff & resonance
    let bassCutoff;
    let bassQ;
    let arpGain;
    let padGain;

    if (barFloat < 8) {
      // Bars 1-8: Kick + Hat + Bass (gradual opening)
      const p = barFloat / 8;
      bassCutoff = 260 + 520 * p;
      bassQ = 2.4 + 1.1 * p;
      arpGain = 0;
      padGain = 0;
    } else if (barFloat < 16) {
      // Bars 9-16: Add bright arpeggio
      const p = (barFloat - 8) / 8;
      bassCutoff = 780 + 480 * p;
      bassQ = 3.5 + 0.9 * p;
      arpGain = smoothstep(8, 9.2, barFloat);
      padGain = 0;
    } else if (barFloat < 24) {
      // Bars 17-24: Filter-swept acid bass + light pad
      const p = (barFloat - 16) / 8;
      // Dramatic acid filter sweep peaking around bar 23
      const sweep = Math.sin(p * Math.PI * 0.85);
      bassCutoff = 520 + 2900 * sweep;
      bassQ = 4.2 + 3.4 * sweep;
      arpGain = 0.55 + 0.45 * smoothstep(19.5, 23.5, barFloat);
      padGain = smoothstep(16, 17.5, barFloat);
    } else {
      // Bars 25-32: Full energy (25-28) then reduce cleanly back to bar 1 state (29-32)
      const inClimax = barFloat < 28;
      if (inClimax) {
        const p = (barFloat - 24) / 4;
        bassCutoff = 2100 + 700 * Math.sin(p * Math.PI);
        bassQ = 5.4;
        arpGain = 1.0;
        padGain = 1.0;
      } else {
        const p = (barFloat - 28) / 4;
        bassCutoff = 2100 * (1 - p) + 260 * p;
        bassQ = 5.4 * (1 - p) + 2.4 * p;
        arpGain = 1 - smoothstep(28, 30.8, barFloat);
        padGain = 1 - smoothstep(28, 30.2, barFloat);
      }
    }
    return { bassCutoff, bassQ, arpGain, padGain };
  }

  let lastStep = -1;
  const totalActiveSteps = numBars * STEPS_PER_BAR;

  for (let i = 0; i < totalLength; i++) {
    const t = i / SAMPLE_RATE;
    const inLoop = i < loopLength;
    const barFloat = t / BAR_SECONDS;
    const stepIndex = Math.floor(t / STEP_SECONDS);

    // Step sequencer triggers (only inside active loop window)
    if (inLoop && stepIndex !== lastStep && stepIndex < totalActiveSteps) {
      lastStep = stepIndex;
      const bar = Math.floor(stepIndex / STEPS_PER_BAR);
      const stepInBar = stepIndex % STEPS_PER_BAR;

      // Kick on 4-on-the-floor beats (0, 4, 8, 12)
      if (stepInBar % 4 === 0) {
        kickAge = 0;
        kickPhase = 0;
        kickClickEnv = 1.0;
      }

      // Off-beat crisp hat (steps 2, 6, 10, 14) + quiet 16th ghost ticks
      if (stepInBar % 4 === 2) {
        hatAge = 0;
        // Slightly more open on the last off-beat of every 2nd bar
        const open = stepInBar === 14 && bar % 2 === 1;
        hatDecay = open ? 0.13 : 0.048;
        hatAmp = open ? 0.42 : 0.34;
        hatPan = stepInBar === 2 || stepInBar === 10 ? -0.18 : 0.18;
      } else if (stepInBar % 2 === 1) {
        hatAge = 0;
        hatDecay = 0.022;
        hatAmp = 0.11;
        hatPan = stepInBar % 4 === 1 ? 0.25 : -0.25;
      }

      // Acid bassline 16th trigger
      const bassPat = bar % 4 === 3 ? BASS_PATTERN_B : BASS_PATTERN_A;
      const ev = bassPat[stepInBar];
      bassTargetFreq = midiToHz(ev.n);
      bassSlide = ev.s;
      if (!ev.s) {
        bassFreq = bassTargetFreq;
      }
      bassAccent = ev.a;
      bassStepAge = 0;
      bassEnv = 1.0;
      bassFilterEnv = 0.7 + 0.55 * ev.a;

      // Arpeggio 16th trigger
      const chordIdx = bar % 4;
      const arpNote = ARP_MOTIFS[chordIdx][stepInBar];
      if (arpNote > 0) {
        // Subtle octave sparkle on climax bars 25-28
        const octShift = bar >= 24 && bar < 28 && stepInBar % 4 === 2 ? 12 : 0;
        arpFreq = midiToHz(arpNote + octShift);
        arpStepAge = 0;
        arpEnv = 1.0;
        arpVel = stepInBar % 4 === 0 ? 1.0 : 0.72;
      }

      // Pad chord update on bar boundaries
      if (stepInBar === 0) {
        const chord = PAD_CHORDS[chordIdx];
        for (let k = 0; k < 4; k++) {
          padFreqs[k] = midiToHz(chord[k]);
        }
      }
    }

    const arr = inLoop
      ? arrangementAt(barFloat)
      : { bassCutoff: 260, bassQ: 2.4, arpGain: 0, padGain: 0 };

    // --- 1. KICK ---
    let kick = 0;
    if (kickAge < 0.45) {
      // Smooth 1.5 ms raised-cosine attack from exact 0 so t=0 has zero instantaneous click
      const atk = kickAge < 0.0015 ? 0.5 - 0.5 * Math.cos((Math.PI * kickAge) / 0.0015) : 1.0;
      const pitchHz = 46 + 128 * Math.exp(-kickAge * 36);
      kickPhase += (2 * Math.PI * pitchHz) / SAMPLE_RATE;
      const bodyEnv = Math.exp(-kickAge * 8.2);
      const clickNoise = (rand() * 2 - 1) * kickClickEnv * 0.22;
      kickClickEnv *= 0.965;
      const rawKick = (Math.sin(kickPhase) * bodyEnv + clickNoise) * atk;
      kick = Math.tanh(rawKick * 1.35) * 0.62;
      kickAge += 1 / SAMPLE_RATE;
    }

    // Sidechain ducking envelope derived from kick age (tight electronic pump)
    const sidechain = kickAge < 0.14 ? 0.38 + 0.62 * smoothstep(0.0, 0.14, kickAge) : 1.0;

    // --- 2. HI-HAT ---
    let hatL = 0;
    let hatR = 0;
    if (hatAge < 0.35) {
      const atk = hatAge < 0.0012 ? hatAge / 0.0012 : 1.0;
      const env = Math.exp(-hatAge / hatDecay) * atk * hatAmp;
      // Metallic seeded noise + high-frequency ring partials
      const n = rand() * 2 - 1;
      const metallic =
        n * 0.8 +
        0.1 * Math.sin(2 * Math.PI * 5240 * t) +
        0.1 * Math.sin(2 * Math.PI * 7820 * t);
      const hpOut = hatHp.step(metallic, 7200, 0.75).hp;
      const shimmer = hatBp.step(hpOut, 10200, 0.9).bp;
      const hatSig = (hpOut * 0.75 + shimmer * 0.45) * env * 0.9;
      hatL = hatSig * (1 - Math.max(0, hatPan));
      hatR = hatSig * (1 + Math.min(0, hatPan));
      hatAge += 1 / SAMPLE_RATE;
    }

    // --- 3. ACID BASSLINE ---
    let bass = 0;
    if (bassEnv > 0.0002 || bassStepAge < 0.25) {
      if (bassSlide) {
        bassFreq += (bassTargetFreq - bassFreq) * 0.0045;
      }
      const dt = bassFreq / SAMPLE_RATE;
      bassPhase = (bassPhase + dt) % 1;
      bassSubPhase = (bassSubPhase + dt * 0.5) % 1;
      const saw = 2 * bassPhase - 1 - polyBlep(bassPhase, dt);
      const sq = (bassPhase < 0.5 ? 1 : -1) + polyBlep(bassPhase, dt) - polyBlep((bassPhase + 0.5) % 1, dt);
      const sub = Math.sin(2 * Math.PI * bassSubPhase);
      const osc = saw * 0.72 + sq * 0.24 + sub * 0.2;

      const atk = bassStepAge < 0.002 ? bassStepAge / 0.002 : 1.0;
      const decayRate = bassSlide ? 7.0 : 12.0;
      bassEnv = Math.exp(-bassStepAge * decayRate) * (0.5 + 0.5 * bassAccent);
      bassFilterEnv *= 0.9994;

      const dynCutoff = arr.bassCutoff * (0.7 + 2.5 * bassFilterEnv * bassAccent);
      const s1 = bassFilter1.step(osc, dynCutoff, arr.bassQ).lp;
      const s2 = bassFilter2.step(Math.tanh(s1 * 1.5), dynCutoff * 1.35, Math.min(4.0, arr.bassQ * 0.65)).lp;

      // Keep bar 32 tail fading cleanly if past loop end
      const loopFade = inLoop ? 1.0 : Math.exp(-(i - loopLength) / (0.12 * SAMPLE_RATE));
      bass = Math.tanh(s2 * 1.35) * bassEnv * atk * sidechain * loopFade * 0.5;
      bassStepAge += 1 / SAMPLE_RATE;
    }

    // --- 4. BRIGHT ARPEGGIO + PING-PONG DELAY ---
    let arpDry = 0;
    if (arr.arpGain > 0.0001 || arpEnv > 0.0005) {
      const dt1 = (arpFreq * 1.0035) / SAMPLE_RATE;
      const dt2 = (arpFreq * 0.9965) / SAMPLE_RATE;
      arpPhase1 = (arpPhase1 + dt1) % 1;
      arpPhase2 = (arpPhase2 + dt2) % 1;
      const w1 = 2 * arpPhase1 - 1 - polyBlep(arpPhase1, dt1);
      const pw = 0.35;
      const w2 = (arpPhase2 < pw ? 1 : -1) + polyBlep(arpPhase2, dt2) - polyBlep((arpPhase2 + 1 - pw) % 1, dt2);
      const atk = arpStepAge < 0.002 ? arpStepAge / 0.002 : 1.0;
      arpEnv = Math.exp(-arpStepAge * 11.5);
      const cutoff = 1400 + 5200 * arpEnv * arpVel;
      const filtered = arpFilter.step((w1 * 0.55 + w2 * 0.45), cutoff, 2.0).lp;
      arpDry = filtered * arpEnv * atk * arpVel * arr.arpGain * (inLoop ? 1 : 0) * 0.42;
      arpStepAge += 1 / SAMPLE_RATE;
    }

    const delOutL = delayBufL[delayIdxL];
    const delOutR = delayBufR[delayIdxR];
    delayLpL = delOutL * 0.72 + delayLpL * 0.28;
    delayLpR = delOutR * 0.72 + delayLpR * 0.28;
    delayBufL[delayIdxL] = arpDry * 0.65 + delayLpR * 0.4;
    delayBufR[delayIdxR] = arpDry * 0.2 + delayLpL * 0.4;
    delayIdxL = (delayIdxL + 1) % delaySamplesL;
    delayIdxR = (delayIdxR + 1) % delaySamplesR;

    const arpL = arpDry * 0.95 + delOutL * 0.65;
    const arpR = arpDry * 0.75 + delOutR * 0.72;

    // --- 5. LIGHT PAD ---
    const targetPadEnv = inLoop ? arr.padGain : 0;
    const padSlew = targetPadEnv > padEnv ? 0.00014 : 0.0002;
    padEnv += (targetPadEnv - padEnv) * padSlew;

    let padL = 0;
    let padR = 0;
    if (padEnv > 0.0002) {
      let sumL = 0;
      let sumR = 0;
      for (let k = 0; k < 4; k++) {
        const f = padFreqs[k];
        const detune = 1 + (k - 1.5) * 0.0032;
        const dtA = (f * detune) / SAMPLE_RATE;
        const dtB = (f / detune) / SAMPLE_RATE;
        padPhasesA[k] = (padPhasesA[k] + dtA) % 1;
        padPhasesB[k] = (padPhasesB[k] + dtB) % 1;
        const triA = 4 * Math.abs(padPhasesA[k] - 0.5) - 1;
        const sawB = 2 * padPhasesB[k] - 1 - polyBlep(padPhasesB[k], dtB);
        const voice = triA * 0.55 + sawB * 0.45;
        // Spread chord voices across the stereo field
        const pan = (k - 1.5) * 0.48;
        sumL += voice * (0.75 - pan * 0.45);
        sumR += voice * (0.75 + pan * 0.45);
      }
      const padCutoff = 1600 + 750 * Math.sin(2 * Math.PI * (t / (BAR_SECONDS * 8)));
      padL = padFilterL.step(sumL * 0.35, padCutoff, 0.95).lp * padEnv * sidechain * 0.44;
      padR = padFilterR.step(sumR * 0.35, padCutoff, 0.95).lp * padEnv * sidechain * 0.44;
    }

    // --- STEREO REVERB SEND (pad + arp only; kick & bass stay tight) ---
    const revInL = padL * 0.65 + arpL * 0.38;
    const revInR = padR * 0.65 + arpR * 0.38;
    const revL = reverb.stepL(revInL) * 0.42;
    const revR = reverb.stepR(revInR) * 0.42;

    // --- MASTER MIX ---
    rawL[i] = kick + bass + hatL + arpL + padL + revL;
    rawR[i] = kick + bass + hatR + arpR + padR + revR;
  }

  // Smooth fade-out on the last 100 ms of the reverb/release tail so wrap terminates cleanly.
  const tailFade = Math.min(tailLength, Math.round(0.1 * SAMPLE_RATE));
  for (let k = 0; k < tailFade; k++) {
    const idx = totalLength - tailFade + k;
    const w = 0.5 + 0.5 * Math.cos((Math.PI * (k + 1)) / tailFade);
    rawL[idx] *= w;
    rawR[idx] *= w;
  }

  // Wrap tail back onto the start of the loop.
  const outL = new Float32Array(loopLength);
  const outR = new Float32Array(loopLength);
  for (let i = 0; i < loopLength; i++) {
    outL[i] = rawL[i];
    outR[i] = rawR[i];
  }
  for (let i = 0; i < tailLength; i++) {
    const idx = i % loopLength;
    outL[idx] += rawL[loopLength + i];
    outR[idx] += rawR[loopLength + i];
  }

  // Enforce smooth continuity across the final 20 ms to match sample 0 without any click.
  const seamWindow = Math.min(Math.round(0.02 * SAMPLE_RATE), Math.floor(loopLength / 4));
  const deltaL = outL[0] - outL[loopLength - 1];
  const deltaR = outR[0] - outR[loopLength - 1];
  for (let k = 0; k < seamWindow; k++) {
    const frac = (k + 1) / seamWindow;
    const w = 0.5 - 0.5 * Math.cos(Math.PI * frac);
    const idx = loopLength - seamWindow + k;
    outL[idx] += deltaL * w;
    outR[idx] += deltaR * w;
  }

  // Soft limiter + normalise to -3 dBFS peak.
  const drive = 1.25;
  const invTanhDrive = 1 / Math.tanh(drive);
  let peak = 0;
  for (let i = 0; i < loopLength; i++) {
    const l = Math.tanh(outL[i] * drive) * invTanhDrive;
    const r = Math.tanh(outR[i] * drive) * invTanhDrive;
    outL[i] = l;
    outR[i] = r;
    const al = Math.abs(l);
    const ar = Math.abs(r);
    if (al > peak) peak = al;
    if (ar > peak) peak = ar;
  }

  const normGain = peak > 0 ? TARGET_PEAK / peak : 1;
  const samples = new Float32Array(loopLength * 2);
  for (let i = 0; i < loopLength; i++) {
    samples[i * 2] = outL[i] * normGain;
    samples[i * 2 + 1] = outR[i] * normGain;
  }

  return { samples, length: loopLength };
}

function writeStereoWav(filePath, samples, frameCount, sampleRate) {
  const numChannels = 2;
  const bitsPerSample = 16;
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = frameCount * blockAlign;
  const buf = Buffer.alloc(44 + dataSize);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // PCM chunk size
  buf.writeUInt16LE(1, 20); // PCM format
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const int16 = clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767);
    buf.writeInt16LE(int16, offset);
    offset += 2;
  }
  fs.writeFileSync(filePath, buf);
}

function findFfmpeg() {
  const preferred = '/opt/homebrew/bin/ffmpeg';
  if (fs.existsSync(preferred)) return preferred;
  return 'ffmpeg';
}

function parseOutDir(argv) {
  const idx = argv.indexOf('--out');
  if (idx !== -1 && argv[idx + 1]) return argv[idx + 1];
  return 'game/audio';
}

function main() {
  const outDir = path.resolve(parseOutDir(process.argv.slice(2)));
  fs.mkdirSync(outDir, { recursive: true });

  const { samples, length } = renderTrack({ bars: 32 });
  const durationSec = (length / SAMPLE_RATE).toFixed(3);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skate-compose-'));
  const wavPath = path.join(tmpDir, 'backing.wav');
  const m4aPath = path.join(outDir, 'backing.m4a');
  const mp3Path = path.join(outDir, 'backing.mp3');

  try {
    writeStereoWav(wavPath, samples, length, SAMPLE_RATE);
    const ffmpeg = findFfmpeg();

    execFileSync(
      ffmpeg,
      ['-y', '-loglevel', 'error', '-i', wavPath, '-c:a', 'aac', '-b:a', '64k', '-ar', String(SAMPLE_RATE), '-ac', '2', '-movflags', '+faststart', m4aPath],
      { stdio: 'inherit' }
    );
    execFileSync(
      ffmpeg,
      ['-y', '-loglevel', 'error', '-i', wavPath, '-c:a', 'libmp3lame', '-b:a', '64k', '-ar', String(SAMPLE_RATE), '-ac', '2', mp3Path],
      { stdio: 'inherit' }
    );

    const m4aSize = fs.statSync(m4aPath).size;
    const mp3Size = fs.statSync(mp3Path).size;
    console.log(`Rendered ${length} frames (${durationSec} s) at ${SAMPLE_RATE} Hz stereo`);
    console.log(`  ${m4aPath}: ${m4aSize} bytes (${(m4aSize / 1024).toFixed(1)} KB)`);
    console.log(`  ${mp3Path}: ${mp3Size} bytes (${(mp3Size / 1024).toFixed(1)} KB)`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
