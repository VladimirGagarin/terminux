import { levelFromXp } from './progress'

export const TIPS = [
  'Press Tab to auto-complete commands and file paths.',
  'Use the up and down arrows to walk through your command history.',
  'Ctrl+L clears the screen but keeps your history intact.',
  'Alt+T opens a new tab, up to 10 of them. Alt+1..9 jumps between tabs.',
  'Double-click a tab name to rename it to whatever you like.',
  'Nothing is permanent here: rm only touches the in-browser sandbox.',
  'Try `cat /etc/os-release` to peek at what runs this machine.',
  'Type `neofetch` for a machine summary with a logo.',
  '`grep` and `wc` are handy when you want to search or count.',
  'Lost? `tree` draws the whole filesystem as a picture.',
  'Hidden commands exist. Curious people find them.',
  'Your progress, XP and achievements are stored in this browser.',
  'Make it yours: `name <your-name>` changes the prompt and saves it.',
  'Quick math? Just type an expression like `12*8+4` or `calc (10/4)^2`.',
  'Ask for the time with `time`, or the full date with `now`.',
]

export const FORTUNES = [
  'The best way to predict the future is to invent it.',
  'A ship in harbor is safe, but that is not what ships are built for.',
  'Simplicity is the soul of efficiency.',
  'Programs must be written for people to read, and only incidentally for machines to execute.',
  'Talk is cheap. Show me the code.',
  'Every great developer you know got there by solving problems they were unqualified to solve.',
  'The computer was born to solve problems that did not exist before.',
  'First, solve the problem. Then write the code.',
  'Deleted code is debugged code.',
  'Perfect is the enemy of shipped.',
]

export const HINTS = [
  'Psst — type `tour` for a guided walkthrough.',
  'Try `fortune` for a little wisdom.',
  'Curious? There are hidden commands. Try `coffee`.',
  'Type `stats` to see how far you have come.',
  'Type `tip` whenever you want a new tip.',
]

const BANNER = [
  '╭──────────────────────────────────────────────╮',
  '│   T E R M I N U X        tsh 1.0    >_       │',
  '╰──────────────────────────────────────────────╯',
]

export function randomOf(list) {
  return list[Math.floor(Math.random() * list.length)]
}

export function greetingForHour(hour) {
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  if (hour >= 18 && hour < 23) return 'Good evening'
  return 'Still up'
}

export function buildWelcome(progress, now = new Date()) {
  const rows = []
  const push = (text, tone = 'default', inline = false) => rows.push({ text, tone, inline })

  push('', 'default')
  for (const b of BANNER) push(b, 'green')
  push('', 'default')

  const hour = now.getHours()
  const greet = greetingForHour(hour)
  const name = progress.username || 'user'
  push(`${greet}, ${name}.`, 'cyan')
  push(now.toLocaleString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }), 'dim')

  if (progress.commands === 0) {
    push(`Welcome aboard, ${name} — this is your first ride. Type \`tour\` and I will show you around.`, 'default')
  } else {
    const level = levelFromXp(progress.xp)
    push(
      `Welcome back, ${name} — ${progress.commands} commands run, ${progress.tabsOpened} tabs opened, level ${level}.`,
      'default',
    )
  }

  push('', 'default')
  push(`Tip: ${randomOf(TIPS)}`, 'yellow')
  push('Personalize with `name <your-name>` · try `calc 12*8` · `time` · `date`', 'dim')
  push('Commands: `tour` · `help` · `tip` · `stats` · `achievements`', 'dim')
  push('', 'default')
  return rows
}
