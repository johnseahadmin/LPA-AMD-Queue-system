import { useState, useEffect, useCallback } from 'react'
import { generateSlots, fmt12, formatDate, nearestSlot } from '../lib/utils'
import {
  getSession, getRooms, getBookings,
  updateBooking, updatePersonsCert, createBooking, checkPin,
} from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { toast } from '../components/Toast'

const DEFAULT_PIN = 'doc1234'

export default function DoctorPanel() {
  const [authed, setAuthed] = useState(false)
  const [pin, setPin] = useState('')
  const [roomId, setRoomId] = useState('')
  const [session, setSession] = useState(null)
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [amdForm, setAmdForm] = useState({ name: '', phone: '' })
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (sess) => {
    const s = sess || await getSession()
    setSession(s)
    if (s) {
      const [r, b] = await Promise.all([getRooms(s.id), getBookings(s.id)])
      setRooms(r)
      setBookings(b)
    }
  }, [])

  // pre-load rooms for select
  useEffect(() => {
    async function preload() {
      const s = await getSession()
      setSession(s)
      if (s) setRooms(await getRooms(s.id))
    }
    preload()
  }, [])

  // real-time
  useEffect(() => {
    if (!authed || !session) return
    const sub = supabase
      .channel('doc-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => load(session))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'persons' }, () => load(session))
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [authed, session, load])

  async function login() {
    const ok = await checkPin('certifier', pin) || pin === DEFAULT_PIN
    if (ok && roomId) {
      setAuthed(true)
      setLoading(true)
      await load()
      setLoading(false)
    } else if (!roomId) {
      toast('Please select your room')
    } else {
      toast('Incorrect PIN')
    }
  }

  const myRoom = rooms.find(r => r.id === roomId)
  const queue = bookings
    .filter(b => b.room_id === roomId && !b.cancelled && !b.done && b.arrived)
    .sort((a, b) => a.slot_time.localeCompare(b.slot_time))

  const current = queue[0] || null
  const nextUp = queue.slice(1)

  async function markDone(id) {
    await updateBooking(id, { done: true })
    setBookings(prev => prev.map(b => b.id === id ? { ...b, done: true } : b))
    toast('Marked as done')
  }

  async function addAMD(id) {
    await updatePersonsCert(id, 'LPA+AMD')
    setBookings(prev => prev.map(b => {
      if (b.id !== id) return b
      return { ...b, persons: (b.persons || []).map(p => ({ ...p, cert: 'LPA+AMD' })) }
    }))
    toast('AMD added')
  }

  async function submitAMD() {
    if (!amdForm.name.trim()) { toast('Enter a name'); return }
    const slots = session ? generateSlots(session.start_time, session.end_time) : []
    const slot = nearestSlot(slots) || slots[0]
    const booking = {
      session_id: session.id,
      booker_name: amdForm.name.trim(),
      phone: amdForm.phone.trim(),
      email: '',
      slot_time: slot,
      arrived: true,
      done: false,
      cancelled: false,
      room_id: roomId,
      is_walkin: true,
    }
    await createBooking(booking, [{ name: amdForm.name.trim(), cert: 'AMD (walk-in)' }])
    setAmdForm({ name: '', phone: '' })
    await load(session)
    toast('AMD walk-in added')
  }

  if (!authed) {
    return (
      <div className="panel">
        <div className="login-wrap">
          <div className="card">
            <h2>Certifier login</h2>
            <div className="form-group">
              <label>Your room</label>
              <select value={roomId} onChange={e => setRoomId(e.target.value)}>
                <option value="">Select your room</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name} — {r.certifier}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>PIN / password</label>
              <input type="password" placeholder="Enter PIN" value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && login()} />
            </div>
            <button className="btn btn-primary btn-full" onClick={login}>Sign in</button>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: '0.75rem', textAlign: 'center' }}>
              Default PIN: <span className="mono">doc1234</span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) return <div className="panel"><div className="loader"><i className="ti ti-loader-2" /> Loading…</div></div>

  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1>{myRoom?.name || 'Room'} — {myRoom?.certifier || ''}</h1>
          <p className="subtitle">{session?.date ? formatDate(session.date) : ''}</p>
        </div>
        <button className="btn btn-ghost" onClick={() => { setAuthed(false); setPin('') }}>
          <i className="ti ti-logout" /> Sign out
        </button>
      </div>

      {/* Current client */}
      <div className="card">
        <div className="card-title"><i className="ti ti-user-check" aria-hidden="true" /> Now serving</div>
        {current ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>{current.booker_name}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'DM Mono, monospace', marginBottom: 8 }}>
                {fmt12(current.slot_time)} · {current.persons?.length || 1} person(s)
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                {[...new Set((current.persons || []).map(p => p.cert))].map(c => (
                  <span key={c} className={`badge ${c.includes('AMD') ? 'badge-purple' : 'badge-teal'}`}>{c}</span>
                ))}
              </div>
              {current.persons?.length > 1 && (
                <div>
                  {current.persons.map((p, i) => (
                    <div key={i} style={{ fontSize: 13, marginBottom: 2 }}>{p.name} — <b>{p.cert}</b></div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-success" onClick={() => markDone(current.id)}>
                <i className="ti ti-check" /> Mark done
              </button>
              {!(current.persons || []).some(p => p.cert.includes('AMD')) && (
                <button className="btn btn-warn" onClick={() => addAMD(current.id)}>
                  <i className="ti ti-plus" /> Add AMD
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="empty"><i className="ti ti-couch" /><p>No client assigned yet</p></div>
        )}
      </div>

      {/* Queue */}
      <div className="card">
        <div className="card-title"><i className="ti ti-clock" aria-hidden="true" /> Next in queue</div>
        {nextUp.length ? nextUp.map(b => {
          const certs = [...new Set((b.persons || []).map(p => p.cert))]
          return (
            <div key={b.id} className="client-row">
              <span className="dot dot-amber" />
              <div className="client-info">
                <div className="client-name">{b.booker_name} <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--muted)' }}>({b.persons?.length || 1})</span></div>
                <div className="client-meta">{fmt12(b.slot_time)}</div>
                <div style={{ marginTop: 4, display: 'flex', gap: 4 }}>
                  {certs.map(c => <span key={c} className={`badge ${c.includes('AMD') ? 'badge-purple' : 'badge-teal'}`}>{c}</span>)}
                </div>
              </div>
            </div>
          )
        }) : (
          <div className="empty" style={{ padding: '1rem' }}><i className="ti ti-checks" /><p>Queue is clear</p></div>
        )}
      </div>

      {/* AMD walk-in */}
      <div className="card">
        <div className="card-title"><i className="ti ti-user-plus" aria-hidden="true" /> AMD walk-in</div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: '0.75rem' }}>
          Client did not book AMD but wants it done now.
        </p>
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Name</label>
            <input type="text" placeholder="Full name" value={amdForm.name}
              onChange={e => setAmdForm({ ...amdForm, name: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Phone</label>
            <input type="text" placeholder="+65..." value={amdForm.phone}
              onChange={e => setAmdForm({ ...amdForm, phone: e.target.value })} />
          </div>
        </div>
        <button className="btn btn-warn" style={{ marginTop: '0.5rem' }} onClick={submitAMD}>
          <i className="ti ti-plus" /> Add AMD client
        </button>
      </div>
    </div>
  )
}
