import { useState, useCallback, useRef } from 'react'

let _show = null

export function useToast() {
  const [msg, setMsg] = useState(null)
  const timer = useRef(null)

  const show = useCallback((text) => {
    setMsg(text)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(null), 2800)
  }, [])

  _show = show
  return { msg, show }
}

export function toast(text) {
  _show && _show(text)
}

export function Toast({ msg }) {
  if (!msg) return null
  return <div className="toast">{msg}</div>
}
