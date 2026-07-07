import express from 'express'
import cors from 'cors'
import nodemailer from 'nodemailer'
import { nanoid } from 'nanoid'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { buildReport } from './report.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, 'data.json')
const PORT = 4310

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function seedData() {
  const today = todayISO()
  const employees = [
    { id: nanoid(), name: 'Alex Rivera', role: 'Electrician', phone: '' },
    { id: nanoid(), name: 'Sam Chen', role: 'Driver', phone: '' },
    { id: nanoid(), name: 'Jordan Blake', role: 'Laborer', phone: '' },
    { id: nanoid(), name: 'Casey Nguyen', role: 'Foreman', phone: '' },
    { id: nanoid(), name: 'Morgan Diaz', role: 'Laborer', phone: '' },
  ]
  const jobs = [
    {
      id: nanoid(),
      date: today,
      name: 'Riverside Remodel',
      client: 'Thompson Residence',
      address: '412 Riverside Dr',
      startTime: '08:00',
      crewNeeded: 2,
      notes: '',
    },
    {
      id: nanoid(),
      date: today,
      name: 'Oak St Rewire',
      client: 'Oak St Office',
      address: '88 Oak St',
      startTime: '09:30',
      crewNeeded: 1,
      notes: '',
    },
    {
      id: nanoid(),
      date: today,
      name: 'Warehouse Delivery',
      client: 'Northgate Logistics',
      address: '1200 Industrial Pkwy',
      startTime: '07:00',
      crewNeeded: 1,
      notes: '',
    },
  ]
  return { employees, jobs, assignments: [], settings: defaultSettings() }
}

async function loadState() {
  if (!existsSync(DATA_FILE)) {
    const state = seedData()
    await writeFile(DATA_FILE, JSON.stringify(state, null, 2))
    return state
  }
  const raw = await readFile(DATA_FILE, 'utf-8')
  const state = JSON.parse(raw)
  // migrate records saved before newer fields existed
  for (const e of state.employees) {
    if (e.phone === undefined) e.phone = ''
  }
  for (const a of state.assignments) {
    if (a.acknowledged === undefined) a.acknowledged = false
  }
  if (!state.settings) state.settings = defaultSettings()
  return state
}

function defaultSettings() {
  return { reportEmails: [], reportTime: '17:00', reportEnabled: false, lastReportDate: '' }
}

async function saveState(state) {
  await writeFile(DATA_FILE, JSON.stringify(state, null, 2))
}

const app = express()
app.use(cors())
app.use(express.json())
// Twilio posts inbound-SMS webhooks as form-encoded bodies
app.use(express.urlencoded({ extended: false }))

app.get('/api/state', async (_req, res) => {
  const state = await loadState()
  res.json(state)
})

app.post('/api/employees', async (req, res) => {
  const { name, role, phone } = req.body
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' })
  }
  const state = await loadState()
  const employee = {
    id: nanoid(),
    name: name.trim(),
    role: (role || '').trim(),
    phone: (phone || '').trim(),
  }
  state.employees.push(employee)
  await saveState(state)
  res.status(201).json(employee)
})

app.patch('/api/employees/:id', async (req, res) => {
  const state = await loadState()
  const employee = state.employees.find((e) => e.id === req.params.id)
  if (!employee) return res.status(404).json({ error: 'employee not found' })
  const { name, role, phone } = req.body
  if (name !== undefined) employee.name = String(name).trim()
  if (role !== undefined) employee.role = String(role).trim()
  if (phone !== undefined) employee.phone = String(phone).trim()
  await saveState(state)
  res.json(employee)
})

app.delete('/api/employees/:id', async (req, res) => {
  const state = await loadState()
  state.employees = state.employees.filter((e) => e.id !== req.params.id)
  state.assignments = state.assignments.filter((a) => a.employeeId !== req.params.id)
  await saveState(state)
  res.status(204).end()
})

app.post('/api/jobs', async (req, res) => {
  const { date, name, client, address, startTime, crewNeeded, notes } = req.body
  if (!name || !name.trim() || !date) {
    return res.status(400).json({ error: 'date and name are required' })
  }
  const state = await loadState()
  const job = {
    id: nanoid(),
    date,
    name: name.trim(),
    client: (client || '').trim(),
    address: (address || '').trim(),
    startTime: (startTime || '').trim(),
    crewNeeded: Math.min(20, Math.max(1, Number(crewNeeded) || 1)),
    notes: (notes || '').trim(),
  }
  state.jobs.push(job)
  await saveState(state)
  res.status(201).json(job)
})

app.patch('/api/jobs/:id', async (req, res) => {
  const state = await loadState()
  const job = state.jobs.find((j) => j.id === req.params.id)
  if (!job) return res.status(404).json({ error: 'job not found' })
  const { date, name, client, address, startTime, crewNeeded, notes } = req.body
  if (date !== undefined) job.date = String(date)
  if (name !== undefined) job.name = String(name).trim()
  if (client !== undefined) job.client = String(client).trim()
  if (address !== undefined) job.address = String(address).trim()
  if (startTime !== undefined) job.startTime = String(startTime).trim()
  if (crewNeeded !== undefined) job.crewNeeded = Math.min(20, Math.max(1, Number(crewNeeded) || 1))
  if (notes !== undefined) job.notes = String(notes).trim()
  await saveState(state)
  res.json(job)
})

// duplicate a job onto additional dates, optionally with its crew
// (new assignments start unacknowledged — it's a new day to confirm)
app.post('/api/jobs/:id/duplicate', async (req, res) => {
  const { dates, includeCrew } = req.body
  if (!Array.isArray(dates) || dates.length === 0) {
    return res.status(400).json({ error: 'dates array is required' })
  }
  const state = await loadState()
  const source = state.jobs.find((j) => j.id === req.params.id)
  if (!source) return res.status(404).json({ error: 'job not found' })
  const crew = includeCrew
    ? state.assignments.filter((a) => a.jobId === source.id).map((a) => a.employeeId)
    : []
  const jobs = []
  const assignments = []
  for (const date of dates) {
    const job = { ...source, id: nanoid(), date }
    state.jobs.push(job)
    jobs.push(job)
    for (const employeeId of crew) {
      const assignment = { id: nanoid(), jobId: job.id, employeeId, acknowledged: false }
      state.assignments.push(assignment)
      assignments.push(assignment)
    }
  }
  await saveState(state)
  res.status(201).json({ jobs, assignments })
})

app.delete('/api/jobs/:id', async (req, res) => {
  const state = await loadState()
  state.jobs = state.jobs.filter((j) => j.id !== req.params.id)
  state.assignments = state.assignments.filter((a) => a.jobId !== req.params.id)
  await saveState(state)
  res.status(204).end()
})

app.post('/api/assignments', async (req, res) => {
  const { jobId, employeeId } = req.body
  const state = await loadState()
  const job = state.jobs.find((j) => j.id === jobId)
  const employee = state.employees.find((e) => e.id === employeeId)
  if (!job || !employee) {
    return res.status(404).json({ error: 'job or employee not found' })
  }

  const alreadyOnThisJob = state.assignments.some(
    (a) => a.jobId === jobId && a.employeeId === employeeId,
  )
  if (alreadyOnThisJob) {
    return res.status(200).json({ ok: true })
  }

  const currentCrew = state.assignments.filter((a) => a.jobId === jobId).length
  if (currentCrew >= job.crewNeeded) {
    return res.status(409).json({ error: 'job is fully staffed' })
  }

  // double-booking (same employee on more than one job the same day) is
  // allowed here — the client warns and confirms with the user before
  // sending this request, so the server just records whatever it's told
  const assignment = { id: nanoid(), jobId, employeeId, acknowledged: false }
  state.assignments.push(assignment)
  await saveState(state)
  res.status(201).json(assignment)
})

app.patch('/api/assignments/:id', async (req, res) => {
  const state = await loadState()
  const assignment = state.assignments.find((a) => a.id === req.params.id)
  if (!assignment) return res.status(404).json({ error: 'assignment not found' })
  if (req.body.acknowledged !== undefined) {
    assignment.acknowledged = Boolean(req.body.acknowledged)
  }
  await saveState(state)
  res.json(assignment)
})

app.delete('/api/assignments/:id', async (req, res) => {
  const state = await loadState()
  state.assignments = state.assignments.filter((a) => a.id !== req.params.id)
  await saveState(state)
  res.status(204).end()
})

// Mass-text scaffolding: sends each message via Twilio when the three
// TWILIO_* env vars are set; otherwise reports that SMS isn't configured
// so the UI can fall back to sms: links / copy-paste.
app.post('/api/notify', async (req, res) => {
  const { messages } = req.body
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' })
  }
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM
  if (!sid || !token || !from) {
    return res.status(501).json({
      error:
        'Automatic SMS is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM, then restart the server.',
    })
  }
  const auth = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64')
  const results = []
  for (const m of messages) {
    if (!m.to || !m.body) {
      results.push({ to: m.to || '', ok: false, error: 'missing to/body' })
      continue
    }
    try {
      const resp = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: 'POST',
          headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ To: m.to, From: from, Body: m.body }),
        },
      )
      results.push({ to: m.to, ok: resp.ok })
    } catch {
      results.push({ to: m.to, ok: false, error: 'network error' })
    }
  }
  res.json({ results })
})

// Inbound-SMS webhook (point a Twilio phone number's "A message comes in"
// hook at POST <public-url>/api/sms-reply). Any reply from a known
// employee's phone acknowledges their current and upcoming assignments.
app.post('/api/sms-reply', async (req, res) => {
  const digits = (s) => String(s || '').replace(/\D/g, '')
  const from = digits(req.body.From).slice(-10)
  const state = await loadState()
  const employee = from
    ? state.employees.find((e) => digits(e.phone).slice(-10) === from && from.length === 10)
    : undefined

  let reply
  if (!employee) {
    reply = 'Sorry, this number is not on file with EZ Schedule.'
  } else {
    const today = todayISO()
    let acked = 0
    for (const a of state.assignments) {
      if (a.employeeId !== employee.id || a.acknowledged) continue
      const job = state.jobs.find((j) => j.id === a.jobId)
      if (job && job.date >= today) {
        a.acknowledged = true
        acked++
      }
    }
    await saveState(state)
    const first = employee.name.split(' ')[0]
    reply =
      acked > 0
        ? `Thanks ${first}! Your assignment is confirmed.`
        : `Thanks ${first} — nothing pending to confirm right now.`
  }

  res
    .type('text/xml')
    .send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`)
})

app.put('/api/settings', async (req, res) => {
  const state = await loadState()
  const { reportEmails, reportTime, reportEnabled } = req.body
  if (reportEmails !== undefined) {
    state.settings.reportEmails = [...reportEmails].map((e) => String(e).trim()).filter(Boolean)
  }
  if (reportTime !== undefined) state.settings.reportTime = String(reportTime)
  if (reportEnabled !== undefined) state.settings.reportEnabled = Boolean(reportEnabled)
  await saveState(state)
  res.json(state.settings)
})

// Email delivery uses SMTP via SMTP_HOST, SMTP_PORT, SMTP_USER,
// SMTP_PASS and SMTP_FROM env vars (e.g. a Gmail app password or any
// transactional mail provider's SMTP endpoint).
function mailTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

async function emailReport(state, date) {
  const transport = mailTransport()
  if (!transport) {
    throw new Error(
      'Email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM, then restart the server.',
    )
  }
  if (state.settings.reportEmails.length === 0) {
    throw new Error('No manager email addresses saved in report settings.')
  }
  const { subject, body } = buildReport(date, state)
  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: state.settings.reportEmails.join(', '),
    subject,
    text: body,
  })
}

app.post('/api/report/send', async (req, res) => {
  const state = await loadState()
  const date = req.body?.date || todayISO()
  try {
    await emailReport(state, date)
    res.json({ ok: true, sentTo: state.settings.reportEmails })
  } catch (err) {
    res.status(501).json({ error: err.message })
  }
})

// scheduled daily report: check each minute; fire once per day when the
// local clock passes the configured time
setInterval(async () => {
  try {
    const state = await loadState()
    const { reportEnabled, reportTime, reportEmails, lastReportDate } = state.settings
    if (!reportEnabled || reportEmails.length === 0) return
    const now = new Date()
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const today = todayISO()
    if (lastReportDate === today || hhmm < reportTime) return
    await emailReport(state, today)
    state.settings.lastReportDate = today
    await saveState(state)
    console.log(`Scheduled report for ${today} emailed to ${reportEmails.join(', ')}`)
  } catch (err) {
    console.error('Scheduled report failed:', err.message)
  }
}, 60_000)

app.listen(PORT, () => {
  console.log(`EZ Schedule server listening on http://localhost:${PORT}`)
})
