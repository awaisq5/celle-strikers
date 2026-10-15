# Celle Strikers

**Live app:** https://celle-strikers.web.app (sign-in required)

A ball-by-ball scorebook for our Sunday cricket games in Celle. Pick the teams from a player pool, score every ball on the field from a phone, and keep a history of matches and player figures across Sundays.

Built with React and Firebase while I was training as a software developer, and used by the club on match days.

## What it does

- **Player pool and teams.** Keep a list of regulars, pick two teams for the day, and add a late arrival during a match.
- **Match setup.** Team names, number of overs, toss winner and decision, and an optional "last man standing" rule for small sides.
- **Ball-by-ball scoring.** Runs, wides, no-balls and wickets, with the striker and non-striker rotating on odd runs and at the end of each over. The bowler must be chosen each over and cannot bowl two overs in a row.
- **Live figures.** Score, overs, extras, the current over's balls, the overs history, and batting and bowling figures for every player.
- **Corrections.** Undo the last ball, change strike, reset the current innings, or go back to the first innings to fix it.
- **Innings and result.** The innings ends when the overs run out or the side is all out; the chase ends when the target is reached, and the result is worked out.
- **Nothing lost mid-match.** The live match is saved in the browser after every ball, so a closed tab or a flat battery can be resumed.
- **History and stats.** Finished matches are saved to Firestore. Match history is grouped by date, and player stats add up runs, strike rate, overs, runs conceded and wickets per match day.
- **Sign-in.** Firebase email and password authentication in front of the scorebook.

## Tech stack

React 19, Vite, Tailwind CSS, Firebase Authentication, Cloud Firestore, Firebase Hosting. Vitest and Testing Library for tests, ESLint and Prettier for code style, GitHub Actions for CI.

## Running it

```bash
npm ci
cp .env.example .env      # fill in your Firebase web app config
npm run dev               # http://localhost:5173
```

The app needs a Firebase project with Email/Password sign-in enabled and a Firestore database. The `VITE_FIREBASE_*` values come from the Firebase console under Project settings, Your apps.

```bash
npm test        # scoring rules and an app flow test, with Firebase stubbed
npm run lint
npm run build
```

### Deploying

```bash
npm run build
firebase deploy --only hosting
```

`firebase.json` serves `dist/` and rewrites every route to `index.html`.

## Project structure

```
src/App.jsx                 match setup, live scoring, history and stats tabs
src/lib/cricket.js          scoring rules: overs, extras, end of innings, stats per match day
src/components/Auth.jsx     sign-in and sign-up
src/components/PlayerStats.jsx  player figures by date
src/firebase.js             Firebase app, auth and Firestore from environment variables
```

## Tests

- `src/lib/cricket.test.js`: overs notation, extras, end of an over, all out with and without last man standing, chasing a target, and adding up player stats per match day, including matches saved in the older format.
- `src/App.test.jsx`: renders the app with Firebase stubbed, picks two teams, starts a match and scores balls, checking that a bowler is required and that wides add a run without using up a ball.
