import { useState } from 'react'
import { copyText } from './ui'

const DICE = [4, 6, 8, 10, 12, 20, 100]

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

function makePassword(len, opts) {
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const digits = '0123456789'
  const symbols = '!@#$%^&*()-_=+[]{};:,.?'
  let pool = ''
  if (opts.lower) pool += lower
  if (opts.upper) pool += upper
  if (opts.digits) pool += digits
  if (opts.symbols) pool += symbols
  if (!pool) return ''
  const bytes = new Uint32Array(len)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => pool[b % pool.length]).join('')
}

export default function RandomApp() {
  const [sides, setSides] = useState(6)
  const [roll, setRoll] = useState(null)
  const [coin, setCoin] = useState(null)
  const [coinFlips, setCoinFlips] = useState({ heads: 0, tails: 0 })
  const [min, setMin] = useState('1')
  const [max, setMax] = useState('100')
  const [numbers, setNumbers] = useState([])
  const [length, setLength] = useState(16)
  const [opts, setOpts] = useState({ lower: true, upper: true, digits: true, symbols: false })
  const [password, setPassword] = useState('')
  const [flash, setFlash] = useState('')

  const copied = async (text) => {
    if (await copyText(text)) {
      setFlash('Copied!')
      setTimeout(() => setFlash(''), 1200)
    }
  }

  const flipCoin = () => {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails'
    setCoin(result)
    setCoinFlips((p) => ({ ...p, [result.toLowerCase()]: p[result.toLowerCase()] + 1 }))
  }

  const genNumbers = () => {
    const lo = Number(min)
    const hi = Number(max)
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) {
      setNumbers(['invalid range'])
      return
    }
    const amount = Math.min(20, Math.max(1, Math.floor(hi - lo) + 1))
    setNumbers(Array.from({ length: Math.min(8, amount) }, () => rand(lo, hi)))
  }

  const strength = (() => {
    let s = 0
    if (opts.lower) s += 26
    if (opts.upper) s += 26
    if (opts.digits) s += 10
    if (opts.symbols) s += 23
    const bits = s > 0 ? Math.round(length * Math.log2(s)) : 0
    if (bits >= 120) return ['Very strong', 'ok']
    if (bits >= 80) return ['Strong', 'ok']
    if (bits >= 50) return ['Fair', 'warn']
    return ['Weak', 'bad']
  })()

  return (
    <div className="app app--pad app-scroll">
      <section className="tool-card">
        <h3>Dice</h3>
        <div className="app-row">
          <select className="app-input" value={sides} onChange={(e) => setSides(Number(e.target.value))}>
            {DICE.map((d) => (
              <option key={d} value={d}>d{d}</option>
            ))}
          </select>
          <button type="button" className="app-btn app-btn--primary" onClick={() => setRoll(rand(1, sides))}>
            Roll
          </button>
          <span className="result-chip">{roll ?? '—'}</span>
        </div>
      </section>

      <section className="tool-card">
        <h3>Coin flip</h3>
        <div className="app-row">
          <button type="button" className="app-btn app-btn--primary" onClick={flipCoin}>
            Flip
          </button>
          <span className="result-chip">{coin ?? '—'}</span>
          <span className="app-muted">H {coinFlips.heads} · T {coinFlips.tails}</span>
        </div>
      </section>

      <section className="tool-card">
        <h3>Random number</h3>
        <div className="app-row">
          <input className="app-input app-input--num" value={min} onChange={(e) => setMin(e.target.value)} />
          <span className="app-muted">to</span>
          <input className="app-input app-input--num" value={max} onChange={(e) => setMax(e.target.value)} />
          <button type="button" className="app-btn app-btn--primary" onClick={genNumbers}>
            Generate
          </button>
        </div>
        {numbers.length > 0 && (
          <div className="chip-row">
            {numbers.map((n, i) => (
              <span key={i} className="result-chip">{n}</span>
            ))}
          </div>
        )}
      </section>

      <section className="tool-card">
        <h3>Password</h3>
        <div className="app-row app-row--wrap">
          {['lower', 'upper', 'digits', 'symbols'].map((k) => (
            <label key={k} className="check-line">
              <input
                type="checkbox"
                checked={opts[k]}
                onChange={(e) => setOpts((p) => ({ ...p, [k]: e.target.checked }))}
              />
              {k}
            </label>
          ))}
        </div>
        <div className="app-row">
          <label className="field">
            <span>length {length}</span>
            <input
              type="range"
              min="6"
              max="48"
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
            />
          </label>
        </div>
        <div className="app-row">
          <input className="app-input" readOnly value={password} placeholder="(generate one)" />
          <button type="button" className="app-btn app-btn--primary" onClick={() => setPassword(makePassword(length, opts))}>
            Generate
          </button>
          <button type="button" className="app-btn" disabled={!password} onClick={() => copied(password)}>
            Copy
          </button>
        </div>
        {password && <p className={`app-muted strength-${strength[1]}`}>{strength[0]}</p>}
      </section>

      {flash && <div className="app-flash">{flash}</div>}
    </div>
  )
}
