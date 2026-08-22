import React, { useState } from 'react'
import { aggregate, aggregateSummary, INSTRUMENTS, PARTICIPANTS, PARTICIPANT_LABEL } from '../lib/aggregate.js'
import { fmt } from '../lib/calc.js'

export default function Overview({ bundles }) {
  const oiCount = bundles.filter((b) => b.sources?.participant_oi).length
  const [nDays, setNDays] = useState(Math.min(5, Math.max(oiCount, 1)))
  const agg = aggregate(bundles, nDays)

  if (!agg) {
    return <div className="card"><p className="disclaimer">Multi-day overview के लिए कम से कम 1 Participant OI file चाहिए। जितने दिन डालेंगे, उतना बेहतर।</p></div>
  }

  const cls = agg.key === 'bull' ? 'bias-bull' : agg.key === 'bear' ? 'bias-bear' : agg.key === 'vol' ? 'bias-vol' : 'bias-neutral'
  const summary = aggregateSummary(agg)

  return (
    <>
      <div className="card">
        <h2>📅 अभी का कुल Status <span className="cap">सारे दिन जोड़कर</span></h2>
        <div className="pick-row" style={{ alignItems: 'center', marginBottom: 10 }}>
          <span className="cap">कितने दिन जोड़ें:</span>
          <select value={nDays} onChange={(e) => setNDays(Number(e.target.value))}>
            {Array.from({ length: Math.max(oiCount, 1) }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n} दिन</option>
            ))}
          </select>
          <span className="cap">({agg.from} → {agg.to})</span>
        </div>
        <div className="gauge">
          <div className={`bias-pill ${cls}`}>{agg.verdict}</div>
          <div className="meter">
            <div className="meter-track"><div className="meter-knob" style={{ left: `${Math.max(2, Math.min(98, 50 + agg.scoreNet * 8))}%` }} /></div>
            <div className="meter-labels"><span>मंदी</span><span>तेजी</span></div>
          </div>
        </div>
        <div className="conf-stats" style={{ marginTop: 10 }}>
          <span>📆 {agg.days} दिन</span>
          <span>🤝 {agg.agreement}% भरोसा</span>
          <span>{agg.scoreNet >= 0 ? '🟢' : '🔴'} score {agg.scoreNet}</span>
        </div>
      </div>

      <div className="card">
        <h2>📝 Multi-Day निचोड़</h2>
        <p style={{ fontSize: 14, lineHeight: 1.7 }}>{summary}</p>
      </div>

      <div className="card">
        <h2>🔬 हर Player का {agg.days}-दिन hisaab</h2>
        <p className="disclaimer" style={{ marginBottom: 10 }}>
          <b>Latest</b> = अभी की कुल net पोजीशन · <b>{agg.days}d बदलाव</b> = इन दिनों में कितना जोड़ा/घटाया · <b>Trend</b> = लगातार बढ़ा/घटा रहे हैं क्या।
        </p>
        {PARTICIPANTS.map((p) => (
          <div key={p} style={{ marginBottom: 14 }}>
            <div style={{ color: 'var(--indigo)', fontWeight: 700, fontSize: 12.5, margin: '6px 2px', textTransform: 'uppercase' }}>
              {PARTICIPANT_LABEL[p]}
            </div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th className="lbl">Instrument</th>
                    <th>Latest (net)</th>
                    <th>{agg.days}d बदलाव</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {INSTRUMENTS.map((inst) => {
                    const c = agg.perParticipant[p][inst.key]
                    return (
                      <tr key={inst.key}>
                        <td className="lbl">{inst.label}</td>
                        <td className={c.latest > 0 ? 'pos' : c.latest < 0 ? 'neg' : 'zero'}>{fmt(c.latest)}</td>
                        <td className={c.cumChange > 0 ? 'pos' : c.cumChange < 0 ? 'neg' : 'zero'}>{fmt(c.cumChange)}</td>
                        <td className="zero" style={{ fontSize: 11 }}>
                          {c.trendDir === 'building' ? `📈 बढ़ा (${c.consistency}%)` : c.trendDir === 'reducing' ? `📉 घटा (${c.consistency}%)` : '↔️ flat'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
