---
name: readme-polish
description: General techniques for making a project README (not a personal profile) read as considered rather than templated — badges, an animated hero line, status tables, and where the line is before it gets gimmicky. Use when writing or updating this repo's README.
---

# README polish

These are general-purpose, publicly documented tools and conventions — not anyone's specific profile content. A project README (this repo's landing page on GitHub) should read as informative first, impressive second; a personal profile README can afford to be more playful, this shouldn't try to be one.

## Badges (shields.io)

`https://img.shields.io/badge/<label>-<hex>?style=for-the-badge&logo=<slug>&logoColor=white` — tech-stack badges for the actual stack in use. Don't badge things that aren't really used just to look busier. Static badges only need the hex + logo slug; dynamic ones (stars, last commit, license) read live from the repo once it exists:

- `https://img.shields.io/github/stars/<owner>/<repo>?style=for-the-badge`
- `https://img.shields.io/github/last-commit/<owner>/<repo>?style=for-the-badge`
- `https://img.shields.io/badge/license-MIT-<hex>?style=for-the-badge` (or the dynamic `github/license/<owner>/<repo>` variant once a LICENSE file exists)

## An animated hero line (optional, use once, not everywhere)

The `readme-typing-svg` service (`https://readme-typing-svg.demolab.com?...&lines=...`) renders a typing-effect SVG from URL params — font, size, color, and a `;`-separated `lines=` list. One use at the very top of the README as a tagline is a nice "pop" moment; used more than once per page it reads as noise. Keep line text plain — avoid special punctuation that needs URL-encoding beyond basic commas/spaces.

## Structure that scales

- A short **Origin/why** section if the project has real context worth stating (a class, a specific problem) — stated plainly, not as a pitch. "This started as X" beats "I built this to demonstrate Y."
- A status table for any project with multiple components/modules — a `✅`/`🔜` column reads faster than prose, and keeps the roadmap visible without needing a separate issue tracker link.
- A **Roadmap** section for what's not built yet, grouped by category, so the reader can see where things are headed without asking.

## Where the line is

Skip, for a project README: visitor counters, Spotify now-playing widgets, snake-game contribution graphs, WakaTime stats. Those are personal-profile conventions (see: any curated list of "awesome profile READMEs") — they're about the person, not the project, and on a project README they read as filler rather than "pop."
