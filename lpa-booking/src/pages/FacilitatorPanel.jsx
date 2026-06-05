import { useState, useEffect, useCallback } from 'react'
import { generateSlots, fmt12, formatDate, genId } from '../lib/utils'
import {
  getSession, upsertSession, getRooms, upsertRooms, deleteRoom,
  getBookings, updateBooking, createBooking, checkPin,
} from '../lib/supabase'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { toast } from '../components/Toast'

const DEFAULT_PIN = 'admin1234'

export default function FacilitatorPanel() {
  const [authed, setAuthed] = useState(false)
  const [pin, setPin] = useState('')
  const [session, setSession] = useState(null)
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)

  // Session form state
  const [sessDate, setSessDate] = useState('')
  const [sessStart, setSessStart] = useState('13:30')
  const [sessEnd, setSessEnd] = useState('17:30')
  const [sessCap, setSessCap] = useState(2)

  const load = useCallback(async (sess) => {
    const s = sess || await getSession()
    setSession(s)
    if (s) {
      setSessDate(s.date || '')
      setSessStart(s.start_time || '13:30')
      setSessEnd(s.end_time || '17:30')
      setSessCap(s.slot_cap || 2)
      const [r, b] = await Promise.all([getRooms(s.id), getBookings(s.id)])
      setRooms(r)
      setBookings(b)
    }
  }, [])

  // Real-time subscription
  useEffect(() => {
    if (!authed || !session) return
    const sub = supabase
      .channel('fac-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => load(session))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'persons' }, () => load(session))
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [authed, session, load])

  async function login() {
    const ok = await checkPin('facilitator', pin) || pin === DEFAULT_PIN
    if (ok) {
      setAuthed(true)
      setLoading(true)
      await load()
      setLoading(false)
    } else {
      toast('Incorrect PIN')
    }
  }

  async function saveSession() {
    try {
      const payload = {
        date: sessDate,
        start_time: sessStart,
        end_time: sessEnd,
        slot_cap: parseInt(sessCap),
        ...(session?.id ? { id: session.id } : {}),
      }
      const saved = await upsertSession(payload)
      setSession(saved)
      // Upsert rooms with session_id
      const roomRows = rooms.map((r, i) => ({
        ...(r.id && !r.id.startsWith('new_') ? { id: r.id } : {}),
        session_id: saved.id,
        name: r.name,
        certifier: r.certifier,
        sort_order: i,
      }))
      const saved_rooms = await upsertRooms(roomRows)
      setRooms(saved_rooms)
      toast('Session saved')
    } catch (e) {
      toast('Error: ' + e.message)
    }
  }

  function addRoom() {
    setRooms(r => [...r, { id: 'new_' + genId(), name: `Room ${String.fromCharCode(65 + r.length)}`, certifier: '', session_id: session?.id }])
  }

  async function removeRoom(idx) {
    const r = rooms[idx]
    if (r.id && !r.id.startsWith('new_')) {
      await deleteRoom(r.id)
    }
    setRooms(prev => prev.filter((_, i) => i !== idx))
  }

  async function markArrived(id) {
    await updateBooking(id, { arrived: true })
    setBookings(prev => prev.map(b => b.id === id ? { ...b, arrived: true } : b))
    toast('Marked as arrived')
  }

  async function cancelBooking(id) {
    if (!confirm('Cancel this booking?')) return
    await updateBooking(id, { cancelled: true })
    setBookings(prev => prev.map(b => b.id === id ? { ...b, cancelled: true } : b))
    toast('Booking cancelled')
  }

  async function assignRoom(bookingId, roomId) {
    await updateBooking(bookingId, { room_id: roomId, arrived: true })
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, room_id: roomId, arrived: true } : b))
    setModal(null)
    toast('Room assigned')
  }

  async function saveWalkin(data) {
    const booking = {
      session_id: session.id,
      booker_name: data.name,
      phone: data.phone,
      email: '',
      slot_time: data.slot,
      arrived: true,
      done: false,
      cancelled: false,
      room_id: data.roomId || null,
      is_walkin: true,
    }
    await createBooking(booking, [{ name: data.name, cert: data.cert }])
    await load(session)
    setModal(null)
    toast('Walk-in added')
  }

  if (!authed) {
    return (
      <div className="panel">
        <div className="login-wrap">
          <div className="card">
            <h2>Facilitator login</h2>
            <div className="form-group">
              <label>PIN / password</label>
              <input type="password" placeholder="Enter PIN" value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && login()} />
            </div>
            <button className="btn btn-primary btn-full" onClick={login}>Sign in</button>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: '0.75rem', textAlign: 'center' }}>
              Default PIN: <span className="mono">admin1234</span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) return <div className="panel"><div className="loader"><i className="ti ti-loader-2" /> Loading…</div></div>

  const slots = session ? generateSlots(session.start_time, session.end_time) : []

  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1>Facilitator</h1>
          <p className="subtitle">{session?.date ? formatDate(session.date) : 'No session configured'}</p>
        </div>
        <button className="btn btn-ghost" onClick={() => setAuthed(false)}><i className="ti ti-logout" /> Sign out</button>
      </div>

      {/* Session config */}
      <div className="card">
        <div className="card-title"><i className="ti ti-settings" aria-hidden="true" /> Session setup</div>
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Date</label>
            <input type="date" value={sessDate} onChange={e => setSessDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Slot capacity (per slot)</label>
            <input type="number" value={sessCap} min={1} max={10} onChange={e => setSessCap(e.target.value)} />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Start time</label>
            <input type="time" value={sessStart} onChange={e => setSessStart(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>End time</label>
            <input type="time" value={sessEnd} onChange={e => setSessEnd(e.target.value)} />
          </div>
        </div>

        <hr />
        <div className="card-title"><i className="ti ti-door" aria-hidden="true" /> Rooms &amp; certifiers</div>
        {rooms.map((r, i) => (
          <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <input type="text" value={r.name} style={{ width: 130 }}
              onChange={e => setRooms(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
            <input type="text" value={r.certifier} placeholder="Certifier name" style={{ flex: 1 }}
              onChange={e => setRooms(prev => prev.map((x, j) => j === i ? { ...x, certifier: e.target.value } : x))} />
            <button className="btn btn-danger btn-sm" onClick={() => removeRoom(i)}><i className="ti ti-trash" /></button>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={addRoom} style={{ marginTop: 4 }}><i className="ti ti-plus" /> Add room</button>
        <hr />
        <button className="btn btn-primary" onClick={saveSession}><i className="ti ti-device-floppy" /> Save session</button>
      </div>

      {/* Client list */}
      {session && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div className="card-title" style={{ marginBottom: 0 }}><i className="ti ti-list-check" aria-hidden="true" /> Bookings</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setModal({ type: 'walkin' })}>
              <i className="ti ti-user-plus" /> Add walk-in
            </button>
          </div>
          {slots.map(t => {
            const bks = bookings.filter(b => b.slot_time === t && !b.cancelled)
            if (!bks.length) return null
            return (
              <div key={t} style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase' }}>
                  {fmt12(t)}
                </div>
                {bks.map(b => {
                  const room = rooms.find(r => r.id === b.room_id)
                  const dotCls = b.done ? 'dot-green' : b.arrived ? 'dot-amber' : 'dot-gray'
                  const certs = [...new Set((b.persons || []).map(p => p.cert))]
                  return (
                    <div key={b.id} className="client-row">
                      <span className={`dot ${dotCls}`} />
                      <div className="client-info">
                        <div className="client-name">
                          {b.booker_name}
                          {b.persons?.length > 1 && <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--muted)', marginLeft: 6 }}>+{b.persons.length - 1}</span>}
                          {b.is_walkin && <span className="badge badge-amber" style={{ marginLeft: 6 }}>walk-in</span>}
                        </div>
                        <div className="client-meta">{b.phone} · Room: {room?.name || '—'}</div>
                        <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {certs.map(c => <span key={c} className={`badge ${c.includes('AMD') ? 'badge-purple' : 'badge-teal'}`}>{c}</span>)}
                        </div>
                      </div>
                      <div className="client-actions">
                        {!b.arrived && !b.done && (
                          <button className="btn btn-success btn-sm" onClick={() => markArrived(b.id)}>
                            <i className="ti ti-check" /> Arrived
                          </button>
                        )}
                        {b.arrived && !b.done && (
                          <button className="btn btn-primary btn-sm" onClick={() => setModal({ type: 'assign', bookingId: b.id })}>
                            <i className="ti ti-door" /> Room
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => setModal({ type: 'view', booking: b })}>
                          <i className="ti ti-eye" />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => cancelBooking(b.id)}>
                          <i className="ti ti-x" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
          {!bookings.filter(b => !b.cancelled).length && (
            <div className="empty"><i className="ti ti-calendar-off" /><p>No bookings yet</p></div>
          )}
        </div>
      )}

      {/* Rooms view */}
      {session && rooms.length > 0 && (
        <div className="card">
          <div className="card-title"><i className="ti ti-layout-columns" aria-hidden="true" /> Room queues</div>
          <div className="two-col">
            {rooms.map(r => {
              const assigned = bookings.filter(b => b.room_id === r.id && !b.cancelled).sort((a, b) => a.slot_time.localeCompare(b.slot_time))
              return (
                <div key={r.id}>
                  <div style={{ background: 'var(--gray-l)', borderRadius: 'var(--radius)', padding: '8px 12px', marginBottom: 8, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="ti ti-door" aria-hidden="true" /> {r.name}
                    <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--muted)', marginLeft: 4 }}>— {r.certifier}</span>
                  </div>
                  {!assigned.length ? (
                    <div className="empty" style={{ padding: '1rem' }}><i className="ti ti-users-minus" /><p>None assigned</p></div>
                  ) : assigned.map(b => (
                    <div key={b.id} className="client-row">
                      <span className={`dot ${b.done ? 'dot-green' : b.arrived ? 'dot-amber' : 'dot-gray'}`} />
                      <div className="client-info">
                        <div className="client-name">{b.booker_name}</div>
                        <div className="client-meta">{fmt12(b.slot_time)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      {modal?.type === 'assign' && (
        <Modal title="Assign to room" onClose={() => setModal(null)}>
          {rooms.map(r => (
            <button key={r.id} className="btn btn-ghost btn-full" style={{ marginBottom: 6, justifyContent: 'flex-start' }}
              onClick={() => assignRoom(modal.bookingId, r.id)}>
              <i className="ti ti-door" /> {r.name} — {r.certifier}
            </button>
          ))}
        </Modal>
      )}
      {modal?.type === 'view' && modal.booking && (
        <Modal title="Booking details" onClose={() => setModal(null)}>
          <ViewBooking booking={modal.booking} />
        </Modal>
      )}
      {modal?.type === 'walkin' && (
        <Modal title="Add walk-in" onClose={() => setModal(null)}>
          <WalkinForm slots={slots} rooms={rooms} onSave={saveWalkin} />
        </Modal>
      )}
    </div>
  )
}

function ViewBooking({ booking: b }) {
  return (
    <div style={{ fontSize: 14 }}>
      <p style={{ marginBottom: 6 }}><b>Ref:</b> <span className="mono">{b.id.slice(0, 8).toUpperCase()}</span></p>
      <p style={{ marginBottom: 6 }}><b>Booker:</b> {b.booker_name}</p>
      <p style={{ marginBottom: 6 }}><b>Phone:</b> {b.phone}</p>
      <p style={{ marginBottom: 6 }}><b>Email:</b> {b.email || '—'}</p>
      <p style={{ marginBottom: '1rem' }}><b>Slot:</b> {fmt12(b.slot_time)}</p>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Persons:</div>
      {(b.persons || []).map((p, i) => (
        <div key={i} className="client-row">
          <div className="client-info">
            <div className="client-name">{p.name}</div>
            <span className={`badge ${p.cert.includes('AMD') ? 'badge-purple' : 'badge-teal'}`}>{p.cert}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function WalkinForm({ slots, rooms, onSave }) {
  const [data, setData] = useState({ name: '', phone: '', cert: 'LPA', slot: slots[0] || '', roomId: '' })
  return (
    <div>
      <div className="form-group"><label>Name</label><input type="text" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} /></div>
      <div className="form-group"><label>Phone</label><input type="text" value={data.phone} onChange={e => setData({ ...data, phone: e.target.value })} /></div>
      <div className="form-group">
        <label>Certification</label>
        <select value={data.cert} onChange={e => setData({ ...data, cert: e.target.value })}>
          <option value="LPA">LPA only</option>
          <option value="LPA+AMD">LPA + AMD</option>
        </select>
      </div>
      <div className="form-group">
        <label>Slot</label>
        <select value={data.slot} onChange={e => setData({ ...data, slot: e.target.value })}>
          {slots.map(t => <option key={t} value={t}>{fmt12(t)}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>Assign to room</label>
        <select value={data.roomId} onChange={e => setData({ ...data, roomId: e.target.value })}>
          <option value="">— unassigned —</option>
          {rooms.map(r => <option key={r.id} value={r.id}>{r.name} — {r.certifier}</option>)}
        </select>
      </div>
      <button className="btn btn-primary btn-full" onClick={() => { if (!data.name) return; onSave(data) }}>
        <i className="ti ti-plus" /> Add walk-in
      </button>
    </div>
  )
}
