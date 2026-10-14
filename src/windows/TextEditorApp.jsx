import { useRef, useState } from 'react'
import { copyText } from './ui'

export default function TextEditorApp({ params = {}, files }) {
  const [path, setPath] = useState(params.path || '')
  const [content, setContent] = useState(() => (params.path ? files.read(params.path) ?? '' : ''))
  const [status, setStatus] = useState(() => (params.path ? `Loaded ${params.path}` : ''))
  const [flash, setFlash] = useState('')
  const areaRef = useRef(null)

  const [lastPath, setLastPath] = useState(params.path || '')
  if (params.path && params.path !== lastPath) {
    setLastPath(params.path)
    setPath(params.path)
    const found = files.read(params.path)
    setContent(found ?? '')
    setStatus(found === null ? `New file: ${params.path}` : `Loaded ${params.path}`)
  }

  const flashMsg = (msg) => {
    setStatus(msg)
    setTimeout(() => setStatus(''), 2000)
  }

  const openFile = (p) => {
    setPath(p)
    const found = files.read(p)
    setContent(found ?? '')
    setStatus(found === null ? `New file: ${p}` : `Loaded ${p}`)
  }

  const save = () => {
    if (!path) {
      flashMsg('Set a file name first (Save as…)')
      return
    }
    files.write(path, content)
    flashMsg(`Saved ${path}`)
  }

  const saveAs = () => {
    const name = window.prompt('Save as (path under home):', path || 'untitled.txt')
    if (!name) return
    files.write(name, content)
    setPath(name)
    flashMsg(`Saved ${name}`)
  }

  const apply = (wrapStart, wrapEnd = wrapStart) => {
    const el = areaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = content.slice(start, end)
    const next = content.slice(0, start) + wrapStart + selected + wrapEnd + content.slice(end)
    setContent(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + wrapStart.length, end + wrapStart.length)
    })
  }

  const insertLinePrefix = (prefix) => {
    const el = areaRef.current
    if (!el) return
    const start = el.selectionStart
    const lineStart = content.lastIndexOf('\n', start - 1) + 1
    const next = content.slice(0, lineStart) + prefix + content.slice(lineStart)
    setContent(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + prefix.length, start + prefix.length)
    })
  }

  const fileList = files.listAll()

  const words = content.split(/\s+/).filter(Boolean).length

  return (
    <div className="app app--pad">
      <div className="app-row app-row--wrap editor-toolbar">
        <input
          className="app-input"
          placeholder="filename e.g. draft.md"
          value={path}
          onChange={(e) => setPath(e.target.value)}
        />
        <button type="button" className="app-btn" onClick={save}>Save</button>
        <button type="button" className="app-btn" onClick={saveAs}>Save as…</button>
      </div>

      <div className="app-row app-row--wrap editor-toolbar">
        <button type="button" className="app-btn app-btn--sm" onClick={() => apply('**')}>B</button>
        <button type="button" className="app-btn app-btn--sm" onClick={() => apply('_')}>i</button>
        <button type="button" className="app-btn app-btn--sm" onClick={() => insertLinePrefix('# ')}>H1</button>
        <button type="button" className="app-btn app-btn--sm" onClick={() => insertLinePrefix('- ')}>list</button>
        <button type="button" className="app-btn app-btn--sm" onClick={() => apply('`')}>code</button>
        <button
          type="button"
          className="app-btn app-btn--sm"
          onClick={async () => {
            if (await copyText(content)) {
              setFlash('Copied!')
              setTimeout(() => setFlash(''), 1200)
            }
          }}
        >
          copy
        </button>
        <span className="app-spacer" />
        <span className="app-muted">{words} words · {content.length} chars</span>
      </div>

      <textarea
        ref={areaRef}
        className="app-input app-textarea editor-area"
        placeholder="Start typing… markdown-friendly toolbar above."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        spellCheck={false}
      />

      <div className="app-footer">
        {fileList.length > 0 ? (
          <select
            className="app-input"
            value=""
            onChange={(e) => {
              if (e.target.value) openFile(e.target.value)
            }}
          >
            <option value="">Open file…</option>
            {fileList.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        ) : (
          <span className="app-muted">No files found under ~</span>
        )}
        <span className="app-muted app-saved">{status}</span>
      </div>

      {flash && <div className="app-flash">{flash}</div>}
    </div>
  )
}
