const UNIT_MS = {
  s: 1000, sec: 1000, secs: 1000, second: 1000, seconds: 1000,
  m: 60000, min: 60000, mins: 60000, minute: 60000, minutes: 60000,
  h: 3600000, hr: 3600000, hrs: 3600000, hour: 3600000, hours: 3600000,
}

function parseReminder(raw) {
  const timeMatch = raw.match(
    /in\s+(\d+)\s*(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h)\b/i,
  )
  if (!timeMatch) return null
  const amount = Number(timeMatch[1])
  const unitKey = timeMatch[2].toLowerCase().replace(/s$/, '')
  const factor = UNIT_MS[timeMatch[2].toLowerCase()] ?? UNIT_MS[unitKey]
  if (!factor) return null
  const textMatch = raw.match(/\bto\s+(.+)$/i)
  const text = textMatch ? textMatch[1].trim() : null
  if (!text) return null
  return { at: Date.now() + amount * factor, text }
}

export function resolveAppCommand(name, args, raw) {
  switch (name) {
    case 'todo':
    case 'tasks':
      return { appId: 'todo', params: {}, message: 'Opening the to-do list…' }
    case 'note':
    case 'notes':
      return { appId: 'notes', params: {}, message: 'Opening notes… (magic clipboard notes)' }
    case 'timer':
      return {
        appId: 'timer',
        params: { view: 'timer', preset: args[0] || null },
        message: args[0] ? `Timer set for ${args[0]}.` : 'Opening the timer…',
      }
    case 'stopwatch':
      return { appId: 'timer', params: { view: 'stopwatch' }, message: 'Opening the stopwatch…' }
    case 'alarm':
      return { appId: 'timer', params: { view: 'alarm' }, message: 'Opening alarms…' }
    case 'remind':
    case 'reminder': {
      const parsed = parseReminder(raw)
      if (parsed) {
        return {
          appId: 'timer',
          params: {
            view: 'reminders',
            add: { id: Date.now() + Math.floor(Math.random() * 1000), text: parsed.text, at: parsed.at, done: false },
          },
          message: `Reminder set: “${parsed.text}”.`,
        }
      }
      return {
        appId: 'timer',
        params: { view: 'reminders' },
        message: 'Opening reminders — try `remind me in 10 minutes to stretch`.',
      }
    }
    case 'convert':
    case 'units':
      return {
        appId: 'convert',
        params: { query: args.join(' ') },
        message: args.length ? `Converting ${args.join(' ')}…` : 'Opening the unit converter…',
      }
    case 'weather':
    case 'wx':
      return {
        appId: 'weather',
        params: { city: args.join(' ') },
        message: args.length ? `Fetching weather for ${args.join(' ')}…` : 'Opening the weather app…',
      }
    case 'random':
    case 'roll':
    case 'dice':
    case 'coin':
      return { appId: 'random', params: {}, message: 'Rolling the dice…' }
    case 'uuid':
      return { appId: 'devtools', params: { view: 'uuid' }, message: 'Generating UUIDs…' }
    case 'hash':
      return { appId: 'devtools', params: { view: 'hash', text: args.join(' ') }, message: 'Hashing…' }
    case 'base64':
      return { appId: 'devtools', params: { view: 'base64', text: args.join(' ') }, message: 'Opening Base64 tool…' }
    case 'json':
      return { appId: 'devtools', params: { view: 'json', text: args.join(' ') }, message: 'Opening JSON formatter…' }
    case 'draw':
    case 'paint':
      return { appId: 'draw', params: {}, message: 'Opening the sketchpad…' }
    case 'edit':
    case 'nano':
    case 'vim':
    case 'txt':
    case 'code':
      return {
        appId: 'textedit',
        params: { path: args[0] || '' },
        message: args[0] ? `Opening ${args[0]} in the editor…` : 'Opening the text editor…',
      }
    default:
      return null
  }
}

export const APP_COMMANDS = [
  'todo', 'notes', 'timer', 'stopwatch', 'alarm', 'remind',
  'convert', 'weather', 'random', 'uuid', 'hash', 'base64', 'json',
  'draw', 'edit',
]
