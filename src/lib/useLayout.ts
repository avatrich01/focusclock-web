'use client'
import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'focusclock.dashboard.layout.v1'

interface LayoutState {
  order: string[]
  collapsed: Record<string, boolean>
}

function load(defaults: string[]): LayoutState {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (raw) {
      const parsed = JSON.parse(raw) as LayoutState
      const known = parsed.order.filter((id) => defaults.includes(id))
      const missing = defaults.filter((id) => !known.includes(id))
      return { order: [...known, ...missing], collapsed: parsed.collapsed ?? {} }
    }
  } catch {
    /* ignore */
  }
  return { order: [...defaults], collapsed: {} }
}

export interface LayoutApi {
  order: string[]
  collapsed: Record<string, boolean>
  moveUp: (id: string) => void
  moveDown: (id: string) => void
  toggleCollapse: (id: string) => void
  reset: () => void
}

export function useLayout(defaults: string[]): LayoutApi {
  const [state, setState] = useState<LayoutState>(() => load(defaults))

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state])

  const move = useCallback((id: string, delta: number) => {
    setState((prev) => {
      const order = [...prev.order]
      const i = order.indexOf(id)
      const j = i + delta
      if (i < 0 || j < 0 || j >= order.length) return prev
      ;[order[i], order[j]] = [order[j], order[i]]
      return { ...prev, order }
    })
  }, [])

  return {
    order: state.order,
    collapsed: state.collapsed,
    moveUp: useCallback((id: string) => move(id, -1), [move]),
    moveDown: useCallback((id: string) => move(id, 1), [move]),
    toggleCollapse: useCallback(
      (id: string) =>
        setState((prev) => ({ ...prev, collapsed: { ...prev.collapsed, [id]: !prev.collapsed[id] } })),
      []
    ),
    reset: useCallback(() => setState({ order: [...defaults], collapsed: {} }), [defaults])
  }
}
