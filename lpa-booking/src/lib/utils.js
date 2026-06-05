export function generateSlots(start, end) {
  const slots = []
  let [sh, sm] = start.split(':').map(Number)
  let [eh, em] = end.split(':').map(Number)
  let cur = sh * 60 + sm
  const endMin = eh * 60 + em
  while (cur < endMin) {
    const h = Math.floor(cur / 60)
    const m = cur % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    cur += 15
  }
  return slots
}

export function fmt12(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')}${ampm}`
}

export function formatDate(d) {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-SG', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export function nearestSlot(slots) {
  if (!slots.length) return slots[0]
  const now = new Date()
  const cur = now.getHours() * 60 + now.getMinutes()
  return slots.reduce((a, b) => {
    const [ah, am] = a.split(':').map(Number)
    const [bh, bm] = b.split(':').map(Number)
    return Math.abs(ah * 60 + am - cur) <= Math.abs(bh * 60 + bm - cur) ? a : b
  })
}
