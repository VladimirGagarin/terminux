import { useEffect, useState } from 'react'

export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => loadJSON(key, initial))
  useEffect(() => {
    saveJSON(key, value)
  }, [key, value])
  return [value, setValue]
}
