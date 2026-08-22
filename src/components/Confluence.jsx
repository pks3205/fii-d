import React from 'react'
import { FILE_TYPES } from '../lib/parse.js'
import { scenarioProbs } from '../lib/confluence.js'

export function ConfluenceCard({ conf, date }) {
  if (!conf) return null
  const cls = conf.key === 'bull' ? 'bias-bull' : conf.key === 'bear' ? 'bias-bear' : conf.key === 'vol' ? 'bias-vol' : 'bias-neutral'
  return (
    <div className="card">
      <h2>🎯 Confluence Meter <span className="cap">सब sources मिलाकर</span></h2>
      <div className="gauge">
        <div className={`bias-pill ${cls}`}>{conf.verdict}</div>
        <div className="meter">
          <div className="meter-track"><div className="meter-knob" style={{ left: `${Math.max(2, Math.min(98, 50 + conf.scoreNet * 8))}%` }} /></div>
          <div className="meter-labels"><span>मंदी</span><span>तेजी</span></div>
        </div>
      </div>
      <div className="conf-stats">
        <span>📊 {conf.sourcesUsed.length} sources</span>
        <span className="pos">🟢 {conf.bullVotes} bullish votes</span>
        <span className="neg">🔴 {conf.bearVotes} bearish votes</span>
        <span>🤝 {conf.agreement}% agreement</span>
      </div>

      {conf.vixFlag && (
        <div className={`sig ${conf.vixFlag.level === 'high' ? 'warn' : 'info'}`} style={{ marginTop: 12 }}>
          <div className="t">🌡️ Volatility</div>
          <div className="hi">{conf.vixFlag.text}</div>
        </div>
      )}

      {conf.levels && (conf.levels.support || conf.levels.resistance) && (
        <div className="levels-box">
          <div className="lvl"><span className="cap">🟢 Support (max Put OI)</span><b className="pos">{conf.levels.support ?? '—'}</b></div>
          <div className="lvl"><span className="cap">🔴 Resistance (max Call OI)</span><b className="neg">{conf.levels.resistance ?? '—'}</b></div>
          <div className="lvl"><span className="cap">⚖️ PCR</span><b>{conf.levels.pcr ?? '—'}</b></div>
        </div>
      )}

      <div className="votes">
        <div className="cap" style={{ margin: '12px 0 6px' }}>क्यों (सबूत):</div>
        {conf.votes.length === 0 && <div className="disclaimer">पर्याप्त data नहीं — और files upload करें।</div>}
        {conf.votes.map((v, i) => (
          <div key={i} className="vote-row">
            <span className={`vote-dir ${v.dir > 0 ? 'pos' : v.dir < 0 ? 'neg' : 'zero'}`}>{v.dir > 0 ? '▲' : v.dir < 0 ? '▼' : '■'}</span>
            <span className="vote-src">{v.source}</span>
            <span className="vote-why">{v.why}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ScenarioCard({ conf }) {
  if (!conf) return null
  const p = scenarioProbs(conf)
  const bars = [
    { k: 'Gap Down', v: p.gapDown, c: 'var(--red)' },
    { k: 'Flat', v: p.flat, c: 'var(--indigo)' },
    { k: 'Gap Up', v: p.gapUp, c: 'var(--green)' },
  ]
  return (
    <div className="card">
      <h2>🔮 अगले session का अनुमान <span className="cap">(probability — गारंटी नहीं)</span></h2>
      {bars.map((b) => (
        <div key={b.k} className="prob-row">
          <span className="prob-label">{b.k}</span>
          <div className="prob-track"><div className="prob-fill" style={{ width: `${b.v}%`, background: b.c }} /></div>
          <span className="prob-val">{b.v}%</span>
        </div>
      ))}
      <p className="disclaimer" style={{ marginTop: 10 }}>
        ⚠️ यह data-आधारित <b>probability</b> है, पक्की भविष्यवाणी नहीं। Institutional shorts कभी hedge भी होते हैं। इसे "edge" समझें, "crystal ball" नहीं।
      </p>
    </div>
  )
}

export function SummaryCard({ text }) {
  return (
    <div className="card">
      <h2>📝 आज का सार <span className="cap">आसान भाषा में</span></h2>
      <p style={{ fontSize: 14, lineHeight: 1.7 }}>{text}</p>
    </div>
  )
}

export function SourcesCard({ bundle, onGoUpload }) {
  const loaded = bundle ? Object.keys(bundle.sources) : []
  const all = Object.keys(FILE_TYPES)
  return (
    <div className="card">
      <h2>🗂️ इस दिन की Files</h2>
      {all.map((t) => (
        <div key={t} className="src-row">
          <span>{FILE_TYPES[t].icon} {FILE_TYPES[t].label}</span>
          <span className={loaded.includes(t) ? 'pos' : 'zero'}>{loaded.includes(t) ? '✓ loaded' : '— missing'}</span>
        </div>
      ))}
      <button className="btn sm" style={{ marginTop: 10 }} onClick={onGoUpload}>➕ और files जोड़ें</button>
    </div>
  )
}
