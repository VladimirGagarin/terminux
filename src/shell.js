import { TIPS, FORTUNES, randomOf } from './engagement'
import { ACHIEVEMENTS, levelFromXp, xpIntoLevel, unlockedCount, totalAchievements, setUsername } from './progress'
import { evaluateExpression, isArithmetic, formatNumber } from './calc'
import { APP_COMMANDS } from './windows/commands'
import { GAMES, GAME_COMMANDS } from './games'

export const MAX_TABS = 10
export const FS_KEY = 'terminux.fs.v1'

const dir = (children = {}) => ({ type: 'dir', children })
const file = (content = '') => ({ type: 'file', content })

export function createFileSystem() {
  return dir({
    home: dir({
      user: dir({
        '.bashrc': file(
          '# ~/.bashrc\nexport PS1="\\u@\\h:\\w\\$ "\nalias ll="ls -la"\n',
        ),
        documents: dir({
          'notes.txt': file(
            'Meeting notes\n-------------\n- Ship terminux v1\n- Add 10-tab limit\n- Make it feel real\n',
          ),
          'todo.md': file('# TODO\n- [x] tabs\n- [ ] themes\n- [ ] real shell\n'),
        }),
        projects: dir({
          terminux: dir({
            'README.md': file(
              '# terminux\nA friendly terminal that looks and feels real.\n\n## Commands\nRun `help` to list everything.\n',
            ),
            'main.js': file(
              "console.log('hello from terminux')\n",
            ),
          }),
        }),
        downloads: dir({
          'installer.exe': file('[binary data...]'),
        }),
      }),
    }),
    etc: dir({
      hostname: file('terminux\n'),
      'os-release': file(
        'NAME="Terminux OS"\nVERSION="1.0 (stable)"\nID=terminux\n',
      ),
      passwd: file('root:x:0:0:root:/root:/bin/bash\nuser:x:1000:1000::/home/user:/bin/bash\n'),
    }),
    var: dir({
      log: dir({
        'system.log': file(
          '[ OK ] Started terminux.service\n[ OK ] Mounted /home\n[ WARN ] 10 tabs is a lot of tabs\n',
        ),
      }),
    }),
    tmp: dir({}),
    usr: dir({ bin: dir({}) }),
    root: dir({}),
  })
}

export function loadFileSystem() {
  try {
    const raw = localStorage.getItem(FS_KEY)
    if (!raw) return createFileSystem()
    const parsed = JSON.parse(raw)
    if (parsed && parsed.type === 'dir') return parsed
    return createFileSystem()
  } catch {
    return createFileSystem()
  }
}

export function persistFileSystem(fs) {
  try {
    localStorage.setItem(FS_KEY, JSON.stringify(fs))
    return true
  } catch {
    return false
  }
}

export function writeFileDeep(fs, path, content) {
  const parts = path.split('/').filter(Boolean)
  if (parts.length === 0) return false
  let node = fs
  for (let i = 0; i < parts.length - 1; i++) {
    if (!node.children[parts[i]]) node.children[parts[i]] = dir()
    node = node.children[parts[i]]
    if (node.type !== 'dir') return false
  }
  node.children[parts[parts.length - 1]] = file(String(content ?? ''))
  return true
}

export function removeFileDeep(fs, path) {
  const idx = path.lastIndexOf('/')
  const parent = getNode(fs, path.slice(0, idx) || '/')
  const name = path.slice(idx + 1)
  if (parent && parent.children[name]) {
    delete parent.children[name]
    return true
  }
  return false
}

export function collectFiles(fs, root) {
  const node = getNode(fs, root)
  if (!node || node.type !== 'dir') return []
  const results = []
  const walk = (n, prefix) => {
    for (const [name, child] of Object.entries(n.children)) {
      if (child.type === 'dir') walk(child, `${prefix}/${name}`)
      else results.push(`${prefix}/${name}`)
    }
  }
  walk(node, '')
  return results.map((p) => p.replace(/^\//, ''))
}

export function resolvePath(cwd, p) {
  if (!p) return cwd
  const parts = p.startsWith('/') ? [] : cwd.split('/').filter(Boolean)
  for (const part of p.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return '/' + parts.join('/')
}

export function getNode(fs, path) {
  const parts = path.split('/').filter(Boolean)
  let node = fs
  for (const part of parts) {
    if (!node || node.type !== 'dir') return null
    node = node.children[part]
  }
  return node ?? null
}

export function getParent(fs, path) {
  const idx = path.lastIndexOf('/')
  const parentPath = path.slice(0, idx) || '/'
  return { parent: getNode(fs, parentPath), name: path.slice(idx + 1), parentPath }
}

export function basename(path) {
  if (path === '/') return '/'
  return path.split('/').filter(Boolean).pop() ?? '/'
}

export function prettyPath(cwd) {
  if (cwd === '/home/user') return '~'
  if (cwd.startsWith('/home/user/')) return '~' + cwd.slice('/home/user'.length)
  return cwd
}

export function tokenize(input) {
  const tokens = []
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g
  let m
  while ((m = re.exec(input))) {
    tokens.push(m[1] ?? m[2] ?? m[3])
  }
  return tokens
}

const line = (text = '', tone = 'default') => ({ text, tone })

function listEntries(node) {
  return Object.keys(node.children).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  )
}

const BUILT_IN_COMMANDS = [
  'help', 'clear', 'echo', 'pwd', 'ls', 'cd', 'cat', 'mkdir', 'touch',
  'rm', 'tree', 'whoami', 'hostname', 'date', 'time', 'now', 'uname', 'history',
  'neofetch', 'grep', 'head', 'tail', 'wc', 'exit',
  'tour', 'tip', 'fortune', 'stats', 'achievements',
  'calc', 'expr', 'name', 'username',
  'coffee', 'hack', 'matrix', 'hello', '42', 'sudo', 'cowsay',
  'apps', 'panel', 'dock', 'games',
  ...APP_COMMANDS,
  ...GAME_COMMANDS,
]

function lsColor(name, node) {
  if (node.type === 'dir') return 'blue'
  if (name.endsWith('.sh') || name.startsWith('.')) return 'green'
  if (name.endsWith('.md')) return 'cyan'
  if (name.endsWith('.log') || name.endsWith('.txt')) return 'yellow'
  return 'default'
}

const HELP_ROWS = [
  ['help', 'show this list of commands'],
  ['ls [dir]', 'list directory contents'],
  ['cd <dir>', 'change the working directory'],
  ['pwd', 'print the working directory'],
  ['cat <file>', 'print a file'],
  ['echo <text>', 'print text'],
  ['mkdir <name>', 'create a directory'],
  ['touch <name>', 'create an empty file'],
  ['rm <path>', 'remove a file or directory'],
  ['tree [dir]', 'print a directory tree'],
  ['head/tail <file>', 'first / last lines of a file'],
  ['grep <pat> <file>', 'search inside a file'],
  ['wc <file>', 'count lines, words, characters'],
  ['history', 'show command history'],
  ['date / time / now', 'current date and time'],
  ['calc <expr>', 'calculate: + - * / % ^ ( )'],
  ['name <new>', 'change your username (saved)'],
  ['uname / whoami / hostname', 'system info'],
  ['neofetch', 'system info with a logo'],
  ['clear', 'clear the screen (Ctrl+L)'],
  ['exit', 'close this tab (Ctrl+W)'],
]

const HELP_FUN_ROWS = [
  ['tour', 'take a guided 7-step tour'],
  ['tip', 'show a random tip'],
  ['fortune', 'print a fortune'],
  ['stats', 'your progress, XP and level'],
  ['achievements', 'everything you have unlocked'],
  ['neofetch / coffee / matrix / cowsay', 'because terminals can be fun too'],
]

const HELP_APP_ROWS = [
  ['todo', 'open the to-do list app'],
  ['notes', 'open sticky notes'],
  ['timer [10m] / stopwatch / alarm', 'time tools'],
  ['remind in 10 min to stretch', 'set a reminder'],
  ['convert 10kg to lb', 'unit & currency converter'],
  ['weather <city>', '5-day forecast (Open-Meteo)'],
  ['random / uuid / hash / base64 / json', 'utility tools'],
  ['edit <file> / draw', 'text editor & sketchpad'],
  ['apps', 'list the app commands'],
  ['panel [on|off]', 'show or hide the app dock'],
]

const HELP_GAME_ROWS = [
  ['guess', 'guess the secret number'],
  ['hangman', 'letter-by-letter word game'],
  ['typing', 'measure your typing speed'],
  ['adventure', 'a tiny text adventure'],
  ['games', 'list the mini games'],
]

function boxLines(text, tone, width = 58) {
  const words = text.split(' ')
  const rows = []
  let cur = ''
  for (const w of words) {
    if (cur && cur.length + 1 + w.length > width) {
      rows.push(cur)
      cur = w
    } else {
      cur = cur ? `${cur} ${w}` : w
    }
  }
  if (cur) rows.push(cur)
  const bar = '─'.repeat(width + 2)
  const out = [line(`╭${bar}╮`, tone)]
  for (const r of rows) out.push(line(`│ ${r.padEnd(width)} │`, tone))
  out.push(line(`╰${bar}╯`, tone))
  return out
}

export function runCommand(input, session, fs) {
  const out = []
  const tokens = tokenize(input.trim())
  if (tokens.length === 0) return out
  const name = tokens[0]
  const args = tokens.slice(1)

  switch (name) {
    case 'help': {
      out.push(line('Terminux built-in commands', 'bold'))
      out.push(line(''))
      for (const [cmd, desc] of HELP_ROWS) {
        out.push({ text: cmd.padEnd(30), tone: 'green', inline: true })
        out.push(line(desc, 'dim'))
      }
      out.push(line(''))
      out.push(line('Fun & progress', 'bold'))
      out.push(line(''))
      for (const [cmd, desc] of HELP_FUN_ROWS) {
        out.push({ text: cmd.padEnd(30), tone: 'cyan', inline: true })
        out.push(line(desc, 'dim'))
      }
      out.push(line(''))
      out.push(line('Apps & editors', 'bold'))
      out.push(line(''))
      for (const [cmd, desc] of HELP_APP_ROWS) {
        out.push({ text: cmd.padEnd(30), tone: 'magenta', inline: true })
        out.push(line(desc, 'dim'))
      }
      out.push(line(''))
      out.push(line('Mini games', 'bold'))
      out.push(line(''))
      for (const [cmd, desc] of HELP_GAME_ROWS) {
        out.push({ text: cmd.padEnd(30), tone: 'green', inline: true })
        out.push(line(desc, 'dim'))
      }
      out.push(line(''))
      out.push(line('Shortcuts: Alt+T new tab, Alt+W close, Alt+1..9 switch, Ctrl+L clear', 'dim'))
      out.push(line('Tip: bare math works too — try `2+3*4` or `(10/4)^2`', 'yellow'))
      break
    }
    case 'clear': {
      session.clearRequested = true
      break
    }
    case 'exit': {
      session.exitRequested = true
      break
    }
    case 'echo': {
      out.push(line(args.join(' ')))
      break
    }
    case 'pwd': {
      out.push(line(session.cwd))
      break
    }
    case 'whoami': {
      out.push(line(session.progress?.username || 'user'))
      break
    }
    case 'hostname': {
      out.push(line('terminux'))
      break
    }
    case 'date': {
      out.push(line(new Date().toDateString()))
      break
    }
    case 'time': {
      const now = new Date()
      out.push({ text: now.toLocaleTimeString(), tone: 'green' })
      break
    }
    case 'now': {
      const now = new Date()
      out.push({ text: now.toLocaleString(), tone: 'green' })
      break
    }
    case 'name':
    case 'username': {
      const desired = args.join(' ').trim()
      if (!desired) {
        out.push({ text: 'Current username: ', tone: 'dim', inline: true })
        out.push(line(session.progress?.username || 'user', 'green'))
        out.push(line('Change it with: name <new-name>   (saved in this browser)', 'dim'))
        break
      }
      const clean = desired.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 20)
      if (!clean) {
        out.push(line('name: use letters, digits, dot, dash or underscore', 'red'))
        break
      }
      setUsername(clean)
      out.push({ text: 'Username set to ', tone: 'dim', inline: true })
      out.push(line(clean, 'green'))
      out.push(line('Your prompt and greeting will use it from now on. `Alt+R` resets everything else.', 'dim'))
      break
    }
    case 'calc':
    case 'expr': {
      if (args.length === 0) {
        out.push(line('usage: calc <expression>, e.g. calc (12 + 8) * 3 / 4', 'red'))
        break
      }
      const expression = args.join(' ')
      try {
        const result = evaluateExpression(expression)
        if (!Number.isFinite(result)) {
          out.push(line('calc: result is undefined (division by zero?)', 'red'))
          break
        }
        out.push({ text: `${expression} = `, tone: 'dim', inline: true })
        out.push(line(formatNumber(result), 'green'))
      } catch (err) {
        out.push(line(`calc: ${err.message}`, 'red'))
      }
      break
    }
    case 'uname': {
      const a = args.join(' ')
      if (a.includes('a')) out.push(line('Terminux terminux 1.0.0 x86_64 GNU/Linux'))
      else if (a.includes('r')) out.push(line('1.0.0'))
      else if (a.includes('m')) out.push(line('x86_64'))
      else out.push(line('Terminux'))
      break
    }
    case 'history': {
      session.history.forEach((h, i) => {
        out.push({ text: String(i + 1).padStart(5) + '  ', tone: 'dim', inline: true })
        out.push(line(h, 'default'))
      })
      break
    }
    case 'ls': {
      const target = resolvePath(session.cwd, args.find((a) => !a.startsWith('-')) || '.')
      const node = getNode(fs, target)
      if (!node) out.push(line(`ls: cannot access '${args[0]}': No such file or directory`, 'red'))
      else if (node.type === 'file') out.push(line(basename(target)))
      else {
        const entries = listEntries(node)
        if (entries.length === 0) break
        if (args.some((a) => a === '-l' || a === '-la' || a === '-al')) {
          out.push(line(`total ${entries.length}`, 'dim'))
          for (const e of entries) {
            const child = node.children[e]
            const perms = child.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--'
            const size = String(child.type === 'dir' ? 4096 : child.content.length).padStart(6)
            out.push({ text: `${perms}  user user ${size}  `, tone: 'dim', inline: true })
            out.push(line(e, lsColor(e, child)))
          }
        } else {
          entries.forEach((e, i) => {
            out.push({ text: e + (i < entries.length - 1 ? '  ' : ''), tone: lsColor(e, node.children[e]), inline: i < entries.length - 1 })
          })
        }
      }
      break
    }
    case 'cd': {
      const dest = args[0] ?? '~'
      const target = dest === '~' ? '/home/user' : resolvePath(session.cwd, dest)
      const node = getNode(fs, target)
      if (!node) out.push(line(`cd: ${dest}: No such file or directory`, 'red'))
      else if (node.type !== 'dir') out.push(line(`cd: ${dest}: Not a directory`, 'red'))
      else session.cwd = target
      break
    }
    case 'cat': {
      if (!args[0]) { out.push(line('cat: missing file operand', 'red')); break }
      const target = resolvePath(session.cwd, args[0])
      const node = getNode(fs, target)
      if (!node) out.push(line(`cat: ${args[0]}: No such file or directory`, 'red'))
      else if (node.type === 'dir') out.push(line(`cat: ${args[0]}: Is a directory`, 'red'))
      else node.content.replace(/\n$/, '').split('\n').forEach((l) => out.push(line(l)))
      break
    }
    case 'mkdir': {
      if (!args[0]) { out.push(line('mkdir: missing operand', 'red')); break }
      const target = resolvePath(session.cwd, args[0])
      const { parent, name: newName } = getParent(fs, target)
      if (!parent || parent.type !== 'dir') out.push(line(`mkdir: cannot create directory '${args[0]}': No such file or directory`, 'red'))
      else if (parent.children[newName]) out.push(line(`mkdir: cannot create directory '${args[0]}': File exists`, 'red'))
      else parent.children[newName] = dir()
      break
    }
    case 'touch': {
      if (!args[0]) { out.push(line('touch: missing file operand', 'red')); break }
      const target = resolvePath(session.cwd, args[0])
      const { parent, name: newName } = getParent(fs, target)
      if (!parent || parent.type !== 'dir') out.push(line(`touch: cannot touch '${args[0]}': No such file or directory`, 'red'))
      else if (!parent.children[newName]) parent.children[newName] = file('')
      break
    }
    case 'rm': {
      const recursive = args.some((a) => a.startsWith('-'))
      const pathArg = args.find((a) => !a.startsWith('-'))
      if (!pathArg) { out.push(line('rm: missing operand', 'red')); break }
      const target = resolvePath(session.cwd, pathArg)
      if (target === '/' || target === '/home/user') {
        out.push(line('rm: refusing to remove the universe (try a smaller target)', 'red'))
        break
      }
      const { parent, name: newName } = getParent(fs, target)
      const node = getNode(fs, target)
      if (!node) out.push(line(`rm: cannot remove '${pathArg}': No such file or directory`, 'red'))
      else if (node.type === 'dir' && !recursive) out.push(line(`rm: cannot remove '${pathArg}': Is a directory`, 'red'))
      else delete parent.children[newName]
      break
    }
    case 'tree': {
      const target = resolvePath(session.cwd, args[0] || '.')
      const node = getNode(fs, target)
      if (!node || node.type !== 'dir') { out.push(line(`tree: ${args[0] || '.'}: Not a directory`, 'red')); break }
      out.push(line(prettyPath(target), 'blue'))
      const walk = (n, prefix) => {
        const entries = listEntries(n)
        entries.forEach((e, i) => {
          const last = i === entries.length - 1
          const child = n.children[e]
          out.push({ text: prefix + (last ? '└── ' : '├── '), tone: 'dim', inline: true })
          out.push(line(e, lsColor(e, child)))
          if (child.type === 'dir') walk(child, prefix + (last ? '    ' : '│   '))
        })
      }
      walk(node, '')
      break
    }
    case 'head':
    case 'tail': {
      const fileArg = args.find((a) => !a.startsWith('-'))
      if (!fileArg) { out.push(line(`${name}: missing file operand`, 'red')); break }
      const node = getNode(fs, resolvePath(session.cwd, fileArg))
      if (!node || node.type !== 'file') { out.push(line(`${name}: ${fileArg}: No such file or directory`, 'red')); break }
      const all = node.content.replace(/\n$/, '').split('\n')
      const rows = name === 'head' ? all.slice(0, 10) : all.slice(-10)
      rows.forEach((l) => out.push(line(l)))
      break
    }
    case 'grep': {
      const pattern = args[0]
      const fileArg = args[1]
      if (!pattern || !fileArg) { out.push(line('usage: grep <pattern> <file>', 'red')); break }
      const node = getNode(fs, resolvePath(session.cwd, fileArg))
      if (!node || node.type !== 'file') { out.push(line(`grep: ${fileArg}: No such file or directory`, 'red')); break }
      const hits = node.content.split('\n').filter((l) => l.includes(pattern))
      if (hits.length === 0) out.push(line(`grep: no matches for '${pattern}'`, 'dim'))
      hits.forEach((l) => out.push(line(l, 'yellow')))
      break
    }
    case 'wc': {
      if (!args[0]) { out.push(line('wc: missing file operand', 'red')); break }
      const node = getNode(fs, resolvePath(session.cwd, args[0]))
      if (!node || node.type !== 'file') { out.push(line(`wc: ${args[0]}: No such file or directory`, 'red')); break }
      const lines = node.content === '' ? 0 : node.content.replace(/\n$/, '').split('\n').length
      const words = node.content.split(/\s+/).filter(Boolean).length
      out.push(line(`${String(lines).padStart(5)} ${String(words).padStart(5)} ${String(node.content.length).padStart(5)} ${args[0]}`))
      break
    }
    case 'neofetch': {
      out.push(...neofetchLines(session.progress))
      break
    }
    case 'tip': {
      out.push({ text: 'Tip: ', tone: 'yellow', inline: true })
      out.push(line(randomOf(TIPS), 'default'))
      break
    }
    case 'fortune': {
      out.push(...boxLines(randomOf(FORTUNES), 'magenta'))
      break
    }
    case 'stats': {
      const p = session.progress
      if (!p) { out.push(line('progress is unavailable right now', 'red')); break }
      const level = levelFromXp(p.xp)
      const into = xpIntoLevel(p.xp)
      out.push(line('Your terminux record', 'bold'))
      out.push(line(''))
      const stat = (label, value) => {
        out.push({ text: `${label.padEnd(16)}`, tone: 'dim', inline: true })
        out.push(line(String(value), 'green'))
      }
      stat('level', `${level}  (${into}/40 xp to next)`)
      stat('total xp', p.xp)
      stat('commands run', p.commands)
      stat('tabs opened', p.tabsOpened)
      stat('achievements', `${unlockedCount()}/${totalAchievements()}`)
      stat('secrets found', p.secrets.length)
      stat('member since', new Date(p.firstSeen).toLocaleDateString())
      out.push(line(''))
      out.push(line('Keep going — achievements unlock as you explore.', 'dim'))
      break
    }
    case 'achievements': {
      const p = session.progress
      if (!p) { out.push(line('progress is unavailable right now', 'red')); break }
      out.push(line(`Achievements  ${unlockedCount()}/${totalAchievements()}`, 'bold'))
      out.push(line(''))
      for (const [id, def] of Object.entries(ACHIEVEMENTS)) {
        const got = Boolean(p.achievements[id])
        out.push({ text: got ? '  [x] ' : '  [ ] ', tone: got ? 'green' : 'dim', inline: true })
        out.push({ text: def.label.padEnd(18), tone: got ? 'yellow' : 'dim', inline: true })
        out.push(line(def.desc, got ? 'default' : 'dim'))
      }
      break
    }
    case 'coffee': {
      const art = [
        '        ( (',
        '         ) )',
        '      .........',
        '      |       |]',
        '      \\       /',
        '       `-----`',
      ]
      art.forEach((a) => out.push(line(a, 'yellow')))
      out.push(line('brewing... a browser has no coffee, but thanks for asking.', 'dim'))
      break
    }
    case 'matrix': {
      for (let r = 0; r < 12; r++) {
        let s = ''
        for (let c = 0; c < 46; c++) s += Math.random() > 0.5 ? '1' : '0'
        out.push(line(s, 'green'))
      }
      out.push(line('wake up... or just type `clear`.', 'dim'))
      break
    }
    case 'hack': {
      const steps = [
        ['hacking the mainframe', 'green'],
        ['bypassing the firewall', 'green'],
        ['cloning the database', 'green'],
        ['Access granted. (Not really — this is a browser sandbox.)', 'dim'],
      ]
      let filled = ''
      for (let i = 0; i < steps.length; i++) {
        filled += '▓'.repeat(11)
        out.push(line(`[${filled}${'░'.repeat(44 - filled.length)}] ${steps[i][0]}`, steps[i][1]))
      }
      break
    }
    case 'hello': {
      out.push({ text: 'Hello there, ', tone: 'default', inline: true })
      out.push({ text: session.progress?.username || 'user', tone: 'green', inline: true })
      out.push(line('! Type `tour` if you want the grand welcome.', 'default'))
      break
    }
    case '42': {
      out.push(line('The Answer to the Great Question of Life, the Universe, and Everything.', 'cyan'))
      break
    }
    case 'sudo': {
      if (args.join(' ') === 'make me a sandwich') {
        out.push(line('Okay.', 'green'))
      } else {
        out.push(line('user is not in the sudoers file. This incident has been reported.', 'red'))
      }
      break
    }
    case 'tour': {
      out.push(line('The tour runs automatically — type `tour` on a fresh line to begin.', 'dim'))
      break
    }
    case 'apps': {
      out.push(line('Apps & editors', 'bold'))
      out.push(line(''))
      for (const [cmd, desc] of HELP_APP_ROWS) {
        out.push({ text: cmd.padEnd(30), tone: 'magenta', inline: true })
        out.push(line(desc, 'dim'))
      }
      out.push(line(''))
      out.push(line('Type any of these to open a window. Toggle the dock with `panel`.', 'dim'))
      break
    }
    case 'games': {
      out.push(line('Mini games', 'bold'))
      out.push(line(''))
      for (const g of GAMES) {
        out.push({ text: g.id.padEnd(14), tone: 'green', inline: true })
        out.push(line(g.desc, 'dim'))
      }
      out.push(line(''))
      out.push(line('Type a game name to play. Adrift already? Type `quit` inside a game.', 'dim'))
      break
    }
    case 'panel':
    case 'dock': {
      const action = (args[0] || 'toggle').toLowerCase()
      session.togglePanelRequested = true
      session.panelAction = action
      if (action === 'on' || action === 'show') out.push(line('Showing the app dock.', 'dim'))
      else if (action === 'off' || action === 'hide') out.push(line('Hiding the app dock.', 'dim'))
      else out.push(line('Toggling the app dock.', 'dim'))
      break
    }
    case 'cowsay': {
      const text = args.join(' ') || 'moo'
      const top = ' ' + '_'.repeat(text.length + 2)
      const bottom = ' ' + '-'.repeat(text.length + 2)
      out.push(line(top))
      out.push(line(`< ${text} >`))
      out.push(line(bottom))
      out.push(line('        \\   ^__^'))
      out.push(line('         \\  (oo)\\_______'))
      out.push(line('            (__)\\       )\\/\\'))
      out.push(line('                ||----w |'))
      out.push(line('                ||     ||'))
      break
    }
    default: {
      if (isArithmetic(input)) {
        try {
          const result = evaluateExpression(input)
          if (Number.isFinite(result)) {
            out.push({ text: `${input.trim()} = `, tone: 'dim', inline: true })
            out.push(line(formatNumber(result), 'green'))
            break
          }
        } catch {
          out.push(line(`calc: ${input.trim()} is not a valid expression`, 'red'))
          break
        }
      }
      out.push(line(`${name}: command not found`, 'red'))
      const near = BUILT_IN_COMMANDS.find(
        (c) => c.startsWith(name[0]) && c.slice(0, 3) === name.slice(0, 3),
      )
      if (near) out.push(line(`Did you mean '${near}'? Try 'help'.`, 'dim'))
      else out.push(line("Type 'help' to see what's available.", 'dim'))
    }
  }

  return out
}

function neofetchLines(progress) {
  const logo = [
    '        _____ _       _',
    '       |_   _(_) __ _| | ___  ___',
    '         | | | |/ _` | |/ _ \\/ __|',
    '         | | | | (_| | |  __\\__ \\',
    '         |_| |_|\\__, |_|\\___|___/',
    '                |___/',
  ]
  const info = [
    ['user@terminux', 'cyan'],
    ['--------------', 'dim'],
    ['OS', 'Terminux OS 1.0 x86_64'],
    ['Host', 'Web Browser'],
    ['Kernel', '1.0.0-react'],
    ['Shell', 'tsh 1.0'],
    ['Tabs', progress ? `${progress.tabsOpened} opened · ${MAX_TABS} max` : `${MAX_TABS} max`],
    ['XP', progress ? `${progress.xp} · level ${levelFromXp(progress.xp)}` : 'level 1'],
    ['Theme', 'terminux-dark'],
  ]
  const rows = []
  const width = Math.max(...logo.map((l) => l.length))
  for (let i = 0; i < Math.max(logo.length, info.length); i++) {
    const l = logo[i] ?? ''
    rows.push({ text: l.padEnd(width + 3), tone: 'green', inline: true, raw: true })
    const inf = info[i]
    if (!inf) { rows.push({ text: '', tone: 'default' }); continue }
    if (Array.isArray(inf)) {
      rows.push({ text: inf[0], tone: inf[1], inline: true, raw: true })
      rows.push({ text: '', tone: 'default' })
    } else {
      rows.push({ text: inf[0] + ': ', tone: 'bold', inline: true, raw: true })
      rows.push({ text: inf[1], tone: 'default' })
    }
  }
  return rows
}

export function completeInput(input, session, fs) {
  const tokens = input.split(' ')
  const last = tokens[tokens.length - 1]

  if (tokens.length === 1) {
    const matches = BUILT_IN_COMMANDS.filter((c) => c.startsWith(last))
    if (matches.length === 1) return { value: matches[0] + ' ', options: [] }
    return { value: input, options: matches }
  }

  const dirPart = last.includes('/') ? last.slice(0, last.lastIndexOf('/') + 1) : ''
  const frag = last.includes('/') ? last.slice(last.lastIndexOf('/') + 1) : last
  const target = resolvePath(session.cwd, dirPart || '.')
  const node = getNode(fs, target)
  if (!node || node.type !== 'dir') return { value: input, options: [] }

  const matches = listEntries(node).filter((e) => e.startsWith(frag))
  if (matches.length === 1) {
    const isDir = node.children[matches[0]].type === 'dir'
    tokens[tokens.length - 1] = dirPart + matches[0] + (isDir ? '/' : ' ')
    return { value: tokens.join(' '), options: [] }
  }
  return { value: input, options: matches }
}
