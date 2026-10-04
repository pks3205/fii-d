package com.goldos.app.data

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.random.Random

/** Normalized OHLC candle. Live volume remains zero when the feed does not provide traded volume. */
data class GoldCandle(
    val openTime: Long,
    val open: Double,
    val high: Double,
    val low: Double,
    val close: Double,
    val volume: Double = 0.0,
    val isOpen: Boolean = false,
)

data class GoldSnapshot(
    val symbol: String = "XAUUSD",
    val timeframe: String = "5m",
    val price: Double? = null,
    val changePercent: Double? = null,
    val high: Double? = null,
    val low: Double? = null,
    val timestamp: Long = System.currentTimeMillis(),
    val quoteAgeSeconds: Long = 0,
    val marketStatus: String = "unknown",
    val dataStatus: String = "UNAVAILABLE",
    val isDemo: Boolean = false,
    val trend: String? = null,
    val rsi: Double? = null,
    val vwap: Double? = null,
    val volatility: String = "N/A",
    val candles: List<GoldCandle> = emptyList(),
)

interface MarketDataProvider {
    suspend fun getSnapshot(timeframe: String): GoldSnapshot
}

/** A replaceable provider contract dedicated to XAUUSD. */
interface GoldPriceProvider : MarketDataProvider

object MarketAnalysis {
    fun analyze(candles: List<GoldCandle>): Indicators {
        if (candles.size < 5) return Indicators()
        val closes = candles.map { it.close }
        val ema20 = ema(closes, 20)
        val ema50 = ema(closes, 50)
        val latest = closes.last()
        val trend = when {
            latest > ema20 && ema20 > ema50 -> "BULLISH"
            latest < ema20 && ema20 < ema50 -> "BEARISH"
            else -> "MIXED"
        }
        val ranges = candles.takeLast(20).map { (it.high - it.low) / max(it.close, 0.0001) }
        val average = ranges.average().coerceAtLeast(0.000001)
        val ratio = ranges.last() / average
        val volatility = when {
            ratio > 1.5 -> "HIGH"
            ratio < 0.65 -> "LOW"
            else -> "NORMAL"
        }
        val vwapVolume = candles.filter { it.volume > 0.0 }
        val volumeTotal = vwapVolume.sumOf { it.volume }
        val vwap = if (volumeTotal > 0.0) {
            vwapVolume.sumOf { ((it.high + it.low + it.close) / 3.0) * it.volume } / volumeTotal
        } else null
        return Indicators(trend, rsi(closes, 14), vwap, volatility, ema20, ema50)
    }

    private fun ema(values: List<Double>, period: Int): Double {
        val multiplier = 2.0 / (period + 1.0)
        return values.drop(1).fold(values.first()) { current, value -> value * multiplier + current * (1.0 - multiplier) }
    }

    private fun rsi(values: List<Double>, period: Int): Double? {
        if (values.size <= period) return null
        var gain = 0.0
        var loss = 0.0
        for (index in 1..period) {
            val delta = values[index] - values[index - 1]
            gain += max(delta, 0.0)
            loss += max(-delta, 0.0)
        }
        var avgGain = gain / period
        var avgLoss = loss / period
        for (index in period + 1 until values.size) {
            val delta = values[index] - values[index - 1]
            avgGain = (avgGain * (period - 1) + max(delta, 0.0)) / period
            avgLoss = (avgLoss * (period - 1) + max(-delta, 0.0)) / period
        }
        if (avgLoss == 0.0) return if (avgGain == 0.0) 50.0 else 100.0
        val relativeStrength = avgGain / avgLoss
        return 100.0 - 100.0 / (1.0 + relativeStrength)
    }
}

data class Indicators(
    val trend: String? = null,
    val rsi: Double? = null,
    val vwap: Double? = null,
    val volatility: String = "N/A",
    val ema20: Double? = null,
    val ema50: Double? = null,
)

class DemoGoldPriceProvider(private val now: () -> Long = System::currentTimeMillis) : GoldPriceProvider {
    override suspend fun getSnapshot(timeframe: String): GoldSnapshot {
        val intervalMs = when (timeframe) {
            "1m" -> 60_000L
            "15m" -> 900_000L
            "1h" -> 3_600_000L
            else -> 300_000L
        }
        val time = now()
        val currentStart = time / intervalMs * intervalMs
        val random = Random(7201 + timeframe.hashCode())
        val historical = mutableListOf<GoldCandle>()
        var previousClose = 4180.35 + random.nextDouble(-2.5, 2.5)
        repeat(39) { index ->
            val wave = sin(index * 0.49) * 1.65 + sin(index * 0.17 + 1.2) * 1.2
            val open = previousClose
            val close = 4178.8 + index * 0.028 + wave + random.nextDouble(-0.35, 0.35)
            val high = max(open, close) + random.nextDouble(0.42, 1.57)
            val low = min(open, close) - random.nextDouble(0.38, 1.46)
            historical += GoldCandle(currentStart - (39 - index) * intervalMs, open, high, low, close, random.nextDouble(95.0, 350.0))
            previousClose = close
        }
        val pulse = sin(time / 51_000.0) * 0.23 + kotlin.math.cos(time / 37_000.0) * 0.12
        val current = previousClose + pulse
        val open = previousClose
        val currentCandle = GoldCandle(
            currentStart, open, max(open, current) + abs(pulse) * 0.55 + 0.18,
            min(open, current) - abs(pulse) * 0.45 - 0.17, current, 140.0, true,
        )
        val candles = historical + currentCandle
        val indicators = MarketAnalysis.analyze(candles)
        return GoldSnapshot(
            timeframe = timeframe,
            price = current,
            changePercent = 0.38 + sin(time / 270_000.0) * 0.07,
            high = candles.maxOf { it.high } + 8.7,
            low = candles.minOf { it.low } - 9.2,
            timestamp = time,
            marketStatus = "open",
            dataStatus = "DEMO DATA",
            isDemo = true,
            trend = indicators.trend,
            rsi = indicators.rsi,
            vwap = indicators.vwap,
            volatility = indicators.volatility,
            candles = candles,
        )
    }
}
