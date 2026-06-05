import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Sessions ──────────────────────────────────────────────
export async function getSession() {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') console.error(error)
  return data || null
}

export async function upsertSession(session) {
  if (session.id) {
    const { data, error } = await supabase
      .from('sessions')
      .update(session)
      .eq('id', session.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('sessions')
      .insert(session)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// ── Rooms ──────────────────────────────────────────────────
export async function getRooms(sessionId) {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('session_id', sessionId)
    .order('sort_order')
  if (error) console.error(error)
  return data || []
}

export async function upsertRooms(rooms) {
  const { data, error } = await supabase
    .from('rooms')
    .upsert(rooms, { onConflict: 'id' })
    .select()
  if (error) throw error
  return data
}

export async function deleteRoom(id) {
  const { error } = await supabase.from('rooms').delete().eq('id', id)
  if (error) throw error
}

// ── Bookings ───────────────────────────────────────────────
export async function getBookings(sessionId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, persons(*)')
    .eq('session_id', sessionId)
    .order('slot_time')
  if (error) console.error(error)
  return data || []
}

export async function createBooking(booking, persons) {
  const { data: bData, error: bErr } = await supabase
    .from('bookings')
    .insert(booking)
    .select()
    .single()
  if (bErr) throw bErr
  const personRows = persons.map(p => ({ ...p, booking_id: bData.id }))
  const { error: pErr } = await supabase.from('persons').insert(personRows)
  if (pErr) throw pErr
  return bData
}

export async function updateBooking(id, updates) {
  const { data, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePersonsCert(bookingId, cert) {
  const { error } = await supabase
    .from('persons')
    .update({ cert })
    .eq('booking_id', bookingId)
  if (error) throw error
}

// ── Auth (simple PIN check against sessions table) ────────
export async function checkPin(role, pin) {
  const { data, error } = await supabase
    .from('pins')
    .select('pin_hash')
    .eq('role', role)
    .single()
  if (error) return false
  return data.pin_hash === pin
}
