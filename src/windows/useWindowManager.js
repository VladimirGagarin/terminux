import { useCallback, useRef, useState } from 'react'
import { APPS } from './apps'

const DEFAULT_SIZE = { w: 460, h: 500 }

export function useWindowManager() {
  const [windows, setWindows] = useState([])
  const zRef = useRef(1)
  const idRef = useRef(1)

  const openApp = useCallback((appId, params = {}) => {
    const def = APPS[appId]
    if (!def) return
    setWindows((prev) => {
      const existing = prev.find((w) => w.appId === appId)
      const z = zRef.current++
      if (existing) {
        return prev.map((w) =>
          w.id === existing.id
            ? { ...w, z, minimized: false, params: { ...w.params, ...params } }
            : w,
        )
      }
      const id = idRef.current++
      const base = def.size ?? DEFAULT_SIZE
      const n = prev.length
      return [
        ...prev,
        {
          id,
          appId,
          title: def.title,
          x: 84 + (n % 7) * 28,
          y: 44 + (n % 7) * 24,
          w: base.w,
          h: base.h,
          z,
          minimized: false,
          maximized: false,
          params,
        },
      ]
    })
  }, [])

  const close = useCallback((id) => setWindows((prev) => prev.filter((w) => w.id !== id)), [])

  const focus = useCallback((id) => {
    setWindows((prev) => {
      if (!prev.some((w) => w.id === id)) return prev
      const z = zRef.current++
      return prev.map((w) => (w.id === id ? { ...w, z, minimized: false } : w))
    })
  }, [])

  const minimize = useCallback((id) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: true } : w)))
  }, [])

  const toggleMaximize = useCallback((id) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, maximized: !w.maximized, minimized: false } : w,
      ),
    )
  }, [])

  const move = useCallback((id, x, y) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, x, y } : w)))
  }, [])

  const resize = useCallback((id, w, h) => {
    setWindows((prev) => prev.map((win) => (win.id === id ? { ...win, w, h } : win)))
  }, [])

  const setParams = useCallback((id, patch) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, params: { ...w.params, ...patch } } : w)),
    )
  }, [])

  const closeAll = useCallback(() => setWindows([]), [])

  return {
    windows,
    openApp,
    close,
    focus,
    minimize,
    toggleMaximize,
    move,
    resize,
    setParams,
    closeAll,
  }
}
