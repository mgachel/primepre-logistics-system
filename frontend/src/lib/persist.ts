// src/lib/persist.ts

// Save data to localStorage
export function saveToStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error("Error saving to storage", error)
  }
}

// Load data from localStorage
export function loadFromStorage<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : null
  } catch (error) {
    console.error("Error loading from storage", error)
    return null
  }
}

export { loadFromStorage as persistGet, saveToStorage as persistSet }
