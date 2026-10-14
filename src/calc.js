export function evaluateExpression(input) {
  const s = String(input).replace(/\s+/g, '')
  if (!s) throw new Error('empty expression')
  let pos = 0

  const eat = (ch) => {
    if (s[pos] === ch) {
      pos += 1
      return true
    }
    return false
  }

  function parseExpression() {
    let value = parseTerm()
    for (;;) {
      if (eat('+')) value += parseTerm()
      else if (eat('-')) value -= parseTerm()
      else return value
    }
  }

  function parseTerm() {
    let value = parsePower()
    for (;;) {
      if (eat('*')) value *= parsePower()
      else if (eat('/')) value /= parsePower()
      else if (eat('%')) value %= parsePower()
      else return value
    }
  }

  function parsePower() {
    const base = parseUnary()
    if (eat('^')) return base ** parsePower()
    return base
  }

  function parseUnary() {
    if (eat('+')) return parseUnary()
    if (eat('-')) return -parseUnary()
    return parsePrimary()
  }

  function parsePrimary() {
    if (eat('(')) {
      const value = parseExpression()
      if (!eat(')')) throw new Error('missing closing parenthesis')
      return value
    }
    const start = pos
    while (pos < s.length && /[\d.]/.test(s[pos])) pos += 1
    if (pos === start) throw new Error(`unexpected '${s[pos] ?? 'end'}'`)
    const value = Number(s.slice(start, pos))
    if (Number.isNaN(value)) throw new Error('invalid number')
    return value
  }

  const result = parseExpression()
  if (pos !== s.length) throw new Error(`unexpected '${s[pos]}'`)
  return result
}

export function isArithmetic(input) {
  const s = input.trim()
  if (!/^[0-9+\-*/%^().\s]+$/.test(s)) return false
  if (!/[0-9]/.test(s)) return false
  return /[+\-*/%^]/.test(s)
}

export function formatNumber(value) {
  if (!Number.isFinite(value)) return String(value)
  const rounded = Math.round(value * 1e10) / 1e10
  return String(rounded)
}
