import React from 'react'
import { PARTICIPANTS, PARTICIPANT_LABEL, INSTRUMENTS, fmt } from '../lib/calc.js'

function Cell({ v, colorBySign = true, tint = false }) {
  if (v === null || v === undefined) return <td className="zero">—</td>
  const cls = !colorBySign ? '' : v > 0 ? 'pos' : v < 0 ? 'neg' : 'zero'
  const tintCls = tint ? (v > 0 ? 'cell-buy' : v < 0 ? 'cell-sell' : '') : ''
  return <td className={`${cls} ${tintCls}`}>{fmt(v)}</td>
}

/** Table B: Positions Bought/Sold Today (net change) — the "apple-to-apple" table. */
export function ChangeTable({ change }) {
  if (!change) {
    return (
      <div className="card">
        <h2>📗 Positions Bought / Sold Today <span className="cap">(Apple-to-Apple net change)</span></h2>
        <p className="disclaimer">पिछले दिन का data नहीं है, इसलिए आज का change नहीं निकल सकता। कल की शीट upload करने पर यह table अपने आप भर जाएगी।</p>
      </div>
    )
  }
  return (
    <div className="card">
      <h2>📗 Positions Bought / Sold Today <span className="cap">(आज कितना खरीदा/बेचा)</span></h2>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th className="lbl">Participant</th>
              {INSTRUMENTS.map((i) => <th key={i.key}>{i.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {PARTICIPANTS.map((p) => (
              <tr key={p}>
                <td className="lbl">{PARTICIPANT_LABEL[p]}</td>
                {INSTRUMENTS.map((i) => <Cell key={i.key} v={change[p][i.key]} tint />)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="disclaimer" style={{ marginTop: 8 }}>
        <span className="pos">हरा = Net खरीदा (Bought)</span> &nbsp;·&nbsp; <span className="neg">लाल = Net बेचा (Sold)</span>. यह = आज की net पोजीशन − कल की net पोजीशन.
      </p>
    </div>
  )
}

/** Table A: Instrument-wise net position, all participants (today snapshot). */
export function NetTable({ todayNet }) {
  return (
    <div className="card">
      <h2>📘 Net Positions Today <span className="cap">(Long − Short, हर player)</span></h2>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th className="lbl">Participant</th>
              {INSTRUMENTS.map((i) => <th key={i.key}>{i.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {PARTICIPANTS.map((p) => (
              <tr key={p}>
                <td className="lbl">{PARTICIPANT_LABEL[p]}</td>
                {INSTRUMENTS.map((i) => <Cell key={i.key} v={todayNet[p][i.key].net} />)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** 3-day rolling trend, per participant. Rows = instruments, cols = T, T-1, T-2. */
export function TrendTable({ history }) {
  const days = history.slice(0, 3)
  const cols = ['Today (T)', '1 Day Ago (T-1)', '2 Days Ago (T-2)']
  return (
    <div className="card">
      <h2>📈 Instrument-wise Trend <span className="cap">(3-Day rolling carry-forward)</span></h2>
      {days.length < 2 && (
        <p className="disclaimer" style={{ marginBottom: 10 }}>
          Trend दिखाने के लिए कम से कम 2 दिन का data चाहिए। अभी {days.length} दिन है — रोज़ upload करते रहें।
        </p>
      )}
      {PARTICIPANTS.map((p) => (
        <div key={p} style={{ marginBottom: 14 }}>
          <div style={{ color: 'var(--indigo)', fontWeight: 700, fontSize: 12.5, margin: '6px 2px', textTransform: 'uppercase', letterSpacing: '.4px' }}>
            {PARTICIPANT_LABEL[p]}
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th className="lbl">Instrument</th>
                  {cols.map((c, i) => <th key={i}>{days[i] ? `${c}` : c}<br /><span style={{ fontSize: 9, opacity: .7 }}>{days[i]?.date || '—'}</span></th>)}
                </tr>
              </thead>
              <tbody>
                {INSTRUMENTS.map((inst) => (
                  <tr key={inst.key}>
                    <td className="lbl">{inst.label}</td>
                    {[0, 1, 2].map((di) => {
                      const v = days[di]?.net?.[p]?.[inst.key]?.net
                      return <Cell key={di} v={v ?? null} />
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
