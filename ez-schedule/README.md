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
- **Day & week calendar** — a Day/Week toggle in the top bar. Day view is
  the working board; Week view is a 7-column calendar (Monday start,
  today highlighted, short-staffed days flagged) with the same
  drag-and-drop, and clicking a day header opens that day.
- **Jobs that span days** — "Add days" on any job card copies it to extra
  dates (with a rest-of-the-work-week shortcut), optionally bringing its
  crew along; edit-in-place (✎) changes any job detail or moves it to
  another date.
- **Status ribbon** — one line under the top bar: short-staffed job count,
  unassigned employees, and how many people have acknowledged.
- **Employee & job management** — add/edit/remove employees (name, role,
  phone) and jobs (name, client, address, start time, crew size, notes) right
  in the UI.
- **Text crew** — composes each assigned employee's job details for the
  selected day into a text message. Per-person "Text" buttons open your
  messaging app pre-filled; "Copy"/"Copy all" grab the text; "Send all"
  mass-sends through Twilio when the local server is running with
  `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_FROM` set.
- **Manager status report** — the "Report" button shows the day's
  breakdown (jobs not fully staffed, people awaiting acknowledgment,
  unassigned employees) with Copy and open-in-email-app actions. Managers
  can get it emailed automatically at a set time each day (e.g. 17:00):
  save their addresses and the send time in the modal, and run the local
  server with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and
  `SMTP_FROM` set (any mail provider's SMTP endpoint or a Gmail app
  password works).
- **Days off** — mark single days or vacation ranges on any employee
  (pencil button → "Days off"). On those days their bubble turns gray
  with an OFF tag and sinks below the assigned group; assigning them
  anyway asks for confirmation first, and marking someone off while
  they're already assigned offers to pull them from those jobs. Off
  counts show in the status ribbon, week-view headers, and the manager
  report.
- **Acknowledgments** — employees who confirm their assignment get a black
  ✓ next to their name in both the employee list and the job card. The
  office can toggle it from the ✓ button on a job-card chip or from the
  Text crew screen (which shows an acknowledged counter). For automatic
  acknowledgment, point a Twilio number's inbound-message webhook at
  `POST /api/sms-reply` — any reply from a known employee phone confirms
  their current assignments and texts back a confirmation.
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
