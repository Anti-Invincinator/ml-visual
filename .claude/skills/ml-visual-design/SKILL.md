---
name: ml-visual-design
description: Design system and component conventions for the ml-visual project — dark-only palette tokens, typography, card/canvas/SVG patterns, and the train-gate rule for heavy interactive visualizations. Use when building or editing any page, component, or notebook plot in this repo.
---

# ml-visual design system

This project shows ML/DL algorithms implemented from scratch, twice — once in a Jupyter notebook (Python/numpy) and once as a live interactive page (Next.js/TypeScript). Every new algorithm should follow these established conventions so the site reads as one coherent system, not a pile of one-off demos.

## Color tokens (`web/src/app/globals.css`)

Dark-only, no light mode. Defined as CSS custom properties on `:root`:

- `--page` (#050505), `--surface` (#0d0d0f), `--surface-raised` — near-true-black surfaces, not the warmer off-black some earlier iterations used.
- `--ink-primary` / `--ink-secondary` / `--ink-muted` — cool grays.
- `--hairline`, `--border`, `--border-strong` — structural dividers, never drop shadows.
- `--accent` (blue #3987e5) is the brand accent; `--accent-secondary` (violet #9085e9) is a secondary highlight.
- `--status-good` (green) / `--status-critical` (red) are reserved for state (e.g. "live" badges) — never reused as a data-series color.
- `--metric-*` tokens are the categorical dataviz palette (blue/orange/aqua/yellow/violet) — validated for colorblind-safety by the bundled `dataviz` skill. Reuse these exact hexes for any new multi-series comparison; don't invent new categorical colors ad hoc.

Always load the `dataviz` skill before adding any chart, heatmap, or multi-series visualization — it has the validator and the full color-assignment rules (sequential vs. categorical vs. diverging vs. status).

## Typography

Geist Sans for UI text, Geist Mono (`var(--font-mono)`) for anything numeric, code-like, or a formula/threshold label (readouts, slider values, split conditions in a tree diagram). This is deliberate, not decorative — it signals "this is a value you can trust the precision of."

## Page structure

Every algorithm page (`web/src/app/<slug>/page.tsx`) follows the same shape:
1. `← all algorithms` back-link (font-mono, muted)
2. `<h1>` title + a short paragraph explaining the concept and what makes it worth building from scratch
3. One or more `<section>`s, each with an `<h2>`, a one-line description, and the interactive component
4. A closing note pointing to the companion notebook path

Interactive logic lives in `web/src/algorithms/<slug>/` as `engine.ts` (pure, from-scratch math — no ML/optimization libraries) plus one or more `.tsx` components (`"use client"`).

## The train-gate rule

If a visualization needs to precompute many frames of heavy work up front (a full training run, a per-pixel classifier-surface heatmap across dozens of snapshots), gate it behind an explicit "train" button — show a single cheap static frame (untrained/default state) on load, and only do the expensive precompute when the user clicks. Backprop and SVM do this.

If the recompute is cheap and instant (a slider directly recomputing one frame — gradient descent's loss-surface race, decision trees' depth slider, k-means' small point-cloud animation), it's fine to auto-run/auto-play. Judge by actual cost, not by whether the algorithm is "iterative" — k-means and gradient descent both use loops of possibly-many gradient/assignment steps.

## SSR/hydration gotchas (learned the hard way on this repo)

- `Math.cos`/`Math.sin`/`Math.atan2` are not guaranteed bit-identical between Node (SSR) and the browser (hydration) per the ECMAScript spec. Round any SVG path coordinate derived from a trig function to ~2 decimal places before interpolating into a `d` attribute, or it'll hydration-mismatch.
- `ImageData` is a browser-only API. Never construct it inside `useMemo` or at module scope during render — that code path also runs during Next's server render. Build it inside a `useEffect` (or a ref populated by one), never returned from a bare synchronous computation used directly in JSX.

## Verify before writing the pitch

Before writing comparison copy ("X beats Y", "this converges reliably"), actually run the numbers — a throwaway Node/Python script, or the real training loop — before committing to a claim in the UI or notebook. This project has caught itself overclaiming twice (an SVM hyperparameter guess, a k-means++ "always wins" claim that turned out false at 1 of 20 seeds). Verify, then write copy that matches what actually happened.

## Home page categories (`web/src/lib/algorithms.ts`)

Algorithms are grouped by ML taxonomy (Foundations, Supervised, Unsupervised, Deep Learning, Transformers — see the roadmap in the root README), not by ad-hoc topic labels. Each entry has `status: "live" | "soon"`; "soon" entries render muted and non-clickable so the roadmap is visible without dead links.
