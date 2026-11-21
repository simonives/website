# Game Backing Track

Original looping electronic backing track for the skateboard game (`backing.m4a` and `backing.mp3`).

- **Tool:** [`game/tools/compose.mjs`](../tools/compose.mjs) (pure Node.js additive and subtractive synthesis, encoded with `ffmpeg`)
- **Date:** 2026-11-21
- **Composition:** Original track composed entirely in code with seeded deterministic synthesis, containing no external samples and no copied melodies. Tempo is 128 BPM in A minor across 32 bars (60.0 s), arranged for seamless looping and normalised to -3 dBFS with a soft limiter.
- **Licence:** Released under the repository's licence (see [`LICENSE`](../../LICENSE) at the repository root).

## Regenerating the files

Run from the repository root with Node.js and `ffmpeg` installed:

```sh
node game/tools/compose.mjs --out game/audio
```

This renders a 44.1 kHz stereo WAV to a temporary directory and encodes `game/audio/backing.m4a` (AAC, 64 kbps) and `game/audio/backing.mp3` (MP3, 64 kbps).
