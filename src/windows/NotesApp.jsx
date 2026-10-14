import { useState } from 'react'
import { usePersistentState } from './storage'
import { copyText, formatTimestamp } from './ui'

const COLORS = ['#f6e58d', '#a5e6ba', '#a9d6f5', '#f7b3c2', '#d8c2f0']

export default function NotesApp({ files }) {
  const [notes, setNotes] = usePersistentState('terminux.notes', [])
  const [saved, setSaved] = useState('')

  const addNote = () => {
    setNotes((prev) => [
      { id: Date.now(), text: '', color: COLORS[prev.length % COLORS.length], at: Date.now() },
      ...prev,
    ])
  }

  const update = (id, patch) => setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)))
  const remove = (id) => setNotes((prev) => prev.filter((n) => n.id !== id))

  const saveToFile = () => {
    const body = notes
      .map((n) => `## ${formatTimestamp(n.at)}\n\n${n.text || '(empty)'}\n`)
      .join('\n')
    files.write('notes.md', `# Notes\n\n${body}`)
    setSaved('Saved to notes.md')
    setTimeout(() => setSaved(''), 1800)
  }

  const copyAll = async () => {
    const body = notes.map((n) => `${formatTimestamp(n.at)}\n${n.text}`).join('\n\n---\n\n')
    if (await copyText(body)) {
      setSaved('Copied all notes')
      setTimeout(() => setSaved(''), 1800)
    }
  }

  return (
    <div className="app app--pad">
      <div className="app-row app-row--between">
        <span className="app-muted">{notes.length} note{notes.length === 1 ? '' : 's'}</span>
        <div className="app-row">
          <button type="button" className="app-btn" onClick={copyAll} disabled={!notes.length}>
            Copy all
          </button>
          <button type="button" className="app-btn app-btn--primary" onClick={addNote}>
            New note
          </button>
        </div>
      </div>

      <div className="app-scroll">
        {notes.length === 0 && <p className="app-empty">No notes yet — hit “New note”.</p>}
        <div className="notes-grid">
          {notes.map((n) => (
            <div key={n.id} className="note" style={{ background: n.color }}>
              <textarea
                className="note-text"
                placeholder="Write something…"
                value={n.text}
                onChange={(e) => update(n.id, { text: e.target.value })}
              />
              <div className="note-foot">
                <small>{formatTimestamp(n.at)}</small>
                <div className="app-row">
                  <button
                    type="button"
                    className="note-btn"
                    title="Change color"
                    onClick={() =>
                      update(n.id, { color: COLORS[(COLORS.indexOf(n.color) + 1) % COLORS.length] })
                    }
                  >
                    ●
                  </button>
                  <button type="button" className="note-btn" title="Delete" onClick={() => remove(n.id)}>
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="app-footer">
        <button type="button" className="app-btn" onClick={saveToFile} disabled={!notes.length}>
          Save notes.md
        </button>
        <span className="app-muted app-saved">{saved}</span>
      </div>
    </div>
  )
}
