import React, { useRef, useState } from 'react'
import { FILE_TYPES } from '../lib/parse.js'

const ORDER = ['participant_oi', 'participant_vol', 'fii_stats', 'option_chain']

export default function UploadSlots({ bundle, onUpload, onUploadMany, error }) {
  // Optional manual date override (used only if a file's date isn't detected).
  const [useManualDate, setUseManualDate] = useState(false)
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10))
  const overrideDate = useManualDate ? manualDate : null

  return (
    <div className="card">
      <h2>📤 NSE Files Upload <span className="cap">एक साथ या अलग-अलग</span></h2>

      <p className="disclaimer" style={{ marginBottom: 10 }}>
        हर file अपनी <b>अपनी date</b> में save होती है — यानी अलग-अलग दिन का data डालने पर पुराने दिन <b>save रहते हैं</b> और
        multi-day sheet बनती जाती है। नीचे नए slots हमेशा उसी दिन के लिए हैं जो आप अभी देख रहे हैं।
      </p>

      <ComboDrop onUploadMany={(files) => onUploadMany(files, overrideDate)} />

      <label className="date-toggle">
        <input type="checkbox" checked={useManualDate} onChange={(e) => setUseManualDate(e.target.checked)} />
        <span>Date खुद चुनें (अगर file से date न पकड़ी जाए)</span>
      </label>
      {useManualDate && (
        <input type="date" value={manualDate} max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setManualDate(e.target.value)} className="date-input" />
      )}

      <div className="divider"><span>या हर file अलग slot में</span></div>

      <div className="slot-grid">
        {ORDER.map((t) => (
          <Slot key={t} type={t} meta={FILE_TYPES[t]} loaded={bundle?.sources?.[t]}
            onUpload={(f, ty) => onUpload(f, ty, overrideDate)} />
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
      <div className="combo-hint">एक बार में सभी files select करें — app खुद पहचान लेगा कौन सी file किस slot की है और सही दिन में save कर देगा (OI, Volume, FII Stats, Option Chain)</div>
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
