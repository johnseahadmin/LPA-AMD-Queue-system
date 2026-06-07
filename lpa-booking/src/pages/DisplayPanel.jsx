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
      <div style={{ fontSize: 36, fontWeight: 300, fontFamily: 'DM Mono, monospace', color: '#E8C4C4', lineHeight: 1 }}>
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
    <div style={{
      flex: 1,
      background: 'rgba(10,4,4,0.65)',
      border: '1px solid rgba(139,26,26,0.35)',
      borderRadius: 16,
      padding: '2rem',
      minWidth: 260,
      position: 'relative',
      overflow: 'hidden',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      {/* top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent, rgba(139,26,26,0.8), transparent)',
      }} />

      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 4 }}>
        {room.name}
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: '2rem', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 15 }}>
        {room.certifier}
      </div>

      {current ? (
        <>
          <div style={{ fontSize: 11, color: 'rgba(139,26,26,0.8)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
            Now serving
          </div>
          <div style={{ fontSize: 26, fontWeight: 400, marginBottom: 6, lineHeight: 1.2, fontFamily: 'Cormorant Garamond, serif', color: '#F5F0E8' }}>
            {current.booker_name}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {certs.map(c => (
              <span key={c} style={{
                display: 'inline-block',
                background: c.includes('AMD') ? 'rgba(74,56,120,0.4)' : 'rgba(139,26,26,0.3)',
                color: c.includes('AMD') ? '#C4BFEF' : '#E8C4C4',
                border: `1px solid ${c.includes('AMD') ? 'rgba(74,56,120,0.5)' : 'rgba(139,26,26,0.5)'}`,
                padding: '3px 10px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}>
                {c}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'DM Mono, monospace' }}>
            {fmt12(current.slot_time)} · {current.persons?.length || 1} person(s)
          </div>
        </>
      ) : (
        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 15, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>No client in room</div>
      )}

      {next && (
        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(139,26,26,0.2)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>Up next</div>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', fontFamily: 'Cormorant Garamond, serif' }}>{next.booker_name}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 2, fontFamily: 'DM Mono, monospace' }}>{fmt12(next.slot_time)}</div>
        </div>
      )}

      {queue.length > 2 && (
        <div style={{ marginTop: '1rem', fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
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
    <div style={{
      minHeight: '100vh',
      backgroundImage: 'url(/lpa_amd_poster.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative',
      fontFamily: 'DM Sans, sans-serif',
      color: '#F5F0E8',
    }}>
      {/* Dark overlay */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(8,3,3,0.78)',
        zIndex: 0,
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, padding: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 300, fontFamily: 'Cormorant Garamond, serif', color: '#F5F0E8', marginBottom: 4, letterSpacing: '0.02em' }}>
              LPA &amp; AMD Certification
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>
              {session?.date ? formatDate(session.date) : 'Please proceed to your assigned room'}
            </div>
          </div>
          <Clock />
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          {rooms.length ? rooms.map(r => (
            <RoomCard key={r.id} room={r} bookings={bookings} />
          )) : (
            <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 15, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>No rooms configured for this session.</div>
          )}
        </div>

        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(139,26,26,0.2)', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.04em' }}>
            Please wait in the waiting area until your name appears. Bring all required documents.
          </p>
        </div>
      </div>
    </div>
  )
}
