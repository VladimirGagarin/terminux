import { useEffect, useRef, useState } from 'react'

const COLORS = ['#8be9fd', '#50fa7b', '#f1fa8c', '#ff5555', '#ff79c6', '#bd93f9', '#f8f8f2', '#0b0e14']

export default function DrawApp() {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const last = useRef(null)
  const [color, setColor] = useState('#8be9fd')
  const [size, setSize] = useState(4)
  const [eraser, setEraser] = useState(false)

  const colorRef = useRef(color)
  const sizeRef = useRef(size)
  const eraserRef = useRef(eraser)

  useEffect(() => {
    colorRef.current = color
  }, [color])
  useEffect(() => {
    sizeRef.current = size
  }, [size])
  useEffect(() => {
    eraserRef.current = eraser
  }, [eraser])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#0b0e14'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
  }, [])

  const pointFromEvent = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const begin = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    last.current = pointFromEvent(e)
    drawSegment(last.current, last.current)
  }

  const drawSegment = (from, to) => {
    const ctx = canvasRef.current.getContext('2d')
    ctx.strokeStyle = eraserRef.current ? '#0b0e14' : colorRef.current
    ctx.lineWidth = sizeRef.current
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }

  const move = (e) => {
    if (!drawing.current) return
    const p = pointFromEvent(e)
    drawSegment(last.current, p)
    last.current = p
  }

  const end = () => {
    drawing.current = false
    last.current = null
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#0b0e14'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const download = () => {
    const canvas = canvasRef.current
    const link = document.createElement('a')
    link.download = `terminux-draw-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="app app--pad">
      <div className="app-row app-row--wrap">
        <div className="swatches">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`swatch ${color === c && !eraser ? 'swatch--on' : ''}`}
              style={{ background: c }}
              title={c}
              onClick={() => {
                setColor(c)
                setEraser(false)
              }}
            />
          ))}
        </div>
        <label className="field">
          <span>size {size}</span>
          <input type="range" min="1" max="40" value={size} onChange={(e) => setSize(Number(e.target.value))} />
        </label>
        <button
          type="button"
          className={`app-btn ${eraser ? 'app-btn--primary' : ''}`}
          onClick={() => setEraser((v) => !v)}
        >
          Eraser
        </button>
      </div>

      <canvas
        ref={canvasRef}
        className="draw-canvas"
        width={640}
        height={400}
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />

      <div className="app-footer">
        <button type="button" className="app-btn" onClick={clear}>Clear</button>
        <button type="button" className="app-btn app-btn--primary" onClick={download}>Download PNG</button>
      </div>
    </div>
  )
}
