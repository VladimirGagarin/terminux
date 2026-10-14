import { useState } from 'react'
import { usePersistentState } from './storage'
import { copyText, formatTimestamp } from './ui'

const FILTERS = [
  ['all', 'All'],
  ['open', 'Active'],
  ['done', 'Done'],
]

export default function TodoApp({ files }) {
  const [todos, setTodos] = usePersistentState('terminux.todo', [])
  const [text, setText] = useState('')
  const [filter, setFilter] = useState('all')
  const [saved, setSaved] = useState('')

  const add = () => {
    const value = text.trim()
    if (!value) return
    setTodos((prev) => [{ id: Date.now(), text: value, done: false, at: Date.now() }, ...prev])
    setText('')
  }

  const toggle = (id) => setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  const remove = (id) => setTodos((prev) => prev.filter((t) => t.id !== id))
  const clearDone = () => setTodos((prev) => prev.filter((t) => !t.done))

  const asMarkdown = () =>
    todos.map((t) => `- [${t.done ? 'x' : ' '}] ${t.text}`).join('\n')

  const saveToFile = () => {
    files.write('todo.md', `# Todo\n\n${asMarkdown()}\n`)
    setSaved('Saved to todo.md')
    setTimeout(() => setSaved(''), 1800)
  }

  const copy = async () => {
    if (await copyText(asMarkdown())) {
      setSaved('Copied to clipboard')
      setTimeout(() => setSaved(''), 1800)
    }
  }

  const shown = todos.filter(
    (t) => filter === 'all' || (filter === 'open' && !t.done) || (filter === 'done' && t.done),
  )
  const open = todos.filter((t) => !t.done).length

  return (
    <div className="app app--pad">
      <div className="app-row">
        <input
          className="app-input"
          placeholder="What needs doing?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
          }}
        />
        <button type="button" className="app-btn app-btn--primary" onClick={add}>
          Add
        </button>
      </div>

      <div className="app-row app-row--between">
        <div className="segmented">
          {FILTERS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`seg ${filter === id ? 'seg--on' : ''}`}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="app-muted">{open} left</span>
      </div>

      <div className="app-scroll">
        {shown.length === 0 && <p className="app-empty">Nothing here yet.</p>}
        <ul className="todo-list">
          {shown.map((t) => (
            <li key={t.id} className={`todo-item ${t.done ? 'todo-item--done' : ''}`}>
              <button
                type="button"
                className={`check ${t.done ? 'check--on' : ''}`}
                aria-label={t.done ? 'Mark active' : 'Mark done'}
                onClick={() => toggle(t.id)}
              >
                {t.done ? '✓' : ''}
              </button>
              <div className="todo-text">
                <span>{t.text}</span>
                <small>{formatTimestamp(t.at)}</small>
              </div>
              <button type="button" className="app-icon-btn" title="Delete" onClick={() => remove(t.id)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="app-footer">
        <button type="button" className="app-btn" onClick={saveToFile}>
          Save todo.md
        </button>
        <button type="button" className="app-btn" onClick={copy}>
          Copy
        </button>
        <button type="button" className="app-btn" onClick={clearDone} disabled={!todos.some((t) => t.done)}>
          Clear done
        </button>
        <span className="app-muted app-saved">{saved}</span>
      </div>
    </div>
  )
}
