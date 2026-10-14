import { useMemo, useState } from 'react'

const CATEGORIES = {
  length: { label: 'Length', base: 'm', units: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254, nmi: 1852 } },
  mass: { label: 'Mass', base: 'kg', units: { kg: 1, g: 0.001, mg: 1e-6, lb: 0.45359237, oz: 0.028349523125, t: 1000, st: 6.35029318 } },
  volume: { label: 'Volume', base: 'L', units: { L: 1, mL: 0.001, gal: 3.785411784, qt: 0.946352946, pt: 0.473176473, cup: 0.2365882365, floz: 0.0295735296, m3: 1000 } },
  area: { label: 'Area', base: 'm2', units: { m2: 1, km2: 1e6, cm2: 1e-4, ha: 10000, acre: 4046.8564224, ft2: 0.09290304, in2: 0.00064516, mi2: 2589988.110336 } },
  speed: { label: 'Speed', base: 'm/s', units: { 'm/s': 1, 'km/h': 0.2777777778, mph: 0.44704, knot: 0.5144444444, 'ft/s': 0.3048 } },
  time: { label: 'Time', base: 's', units: { s: 1, ms: 0.001, min: 60, h: 3600, day: 86400, week: 604800 } },
  data: { label: 'Data', base: 'MB', units: { bit: 1.25e-7, B: 1e-6, KB: 0.001, MB: 1, GB: 1000, TB: 1e6 } },
  currency: { label: 'Currency (offline, approx.)', base: 'USD', units: { USD: 1, EUR: 0.92, GBP: 0.79, NGN: 1550, JPY: 156, CAD: 1.36, AUD: 1.52, INR: 83.3, ZAR: 18.4, CNY: 7.24 } },
}

const TEMP_UNITS = ['C', 'F', 'K']

function findUnit(token) {
  const t = String(token).trim()
  if (!t) return null
  for (const [cat, c] of Object.entries(CATEGORIES)) {
    if (Object.prototype.hasOwnProperty.call(c.units, t)) return { cat, unit: t }
  }
  const lower = t.toLowerCase()
  if (['c', 'celsius', '°c'].includes(lower)) return { cat: 'temperature', unit: 'C' }
  if (['f', 'fahrenheit', '°f'].includes(lower)) return { cat: 'temperature', unit: 'F' }
  if (['k', 'kelvin'].includes(lower)) return { cat: 'temperature', unit: 'K' }
  for (const [cat, c] of Object.entries(CATEGORIES)) {
    const key = Object.keys(c.units).find((u) => u.toLowerCase() === lower)
    if (key) return { cat, unit: key }
  }
  return null
}

function convertTemp(value, from, to) {
  let celsius = value
  if (from === 'F') celsius = (value - 32) * (5 / 9)
  else if (from === 'K') celsius = value - 273.15
  if (to === 'F') return celsius * (9 / 5) + 32
  if (to === 'K') return celsius + 273.15
  return celsius
}

function convert(value, from, to) {
  const f = findUnit(from)
  const t = findUnit(to)
  if (!f) return { error: `Unknown unit: ${from}` }
  if (!t) return { error: `Unknown unit: ${to}` }
  if (f.cat !== t.cat) return { error: `Cannot convert ${f.cat} to ${t.cat}` }
  if (f.cat === 'temperature') return { value: convertTemp(value, f.unit, t.unit) }
  const c = CATEGORIES[f.cat]
  return { value: (value * c.units[f.unit]) / c.units[t.unit] }
}

function parseQuery(query) {
  if (!query) return null
  const m = String(query).match(/(-?\d+(?:\.\d+)?)\s*°?\s*([a-zA-Z°][a-zA-Z0-9/^³²]*)\s*(?:to|in|->|=>)\s*°?\s*([a-zA-Z°][a-zA-Z0-9/^³²]*)/i)
  if (!m) return null
  return { value: m[1], from: m[2], to: m[3] }
}

function fmt(n) {
  if (!Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e15)) return n.toExponential(6)
  return String(Math.round(n * 1e8) / 1e8)
}

export default function ConvertApp({ params = {} }) {
  const preset = useMemo(() => parseQuery(params.query), [params.query])
  const [value, setValue] = useState(preset?.value ?? '1')
  const [from, setFrom] = useState(() => {
    const f = findUnit(preset?.from) || findUnit('m')
    return f ? f.unit : 'm'
  })
  const [to, setTo] = useState(() => {
    const t = findUnit(preset?.to) || findUnit('ft')
    return t ? t.unit : 'ft'
  })

  const fromInfo = findUnit(from)
  const toInfo = findUnit(to)
  const result = convert(Number(value) || 0, from, to)

  const changeFrom = (unit) => {
    setFrom(unit)
    const info = findUnit(unit)
    if (info && toInfo && info.cat !== toInfo.cat) {
      setTo(info.cat === 'temperature' ? 'F' : CATEGORIES[info.cat].base)
    }
  }

  const swap = () => {
    setFrom(to)
    setTo(from)
  }

  const unitOptions = (
    <>
      <optgroup label="Temperature">
        {TEMP_UNITS.map((u) => (
          <option key={u} value={u}>{u}</option>
        ))}
      </optgroup>
      {Object.entries(CATEGORIES).map(([cat, c]) => (
        <optgroup key={cat} label={c.label}>
          {Object.keys(c.units).map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </optgroup>
      ))}
    </>
  )

  return (
    <div className="app app--pad">
      <div className="convert-grid">
        <input
          className="app-input app-input--big"
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <select className="app-input" value={from} onChange={(e) => changeFrom(e.target.value)}>
          {unitOptions}
        </select>
      </div>

      <div className="app-row app-row--center">
        <button type="button" className="app-btn" onClick={swap} title="Swap units">
          ⇅ swap
        </button>
      </div>

      <div className="convert-grid">
        <output className="convert-out">{result.error ? 'error' : fmt(result.value)}</output>
        <select className="app-input" value={to} onChange={(e) => setTo(e.target.value)}>
          {unitOptions}
        </select>
      </div>

      {result.error ? (
        <p className="app-muted error">{result.error}</p>
      ) : (
        <p className="app-muted">
          {value} {from} = {fmt(result.value)} {to}
        </p>
      )}

      {fromInfo?.cat === 'currency' && (
        <p className="app-muted">Currency rates are offline approximations — not live market data.</p>
      )}
      <p className="app-muted">Tip: type <code>convert 10kg to lb</code> at the prompt.</p>
    </div>
  )
}
