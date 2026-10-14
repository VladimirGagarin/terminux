import { useRef, useState } from 'react'

export default function Window({ win, def, onClose, onFocus, onMinimize, onMaximize, onMove, onResize, children }) {
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef(null)

  const startDrag = (e) => {
    if (e.button !== 0) return
    if (e.target.closest('.win-btn')) return
    const layer = e.currentTarget.closest('.windows-layer')
    const bounds = layer?.getBoundingClientRect() ?? { width: window.innerWidth, height: window.innerHeight }
    dragRef.current = { dx: e.clientX - win.x, dy: e.clientY - win.y, bounds }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    onFocus(win.id)
  }

  const onDragMove = (e) => {
    const d = dragRef.current
    if (!d) return
    const x = Math.min(Math.max(0, e.clientX - d.dx), Math.max(0, d.bounds.width - 120))
    const y = Math.min(Math.max(0, e.clientY - d.dy), Math.max(0, d.bounds.height - 40))
    onMove(win.id, x, y)
  }

  const endDrag = () => {
    dragRef.current = null
    setDragging(false)
  }

  const startResize = (e) => {
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const { w, h } = win
    const onMoveResize = (ev) => {
      onResize(win.id, Math.max(300, w + ev.clientX - startX), Math.max(220, h + ev.clientY - startY))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMoveResize)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMoveResize)
    window.addEventListener('pointerup', onUp)
    onFocus(win.id)
  }

  const style = win.maximized
    ? { left: 0, top: 0, width: '100%', height: '100%', zIndex: win.z }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z }

  return (
    <section
      className={`win ${win.maximized ? 'win--max' : ''} ${dragging ? 'win--dragging' : ''}`}
      style={style}
      onPointerDown={() => onFocus(win.id)}
    >
      <header
        className="win-head"
        onPointerDown={startDrag}
        onPointerMove={onDragMove}
        onPointerUp={endDrag}
        onDoubleClick={() => onMaximize(win.id)}
      >
        <span className="win-icon" aria-hidden="true">{def.icon}</span>
        <span className="win-title">{win.title}</span>
        <span className="win-controls">
          <button type="button" className="win-btn" title="Minimize" onClick={() => onMinimize(win.id)}>
            –
          </button>
          <button
            type="button"
            className="win-btn"
            title={win.maximized ? 'Restore' : 'Maximize'}
            onClick={() => onMaximize(win.id)}
          >
            {win.maximized ? '❐' : '▢'}
          </button>
          <button type="button" className="win-btn win-btn--close" title="Close" onClick={() => onClose(win.id)}>
            ×
          </button>
        </span>
      </header>
      <div className="win-body">{children}</div>
      {!win.maximized && <span className="win-resize" onPointerDown={startResize} />}
    </section>
  )
}
