import React, { useRef, useState } from 'react'
import { FILE_TYPES } from '../lib/parse.js'

const ORDER = ['participant_oi', 'participant_vol', 'fii_stats', 'option_chain']

export default function UploadSlots({ bundle, onUpload, onUploadMany, error }) {
  return (
    <div className="card">
      <h2>📤 NSE Files Upload <span className="cap">एक साथ या अलग-अलग</span></h2>

      <ComboDrop onUploadMany={onUploadMany} />

      <div className="divider"><span>या हर file अलग slot में</span></div>

      <div className="slot-grid">
        {ORDER.map((t) => (
          <Slot key={t} type={t} meta={FILE_TYPES[t]} loaded={bundle?.sources?.[t]} onUpload={onUpload} />
        ))}
      </div>
      {error && <div className="warnbox" style={{ marginTop: 12 }}>⚠️ {error}</div>}
    </div>
  )
}

function ComboDrop({ onUploadMany }) {
  const ref = useRef(null)
  const [drag, setDrag] = useState(false)
  const pick = (files) => { if (files?.length) onUploadMany(files) }
  return (
    <div
      className={`combo-drop ${drag ? 'drag' : ''}`}
      onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files) }}
      role="button"
    >
      <div className="combo-icon">📥</div>
      <div className="combo-big">चारों files एक साथ यहाँ डालें</div>
      <div className="combo-hint">एक बार में सभी files select करें — app खुद पहचान लेगा कौन सी file किस slot की है (OI, Volume, FII Stats, Option Chain)</div>
      <input ref={ref} type="file" multiple onChange={(e) => pick(e.target.files)} />
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
      <input ref={ref} type="file" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  )
}
