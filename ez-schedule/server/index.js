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
    { id: nanoid(), name: 'Alex Rivera', role: 'Electrician' },
    { id: nanoid(), name: 'Sam Chen', role: 'Driver' },
    { id: nanoid(), name: 'Jordan Blake', role: 'Laborer' },
    { id: nanoid(), name: 'Casey Nguyen', role: 'Foreman' },
    { id: nanoid(), name: 'Morgan Diaz', role: 'Laborer' },
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
  return JSON.parse(raw)
}

async function saveState(state) {
  await writeFile(DATA_FILE, JSON.stringify(state, null, 2))
}

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/state', async (_req, res) => {
  const state = await loadState()
  res.json(state)
})

app.post('/api/employees', async (req, res) => {
  const { name, role } = req.body
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' })
  }
  const state = await loadState()
  const employee = { id: nanoid(), name: name.trim(), role: (role || '').trim() }
  state.employees.push(employee)
  await saveState(state)
  res.status(201).json(employee)
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
  const assignment = { id: nanoid(), jobId, employeeId }
  state.assignments.push(assignment)
  await saveState(state)
  res.status(201).json(assignment)
})

app.delete('/api/assignments/:id', async (req, res) => {
  const state = await loadState()
  state.assignments = state.assignments.filter((a) => a.id !== req.params.id)
  await saveState(state)
  res.status(204).end()
})

app.listen(PORT, () => {
  console.log(`EZ Schedule server listening on http://localhost:${PORT}`)
})
