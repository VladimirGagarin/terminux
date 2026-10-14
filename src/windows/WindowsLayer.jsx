import { APPS, APP_ORDER } from './apps'
import Window from './Window'
import './windows.css'

export default function WindowsLayer({ manager, files, panelVisible = false, onTogglePanel }) {
  const { windows, openApp, close, focus, minimize, toggleMaximize, move, resize, setParams } = manager

  return (
    <div className="windows-layer">
      <div className="win-canvas">
        {windows.map((win) => {
          const def = APPS[win.appId]
          const Component = def.component
          if (win.minimized) return null
          return (
            <Window
              key={win.id}
              win={win}
              def={def}
              onClose={close}
              onFocus={focus}
              onMinimize={minimize}
              onMaximize={toggleMaximize}
              onMove={move}
              onResize={resize}
            >
              <Component
                params={win.params}
                setParams={(patch) => setParams(win.id, patch)}
                files={files}
                windowId={win.id}
              />
            </Window>
          )
        })}
      </div>

      {panelVisible && (
      <div className="dock" role="toolbar" aria-label="Apps">
        <button
          type="button"
          className="dock-close"
          title="Hide the dock (type `panel`)"
          onClick={() => onTogglePanel?.('hide')}
        >
          ×
        </button>
        {APP_ORDER.map((appId) => {
          const def = APPS[appId]
          const open = windows.find((w) => w.appId === appId)
          return (
            <button
              key={appId}
              type="button"
              className={`dock-btn ${open ? 'dock-btn--open' : ''} ${open && !open.minimized ? 'dock-btn--active' : ''}`}
              title={def.title}
              onClick={() => {
                if (open && !open.minimized) minimize(open.id)
                else if (open) focus(open.id)
                else openApp(appId)
              }}
            >
              <span className="dock-icon" aria-hidden="true">{def.icon}</span>
              <span className="dock-label">{def.title}</span>
            </button>
          )
        })}
      </div>
      )}
    </div>
  )
}
