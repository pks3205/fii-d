import { readRows, detectType, detectFromName } from './parsers/detect.js'
import { parseParticipantOI } from './parsers/participantOI.js'
import {
  parseParticipantVol, parseFiiStats, parseFiiDiiCash, parseOptionChain, parseVix,
} from './parsers/others.js'

export const FILE_TYPES = {
  participant_oi:  { label: 'Participant OI',      icon: '📊', desc: 'Client/DII/FII/Pro की Long-Short पोजीशन' },
  participant_vol: { label: 'Participant Volumes', icon: '🔊', desc: 'हर player का आज का trading volume (conviction)' },
  fii_stats:       { label: 'FII Derivatives Stats', icon: '💰', desc: 'FII का Buy/Sell ₹ amount + net' },
  fii_dii_cash:    { label: 'FII/DII Cash',        icon: '🏦', desc: 'Cash market में FII/DII का ₹ flow' },
  option_chain:    { label: 'Option Chain',        icon: '🎯', desc: 'Support/Resistance + PCR levels' },
  vix:             { label: 'India VIX',           icon: '🌡️', desc: 'Volatility / डर का स्तर' },
}

const ROUTER = {
  participant_oi: parseParticipantOI,
  participant_vol: parseParticipantVol,
  fii_stats: parseFiiStats,
  fii_dii_cash: parseFiiDiiCash,
  option_chain: parseOptionChain,
  vix: parseVix,
}

/**
 * Parse a File → { type, date, ...data }. Auto-detects type; if a forcedType is
 * given (user dropped into a specific slot), tries that first, then auto.
 */
export async function parseFile(file, forcedType = null) {
  const buf = await file.arrayBuffer()
  const rows = readRows(new Uint8Array(buf))

  let type = forcedType || detectType(rows)
  if (type === 'unknown') type = detectFromName(file.name) || 'unknown'
  if (type === 'unknown') {
    throw new Error('यह NSE file पहचान नहीं पाई। सही report चुनें (Participant OI / Volumes / FII Stats / Cash / Option Chain / VIX)।')
  }

  const parser = ROUTER[type]
  if (!parser) throw new Error(`Parser नहीं मिला: ${type}`)

  try {
    return parser(rows, file.name)
  } catch (e) {
    // If forced type failed, retry with auto-detect
    if (forcedType) {
      const auto = detectType(rows)
      if (auto !== 'unknown' && auto !== forcedType && ROUTER[auto]) return ROUTER[auto](rows, file.name)
    }
    throw e
  }
}
