/**
 * Sample data mimicking a real NSE "Participant wise Open Interest" file.
 * Numbers loosely reflect the screenshot shared (Amit Dhamija's table) so the
 * demo shows realistic decoding. Two consecutive days are provided so the
 * "Today's Change" and "3-day trend" features can be demonstrated end-to-end.
 */

// raw fields per participant: 12 long/short values
function mk(vals) {
  const [futIL, futIS, futSL, futSS, ocL, ocS, opL, opS, socL, socS, sopL, sopS] = vals
  return {
    futIdxLong: futIL, futIdxShort: futIS,
    futStkLong: futSL, futStkShort: futSS,
    optIdxCallLong: ocL, optIdxCallShort: ocS,
    optIdxPutLong: opL, optIdxPutShort: opS,
    optStkCallLong: socL, optStkCallShort: socS,
    optStkPutLong: sopL, optStkPutShort: sopS,
  }
}

export const SAMPLE_DAYS = [
  {
    date: '2026-08-21',
    fileName: 'fao_participant_oi_21082026.csv (sample T-1)',
    participants: {
      //          futIL   futIS   futSL   futSS    ocL     ocS     opL     opS     socL    socS    sopL    sopS
      Client: mk([175000, 130000, 850000, 900000, 1720000, 1300000, 640000, 610000, 830000, 810000, 470000, 210000]),
      DII:    mk([70000,  72000,  520000, 500000, 6000,    4800,    90,     65,     14000,  20000,  250,    630]),
      FII:    mk([250000, 320000, 900000, 830000, 24000,   13000,   120000, 168000, 26000,  22000,  17000,  20000]),
      Pro:    mk([80000,  78000,  260000, 280000, 67000,   30000,   315000, 285000, 51000,  29000,  17400,  41000]),
    },
  },
  {
    date: '2026-08-22',
    fileName: 'fao_participant_oi_22082026.csv (sample T)',
    participants: {
      // Retail even more bullish, FII adds shorts, Pro loads more puts -> bearish + gap-down + nike setup
      Client: mk([195000, 128000, 860000, 905000, 1900000, 1360000, 620000, 690000, 850000, 830000, 480000, 200000]),
      DII:    mk([70000,  72000,  540000, 500000, 6100,    4900,    90,     65,     14500,  20500,  250,    630]),
      FII:    mk([230000, 355000, 920000, 830000, 24000,   13000,   122000, 168000, 26000,  22000,  17000,  20000]),
      Pro:    mk([80000,  79000,  260000, 280000, 40000,   67000,   345000, 260000, 55000,  29000,  17400,  41000]),
    },
  },
]
