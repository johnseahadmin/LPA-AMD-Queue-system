export default function Modal({ title, onClose, children }) {
  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
