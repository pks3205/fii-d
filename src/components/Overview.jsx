import React, { useState } from 'react'
import { aggregate, aggregateSummary, INSTRUMENTS, PARTICIPANTS, PARTICIPANT_LABEL } from '../lib/aggregate.js'
import { fmt, fmtC, computeNet, computeChange } from '../lib/calc.js'
import { buildConfluence, scenarioProbs } from '../lib/confluence.js'

/**
 * Overview = the "अभी क्या चल रहा है + कल क्या हो सकता है" screen.
 * Combines multi-day aggregate + latest-day advanced confluence into one detailed view.
 */
export default function Overview({ bundles }) {
  const oiBundles = bundles.filter((b) => b.sources?.participant_oi)
  const oiCount = oiBundles.length
  const [nDays, setNDays] = useState(Math.min(5, Math.max(oiCount, 1)))
  const agg = aggregate(bundles, nDays)

  // Latest day's full confluence (with advanced metrics)
  const sorted = [...bundles].sort((a, b) => (a.date < b.date ? 1 : -1))
  const latest = sorted[0]
  const prev = sorted[1]
  const conf = latest ? confFor(latest, prev) : null

  if (!latest) {
    return <div className="card"><p className="muted-note">कोई data नहीं। पहले NSE file upload करें (📤 Upload).</p></div>
  }

  const cls = agg ? biasCls(agg.key) : 'bias-neutral'
  const summary = agg ? aggregateSummary(agg) : ''
  const probs = conf ? scenarioProbs(conf) : null

  return (
    <>
      {/* CURRENT STATUS */}
      <div className="card">
        <h2>📅 अभी का कुल Status <span className="cap">{latest.date} तक, {agg?.days || 1} दिन जोड़कर</span></h2>
        <div className="pick-row" style={{ alignItems: 'center', marginBottom: 10 }}>
          <span className="cap">दिन:</span>
          <select value={nDays} onChange={(e) => setNDays(Number(e.target.value))}>
            {Array.from({ length: Math.max(oiCount, 1) }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          {agg && <span className="cap">{agg.from} → {agg.to}</span>}
        </div>
        {agg && (
          <div className="gauge">
            <div className={`bias-pill ${cls}`}>{agg.verdict}</div>
            <div className="meter">
              <div className="meter-track"><div className="meter-knob" style={{ left: `${knob(agg.scoreNet)}%` }} /></div>
              <div className="meter-labels"><span>मंदी</span><span>तेजी</span></div>
            </div>
          </div>
        )}
        {agg && <div className="conf-stats" style={{ marginTop: 10 }}>
          <span>📆 {agg.days} दिन</span><span>🤝 {agg.agreement}% भरोसा</span>
          <span>{agg.scoreNet >= 0 ? '🟢' : '🔴'} score {agg.scoreNet}</span>
        </div>}
      </div>

      {/* KAL KYA HOGA */}
      {conf && (
        <div className="card">
          <h2>🔮 कल क्या हो सकता है <span className="cap">(probability — गारंटी नहीं)</span></h2>
          {probs && ['gapDown', 'flat', 'gapUp'].map((k) => {
            const label = k === 'gapDown' ? 'Gap Down' : k === 'flat' ? 'Flat' : 'Gap Up'
            const color = k === 'gapDown' ? 'var(--red)' : k === 'flat' ? 'var(--indigo)' : 'var(--green)'
            return (
              <div key={k} className="prob-row">
                <span className="prob-label">{label}</span>
                <div className="prob-track"><div className="prob-fill" style={{ width: `${probs[k]}%`, background: color }} /></div>
                <span className="prob-val">{probs[k]}%</span>
              </div>
            )
          })}
          {conf.range && (
            <div className="hint-line">📏 कल का संभावित range (VIX से): <b className="neg">{conf.range.low.toLocaleString('en-IN')}</b> — <b className="pos">{conf.range.high.toLocaleString('en-IN')}</b> (±{conf.range.move})</div>
          )}
          {conf.maxPain && (
            <div className="hint-line">🎯 Max Pain: <b>{conf.maxPain.toLocaleString('en-IN')}</b>{conf.maxPainRead ? ` — ${conf.maxPainRead.text}` : ''}</div>
          )}
        </div>
      )}

      {/* SMART MONEY METRICS */}
      {conf && (
        <div className="card">
          <h2>🧠 Smart Money Metrics</h2>
          {conf.lsr && (
            <MetricRow label="FII Long-Short Ratio" value={`${conf.lsr.longPct}% long (${conf.lsr.ratio ?? '—'})`} tag={conf.lsr.read} k={conf.lsr.key} />
          )}
          {conf.matrix && (
            <MetricRow label="Cash × Futures" value={`Cash ₹${conf.matrix.cashNet.toLocaleString('en-IN')} Cr`} tag={conf.matrix.verdict} k={conf.matrix.key} />
          )}
          {conf.divergence?.active && (
            <div className="sig warn" style={{ marginTop: 8 }}><div className="hi">{conf.divergence.text}</div></div>
          )}
          {conf.vixFlag && (
            <div className={`sig ${conf.vixFlag.level === 'high' ? 'warn' : 'info'}`} style={{ marginTop: 8 }}><div className="hi">{conf.vixFlag.text}</div></div>
          )}
        </div>
      )}

      {/* SUMMARY */}
      {agg && (
        <div className="card">
          <h2>📝 Multi-Day निचोड़</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7 }}>{summary}</p>
        </div>
      )}

      {/* PER-PLAYER TABLE (fixed, small font) */}
      {agg && (
        <div className="card">
          <h2>🔬 हर Player का {agg.days}-दिन hisaab</h2>
          <p className="muted-note" style={{ marginBottom: 8 }}>Latest = अभी net · {agg.days}d = इन दिनों में जोड़ा/घटाया · Trend = लगातार बढ़ा/घटा।</p>
          {PARTICIPANTS.map((p) => (
            <div key={p} style={{ marginBottom: 12 }}>
              <div className="pgroup">{PARTICIPANT_LABEL[p]}</div>
              <div className="tbl-wrap">
              <table>
                <thead><tr><th>Instrument</th><th>Latest</th><th>{agg.days}d</th><th>Trend</th></tr></thead>
                <tbody>
                  {INSTRUMENTS.map((inst) => {
                    const c = agg.perParticipant[p][inst.key]
                    return (
                      <tr key={inst.key}>
                        <td className="lbl">{inst.abbr}</td>
                        <td className={cn(c.latest)}>{fmtC(c.latest)}</td>
                        <td className={cn(c.cumChange)}>{fmtC(c.cumChange)}</td>
                        <td className="zero mini">{c.trendDir === 'building' ? `📈${c.consistency}%` : c.trendDir === 'reducing' ? `📉${c.consistency}%` : '↔️'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function confFor(bundle, prevBundle) {
  const s = bundle.sources
  const oi = s.participant_oi
  const todayNet = oi ? (oi.net || computeNet(oi)) : null
  const prevNet = prevBundle?.sources?.participant_oi
    ? (prevBundle.sources.participant_oi.net || computeNet(prevBundle.sources.participant_oi)) : null
  const change = todayNet ? computeChange(todayNet, prevNet) : null
  return buildConfluence({
    oi, oiChange: change, vol: s.participant_vol, fiiStats: s.fii_stats,
    optionChain: s.option_chain, cash: s.fii_dii_cash, vix: s.vix,
  })
}

function MetricRow({ label, value, tag, k }) {
  return (
    <div className="metric-row">
      <div className="metric-top"><span className="metric-label">{label}</span><span className="metric-value">{value}</span></div>
      <div className={`metric-tag ${k === 'bull' ? 'pos' : k === 'bear' ? 'neg' : k === 'contrarian' ? 'amber' : 'zero'}`}>{tag}</div>
    </div>
  )
}

const cn = (v) => v > 0 ? 'pos' : v < 0 ? 'neg' : 'zero'
const biasCls = (k) => k === 'bull' ? 'bias-bull' : k === 'bear' ? 'bias-bear' : k === 'vol' ? 'bias-vol' : 'bias-neutral'
const knob = (s) => Math.max(2, Math.min(98, 50 + s * 8))
