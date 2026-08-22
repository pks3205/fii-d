import React, { useRef, useState } from 'react'
import { FILE_TYPES } from '../lib/parse.js'

const ORDER = ['participant_oi', 'participant_vol', 'fii_stats', 'fii_dii_cash', 'option_chain', 'vix']

export default function UploadSlots({ bundle, onUpload, error }) {
  return (
    <div className="card">
      <h2>📤 NSE Files Upload <span className="cap">हर report की अलग जगह</span></h2>
      <p className="disclaimer" style={{ marginBottom: 12 }}>
        NSE की <b>All Reports → Derivatives</b> से files download करके यहाँ डालें। जितनी ज़्यादा files, उतना clear signal।
        कोई एक file भी चले तो analysis मिलेगा। (App खुद पहचान लेगा कि कौन सी file है।)
      </p>
      <div className="slot-grid">
        {ORDER.map((t) => (
          <Slot key={t} type={t} meta={FILE_TYPES[t]} loaded={bundle?.sources?.[t]} onUpload={onUpload} />
        ))}
      </div>
      {error && <div className="warnbox" style={{ marginTop: 12 }}>⚠️ {error}</div>}
    </div>
  )
}

function Slot({ type, meta, loaded, onUpload }) {
  const ref = useRef(null)
  const [drag, setDrag] = useState(false)
  const pick = (f) => { if (f) onUpload(f, type) }
  return (
    <div
      className={`slot ${loaded ? 'loaded' : ''} ${drag ? 'drag' : ''}`}
      onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]) }}
    >
      <div className="slot-icon">{meta.icon}</div>
      <div className="slot-body">
        <div className="slot-title">{meta.label} {loaded && <span className="slot-ok">✓</span>}</div>
        <div className="slot-desc">{loaded ? '✅ Loaded — बदलने के लिए tap करें' : meta.desc}</div>
      </div>
      <input ref={ref} type="file" accept=".xlsx,.xls,.csv" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  )
}
