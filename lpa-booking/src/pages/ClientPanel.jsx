import { useState, useEffect } from 'react'
import { generateSlots, fmt12, formatDate } from '../lib/utils'
import { getSession, getBookings, createBooking } from '../lib/supabase'

function PersonRow({ index, value, onChange }) {
  return (
    <div className="client-row" style={{ marginBottom: 8 }}>
      <div className="client-info">
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          Person {index + 1}
        </div>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <input
            type="text"
            placeholder="Full name"
            value={value.name}
            onChange={e => onChange({ ...value, name: e.target.value })}
          />
          <select value={value.cert} onChange={e => onChange({ ...value, cert: e.target.value })}>
            <option value="LPA">LPA only</option>
            <option value="LPA+AMD">LPA + AMD</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export default function ClientPanel() {
  const [session, setSession] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [booker, setBooker] = useState({ name: '', phone: '', email: '' })
  const [persons, setPersons] = useState([{ name: '', cert: 'LPA' }])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const s = await getSession()
    setSession(s)
    if (s) {
      const bks = await getBookings(s.id)
      setBookings(bks)
    }
    setLoading(false)
  }

  function setCount(n) {
    const arr = Array.from({ length: n }, (_, i) => persons[i] || { name: '', cert: 'LPA' })
    setPersons(arr)
  }

  function slotCount(t) {
    return bookings.filter(b => b.slot_time === t && !b.cancelled).length
  }

  async function submit() {
    setError('')
    if (!booker.name.trim() || !booker.phone.trim() || !booker.email.trim()) {
      setError('Please fill in your name, phone number and email.'); return
    }
    if (!selectedSlot) { setError('Please select a time slot.'); return }
    for (let i = 0; i < persons.length; i++) {
      if (!persons[i].name.trim()) { setError(`Please enter a name for person ${i + 1}.`); return }
    }
    setSubmitting(true)
    try {
      const booking = {
        session_id: session.id,
        booker_name: booker.name.trim(),
        phone: booker.phone.trim(),
        email: booker.email.trim(),
        slot_time: selectedSlot,
        arrived: false,
        done: false,
        cancelled: false,
        room_id: null,
        is_walkin: false,
      }
      const personRows = persons.map(p => ({ name: p.name.trim(), cert: p.cert }))
      const created = await createBooking(booking, personRows)
      setDone({ id: created.id, slot: selectedSlot, persons })
    } catch (e) {
      setError('Booking failed: ' + e.message)
    }
    setSubmitting(false)
  }

  function reset() {
    setDone(null)
    setSelectedSlot(null)
    setBooker({ name: '', phone: '', email: '' })
    setPersons([{ name: '', cert: 'LPA' }])
    setError('')
    load()
  }

  if (loading) return <div className="panel"><div className="loader"><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> Loading session…</div></div>

  if (done) {
    return (
      <div className="panel">
        <div className="success-screen">
          <i className="ti ti-circle-check icon" />
          <h2>You're booked!</h2>
          <p className="subtitle">See you on {formatDate(session.date)} at {fmt12(done.slot)}</p>
          <div className="card" style={{ maxWidth: 360, margin: '1.5rem auto', textAlign: 'left' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Booking reference</div>
            <div className="mono" style={{ fontSize: 15, fontWeight: 500, color: 'var(--teal)', marginBottom: '1rem' }}>
              {done.id.slice(0, 8).toUpperCase()}
            </div>
            <div style={{ fontSize: 13, marginBottom: 4 }}><b>Slot:</b> {fmt12(done.slot)}</div>
            <div style={{ fontSize: 13 }}>
              <b>Group:</b> {done.persons.map(p => `${p.name} (${p.cert})`).join(', ')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: '0.75rem' }}>
              Please bring all required documents and arrive 5 minutes early.
            </div>
          </div>
          <button className="btn btn-ghost" onClick={reset}><i className="ti ti-plus" /> Book another</button>
        </div>
      </div>
    )
  }

  const slots = session ? generateSlots(session.start_time, session.end_time) : []
  const cap = session?.slot_cap || 2

  return (
    <div className="panel">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1>Book your certification slot</h1>
        <p className="subtitle">LPA &amp; AMD certification · 15-minute appointments</p>
      </div>

      {session ? (
        <div className="session-banner">
          <i className="ti ti-calendar-event" aria-hidden="true" />
          {formatDate(session.date)} · {fmt12(session.start_time)} – {fmt12(session.end_time)}
        </div>
      ) : (
        <div className="card">
          <div className="empty"><i className="ti ti-calendar-off" /><p>No upcoming session is available for booking yet.</p></div>
        </div>
      )}

      {session && <>
        <div className="card">
          <div className="card-title"><i className="ti ti-user" aria-hidden="true" /> Your details</div>
          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Name</label>
              <input type="text" placeholder="Full name" value={booker.name} onChange={e => setBooker({ ...booker, name: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Mobile number</label>
              <input type="tel" placeholder="+65 9123 4567" value={booker.phone} onChange={e => setBooker({ ...booker, phone: e.target.value })} />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '1rem', marginBottom: 0 }}>
            <label>Email address</label>
            <input type="email" placeholder="you@email.com" value={booker.email} onChange={e => setBooker({ ...booker, email: e.target.value })} />
          </div>
        </div>

        <div className="card">
          <div className="card-title"><i className="ti ti-users" aria-hidden="true" /> Who is coming?</div>
          <div className="form-group">
            <label>Number of people in your group</label>
            <select value={persons.length} onChange={e => setCount(parseInt(e.target.value))}>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} {n === 1 ? 'person' : 'people'}</option>)}
            </select>
          </div>
          {persons.map((p, i) => (
            <PersonRow key={i} index={i} value={p} onChange={v => {
              const arr = [...persons]; arr[i] = v; setPersons(arr)
            }} />
          ))}
        </div>

        <div className="card">
          <div className="card-title"><i className="ti ti-clock" aria-hidden="true" /> Choose a time slot</div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: '1rem' }}>
            Your group shares one 15-minute slot. Select your preferred time.
          </p>
          <div className="slots-grid">
            {slots.map(t => {
              const count = slotCount(t)
              const full = count >= cap
              const sel = selectedSlot === t
              return (
                <div
                  key={t}
                  className={`slot ${full ? 'slot-full' : ''} ${sel ? 'slot-selected' : ''}`}
                  onClick={() => !full && setSelectedSlot(t)}
                >
                  <div className="slot-time">{fmt12(t)}</div>
                  <div className="slot-count">{count}/{cap}</div>
                </div>
              )
            })}
          </div>
        </div>

        {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: '0.75rem' }}>{error}</p>}
        <button className="btn btn-primary btn-full" onClick={submit} disabled={submitting}>
          {submitting ? <><i className="ti ti-loader-2" /> Booking…</> : <><i className="ti ti-check" /> Confirm booking</>}
        </button>
      </>}
    </div>
  )
}
