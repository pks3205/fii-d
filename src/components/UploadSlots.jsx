import React, { useRef, useState } from 'react'
import { FILE_TYPES } from '../lib/parse.js'

const ORDER = ['participant_oi', 'participant_vol', 'fii_stats', 'option_chain', 'fii_dii_cash']

export default function UploadSlots({ bundle, onUpload, onUploadMany, onSetVix, onDone, error }) {
  // The date ALL uploads in this session go to. Defaults to the file's own date
  // when "auto" is on; or a user-picked date. Auto is safest for real NSE files.
  const [autoDate, setAutoDate] = useState(true)
  const [pickDate, setPickDate] = useState(new Date().toISOString().slice(0, 10))
  const overrideDate = autoDate ? null : pickDate

  const [vixInput, setVixInput] = useState(bundle?.sources?.vix?.vix ?? '')

  const loadedCount = bundle ? Object.keys(bundle.sources).length : 0

  return (
    <div className="card">
      <h2>📤 NSE Files Upload <span className="cap">एक साथ या अलग-अलग</span></h2>

      {/* Date control at TOP so it applies to every upload below */}
      <div className="upload-date">
        <label className="date-toggle">
          <input type="checkbox" checked={autoDate} onChange={(e) => setAutoDate(e.target.checked)} />
          <span>File से date अपने आप ले लो (recommended)</span>
        </label>
        {!autoDate && (
          <input type="date" value={pickDate} max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setPickDate(e.target.value)} className="date-input" />
        )}
        <p className="muted-note">
          {autoDate
            ? 'हर file अपनी तारीख़ में save होगी। एक ही दिन की सभी files एक साथ चुनें — वे एक ही दिन में जुड़ जाएँगी।'
            : `सभी चुनी हुई files इसी तारीख़ (${pickDate}) में save होंगी।`}
        </p>
      </div>

      <ComboDrop onUploadMany={(files) => onUploadMany(files, overrideDate)} />

      <div className="divider"><span>या हर file अलग slot में</span></div>

      <div className="slot-grid">
        {ORDER.map((t) => (
          <Slot key={t} type={t} meta={FILE_TYPES[t]} loaded={bundle?.sources?.[t]}
            onUpload={(f, ty) => onUpload(f, ty, overrideDate)} />
        ))}
      </div>

      {/* VIX manual input (no file needed) */}
      <div className="vix-box">
        <div className="vix-label">🌡️ India VIX <span className="cap">(manually डालें — file की ज़रूरत नहीं)</span></div>
        <div className="vix-row">
          <input type="number" step="0.01" placeholder="जैसे 14.5" value={vixInput}
            onChange={(e) => setVixInput(e.target.value)} className="vix-input" />
          <button className="btn sm primary" onClick={() => onSetVix(overrideDate, vixInput)}>Save VIX</button>
        </div>
        <p className="muted-note">VIX से कल का "expected range" निकलता है। NSE VIX page से आज का number देखकर यहाँ डालें।</p>
      </div>

      {error && <div className="warnbox" style={{ marginTop: 12 }}>⚠️ {error}</div>}

      {/* Status + Done */}
      <div className="upload-footer">
        <div className="upload-status">
          {loadedCount > 0
            ? `✅ इस दिन की ${loadedCount} file(s) save हो गईं`
            : 'अभी कोई file नहीं — ऊपर से डालें'}
        </div>
        <button className="btn primary big-done" onClick={onDone} disabled={loadedCount === 0}>
          ✔ OK / Done — Analysis देखें
        </button>
      </div>
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
      <div className="combo-big">सभी files एक साथ यहाँ डालें</div>
      <div className="combo-hint">एक बार में जितनी files चाहें select करें — app खुद पहचान लेगा (OI, Volume, FII Stats, Option Chain, Cash) और permanent save कर देगा।</div>
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
