import { useState } from 'react'
import ClientPanel from './pages/ClientPanel'
import FacilitatorPanel from './pages/FacilitatorPanel'
import DoctorPanel from './pages/DoctorPanel'
import DisplayPanel from './pages/DisplayPanel'
import { Toast, useToast } from './components/Toast'

const TABS = [
  { id: 'facilitator', label: 'Facilitator',   icon: 'ti-layout-dashboard' },
  { id: 'certifier',   label: 'Certifier',     icon: 'ti-stethoscope' },
  { id: 'display',     label: 'Display board', icon: 'ti-device-tv' },
]

export default function App() {
  const [tab, setTab] = useState('client')
  const { msg, show } = useToast()

  const isClient  = tab === 'client'
  const isDisplay = tab === 'display'

  return (
    <>
      {!isClient && !isDisplay && (
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
          <button
            className="nav-btn"
            style={{ marginLeft: 'auto' }}
            onClick={() => setTab('client')}
          >
            <i className="ti ti-arrow-left" /> Back to booking
          </button>
        </nav>
      )}

      {isClient && (
        <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 200 }}>
          <button
            onClick={() => setTab('facilitator')}
            style={{
              background: 'rgba(139,26,26,0.08)',
              border: '0.5px solid rgba(139,26,26,0.2)',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 11,
              color: 'var(--ash)',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              letterSpacing: '0.05em',
            }}
          >
            Staff login
          </button>
        </div>
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
