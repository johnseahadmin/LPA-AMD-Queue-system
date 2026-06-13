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
    <div style={{
      background: '#1B2E6B',
      color: '#fff',
      borderRadius: 10,
      padding: '8px 16px',
      textAlign: 'center',
      minWidth: 90,
    }}>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 22, fontWeight: 500, lineHeight: 1 }}>
        {now.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div style={{ fontSize: 10, opacity: 0.7, marginTop: 3, letterSpacing: '0.05em' }}>
        {now.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
      </div>
    </div>
  )
}

function RoomCard({ room, bookings, index }) {
  const queue = bookings
    .filter(b => b.room_id === room.id && !b.cancelled && !b.done && b.arrived)
    .sort((a, b) => a.slot_time.localeCompare(b.slot_time))

  const current = queue[0]
  const next = queue[1]
  const certs = current ? [...new Set((current.persons || []).map(p => p.cert))] : []

  const colors = ['#1B2E6B', '#8B1A1A', '#1A6B3C', '#6B4A1A']
  const color = colors[index % colors.length]

  return (
    <div style={{
      flex: 1,
      minWidth: 280,
      background: '#FFFFFF',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        background: color,
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600, marginBottom: 2 }}>
            {room.name}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 400 }}>
            {room.certifier}
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 8,
          padding: '4px 12px',
          fontSize: 11,
          color: 'rgba(255,255,255,0.8)',
          fontWeight: 500,
        }}>
          {queue.length} waiting
        </div>
      </div>

      <div style={{ padding: '24px', flex: 1 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '2px', color: '#999', fontWeight: 600, marginBottom: 12 }}>
          Now serving
        </div>

        {current ? (
          <>
            <div style={{
              fontSize: 52,
              fontWeight: 700,
              color: color,
              lineHeight: 1,
              marginBottom: 8,
              fontFamily: 'Poppins, sans-serif',
              letterSpacing: '-1px',
            }}>
              {current.booker_name.split(' ')[0].toUpperCase()}
            </div>
            <div style={{ fontSize: 14, color: '#444', fontWeight: 500, marginBottom: 6 }}>
              {current.booker_name}
            </div>
            <div style={{ fontSize: 12, color: '#999', fontFamily: 'DM Mono, monospace', marginBottom: 12 }}>
              {fmt12(current.slot_time)} · {current.persons?.length || 1} person(s)
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {certs.map(c => (
                <span key={c} style={{
                  background: color + '15',
                  color: color,
                  border: `1px solid ${color}30`,
                  padding: '3px 12px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {c}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{
              fontSize: 42,
              fontWeight: 700,
              color: '#D0D8EE',
              lineHeight: 1,
              marginBottom: 8,
              fontFamily: 'Poppins, sans-serif',
            }}>
              —
            </div>
            <div style={{
              background: '#F0F4FF',
              color: '#8A9BB5',
              padding: '6px 16px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              Available
            </div>
          </div>
        )}
      </div>

      {next && (
        <div style={{
          padding: '14px 24px',
          background: '#F8FAFF',
          borderTop: '1px solid #EEF1FB',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#999', fontWeight: 600, flexShrink: 0 }}>
            Next
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#333', flex: 1 }}>{next.booker_name}</div>
          <div style={{ fontSize: 11, color: '#999', fontFamily: 'DM Mono, monospace' }}>{fmt12(next.slot_time)}</div>
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

  const done = bookings.filter(b => b.done && !b.cancelled).length
  const arrived = bookings.filter(b => b.arrived && !b.cancelled).length

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F0F4FF 0%, #F8F9FF 100%)',
      fontFamily: 'Poppins, sans-serif',
      color: '#1A1A2E',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E0E8F4',
        padding: '16px 2.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 12px rgba(27,46,107,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 4, height: 36, background: '#1B2E6B', borderRadius: 2 }} />
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '2px', color: '#8A9BB5', fontWeight: 600 }}>
              LPA · AMD Certification
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#1B2E6B', lineHeight: 1.2 }}>
              Queue Display
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 12, color: '#8A9BB5', textAlign: 'right' }}>
            {session?.date ? formatDate(session.date) : ''}
          </div>
          <Clock />
        </div>
      </div>

      <div style={{ flex: 1, padding: '2rem 2.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {rooms.length ? rooms.map((r, i) => (
          <RoomCard key={r.id} room={r} bookings={bookings} index={i} />
        )) : (
          <div style={{ color: '#8A9BB5', fontSize: 15, margin: 'auto', textAlign: 'center', padding: '4rem' }}>
            No rooms configured for this session.
          </div>
        )}
      </div>

      <div style={{
        background: '#FFFFFF',
        borderTop: '1px solid #E0E8F4',
        padding: '16px 2.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 12, color: '#8A9BB5' }}>
          Please monitor your SMS notification and remain ready with your IC
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#1B2E6B', fontFamily: 'DM Mono, monospace', background: '#EEF1FB', borderRadius: 10, padding: '4px 20px', minWidth: 70 }}>
              {arrived}
            </div>
            <div style={{ fontSize: 10, color: '#8A9BB5', marginTop: 4, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              Arrived
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#1A6B3C', fontFamily: 'DM Mono, monospace', background: '#EEF8F2', borderRadius: 10, padding: '4px 20px', minWidth: 70 }}>
              {done}
            </div>
            <div style={{ fontSize: 10, color: '#8A9BB5', marginTop: 4, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              Completed
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
