# Resonance — Gong Visualizers

Sacred-geometry sound visualizers that ring with your gong. Play a recording or
open the live mic, then watch the form respond.

**Live site:** https://mattyruff.github.io/Sound-Visualizers/

- **Aurum** — the Seed of Life in gold, breathing violet from its core.
- **Torus** — a woven torus seen down its axis, gold windings over an emerald core.
- **Galaxy** — a spiral galaxy glittering with the gong; stars sparkle on every
  shimmer, the core flares with each strike.

Each visualizer is a single self-contained HTML file (no build step, no
dependencies) served as a static site via GitHub Pages. They share the same
audio spine: mic/file/sample input, a strike detector tuned for gongs (clean
hits, masked hits, and slow swells), and cross-tab audio focus so only one
Resonance tab makes sound at a time.

## Testing ground

New work is tried in the separate
[Resonance-Beta](https://github.com/mattyruff/Resonance-Beta) repo first —
rough experiments in its `sandbox/`, release candidates in its `beta/` — and
promoted here by plain file copy once it has been tested with a real gong.
The two sites deploy independently, so nothing broken can reach this one.

## Deployment

Pushing to `claude/github-pages-deploy-r4ya9f` triggers the
[`Deploy to GitHub Pages`](.github/workflows/deploy.yml) workflow, which
publishes the site.

## Former tenants

This repo once also housed two unrelated apps; each now lives in its own
repo, with its history:

- **EZ Schedule** → [mattyruff/EZ-Schedule](https://github.com/mattyruff/EZ-Schedule)
- **RETROPARDY!** → [mattyruff/jeopardy-retro](https://github.com/mattyruff/jeopardy-retro)

The old `/schedule/` and `/retropardy/` URLs redirect to their new homes, and
Vox (vocal toning) lives at [mattyruff/VOX](https://github.com/mattyruff/VOX)
with `/vox.html` redirecting likewise.
