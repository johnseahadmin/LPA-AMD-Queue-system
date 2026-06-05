import { useState } from 'react'
import ClientPanel from './pages/ClientPanel'
import FacilitatorPanel from './pages/FacilitatorPanel'
import DoctorPanel from './pages/DoctorPanel'
import DisplayPanel from './pages/DisplayPanel'
import { Toast, useToast } from './components/Toast'

const TABS = [
  { id: 'client',      label: 'Book a slot',   icon: 'ti-calendar-plus' },
  { id: 'facilitator', label: 'Facilitator',   icon: 'ti-layout-dashboard' },
  { id: 'certifier',   label: 'Certifier',     icon: 'ti-stethoscope' },
  { id: 'display',     label: 'Display board', icon: 'ti-device-tv' },
]

export default function App() {
  const [tab, setTab] = useState('client')
  const { msg, show } = useToast()

  const isDisplay = tab === 'display'

  return (
    <>
      {!isDisplay && (
        <nav className="nav">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`nav-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <i className={`ti ${t.icon}`} aria-hidden="true" />
              {t.label}
            </button>
          ))}
        </nav>
      )}

      {tab === 'client'      && <ClientPanel />}
      {tab === 'facilitator' && <FacilitatorPanel />}
      {tab === 'certifier'   && <DoctorPanel />}
      {tab === 'display'     && (
        <div>
          <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 200 }}>
            <button className="btn btn-ghost btn-sm"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={() => setTab('facilitator')}>
              <i className="ti ti-arrow-left" /> Back
            </button>
          </div>
          <DisplayPanel />
        </div>
      )}

      <Toast msg={msg} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
