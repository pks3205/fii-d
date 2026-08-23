import React from 'react'
import { versus } from '../lib/versus.js'
import { fmtC } from '../lib/calc.js'

export default function Versus({ bundle }) {
  const oi = bundle?.sources?.participant_oi
  if (!oi) return null
  const v = versus(oi, bundle.sources.fii_dii_cash)
  if (!v) return null

  const cls = v.key === 'bull' ? 'bias-bull' : v.key === 'bear' ? 'bias-bear' : 'bias-neutral'

  return (
    <div className="card">
      <h2>🥊 Retailer vs FII <span className="cap">कौन किधर भारी</span></h2>

      <div className={`vs-verdict ${cls}`}>{v.verdict}</div>

      {/* Head-to-head bars per instrument */}
      <div className="vs-legend">
        <span><span className="dot" style={{ background: '#6b8afd' }} />Retail (Client)</span>
        <span><span className="dot" style={{ background: '#ffbb33' }} />FII</span>
      </div>
      {v.rows.map((r) => (
        <HeadToHead key={r.key} row={r} />
      ))}

      {/* Cash ₹ */}
      {v.cashData && (v.cashData.fii != null) && (
        <div className="vs-cash">
          <div className="vs-cash-title">💵 Cash Market (₹ Cr)</div>
          <div className="vs-cash-row">
            <span>FII</span>
            <b className={v.cashData.fii >= 0 ? 'pos' : 'neg'}>{v.cashData.fii >= 0 ? '+' : ''}{v.cashData.fii?.toLocaleString('en-IN')}</b>
          </div>
          <div className="vs-cash-row">
            <span>DII</span>
            <b className={v.cashData.dii >= 0 ? 'pos' : 'neg'}>{v.cashData.dii >= 0 ? '+' : ''}{v.cashData.dii?.toLocaleString('en-IN')}</b>
          </div>
        </div>
      )}

      {/* Total Buy vs Sell pressure */}
      <div className="vs-title">⚖️ कुल Buy vs Sell दबाव (सभी players)</div>
      <BuySell label="Index (सभी)" data={v.buySell.idx} />
      <BuySell label="Stock (सभी)" data={v.buySell.stk} />
      <BuySell label="TOTAL" data={v.buySell.total} big />

      <p className="muted-note" style={{ marginTop: 10 }}>
        🟢 हरा हिस्सा = कुल Long (buy) contracts, 🔴 लाल = Short (sell)। जिधर बड़ा हिस्सा, उधर दबाव भारी।
      </p>
    </div>
  )
}

/** Opposed tug-of-war: Retail (left/blue) vs FII (right/amber). */
function HeadToHead({ row }) {
  const cl = row.client, fii = row.fii
  const maxV = Math.max(Math.abs(cl), Math.abs(fii), 1)
  const clW = (Math.abs(cl) / maxV) * 100
  const fiiW = (Math.abs(fii) / maxV) * 100
  return (
    <div className="h2h">
      <div className="h2h-top">
        <span className="h2h-name">{row.full}</span>
        {row.opposed && <span className="h2h-flag">⚔️ आमने-सामने</span>}
      </div>
      <div className="h2h-bars">
        <div className="h2h-side left">
          <span className={`h2h-val ${cl >= 0 ? 'pos' : 'neg'}`}>{cl >= 0 ? 'L ' : 'S '}{fmtC(cl)}</span>
          <div className="h2h-track"><div className="h2h-fill blue" style={{ width: clW + '%' }} /></div>
        </div>
        <div className="h2h-side right">
          <div className="h2h-track"><div className="h2h-fill amber" style={{ width: fiiW + '%' }} /></div>
          <span className={`h2h-val ${fii >= 0 ? 'pos' : 'neg'}`}>{fii >= 0 ? 'L ' : 'S '}{fmtC(fii)}</span>
        </div>
      </div>
    </div>
  )
}

function BuySell({ label, data, big }) {
  const longPct = data.tilt.pct
  const sideText = data.tilt.side === 'buy' ? 'Buy भारी' : data.tilt.side === 'sell' ? 'Sell भारी' : 'बराबर'
  const sideCls = data.tilt.side === 'buy' ? 'pos' : data.tilt.side === 'sell' ? 'neg' : 'zero'
  return (
    <div className={`bs ${big ? 'big' : ''}`}>
      <div className="bs-top">
        <span className="bs-label">{label}</span>
        <span className={`bs-tilt ${sideCls}`}>{sideText} ({longPct}% buy)</span>
      </div>
      <div className="bs-bar">
        <div className="bs-buy" style={{ width: longPct + '%' }}>{longPct >= 20 ? fmtC(data.long) : ''}</div>
        <div className="bs-sell" style={{ width: (100 - longPct) + '%' }}>{(100 - longPct) >= 20 ? fmtC(data.short) : ''}</div>
      </div>
    </div>
  )
}
