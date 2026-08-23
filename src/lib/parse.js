import { readRows, detectType, detectFromName } from './parsers/detect.js'
import { parseParticipantOI } from './parsers/participantOI.js'
import JSZip from 'jszip'
import {
  parseParticipantVol, parseFiiStats, parseFiiDiiCash, parseOptionChain, parseVix,
} from './parsers/others.js'

export const FILE_TYPES = {
  participant_oi:  { label: 'Participant OI',      icon: '📊', desc: 'Client/DII/FII/Pro की Long-Short पोजीशन' },
  participant_vol: { label: 'Participant Volumes', icon: '🔊', desc: 'हर player का आज का trading volume (conviction)' },
  fii_stats:       { label: 'FII Derivatives Stats', icon: '💰', desc: 'FII का Buy/Sell ₹ amount + net' },
  option_chain:    { label: 'Option Chain / Bhavcopy', icon: '🎯', desc: 'Support/Resistance + PCR + Max Pain' },
  fii_dii_cash:    { label: 'FII/DII Cash',        icon: '🏦', desc: 'Cash market ₹ flow (Cash×Futures matrix के लिए)' },
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
/** If the file is a .zip, extract the first CSV/xls inside and return
 *  { bytes, name }. Otherwise return the raw bytes + original name. */
async function unwrap(file) {
  const buf = new Uint8Array(await file.arrayBuffer())
  const isZip = /\.zip$/i.test(file.name) || (buf[0] === 0x50 && buf[1] === 0x4b) // 'PK'
  if (!isZip) return { bytes: buf, name: file.name }

  const zip = await JSZip.loadAsync(buf)
  // Prefer a .csv, else .xls/.xlsx, else the first file.
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir)
  const pick =
    names.find((n) => /\.csv$/i.test(n)) ||
    names.find((n) => /\.(xlsx?|xls)$/i.test(n)) ||
    names[0]
  if (!pick) throw new Error('ZIP खाली है — कोई CSV/Excel नहीं मिला।')
  const inner = await zip.files[pick].async('uint8array')
  return { bytes: inner, name: pick }
}

export async function parseFile(file, forcedType = null) {
  const { bytes, name } = await unwrap(file)
  const rows = readRows(bytes)

  let type = forcedType || detectType(rows)
  if (type === 'unknown') type = detectFromName(name) || detectFromName(file.name) || 'unknown'
  if (type === 'unknown') {
    throw new Error('यह NSE file पहचान नहीं पाई। सही report चुनें (Participant OI / Volumes / FII Stats / Option Chain)।')
  }

  const parser = ROUTER[type]
  if (!parser) throw new Error(`Parser नहीं मिला: ${type}`)

  try {
    return parser(rows, name)
  } catch (e) {
    // If forced type failed, retry with auto-detect
    if (forcedType) {
      const auto = detectType(rows)
      if (auto !== 'unknown' && auto !== forcedType && ROUTER[auto]) return ROUTER[auto](rows, name)
    }
    throw e
  }
}
