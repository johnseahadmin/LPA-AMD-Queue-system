import { useState, useEffect, useCallback } from 'react'
import { getSession, getRooms, getBookings } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { fmt12, formatDate } from '../lib/utils'

function Clock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 36, fontWeight: 300, fontFamily: 'DM Mono, monospace', color: '#5DCAA5', lineHeight: 1 }}>
        {now.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
        {now.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
      </div>
    </div>
  )
}

function RoomCard({ room, bookings }) {
  const queue = bookings
    .filter(b => b.room_id === room.id && !b.cancelled && !b.done && b.arrived)
    .sort((a, b) => a.slot_time.localeCompare(b.slot_time))

  const current = queue[0]
  const next = queue[1]

  const certs = current ? [...new Set((current.persons || []).map(p => p.cert))] : []

  return (
    <div className="display-room" style={{ minWidth: 260 }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 4 }}>
        {room.name}
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: '2rem' }}>
        {room.certifier}
      </div>

      {current ? (
        <>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
            Now serving
          </div>
          <div style={{ fontSize: 26, fontWeight: 500, marginBottom: 6, lineHeight: 1.2 }}>
            {current.booker_name}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {certs.map(c => (
              <span key={c} style={{
                display: 'inline-block',
                background: c.includes('AMD') ? 'rgba(175,169,236,0.15)' : 'rgba(93,202,165,0.15)',
                color: c.includes('AMD') ? '#AFA9EC' : '#5DCAA5',
                border: `1px solid ${c.includes('AMD') ? 'rgba(175,169,236,0.3)' : 'rgba(93,202,165,0.3)'}`,
                padding: '3px 10px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 500,
              }}>
                {c}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            {fmt12(current.slot_time)} · {current.persons?.length || 1} person(s)
          </div>
        </>
      ) : (
        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 15 }}>No client in room</div>
      )}

      {next && (
        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>Up next</div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)' }}>{next.booker_name}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{fmt12(next.slot_time)}</div>
        </div>
      )}

      {queue.length > 2 && (
        <div style={{ marginTop: '1rem', fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
          +{queue.length - 2} more in queue
        </div>
      )}
    </div>
  )
}

export default function DisplayPanel() {
  const [session, setSession] = useState(null)
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])

  const load = useCallback(async () => {
    const s = await getSession()
    setSession(s)
    if (s) {
      const [r, b] = await Promise.all([getRooms(s.id), getBookings(s.id)])
      setRooms(r)
      setBookings(b)
    }
  }, [])

  useEffect(() => {
    load()
    const sub = supabase
      .channel('display-board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'persons' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, load)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [load])

  return (
    <div className="display-bg">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 300, color: '#5DCAA5', marginBottom: 4 }}>
            LPA &amp; AMD Certification
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            {session?.date ? formatDate(session.date) : 'Please proceed to your assigned room'}
          </div>
        </div>
        <Clock />
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        {rooms.length ? rooms.map(r => (
          <RoomCard key={r.id} room={r} bookings={bookings} />
        )) : (
          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 15 }}>No rooms configured for this session.</div>
        )}
      </div>

      <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
          Please wait in the waiting area until your name appears. Bring all required documents.
        </p>
      </div>
    </div>
  )
}
