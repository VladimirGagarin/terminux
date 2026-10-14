import { useEffect, useRef, useState } from 'react'
import { usePersistentState } from './storage'
import { beep, formatClock, notify, pad, formatTimestamp } from './ui'

const VIEWS = [
  ['timer', 'Timer'],
  ['stopwatch', 'Stopwatch'],
  ['alarm', 'Alarm'],
  ['reminders', 'Reminders'],
]

function parsePreset(preset) {
  if (!preset) return null
  const m = String(preset).match(/^(\d+)\s*(s|sec|secs|m|min|mins|h|hr|hrs)?$/i)
  if (!m) return null
  const n = Number(m[1])
  const unit = (m[2] || 'm').toLowerCase()
  if (unit.startsWith('s')) return n
  if (unit.startsWith('h')) return n * 3600
  return n * 60
}

export default function TimerApp({ params = {}, setParams }) {
  const [view, setView] = useState(params.view || 'timer')
  const [now, setNow] = useState(0)

  const [minutes, setMinutes] = useState(() => {
    const secs = parsePreset(params.preset)
    return secs ? String(Math.floor(secs / 60)) : '5'
  })
  const [seconds, setSeconds] = useState(() => {
    const secs = parsePreset(params.preset)
    return secs ? String(secs % 60) : '0'
  })
  const [remaining, setRemaining] = useState(0)
  const [running, setRunning] = useState(false)
  const endRef = useRef(0)
  const doneRef = useRef(false)

  const [elapsed, setElapsed] = useState(0)
  const [swRunning, setSwRunning] = useState(false)
  const swStart = useRef(0)
  const [laps, setLaps] = useState([])

  const [alarms, setAlarms] = usePersistentState('terminux.alarms', [])
  const [alarmTime, setAlarmTime] = useState('07:00')
  const [alarmLabel, setAlarmLabel] = useState('')

  const [reminders, setReminders] = usePersistentState('terminux.reminders', [])
  const [reminderText, setReminderText] = useState('')
  const [reminderMins, setReminderMins] = useState('10')

  const [lastView, setLastView] = useState(params.view)
  if (params.view && params.view !== lastView) {
    setLastView(params.view)
    setView(params.view)
  }

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const incoming = params.add
    if (!incoming) return
    setReminders((prev) => (prev.some((r) => r.id === incoming.id) ? prev : [...prev, incoming]))
    setParams?.({ add: null })
  }, [params.add, setParams, setReminders])

  useEffect(() => {
    if (swRunning) setElapsed(now - swStart.current)
  }, [now, swRunning])

  useEffect(() => {
    if (!running) return
    const left = endRef.current - now
    if (left <= 0) {
      setRemaining(0)
      setRunning(false)
      if (!doneRef.current) {
        doneRef.current = true
        notify('Timer finished', 'Your terminux timer is done.')
        beep()
      }
    } else {
      setRemaining(left)
    }
  }, [now, running])

  useEffect(() => {
    const d = new Date(now)
    const hhmm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
    const today = d.toDateString()

    const dueAlarms = alarms.filter((a) => a.time === hhmm && a.lastFired !== today)
    if (dueAlarms.length > 0) {
      dueAlarms.forEach((a) => {
        notify('Alarm', a.label || `Alarm at ${a.time}`)
        beep()
      })
      setAlarms((prev) =>
        prev.map((a) => (dueAlarms.some((x) => x.id === a.id) ? { ...a, lastFired: today } : a)),
      )
    }

    const dueReminders = reminders.filter((r) => !r.done && r.at <= now)
    if (dueReminders.length > 0) {
      dueReminders.forEach((r) => {
        notify('Reminder', r.text)
        beep()
      })
      setReminders((prev) =>
        prev.map((r) => (dueReminders.some((x) => x.id === r.id) ? { ...r, done: true } : r)),
      )
    }
  }, [now, alarms, reminders, setAlarms, setReminders])

  const startTimer = () => {
    if (remaining > 0 && !doneRef.current && endRef.current > now) {
      endRef.current = now + remaining
    } else {
      const total = (Number(minutes) || 0) * 60 + (Number(seconds) || 0)
      if (total <= 0) return
      endRef.current = Date.now() + total * 1000
      setRemaining(total * 1000)
      doneRef.current = false
    }
    setRunning(true)
  }

  const pauseTimer = () => {
    setRemaining(Math.max(0, endRef.current - Date.now()))
    setRunning(false)
  }

  const resetTimer = () => {
    setRunning(false)
    setRemaining(0)
    doneRef.current = false
  }

  const displayTimer = running || remaining > 0 ? remaining : (Number(minutes) || 0) * 60000 + (Number(seconds) || 0) * 1000

  const addAlarm = () => {
    if (!alarmTime) return
    setAlarms((prev) => [
      ...prev,
      { id: Date.now(), time: alarmTime, label: alarmLabel.trim(), lastFired: null },
    ])
    setAlarmLabel('')
  }

  const addReminder = () => {
    const text = reminderText.trim()
    if (!text) return
    const mins = Number(reminderMins) || 0
    setReminders((prev) => [
      ...prev,
      { id: Date.now(), text, at: Date.now() + mins * 60000, done: false },
    ])
    setReminderText('')
  }

  return (
    <div className="app">
      <div className="tabs-strip">
        {VIEWS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`seg ${view === id ? 'seg--on' : ''}`}
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="app-pad app-scroll">
        {view === 'timer' && (
          <div className="stack">
            <div className="digital">{formatClock(displayTimer)}</div>
            <div className="app-row app-row--center">
              <label className="field">
                <span>min</span>
                <input
                  className="app-input app-input--num"
                  type="number"
                  min="0"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  disabled={running}
                />
              </label>
              <label className="field">
                <span>sec</span>
                <input
                  className="app-input app-input--num"
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value)}
                  disabled={running}
                />
              </label>
            </div>
            <div className="app-row app-row--center">
              {running ? (
                <button type="button" className="app-btn app-btn--primary" onClick={pauseTimer}>
                  Pause
                </button>
              ) : (
                <button type="button" className="app-btn app-btn--primary" onClick={startTimer}>
                  Start
                </button>
              )}
              <button type="button" className="app-btn" onClick={resetTimer}>
                Reset
              </button>
            </div>
            <div className="app-row app-row--center">
              {[1, 5, 10, 25].map((m) => (
                <button
                  key={m}
                  type="button"
                  className="chip"
                  onClick={() => {
                    setMinutes(String(m))
                    setSeconds('0')
                    resetTimer()
                  }}
                >
                  {m}m
                </button>
              ))}
            </div>
            <p className="app-muted">You will get a browser notification when it ends.</p>
          </div>
        )}

        {view === 'stopwatch' && (
          <div className="stack">
            <div className="digital">{formatClock(elapsed)}</div>
            <div className="app-row app-row--center">
              {swRunning ? (
                <button type="button" className="app-btn app-btn--primary" onClick={() => setSwRunning(false)}>
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  className="app-btn app-btn--primary"
                  onClick={() => {
                    swStart.current = Date.now() - elapsed
                    setSwRunning(true)
                  }}
                >
                  Start
                </button>
              )}
              <button
                type="button"
                className="app-btn"
                disabled={!swRunning}
                onClick={() => setLaps((p) => [{ id: Date.now(), at: elapsed }, ...p])}
              >
                Lap
              </button>
              <button
                type="button"
                className="app-btn"
                onClick={() => {
                  setSwRunning(false)
                  setElapsed(0)
                  setLaps([])
                }}
              >
                Reset
              </button>
            </div>
            {laps.length > 0 && (
              <ul className="lap-list">
                {laps.map((l, i) => (
                  <li key={l.id}>
                    <span className="app-muted">Lap {laps.length - i}</span>
                    <span>{formatClock(l.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {view === 'alarm' && (
          <div className="stack">
            <div className="app-row">
              <input
                className="app-input"
                type="time"
                value={alarmTime}
                onChange={(e) => setAlarmTime(e.target.value)}
              />
              <input
                className="app-input"
                placeholder="Label (optional)"
                value={alarmLabel}
                onChange={(e) => setAlarmLabel(e.target.value)}
              />
              <button type="button" className="app-btn app-btn--primary" onClick={addAlarm}>
                Set
              </button>
            </div>
            {alarms.length === 0 && <p className="app-empty">No alarms set.</p>}
            <ul className="list">
              {alarms.map((a) => (
                <li key={a.id} className="list-item">
                  <span className="mono">{a.time}</span>
                  <span className="app-muted">{a.label || 'Alarm'}</span>
                  <button
                    type="button"
                    className="app-icon-btn"
                    onClick={() => setAlarms((prev) => prev.filter((x) => x.id !== a.id))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {view === 'reminders' && (
          <div className="stack">
            <div className="app-row">
              <input
                className="app-input"
                placeholder="Remind me to…"
                value={reminderText}
                onChange={(e) => setReminderText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addReminder()
                }}
              />
              <input
                className="app-input app-input--num"
                type="number"
                min="1"
                value={reminderMins}
                onChange={(e) => setReminderMins(e.target.value)}
              />
              <span className="app-muted">min</span>
              <button type="button" className="app-btn app-btn--primary" onClick={addReminder}>
                Add
              </button>
            </div>
            {reminders.length === 0 && <p className="app-empty">No reminders. Try “remind me in 10 minutes to stretch”.</p>}
            <ul className="list">
              {reminders.map((r) => (
                <li key={r.id} className={`list-item ${r.done ? 'list-item--done' : ''}`}>
                  <span>{r.text}</span>
                  <span className="app-muted">
                    {r.done ? 'done' : `in ${formatClock(Math.max(0, r.at - now))}`} · {formatTimestamp(r.at)}
                  </span>
                  <button
                    type="button"
                    className="app-icon-btn"
                    onClick={() => setReminders((prev) => prev.filter((x) => x.id !== r.id))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
