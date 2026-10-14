import { useEffect, useState } from 'react'
import { copyText } from './ui'

const VIEWS = [
  ['uuid', 'UUID'],
  ['hash', 'Hash'],
  ['base64', 'Base64'],
  ['json', 'JSON'],
]

function uuidv4() {
  if (crypto.randomUUID) return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const hex = [...b].map((x) => x.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`
}

async function digest(algo, text) {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest(algo, data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function b64encode(text) {
  try {
    const bytes = new TextEncoder().encode(text)
    let bin = ''
    bytes.forEach((b) => {
      bin += String.fromCharCode(b)
    })
    return btoa(bin)
  } catch {
    return '(invalid)'
  }
}

function b64decode(text) {
  try {
    const bin = atob(text.trim())
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return '(invalid base64)'
  }
}

export default function DevToolsApp({ params = {} }) {
  const [view, setView] = useState(params.view || 'uuid')
  const [flash, setFlash] = useState('')

  const [count, setCount] = useState(5)
  const [uuids, setUuids] = useState([])

  const [hashText, setHashText] = useState(params.text || '')
  const [hashes, setHashes] = useState({})

  const [b64Text, setB64Text] = useState(params.text || '')
  const [b64DecodeInput, setB64DecodeInput] = useState('')

  const [jsonText, setJsonText] = useState(params.text || '')
  const [jsonStatus, setJsonStatus] = useState('')

  const [lastView, setLastView] = useState(params.view)
  if (params.view && params.view !== lastView) {
    setLastView(params.view)
    setView(params.view)
  }

  const [lastText, setLastText] = useState(params.text || '')
  if (params.text && params.text !== lastText) {
    setLastText(params.text)
    setHashText(params.text)
    setB64Text(params.text)
    setJsonText(params.text)
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([digest('SHA-256', hashText), digest('SHA-1', hashText)]).then(([sha256, sha1]) => {
      if (!cancelled) setHashes({ sha256, sha1 })
    })
    return () => {
      cancelled = true
    }
  }, [hashText])

  const flashCopy = async (text) => {
    if (await copyText(text)) {
      setFlash('Copied!')
      setTimeout(() => setFlash(''), 1200)
    }
  }

  const formatJson = (minify) => {
    try {
      const parsed = JSON.parse(jsonText)
      setJsonText(minify ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2))
      setJsonStatus('Valid JSON ✓')
    } catch (err) {
      setJsonStatus(`Invalid: ${err.message}`)
    }
  }

  return (
    <div className="app">
      <div className="tabs-strip">
        {VIEWS.map(([id, label]) => (
          <button key={id} type="button" className={`seg ${view === id ? 'seg--on' : ''}`} onClick={() => setView(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="app-pad app-scroll">
        {view === 'uuid' && (
          <div className="stack">
            <div className="app-row">
              <label className="field">
                <span>count</span>
                <input
                  className="app-input app-input--num"
                  type="number"
                  min="1"
                  max="50"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="app-btn app-btn--primary"
                onClick={() => setUuids(Array.from({ length: Math.min(50, Number(count) || 1) }, uuidv4))}
              >
                Generate
              </button>
              <button type="button" className="app-btn" disabled={!uuids.length} onClick={() => flashCopy(uuids.join('\n'))}>
                Copy all
              </button>
            </div>
            <ul className="list mono-list">
              {uuids.map((u, i) => (
                <li key={i} className="list-item">
                  <span className="mono">{u}</span>
                  <button type="button" className="app-icon-btn" title="Copy" onClick={() => flashCopy(u)}>
                    ⧉
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {view === 'hash' && (
          <div className="stack">
            <textarea
              className="app-input app-textarea"
              placeholder="Text to hash…"
              value={hashText}
              onChange={(e) => setHashText(e.target.value)}
            />
            {hashText && hashes.sha256 && (
              <>
                <div className="hash-row">
                  <span className="app-muted">SHA-256</span>
                  <code className="hash-val">{hashes.sha256}</code>
                  <button type="button" className="app-icon-btn" onClick={() => flashCopy(hashes.sha256)}>⧉</button>
                </div>
                <div className="hash-row">
                  <span className="app-muted">SHA-1</span>
                  <code className="hash-val">{hashes.sha1}</code>
                  <button type="button" className="app-icon-btn" onClick={() => flashCopy(hashes.sha1)}>⧉</button>
                </div>
              </>
            )}
          </div>
        )}

        {view === 'base64' && (
          <div className="stack">
            <label className="field-col">
              <span>Plain text</span>
              <textarea className="app-input app-textarea" value={b64Text} onChange={(e) => setB64Text(e.target.value)} />
            </label>
            <div className="app-row">
              <button type="button" className="app-btn app-btn--primary" onClick={() => flashCopy(b64encode(b64Text))}>
                Encode → Base64 (copy)
              </button>
            </div>
            <div className="b64-out mono">{b64encode(b64Text)}</div>
            <label className="field-col">
              <span>Base64</span>
              <textarea
                className="app-input app-textarea"
                value={b64DecodeInput}
                onChange={(e) => setB64DecodeInput(e.target.value)}
              />
            </label>
            <div className="app-row">
              <button type="button" className="app-btn app-btn--primary" onClick={() => flashCopy(b64decode(b64DecodeInput))}>
                Decode → Text (copy)
              </button>
            </div>
            <div className="b64-out mono">{b64decode(b64DecodeInput)}</div>
          </div>
        )}

        {view === 'json' && (
          <div className="stack">
            <textarea
              className="app-input app-textarea app-textarea--tall"
              placeholder='{"hello":"world"}'
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
            <div className="app-row">
              <button type="button" className="app-btn app-btn--primary" onClick={() => formatJson(false)}>
                Format
              </button>
              <button type="button" className="app-btn" onClick={() => formatJson(true)}>
                Minify
              </button>
              <button
                type="button"
                className="app-btn"
                onClick={() => {
                  try {
                    JSON.parse(jsonText)
                    setJsonStatus('Valid JSON ✓')
                  } catch (err) {
                    setJsonStatus(`Invalid: ${err.message}`)
                  }
                }}
              >
                Validate
              </button>
              <button type="button" className="app-btn" disabled={!jsonText} onClick={() => flashCopy(jsonText)}>
                Copy
              </button>
            </div>
            {jsonStatus && <p className={`app-muted ${jsonStatus.startsWith('Invalid') ? 'error' : ''}`}>{jsonStatus}</p>}
          </div>
        )}
      </div>

      {flash && <div className="app-flash">{flash}</div>}
    </div>
  )
}
