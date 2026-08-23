import React from 'react'
import { PARTICIPANTS, PARTICIPANT_LABEL, INSTRUMENTS, fmtC } from '../lib/calc.js'

function Cell({ v, tint = false }) {
  if (v === null || v === undefined) return <td className="zero">—</td>
  const cls = v > 0 ? 'pos' : v < 0 ? 'neg' : 'zero'
  const tintCls = tint ? (v > 0 ? 'cell-buy' : v < 0 ? 'cell-sell' : '') : ''
  return <td className={`${cls} ${tintCls}`}>{fmtC(v)}</td>
}

function Head() {
  return (
    <thead>
      <tr>
        <th>Player</th>
        {INSTRUMENTS.map((i) => <th key={i.key}>{i.abbr}</th>)}
      </tr>
    </thead>
  )
}

/** Table B: Positions Bought/Sold Today (net change). */
export function ChangeTable({ change }) {
  if (!change) {
    return (
      <div className="card">
        <h2>📗 आज खरीदा / बेचा <span className="cap">apple-to-apple</span></h2>
        <p className="muted-note">पिछले दिन का data नहीं है — कल की शीट upload करते ही यह table अपने आप भर जाएगी।</p>
      </div>
    )
  }
  return (
    <div className="card">
      <h2>📗 आज खरीदा / बेचा <span className="cap">आज का net change</span></h2>
      <div className="tbl-wrap">
        <table>
          <Head />
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
      <p className="muted-note" style={{ marginTop: 8 }}>
        <span className="pos">■ हरा = खरीदा</span> &nbsp; <span className="neg">■ लाल = बेचा</span> &nbsp;· आज की net − कल की net।
      </p>
    </div>
  )
}

/** Table A: Net position snapshot. */
export function NetTable({ todayNet }) {
  return (
    <div className="card">
      <h2>📘 Net Positions <span className="cap">Long − Short</span></h2>
      <div className="tbl-wrap">
        <table>
          <Head />
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
      <p className="muted-note" style={{ marginTop: 8 }}>हरा = net long, लाल = net short। संख्याएँ compact (L=लाख, k=हज़ार)।</p>
    </div>
  )
}

/** 3-day rolling trend per participant. */
export function TrendTable({ history }) {
  const days = history.slice(0, 3)
  const cols = ['Today', '−1', '−2']
  return (
    <div className="card">
      <h2>📈 3-Day Trend <span className="cap">carry-forward net</span></h2>
      {days.length < 2 && <p className="muted-note" style={{ marginBottom: 10 }}>कम से कम 2 दिन का data डालें ({days.length} है)।</p>}
      {PARTICIPANTS.map((p) => (
        <div key={p} style={{ marginBottom: 12 }}>
          <div className="pgroup">{PARTICIPANT_LABEL[p]}</div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Instrument</th>
                  {cols.map((c, i) => <th key={i}>{c}<br /><span style={{ fontSize: 8, opacity: .6, fontWeight: 400 }}>{days[i]?.date.slice(5) || '—'}</span></th>)}
                </tr>
              </thead>
              <tbody>
                {INSTRUMENTS.map((inst) => (
                  <tr key={inst.key}>
                    <td className="lbl">{inst.abbr}</td>
                    {[0, 1, 2].map((di) => <Cell key={di} v={days[di]?.net?.[p]?.[inst.key]?.net ?? null} />)}
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
