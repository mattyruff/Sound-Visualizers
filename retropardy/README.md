# RETROPARDY! — 1985–1995

A Jeopardy-style trivia game covering the golden decade of 1985–1995: movies,
television, music, video games, sports, world events, food & drink, cars,
tech & toys, and fads & fashion.

**1,000+ questions. Zero dependencies. Fully playable offline.**

## Play

Open `index.html` in any browser. That's it — no server, no internet, no build
step. Everything (questions, styling, sound effects) is self-contained.

## Run it as a mobile app

The game is a full **PWA** (progressive web app) — installable on a phone with
its own icon, fullscreen, and 100% offline after the first load:

1. Host the `retropardy/` folder anywhere with HTTPS (GitHub Pages works
   great — no build step needed), or serve it locally
   (`python3 -m http.server` in this folder).
2. Open the URL on your phone.
3. **Android/Chrome:** tap ⋮ → *Add to Home screen* (or the install prompt).
   **iPhone/Safari:** tap Share → *Add to Home Screen*.
4. Launch from the icon — it runs fullscreen and works with airplane mode on.
   The service worker (`sw.js`) precaches every file, questions included.

Want a real store-distributable native app? The folder drops straight into
[Capacitor](https://capacitorjs.com):

```bash
npm init -y && npm i @capacitor/core @capacitor/cli
npx cap init Retropardy com.example.retropardy --web-dir .
npx cap add android   # and/or: npx cap add ios
npx cap open android  # build/run from Android Studio or Xcode
```

No code changes are required — it's plain HTML/CSS/JS with zero dependencies.

## How it works

- **Round 1** — a 6×5 board of clickable dollar values ($200–$1,000), with one
  hidden Daily Double (worth 2×).
- **Double Round** — six new categories at $400–$2,000, with two Daily Doubles.
- **Final Retropardy** — wager any part of your winnings on one last
  hard question.
- Every question is multiple choice: three options, click (or press 1/2/3) to
  answer. Correct adds the value; wrong subtracts it. A 20-second timer keeps
  things honest — running out of time costs you nothing but the board.
- **1–3 players**, hot-seat style. The player in control picks the next clue;
  a wrong answer passes control.
- The game remembers (in `localStorage`) which questions you've been asked, so
  every replay draws fresh material until you've exhausted the pool. Use
  *reset question history* on the title screen to start over.

## Categories

| Board name | Topic |
|---|---|
| AT THE MOVIES | Movies |
| TUBE TIME | Television |
| MIXTAPE | Music |
| HIGH SCORES | Video Games |
| SPORTS PAGE | Sports |
| HEADLINES | Politics & World Events |
| DRIVE-THRU | Food & Drink |
| HORSEPOWER | Cars |
| GADGETS & GIZMOS | Tech & Toys |
| TOTALLY RAD | Fads & Fashion |

## Adding questions

Question banks live in `js/data/*.js`. Each entry looks like:

```js
{cat:"Movies", d:3, q:"Question text?", c:["right answer","wrong","wrong"], a:0}
```

- `cat` — one of the ten category names above
- `d` — difficulty 1–5, which maps to the board row ($200 … $1,000)
- `c` — exactly three choices; `a` is the index (0–2) of the correct one
  (answer order is shuffled at play time)

Drop new entries into any data file (or add a new file and a `<script>` tag in
`index.html`) and they're in the rotation.
