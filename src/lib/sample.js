/**
 * Sample data mimicking a full day's worth of NSE reports (all 6 sources) for 2
 * consecutive days, so every feature (confluence, change, trend) can be demoed.
 * Day-2 (T) numbers use the user's REAL Aug-20 participant OI figures.
 */

function mk(vals) {
  const [futIL, futIS, futSL, futSS, ocL, opL, ocS, opS, socL, sopL, socS, sopS] = vals
  return {
    futIdxLong: futIL, futIdxShort: futIS, futStkLong: futSL, futStkShort: futSS,
    optIdxCallLong: ocL, optIdxCallShort: ocS, optIdxPutLong: opL, optIdxPutShort: opS,
    optStkCallLong: socL, optStkCallShort: socS, optStkPutLong: sopL, optStkPutShort: sopS,
  }
}

export const SAMPLE_BUNDLES = [
  {
    date: '2026-08-19',
    sources: {
      participant_oi: {
        type: 'participant_oi', date: '2026-08-19', fileName: 'fao_participant_oi_19082026.csv (sample T-1)',
        participants: {
          //     futIL   futIS  futSL    futSS   ocL      opL      ocS      opS      socL    socS    sopL    sopS
          Client: mk([210000, 65000, 3300000, 270000, 2800000, 2600000, 2700000, 3300000, 2600000, 1500000, 900000, 1200000]),
          DII:    mk([47000, 20000, 350000, 4400000, 8000, 44000, 80, 0, 5900, 360000, 43000, 22000]),
          FII:    mk([30000, 210000, 3600000, 2950000, 550000, 1050000, 780000, 580000, 180000, 410000, 360000, 195000]),
          Pro:    mk([49000, 39000, 910000, 520000, 970000, 1120000, 850000, 960000, 1100000, 1680000, 1110000, 970000]),
        },
      },
      fii_dii_cash: { type: 'fii_dii_cash', date: '2026-08-19', fileName: 'fii_dii_19082026 (sample)', cash: { FII: { buy: 9800, sell: 11200, net: -1400 }, DII: { buy: 10500, sell: 9100, net: 1400 } } },
      vix: { type: 'vix', date: '2026-08-19', fileName: 'vix (sample)', vix: 14.2 },
    },
  },
  {
    date: '2026-08-20',
    sources: {
      participant_oi: {
        type: 'participant_oi', date: '2026-08-20', fileName: 'fao_participant_oi_20082026.csv (REAL)',
        participants: {
          Client: mk([230698, 57393, 3321427, 261692, 2977400, 2650666, 2866063, 3341328, 2679022, 1504664, 946638, 1273748]),
          DII:    mk([47113, 19835, 351385, 4467747, 8221, 44254, 80, 0, 5915, 364346, 43197, 22458]),
          FII:    mk([24335, 236448, 3630708, 2964410, 555019, 1069438, 788812, 590522, 180769, 417616, 365402, 199002]),
          Pro:    mk([49571, 38041, 914851, 524522, 976354, 1142299, 862039, 974807, 1106270, 1685350, 1116752, 976781]),
        },
      },
      participant_vol: {
        type: 'participant_vol', date: '2026-08-20', fileName: 'participant_vol (sample)',
        volumes: {
          Client: { futIdxLong: 180000, futIdxShort: 175000, optIdxCallLong: 4200000, optIdxPutLong: 3900000, totLong: 9000000, totShort: 8800000 },
          FII: { futIdxLong: 90000, futIdxShort: 130000, optIdxCallLong: 800000, optIdxPutLong: 950000, totLong: 2100000, totShort: 2300000 },
          Pro: { futIdxLong: 210000, futIdxShort: 205000, optIdxCallLong: 2600000, optIdxPutLong: 2800000, totLong: 6100000, totShort: 6000000 },
          DII: { futIdxLong: 12000, futIdxShort: 11000, optIdxCallLong: 4000, optIdxPutLong: 5000, totLong: 40000, totShort: 41000 },
        },
      },
      fii_stats: { type: 'fii_stats', date: '2026-08-20', fileName: 'fii_stats (sample)', stats: {
        indexFut: { buyAmt: 8200, sellAmt: 12100, netAmt: -3900, oiAmt: -18000 },
        indexOpt: { buyAmt: 450000, sellAmt: 452000, netAmt: -2000, oiAmt: 12000 },
        stockFut: { buyAmt: 6100, sellAmt: 5800, netAmt: 300, oiAmt: 24000 },
        stockOpt: { buyAmt: 8000, sellAmt: 7900, netAmt: 100, oiAmt: 1000 },
      } },
      fii_dii_cash: { type: 'fii_dii_cash', date: '2026-08-20', fileName: 'fii_dii_20082026 (sample)', cash: { FII: { buy: 8900, sell: 12400, net: -3500 }, DII: { buy: 11800, sell: 8600, net: 3200 } } },
      option_chain: { type: 'option_chain', date: '2026-08-20', fileName: 'option_chain (sample)', underlying: 'NIFTY', support: 24000, resistance: 24300, pcr: 0.82, totalCallOI: 9500000, totalPutOI: 7790000 },
      vix: { type: 'vix', date: '2026-08-20', fileName: 'vix (sample)', vix: 19.4 },
    },
  },
]
