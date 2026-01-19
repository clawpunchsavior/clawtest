# clawtest

Browser-based quiz game built around a fictional AI character ("The Claw"). Players answer timed questions across four difficulty tiers. Scores, badges, and leaderboard state are persisted in localStorage.

## Architecture

Static single-page app — no build step, no framework, no server-side logic. All game state lives client-side.

```
+-- src/
¦   +-- index.html        # DOM structure, modals, game UI sections
¦   +-- script.js         # Quiz engine, timer logic, leaderboard, badge system
¦   +-- styles.css        # Layout, animations, responsive breakpoints
¦   +-- vercel.json       # Static file serving config
¦   +-- assets/
¦       +-- clawtest.gif
¦       +-- clawtest2.gif
¦       +-- images/
¦       ¦   +-- claw-banner.png
¦       ¦   +-- claw-profile.png
¦       +-- sounds/
+-- vercel.json           # Root deployment config
+-- netlify.toml          # Netlify fallback config
+-- index.html            # Root redirect
```

## How it works

- `script.js` holds the question bank, difficulty scaling, timer countdown, and scoring formulas
- Questions are categorized by difficulty — easy (30s timer, 100pts), medium (20s, 250pts), hard (15s, 500pts), super hard (10s, 1000pts)
- Super hard mode is locked until the player scores 8/10 on hard
- Daily challenge mode rotates a fixed question set per UTC day
- Leaderboard entries are stored in localStorage and rendered in a filterable table
- Badge system tracks milestones (streaks, perfect scores, speed runs)
- Warm-up mini-games: reflex test (click timing) and memory sequence game
- Particle canvas runs on requestAnimationFrame for the background effect
- Copy-to-clipboard for contract address uses navigator.clipboard API with execCommand fallback

## Running locally

```bash
npx serve src
```

Opens on `http://localhost:3000` by default.

## Deployment

Hosted on Vercel as a static site. No build command needed.

```bash
vercel --prod
```

## Dependencies

None. Vanilla JS, no npm packages. Google Fonts loaded via CDN (Inter, Orbitron).

## Browser support

Tested on Chrome, Firefox, Safari, Edge. Uses CSS custom properties, flexbox, grid, and Web Animations API.

## Links

- Site: [clawtest.xyz](https://www.clawtest.xyz)
- Twitter: [@TheClawTest](https://x.com/TheClawTest)
