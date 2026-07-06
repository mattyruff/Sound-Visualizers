import express from 'express'
import cors from 'cors'
import { nanoid } from 'nanoid'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

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
  return { employees, jobs, assignments: [] }
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
  return state
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
    crewNeeded: Math.max(1, Number(crewNeeded) || 1),
    notes: (notes || '').trim(),
  }
  state.jobs.push(job)
  await saveState(state)
  res.status(201).json(job)
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

app.listen(PORT, () => {
  console.log(`EZ Schedule server listening on http://localhost:${PORT}`)
})
