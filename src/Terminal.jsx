import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { runCommand, completeInput, prettyPath, basename } from './shell'
import { resolveAppCommand } from './windows/commands'
import { createGame, GAMES, GAME_COMMANDS } from './games'
import { buildWelcome, randomOf, HINTS } from './engagement'
import { getProgress, recordCommand, unlock, discoverSecret, levelFromXp } from './progress'

function toDisplayLines(rows) {
  const out = []
  let cur = null
  for (const r of rows) {
    if (!cur) cur = []
    cur.push({ text: r.text, tone: r.tone })
    if (!r.inline) {
      out.push(cur)
      cur = null
    }
  }
  if (cur) out.push(cur)
  return out
}

const TOUR = [
  { cmd: 'help', say: 'see every command — run `help`' },
  { cmd: 'ls', say: 'list what is here — run `ls`' },
  { cmd: 'cd projects/terminux', say: 'move around — run `cd projects/terminux`' },
  { cmd: 'cat README.md', say: 'read a file — run `cat README.md`' },
  { cmd: 'tree', say: 'see the whole filesystem — run `tree`' },
  { cmd: 'tip', say: 'grab a random tip — run `tip`' },
  { cmd: 'fortune', say: 'summon a fortune — run `fortune`' },
]

const SECRETS = new Set(['coffee', 'hack', 'matrix', 'cowsay', 'hello', '42', 'sudo'])

const SHELL_PASSTHROUGH = new Set(['games', 'apps', 'panel', 'dock'])

const HOME = '/home/user'

const achievementRows = (def) => [
  { text: '', tone: 'default' },
  { text: '  ★ achievement unlocked  ', tone: 'achieve', inline: true },
  { text: def.label, tone: 'yellow', inline: true },
  { text: `  +${def.xp} XP — ${def.desc}`, tone: 'dim' },
]

const levelUpRows = (level) => [
  { text: '', tone: 'default' },
  { text: `  ▲ level up — you are now level ${level}`, tone: 'green' },
]

const tourStepRows = (tourRef) => {
  const i = tourRef.current.index
  return [
    { text: '', tone: 'default' },
    { text: `  ▸ step ${i + 1}/${TOUR.length}  `, tone: 'cyan', inline: true },
    { text: TOUR[i].say, tone: 'default' },
  ]
}

const startTourRows = (tourRef) => {
  tourRef.current = { index: 0 }
  return [
    { text: '', tone: 'default' },
    { text: '  Welcome to the guided tour — a quick walk through terminux.', tone: 'bold' },
    { text: '  Finish all 7 steps to earn the "Guided" achievement.', tone: 'dim' },
    { text: '  Type the command shown, or `tour stop` to bail out.', tone: 'dim' },
    ...tourStepRows(tourRef),
  ]
}

const promptSegments = (cwd, username) => [
  { text: `${username || 'user'}@terminux`, tone: 'green' },
  { text: ':', tone: 'default' },
  { text: prettyPath(cwd), tone: 'blue' },
  { text: '$ ', tone: 'default' },
]

const promptFor = (gameName, cwd, username) =>
  gameName
    ? [
        { text: `[${gameName}] `, tone: 'magenta' },
        { text: '> ', tone: 'default' },
      ]
    : promptSegments(cwd, username)

const gameListRows = () => [
  { text: 'Mini games', tone: 'bold' },
  { text: '' },
  ...GAMES.flatMap((g) => [
    { text: `${g.id.padEnd(14)}`, tone: 'green', inline: true },
    { text: g.desc, tone: 'dim' },
  ]),
  { text: '' },
  { text: 'Type a game name to play. Inside a game, type `quit` to stop.', tone: 'dim' },
]

const toneClass = (tone) => (tone === 'default' ? '' : `t-${tone}`)

export default function Terminal({ fs, tabId, active, username, onTitle, onExit, onOpenApp, persistFs, onTogglePanel, ref }) {
  const [lines, setLines] = useState(() => toDisplayLines(buildWelcome(getProgress())))
  const [cwd, setCwd] = useState(HOME)
  const [history, setHistory] = useState([])
  const [caret, setCaret] = useState(0)
  const [focused, setFocused] = useState(false)
  const [inputText, setInputText] = useState('')
  const [gameName, setGameName] = useState(null)

  const inputRef = useRef(null)
  const scrollRef = useRef(null)
  const draftRef = useRef('')
  const histIdxRef = useRef(null)
  const tourRef = useRef(null)
  const gameRef = useRef(null)
  const usedRef = useRef(new Set())
  const activeRef = useRef(active)
  const idleTimer = useRef(null)

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }))

  useEffect(() => {
    onTitle(tabId, cwd === HOME ? username || 'user' : basename(cwd))
  }, [cwd, tabId, onTitle, username])

  useEffect(() => {
    activeRef.current = active
  }, [active])

  useEffect(() => {
    if (active) {
      inputRef.current?.focus()
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    }
  }, [active])

  useEffect(() => {
    const el = scrollRef.current
    if (el && active) el.scrollTop = el.scrollHeight
  }, [lines, active])

  const scheduleIdle = useCallback(() => {
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => {
      if (!activeRef.current || tourRef.current || gameRef.current) return
      setLines((prev) => [
        ...prev,
        ...toDisplayLines([
          { text: '', tone: 'default' },
          { text: `Hint: ${randomOf(HINTS)}`, tone: 'dim' },
        ]),
      ])
    }, 45000)
  }, [])

  useEffect(() => {
    scheduleIdle()
    return () => clearTimeout(idleTimer.current)
  }, [scheduleIdle])

  const syncCaret = useCallback((el) => {
    setCaret(el.selectionStart ?? 0)
  }, [])

  const setLineText = useCallback((el, value) => {
    el.value = value
    el.setSelectionRange(value.length, value.length)
    setInputText(value)
    setCaret(value.length)
  }, [])

  const cancelLine = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    const wasGame = gameRef.current?.name
    if (gameRef.current) {
      gameRef.current = null
      setGameName(null)
    }
    const echo = [...promptFor(wasGame, cwd, username), { text: el.value, tone: 'default' }, { text: '^C', tone: 'red' }]
    const extra = wasGame ? toDisplayLines([{ text: 'Game interrupted.', tone: 'dim' }]) : []
    setLines((prev) => [...prev, echo, ...extra])
    histIdxRef.current = null
    draftRef.current = ''
    setLineText(el, '')
    if (el) el.focus()
  }, [cwd, username, setLineText])

  const submit = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    const value = el.value
    const trimmed = value.trim()
    const tokens = trimmed.split(/\s+/)
    const name = tokens[0] ?? ''
    const argLine = trimmed.slice(name.length).trim()
    const echo = [...promptFor(gameRef.current?.name, cwd, username), { text: value, tone: 'default' }]

    const beforeLevel = levelFromXp(getProgress().xp)
    const earned = []
    const announce = (id) => {
      const def = unlock(id)
      if (def) earned.push(def)
    }

    let out = []
    let cleared = false
    let exitRequested = false
    const activeGame = gameRef.current
    const startingGame = trimmed && GAME_COMMANDS.includes(name)
    const stoppingTour =
      tourRef.current && (tokens[1] === 'stop' || tokens[1] === 'skip' || trimmed === 'stop')

    if (trimmed && tokens.length === 1 && name === 'tour') {
      out = startTourRows(tourRef)
      if (activeGame) {
        gameRef.current = null
        setGameName(null)
      }
    } else if (stoppingTour) {
      tourRef.current = null
      out = [{ text: 'Tour ended. Type `tour` whenever you want to pick it back up.', tone: 'dim' }]
    } else if (trimmed && activeGame && !startingGame && !SHELL_PASSTHROUGH.has(name)) {
      const result = activeGame.feed(value)
      out = result.rows
      if (result.done) {
        gameRef.current = null
        setGameName(null)
      }
      if (result.achievement) announce(result.achievement)
    } else if (startingGame) {
      const game = createGame(name)
      gameRef.current = game
      setGameName(game.name)
      out = game.begin()
      announce('gamer')
    } else if (trimmed && name === 'games') {
      out = gameListRows()
    } else if (trimmed) {
      const appCmd = resolveAppCommand(name, tokens.slice(1), trimmed)
      if (appCmd) {
        onOpenApp?.(appCmd.appId, appCmd.params)
        out = [{ text: appCmd.message, tone: 'green' }]
      } else {
        const session = {
          history,
          progress: getProgress(),
          clearRequested: false,
          exitRequested: false,
          togglePanelRequested: false,
          panelAction: 'toggle',
          get cwd() {
            return cwd
          },
          set cwd(next) {
            setCwd(next)
          },
        }

        try {
          out = runCommand(trimmed, session, fs)
        } catch (err) {
          out = [{ text: `internal error: ${err.message}`, tone: 'red' }]
        }
        cleared = session.clearRequested
        exitRequested = session.exitRequested
        if (session.togglePanelRequested) onTogglePanel?.(session.panelAction)

        if (tourRef.current) {
          const step = TOUR[tourRef.current.index]
          if (trimmed === step.cmd) {
            tourRef.current.index += 1
            if (tourRef.current.index >= TOUR.length) {
              tourRef.current = null
              out = [...out, { text: '', tone: 'default' }, { text: '  Nice work — tour complete!', tone: 'green' }]
              announce('tour')
            } else {
              out = [...out, ...tourStepRows(tourRef)]
            }
          } else {
            out = [
              ...out,
              { text: '', tone: 'default' },
              {
                text: `Tour ${tourRef.current.index + 1}/${TOUR.length} — type: ${step.cmd}   (or \`tour stop\`)`,
                tone: 'dim',
              },
            ]
          }
        }
      }
      persistFs?.()
    }

    if (trimmed && !stoppingTour) {
      recordCommand()
      const progress = getProgress()
      if (progress.commands === 1) announce('first-command')
      if (progress.commands >= 10) announce('ten')
      if (progress.commands >= 50) announce('fifty')

      if (['ls', 'cd', 'cat'].includes(name)) {
        usedRef.current.add(name)
        if (usedRef.current.size === 3) announce('explorer')
      }
      if (name === 'tree') announce('tree')
      if (name === 'touch') announce('writer')
      if (name === 'cat' && argLine.includes('/etc/os-release')) announce('sysadmin')
      if (name === 'fortune') announce('fortune')
      if (name === 'name' || name === 'username') announce('named')
      if (name === 'calc' || name === 'expr') announce('math')
      if (SECRETS.has(name)) {
        discoverSecret(name)
        announce('egg')
      }

      const hour = new Date().getHours()
      if (hour < 5) announce('night')
      else if (hour < 7) announce('sunrise')

      setHistory((h) => [...h, trimmed])
    }

    const rows = [...out]
    for (const def of earned) rows.push(...achievementRows(def))
    const afterLevel = levelFromXp(getProgress().xp)
    if (afterLevel > beforeLevel) rows.push(...levelUpRows(afterLevel))

    setLines((prev) => {
      const rendered = toDisplayLines(rows)
      return cleared ? rendered : [...prev, echo, ...rendered]
    })

    histIdxRef.current = null
    draftRef.current = ''
    setLineText(el, '')
    setCaret(0)
    scheduleIdle()

    if (exitRequested) onExit()
  }, [cwd, username, fs, history, onExit, onOpenApp, persistFs, onTogglePanel, scheduleIdle, setLineText])

  const moveHistory = useCallback(
    (direction) => {
      const el = inputRef.current
      if (!el || history.length === 0) return
      let idx = histIdxRef.current
      if (idx === null) {
        if (direction < 0) {
          draftRef.current = el.value
          idx = history.length - 1
        } else return
      } else {
        idx += direction
      }
      if (idx < 0) idx = 0
      if (idx > history.length) idx = history.length
      histIdxRef.current = idx
      const next = idx === history.length ? draftRef.current : history[idx]
      setLineText(el, next)
    },
    [history, setLineText],
  )

  const tabComplete = useCallback(() => {
    const el = inputRef.current
    if (!el || gameRef.current) return
    const { value, options } = completeInput(el.value, { cwd }, fs)
    if (options.length > 0) {
      const echo = [...promptSegments(cwd, username), { text: el.value, tone: 'default' }]
      setLines((prev) => [
        ...prev,
        echo,
        ...toDisplayLines([{ text: options.join('   '), tone: 'dim' }]),
      ])
      return
    }
    setLineText(el, value)
  }, [cwd, username, fs, setLineText])

  const onKeyDown = (e) => {
    const el = e.currentTarget
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      moveHistory(-1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      moveHistory(1)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      tabComplete()
    } else if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault()
      setLines([])
    } else if (e.ctrlKey && (e.key === 'c' || e.key === 'C') && !e.shiftKey) {
      e.preventDefault()
      cancelLine()
    } else if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault()
      setLineText(el, '')
    } else if (e.ctrlKey && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault()
      el.setSelectionRange(0, 0)
      syncCaret(el)
    } else if (e.ctrlKey && (e.key === 'e' || e.key === 'E')) {
      e.preventDefault()
      el.setSelectionRange(el.value.length, el.value.length)
      syncCaret(el)
    }
    scheduleIdle()
  }

  const prompt = promptFor(gameName, cwd, username)
  const value = inputText

  const before = value.slice(0, caret)
  const atCaret = value[caret] ?? ' '
  const after = value.slice(caret + 1)

  return (
    <div
      className={`term ${active ? '' : 'term--hidden'}`}
      onMouseDown={(e) => {
        if (e.target.closest('.term-hidden-input')) return
        requestAnimationFrame(() => inputRef.current?.focus())
      }}
    >
      <div className="term-scroll" ref={scrollRef}>
        {lines.map((segments, i) => (
          <div className="term-line" key={i}>
            {segments.length === 0
              ? ' '
              : segments.map((s, j) => (
                  <span key={j} className={toneClass(s.tone)}>
                    {s.text}
                  </span>
                ))}
          </div>
        ))}
        <div className="term-line prompt-line">
          {prompt.map((s, j) => (
            <span key={j} className={toneClass(s.tone)}>
              {s.text}
            </span>
          ))}
          <span className="term-cmd">
            {before}
            <span className={`cursor ${focused ? '' : 'cursor--idle'}`}>{atCaret}</span>
            {after}
          </span>
        </div>
      </div>
      <input
        ref={inputRef}
        className="term-hidden-input"
        onChange={(e) => {
          setInputText(e.target.value)
          syncCaret(e.target)
          scheduleIdle()
        }}
        onKeyDown={onKeyDown}
        onKeyUp={(e) => syncCaret(e.currentTarget)}
        onClick={(e) => syncCaret(e.currentTarget)}
        onFocus={(e) => {
          setFocused(true)
          setCaret(e.target.selectionStart ?? 0)
        }}
        onBlur={() => setFocused(false)}
        aria-label="Terminal input"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        data-1p-ignore
      />
    </div>
  )
}
