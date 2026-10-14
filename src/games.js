import { randomOf } from './engagement'

const r = (text = '', tone = 'default') => ({ text, tone })

class GuessGame {
  constructor() {
    this.id = 'guess'
    this.name = 'guess'
    this.secret = 1 + Math.floor(Math.random() * 100)
    this.tries = 0
  }

  begin() {
    return [
      r('Number Guessing', 'bold'),
      r('I am thinking of a number between 1 and 100.'),
      r('Type a whole number and press Enter, or `quit` to give up.', 'dim'),
    ]
  }

  feed(input) {
    const t = input.trim().toLowerCase()
    if (t === 'quit' || t === 'exit' || t === 'q') {
      return { rows: [r(`Game over. The number was ${this.secret}.`, 'yellow')], done: true }
    }
    const n = Number(t)
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      return { rows: [r('Enter a whole number between 1 and 100.', 'red')], done: false }
    }
    this.tries += 1
    if (n === this.secret) {
      const quick = this.tries <= 5
      return {
        rows: [r(`Correct! ${this.secret} in ${this.tries} ${this.tries === 1 ? 'try' : 'tries'}.`, 'green')],
        done: true,
        win: true,
        achievement: quick ? 'sniper' : null,
      }
    }
    return {
      rows: [r(n < this.secret ? `${n} is too low.` : `${n} is too high.`, 'yellow')],
      done: false,
    }
  }
}

const HANGMAN_WORDS = [
  'terminal', 'keyboard', 'compiler', 'javascript', 'variable',
  'function', 'network', 'browser', 'algorithm', 'server',
  'prompt', 'memory', 'syntax', 'react', 'process', 'gateway', 'display',
]

function gallows(lives) {
  const wrong = 6 - lives
  return [
    '  +---+',
    '  |   |',
    `  |   ${wrong > 0 ? 'O' : ' '}`,
    `  |  ${wrong > 2 ? '/' : ' '}${wrong > 1 ? '|' : ' '}${wrong > 3 ? '\\' : ' '}`,
    `  |  ${wrong > 4 ? '/' : ' '} ${wrong > 5 ? '\\' : ' '}`,
    '  |',
    '=====',
  ]
}

class HangmanGame {
  constructor() {
    this.id = 'hangman'
    this.name = 'hangman'
    this.word = randomOf(HANGMAN_WORDS)
    this.guessed = new Set()
    this.lives = 6
  }

  mask() {
    return [...this.word].map((c) => (this.guessed.has(c) ? c : '_')).join(' ')
  }

  statusRows() {
    const missed = [...this.guessed].filter((c) => !this.word.includes(c))
    return [
      ...gallows(this.lives).map((l) => r(l, 'cyan')),
      r(''),
      r(`Word:  ${this.mask()}`, 'bold'),
      r(`Lives: ${this.lives}   Missed: ${missed.length ? missed.join(' ') : '—'}`, 'dim'),
    ]
  }

  begin() {
    return [
      r('Hangman', 'bold'),
      ...this.statusRows(),
      r('Guess one letter at a time (`quit` to stop).', 'dim'),
    ]
  }

  feed(input) {
    const t = input.trim().toLowerCase()
    if (t === 'quit' || t === 'exit' || t === 'q') {
      return { rows: [r(`Game over. The word was “${this.word}”.`, 'yellow')], done: true }
    }
    if (!/^[a-z]$/.test(t)) {
      return { rows: [r('Type a single letter a–z.', 'red')], done: false }
    }
    if (this.guessed.has(t)) {
      return { rows: [r(`You already tried “${t}”.`, 'dim')], done: false }
    }
    this.guessed.add(t)
    if (!this.word.includes(t)) this.lives -= 1
    const solved = [...this.word].every((c) => this.guessed.has(c))
    if (solved) {
      return {
        rows: [...this.statusRows(), r(`You saved him! The word was “${this.word}”.`, 'green')],
        done: true,
        win: true,
        achievement: 'wordwise',
      }
    }
    if (this.lives <= 0) {
      return { rows: [...this.statusRows(), r(`Out of lives. The word was “${this.word}”.`, 'red')], done: true }
    }
    return { rows: this.statusRows(), done: false }
  }
}

const TYPING_SENTENCES = [
  'the quick brown fox jumps over the lazy dog',
  'pack my box with five dozen liquor jugs',
  'how vexingly quick daft zebras jump',
  'a terminal is a window into the machine',
  'practice makes progress not perfection',
  'sphinx of black quartz judge my vow',
]

class TypingGame {
  constructor() {
    this.id = 'typing'
    this.name = 'typing'
    this.sentence = randomOf(TYPING_SENTENCES)
    this.startTime = Date.now()
  }

  begin() {
    return [
      r('Typing Speed Test', 'bold'),
      r('Retype the line below as fast and accurately as you can, then press Enter:', 'dim'),
      r(''),
      r(this.sentence, 'cyan'),
      r(''),
    ]
  }

  feed(input) {
    const typed = input
    const elapsedMs = Math.max(1, Date.now() - this.startTime)
    const minutes = elapsedMs / 60000
    const correct = [...this.sentence].filter((c, i) => typed[i] === c).length
    const accuracy = Math.round((correct / this.sentence.length) * 100)
    const wpm = Math.round(this.sentence.length / 5 / minutes)
    const exact = typed === this.sentence
    const win = wpm >= 40 && accuracy >= 90
    const rows = [
      r(''),
      r(`Time: ${(elapsedMs / 1000).toFixed(1)}s`, 'default'),
      r(`Speed: ${wpm} WPM`, 'green'),
      r(`Accuracy: ${accuracy}%`, accuracy >= 90 ? 'green' : accuracy >= 70 ? 'yellow' : 'red'),
      exact ? r('Perfect match!', 'green') : r('Not an exact match — keep practicing.', 'dim'),
    ]
    return { rows, done: true, win, achievement: win ? 'speedster' : null }
  }
}

const ROOMS = {
  hall: {
    name: 'Great Hall',
    desc: 'A dusty stone hall. Torches flicker along the walls. A faded rug lies underfoot.',
    exits: { north: 'library', east: 'kitchen' },
    items: ['lamp'],
  },
  library: {
    name: 'Library',
    desc: 'Shelves of crumbling books reach the ceiling. Something glints on a low shelf.',
    exits: { south: 'hall' },
    items: ['key'],
  },
  kitchen: {
    name: 'Cold Kitchen',
    desc: 'A cold hearth and a heavy iron door to the north. The door is locked.',
    exits: { west: 'hall' },
    items: [],
  },
}

class AdventureGame {
  constructor() {
    this.id = 'adventure'
    this.name = 'adventure'
    this.room = 'hall'
    this.inventory = []
    this.taken = {}
  }

  roomItems(id) {
    const base = ROOMS[id].items || []
    const taken = this.taken[id] || []
    return base.filter((i) => !taken.includes(i))
  }

  look() {
    const room = ROOMS[this.room]
    const rows = [r(room.name, 'bold'), r(room.desc)]
    const items = this.roomItems(this.room)
    if (items.length) rows.push(r(`You can see: ${items.join(', ')}.`, 'yellow'))
    rows.push(r(`Exits: ${Object.keys(room.exits).join(', ')}.`, 'cyan'))
    return rows
  }

  begin() {
    return [
      r('The Terminux Dungeon', 'bold'),
      r('Escape the dungeon. Commands: look, go <dir>, take <item>, inventory, open door, quit.', 'dim'),
      r(''),
      ...this.look(),
    ]
  }

  win() {
    return {
      rows: [
        r('You slide the key into the lock. The door groans open and cold night air rushes in.', 'green'),
        r('You escape the dungeon. You win!', 'bold'),
      ],
      done: true,
      win: true,
      achievement: 'adventurer',
    }
  }

  feed(input) {
    const t = input.trim().toLowerCase()
    if (!t) return { rows: [r('Try: look, go north, take key, inventory.', 'dim')], done: false }
    const [verb, ...rest] = t.split(/\s+/)
    const arg = rest.join(' ')

    if (verb === 'quit' || verb === 'exit') {
      return { rows: [r('You leave the dungeon (for now).', 'yellow')], done: true }
    }
    if (verb === 'look' || verb === 'l') return { rows: this.look(), done: false }
    if (verb === 'inventory' || verb === 'i') {
      return {
        rows: [r(this.inventory.length ? `You are carrying: ${this.inventory.join(', ')}.` : 'You are empty-handed.', 'yellow')],
        done: false,
      }
    }
    if (verb === 'help') {
      return { rows: [r('Commands: look, go <dir>, take <item>, inventory, open door, quit.', 'dim')], done: false }
    }

    if (verb === 'go' || verb === 'move' || verb === 'walk') {
      const dir = arg
      const room = ROOMS[this.room]
      if (!dir) return { rows: [r('Go where? Try: go north.', 'dim')], done: false }
      if (!room.exits[dir]) return { rows: [r(`You can't go ${dir}.`, 'red')], done: false }
      if (this.room === 'kitchen' && dir === 'north') {
        if (this.inventory.includes('key')) return this.win()
        return { rows: [r('The iron door is locked. A key would help.', 'red')], done: false }
      }
      this.room = room.exits[dir]
      return { rows: this.look(), done: false }
    }

    if (verb === 'take' || verb === 'get') {
      if (!arg) return { rows: [r('Take what?', 'dim')], done: false }
      const items = this.roomItems(this.room)
      if (!items.includes(arg)) return { rows: [r(`There is no ${arg} here.`, 'red')], done: false }
      this.taken[this.room] = [...(this.taken[this.room] || []), arg]
      this.inventory.push(arg)
      return { rows: [r(`You take the ${arg}.`, 'green')], done: false }
    }

    if (verb === 'open' || verb === 'unlock' || verb === 'use') {
      if (this.room === 'kitchen' && (arg.includes('door') || arg.includes('key'))) {
        if (this.inventory.includes('key')) {
          return { rows: [r('You unlock the door. Now try `go north`.', 'green')], done: false }
        }
        return { rows: [r('The door is locked and you have no key.', 'red')], done: false }
      }
      return { rows: [r(`You can't ${verb} that.`, 'dim')], done: false }
    }

    return { rows: [r(`I don't understand “${verb}”. Try: look, go north, take key.`, 'dim')], done: false }
  }
}

const FACTORIES = {
  guess: () => new GuessGame(),
  hangman: () => new HangmanGame(),
  typing: () => new TypingGame(),
  adventure: () => new AdventureGame(),
}

export const GAMES = [
  { id: 'guess', name: 'Number Guess', desc: 'find the secret number 1–100' },
  { id: 'hangman', name: 'Hangman', desc: 'guess the hidden word' },
  { id: 'typing', name: 'Typing Test', desc: 'measure your words per minute' },
  { id: 'adventure', name: 'Dungeon', desc: 'a tiny text adventure' },
]

export const GAME_COMMANDS = GAMES.map((g) => g.id)

export function createGame(id) {
  const factory = FACTORIES[id]
  return factory ? factory() : null
}
