import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Terminal from './Terminal'
import {
  loadFileSystem,
  persistFileSystem,
  getNode,
  resolvePath,
  collectFiles,
  writeFileDeep,
  removeFileDeep,
  MAX_TABS,
} from './shell'
import { useWindowManager } from './windows/useWindowManager'
import WindowsLayer from './windows/WindowsLayer'
import {
  getProgress,
  subscribe,
  recordTab,
  unlock,
  levelFromXp,
  unlockedCount,
  totalAchievements,
  resetProgress,
} from './progress'
import './App.css'

function useProgress() {
  const [progress, setProgress] = useState(getProgress)
  useEffect(() => subscribe(() => setProgress(getProgress())), [])
  return progress
}

export default function App() {
  const [fs] = useState(() => loadFileSystem())
  const manager = useWindowManager()
  const progress = useProgress()
  const [tabs, setTabs] = useState(() => [{ id: 1, title: progress.username }])
  const [activeId, setActiveId] = useState(1)
  const [renamingId, setRenamingId] = useState(null)
  const [panelVisible, setPanelVisible] = useState(false)
  const [toast, setToast] = useState('')
  const nextIdRef = useRef(2)
  const termRefs = useRef(new Map())
  const toastTimer = useRef(null)

  const files = useMemo(() => {
    const home = '/home/user'
    const abs = (p) => {
      if (!p) return home
      return p.startsWith('/') ? p : resolvePath(home, p)
    }
    return {
      home,
      resolve: abs,
      list: (dir = home) => {
        const node = getNode(fs, abs(dir))
        if (!node || node.type !== 'dir') return []
        const base = abs(dir)
        return Object.entries(node.children).map(([name, n]) => ({
          name,
          type: n.type,
          path: base === '/' ? `/${name}` : `${base}/${name}`,
        }))
      },
      listAll: () => collectFiles(fs, home),
      read: (p) => {
        const node = getNode(fs, abs(p))
        return node && node.type === 'file' ? node.content : null
      },
      write: (p, content) => {
        const ok = writeFileDeep(fs, abs(p), content)
        if (ok) persistFileSystem(fs)
        return ok
      },
      remove: (p) => {
        const ok = removeFileDeep(fs, abs(p))
        if (ok) persistFileSystem(fs)
        return ok
      },
    }
  }, [fs])

  const persistFs = useCallback(() => persistFileSystem(fs), [fs])

  const flashToast = useCallback((message) => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }, [])

  const announce = useCallback(
    (id) => {
      const def = unlock(id)
      if (def) flashToast(`★ Achievement unlocked: ${def.label}  (+${def.xp} XP)`)
    },
    [flashToast],
  )

  const togglePanel = useCallback(
    (action) => {
      setPanelVisible((prev) => {
        if (action === 'on' || action === 'show') return true
        if (action === 'off' || action === 'hide') return false
        return !prev
      })
      announce('panel')
    },
    [announce],
  )

  const addTab = useCallback(() => {
    if (tabs.length >= MAX_TABS) {
      flashToast(`Tab limit reached (${MAX_TABS})`)
      return
    }
    const id = nextIdRef.current++
    setTabs([...tabs, { id, title: progress.username }])
    setActiveId(id)
    recordTab()
    if (tabs.length + 1 >= 3) announce('multitasker')
    if (tabs.length + 1 >= MAX_TABS) announce('maxed')
  }, [tabs, flashToast, announce, progress.username])

  const closeTab = useCallback(
    (id) => {
      if (tabs.length <= 1) {
        flashToast('At least one tab must stay open')
        return
      }
      const idx = tabs.findIndex((t) => t.id === id)
      const next = tabs.filter((t) => t.id !== id)
      setTabs(next)
      termRefs.current.delete(id)
      if (activeId === id) setActiveId(next[Math.min(idx, next.length - 1)].id)
    },
    [tabs, activeId, flashToast],
  )

  const setTitle = useCallback((id, title) => {
    setTabs((prev) => {
      const tab = prev.find((t) => t.id === id)
      if (!tab || tab.title === title) return prev
      return prev.map((t) => (t.id === id ? { ...t, title } : t))
    })
  }, [])

  const hardReset = useCallback(() => {
    resetProgress()
    flashToast('Progress reset — the slate is clean')
  }, [flashToast])

  useEffect(() => {
    termRefs.current.get(activeId)?.focus()
  }, [activeId, tabs.length])

  useEffect(() => {
    const onWindowKeyDown = (e) => {
      if (!e.altKey) return
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        addTab()
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        closeTab(activeId)
      } else if (/^[1-9]$/.test(e.key)) {
        e.preventDefault()
        const target = tabs[Number(e.key) - 1]
        if (target) setActiveId(target.id)
      } else if (e.key === '0') {
        e.preventDefault()
        const target = tabs[9] ?? tabs[tabs.length - 1]
        if (target) setActiveId(target.id)
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        hardReset()
      }
    }
    window.addEventListener('keydown', onWindowKeyDown)
    return () => window.removeEventListener('keydown', onWindowKeyDown)
  }, [tabs, activeId, addTab, closeTab, hardReset])

  return (
    <div className="window">
      <header className="titlebar">
        <div className="traffic" aria-hidden="true">
          <span className="dot dot--red" />
          <span className="dot dot--amber" />
          <span className="dot dot--green" />
        </div>

        <div className="tabs" role="tablist" aria-label="Terminal tabs">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              role="tab"
              tabIndex={0}
              aria-selected={tab.id === activeId}
              className={`tab ${tab.id === activeId ? 'tab--active' : ''}`}
              onClick={() => setActiveId(tab.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setActiveId(tab.id)
              }}
              onDoubleClick={() => setRenamingId(tab.id)}
              onAuxClick={(e) => {
                if (e.button === 1) closeTab(tab.id)
              }}
            >
              <span className="tab-icon" aria-hidden="true">
                &gt;_
              </span>
              {renamingId === tab.id ? (
                <input
                  className="tab-rename"
                  defaultValue={tab.title}
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    if (v) setTitle(tab.id, v)
                    setRenamingId(null)
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === 'Enter') e.target.blur()
                    if (e.key === 'Escape') {
                      e.target.value = tab.title
                      e.target.blur()
                    }
                  }}
                />
              ) : (
                <span className="tab-title">{tab.title}</span>
              )}
              <button
                type="button"
                className="tab-close"
                aria-label={`Close ${tab.title}`}
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(tab.id)
                }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className={`tab-add ${tabs.length >= MAX_TABS ? 'tab-add--max' : ''}`}
            title={tabs.length >= MAX_TABS ? `Max ${MAX_TABS} tabs` : 'New tab (Alt+T)'}
            onClick={addTab}
          >
            +
          </button>
        </div>

        <div className="win-controls" aria-hidden="true">
          <span>–</span>
          <span>▢</span>
          <span>×</span>
        </div>
      </header>

      <div className="workspace">
        {tabs.map((tab) => (
          <Terminal
            key={tab.id}
            tabId={tab.id}
            fs={fs}
            active={tab.id === activeId}
            username={progress.username}
            onTitle={setTitle}
            onExit={() => closeTab(tab.id)}
            onOpenApp={manager.openApp}
            persistFs={persistFs}
            onTogglePanel={togglePanel}
            ref={(el) => {
              if (el) termRefs.current.set(tab.id, el)
              else termRefs.current.delete(tab.id)
            }}
          />
        ))}
        <WindowsLayer
          manager={manager}
          files={files}
          panelVisible={panelVisible}
          onTogglePanel={togglePanel}
        />
      </div>

      <footer className="statusbar">
        <span className="status-item">
          <span className="status-led" /> tsh 1.0
        </span>
        <span className="status-item status-user" title="Your username — change it with `name <new>`">
          {progress.username}@terminux
        </span>
        <span className="status-item">
          {tabs.length}/{MAX_TABS} tabs
        </span>
        <span className="status-item status-level">
          Lv {levelFromXp(progress.xp)} · {progress.xp} XP
        </span>
        <span className="status-item status-achievements" title="Achievements unlocked">
          ★ {unlockedCount()}/{totalAchievements()}
        </span>
        <span className="status-spacer" />
        <button
          type="button"
          className={`status-item status-panel ${panelVisible ? 'status-panel--on' : ''}`}
          title="Show or hide the app dock (or type `panel`)"
          onClick={() => togglePanel('toggle')}
        >
          {panelVisible ? '▼ panel' : '▲ panel'}
        </button>
        <span className="status-hints">
          Alt+T new · Alt+W close · Alt+1–9 switch · Alt+R reset · Ctrl+L clear · Tab completes
        </span>
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
