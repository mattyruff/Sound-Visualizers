# EZ Schedule

Drag-and-drop daily job scheduling for your crew.

Employees live in the left rail as bubbles — **green** when available, **red**
once they're placed on a job for the selected day. Jobs for the day are cards
on the right. Drag an employee onto a job to assign them: while dragging,
jobs with open slots glow green and full jobs dim, so you always know where a
drop will land.

## Features

- **Smart drag-and-drop** — eligible job cards highlight as you drag; the card
  under the cursor gets a strong glow; full jobs fade out and reject drops.
- **Multi-person jobs** — each job has a crew size ("2/3 filled"); the card
  accepts drops until it's fully staffed.
- **Double-booking warning** — dropping an employee who's already on another
  job that day pops a confirmation ("… is already booked on X. Do you wish to
  proceed?"). Proceeding books them on both jobs (the original assignment is
  kept) and their bubble shows a count badge for how many jobs they're on.
- **Day navigation** — browse and plan any day with prev/next/today controls
  or the date picker; each day has its own jobs and assignments.
- **Employee & job management** — add/edit/remove employees (name, role,
  phone) and jobs (name, client, address, start time, crew size, notes) right
  in the UI.
- **Text crew** — composes each assigned employee's job details for the
  selected day into a text message. Per-person "Text" buttons open your
  messaging app pre-filled; "Copy"/"Copy all" grab the text; "Send all"
  mass-sends through Twilio when the local server is running with
  `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_FROM` set.
- **Local persistence** — everything is saved to `server/data.json` by a tiny
  local Express server. No cloud, no accounts; the file is created with sample
  seed data on first run.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:5173. This starts both the Vite dev server and the
local data server (port 4310) together.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- dnd-kit for drag-and-drop
- Express + a JSON file for local storage

The frontend proxies `/api/*` to the local Express server (see
`vite.config.ts`), so there's no CORS or config to worry about in development.
