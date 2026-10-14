const KEY = 'terminux.progress.v1'

export const ACHIEVEMENTS = {
  'first-command': { label: 'Hello, World', desc: 'Run your first command', xp: 5 },
  tour: { label: 'Guided', desc: 'Complete the interactive tour', xp: 30 },
  explorer: { label: 'Explorer', desc: 'Use ls, cd and cat', xp: 15 },
  tree: { label: 'Deep Roots', desc: 'Print a directory tree', xp: 10 },
  sysadmin: { label: 'Sysadmin', desc: 'Read /etc/os-release', xp: 10 },
  writer: { label: 'Scribe', desc: 'Create a file with touch', xp: 10 },
  fortune: { label: 'Fortune Favors', desc: 'Ask for a fortune', xp: 5 },
  ten: { label: 'Power User', desc: 'Run 10 commands', xp: 10 },
  fifty: { label: 'Muscle Memory', desc: 'Run 50 commands', xp: 25 },
  multitasker: { label: 'Multitasker', desc: 'Open 3 tabs at once', xp: 10 },
  maxed: { label: 'Tab Hoarder', desc: 'Open all 10 tabs', xp: 25 },
  egg: { label: 'Egg Hunter', desc: 'Find a hidden command', xp: 15 },
  night: { label: 'Night Owl', desc: 'Use terminux after midnight', xp: 5 },
  sunrise: { label: 'Early Bird', desc: 'Use terminux before 7am', xp: 5 },
  named: { label: 'An Identity', desc: 'Set your own username', xp: 10 },
  math: { label: 'Calculator', desc: 'Do a calculation with calc', xp: 10 },
  gamer: { label: 'Player One', desc: 'Start a mini game', xp: 10 },
  sniper: { label: 'Sharpshooter', desc: 'Guess the number in 5 tries or fewer', xp: 20 },
  wordwise: { label: 'Wordsmith', desc: 'Win a game of hangman', xp: 20 },
  speedster: { label: 'Speedster', desc: 'Type 40+ WPM with 90%+ accuracy', xp: 25 },
  adventurer: { label: 'Adventurer', desc: 'Escape the terminux dungeon', xp: 30 },
  panel: { label: 'Control Panel', desc: 'Toggle the app dock', xp: 5 },
}

export const XP_PER_LEVEL = 40

const defaults = () => ({
  username: 'user',
  commands: 0,
  tabsOpened: 0,
  xp: 0,
  achievements: {},
  secrets: [],
  firstSeen: Date.now(),
  lastSeen: Date.now(),
})

function safeGet(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

function load() {
  try {
    const raw = safeGet(KEY)
    if (!raw) return defaults()
    const parsed = JSON.parse(raw)
    return {
      ...defaults(),
      ...parsed,
      achievements: parsed.achievements ?? {},
      secrets: parsed.secrets ?? [],
    }
  } catch {
    return defaults()
  }
}

let state = load()
const listeners = new Set()

function commit() {
  safeSet(KEY, JSON.stringify(state))
  listeners.forEach((fn) => fn(state))
}

export function getProgress() {
  return state
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function levelFromXp(xp) {
  return 1 + Math.floor(xp / XP_PER_LEVEL)
}

export function xpIntoLevel(xp) {
  return xp % XP_PER_LEVEL
}

export function totalAchievements() {
  return Object.keys(ACHIEVEMENTS).length
}

export function unlockedCount() {
  return Object.keys(state.achievements).length
}

export function recordCommand() {
  state = {
    ...state,
    commands: state.commands + 1,
    xp: state.xp + 1,
    lastSeen: Date.now(),
  }
  commit()
  return state
}

export function recordTab() {
  state = { ...state, tabsOpened: state.tabsOpened + 1, lastSeen: Date.now() }
  commit()
  return state
}

export function discoverSecret(name) {
  if (state.secrets.includes(name)) return false
  state = { ...state, secrets: [...state.secrets, name], xp: state.xp + 2 }
  commit()
  return true
}

export function unlock(id) {
  const def = ACHIEVEMENTS[id]
  if (!def || state.achievements[id]) return null
  state = {
    ...state,
    achievements: { ...state.achievements, [id]: Date.now() },
    xp: state.xp + (def.xp ?? 0),
  }
  commit()
  return def
}

export function resetProgress() {
  const username = state.username
  state = { ...defaults(), username, firstSeen: Date.now() }
  commit()
  return state
}

export function setUsername(name) {
  const clean = String(name).trim().slice(0, 20)
  if (!clean || clean === state.username) return state
  state = { ...state, username: clean, lastSeen: Date.now() }
  commit()
  return state
}
