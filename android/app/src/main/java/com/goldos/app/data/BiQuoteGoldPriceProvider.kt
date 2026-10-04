package com.goldos.app.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import kotlin.math.max

/** Public BiQuote adapter. Replace this class with a licensed broker feed without changing UI/repository. */
class BiQuoteGoldPriceProvider(
    private val now: () -> Long = System::currentTimeMillis,
) : GoldPriceProvider {
    override suspend fun getSnapshot(timeframe: String): GoldSnapshot = withContext(Dispatchers.IO) {
        val interval = timeframe.takeIf { it in setOf("1m", "5m", "15m", "1h") } ?: "5m"
        val quote = getJson("https://biquote.io/api/XAUUSD?allowStale=true")
        val candlesPayload = getJson("https://biquote.io/api/XAUUSD/ohlc?interval=$interval&limit=40")
        val price = quote.optDouble("mid", quote.optDouble("price", Double.NaN))
        if (!price.isFinite() || price <= 0.0) throw IOException("XAUUSD quote is missing.")

        val barsJson = candlesPayload.optJSONArray("bars") ?: throw IOException("XAUUSD candles are missing.")
        val candles = buildList {
            for (index in 0 until barsJson.length()) {
                val row = barsJson.optJSONObject(index) ?: continue
                val candle = GoldCandle(
                    openTime = parseTime(when {
                        row.has("openTime") -> row.optString("openTime")
                        row.has("time") -> row.optString("time")
                        else -> row.optString("timestamp")
                    }),
                    open = row.optDouble("open", Double.NaN),
                    high = row.optDouble("high", Double.NaN),
                    low = row.optDouble("low", Double.NaN),
                    close = row.optDouble("close", Double.NaN),
                    volume = row.optDouble("volume", 0.0).coerceAtLeast(0.0),
                    isOpen = row.optBoolean("isOpen", false),
                )
                val validPrices = listOf(candle.open, candle.high, candle.low, candle.close).all { it.isFinite() }
                val validRange = candle.high >= max(candle.open, candle.close) && candle.low <= minOf(candle.open, candle.close) && candle.high >= candle.low
                if (candle.openTime > 0L && validPrices && validRange) add(candle)
            }
        }.distinctBy { it.openTime }.sortedBy { it.openTime }
        if (candles.size < 5) throw IOException("Not enough XAUUSD candles are available.")

        val quoteTime = parseTime(quote.optString("timestamp", quote.optString("lastQuoteAt")))
        val providerAge = quote.optLong("quoteAgeSeconds", 0L).coerceAtLeast(0L)
        val timestampAge = if (quoteTime > 0L) max(0L, (now() - quoteTime) / 1000L) else 0L
        val age = max(providerAge, timestampAge)
        val closed = quote.optString("marketState", "open").equals("closed", ignoreCase = true)
        val stale = quote.optBoolean("stale", false) || age > 90L
        val status = when {
            closed -> "CACHED DATA"
            stale -> "DATA DELAYED"
            else -> "LIVE"
        }
        val indicators = MarketAnalysis.analyze(candles)
        GoldSnapshot(
            timeframe = interval,
            price = price,
            changePercent = quote.optNullableDouble("dayDiffPercent"),
            high = quote.optNullableDouble("high"),
            low = quote.optNullableDouble("low"),
            timestamp = quoteTime.takeIf { it > 0L } ?: now(),
            quoteAgeSeconds = age,
            marketStatus = if (closed) "closed" else "open",
            dataStatus = status,
            isDemo = false,
            trend = indicators.trend,
            rsi = indicators.rsi,
            vwap = indicators.vwap,
            volatility = indicators.volatility,
            candles = candles,
        )
    }

    private fun getJson(address: String): JSONObject {
        val connection = (URL(address).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 10_000
            readTimeout = 10_000
            setRequestProperty("Accept", "application/json")
            useCaches = false
        }
        try {
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val body = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (code !in 200..299) throw IOException("Market feed returned HTTP $code")
            return JSONObject(body)
        } finally {
            connection.disconnect()
        }
    }

    private fun parseTime(value: String): Long {
        value.toLongOrNull()?.let { epoch -> return if (epoch < 10_000_000_000L) epoch * 1000L else epoch }
        return runCatching { Instant.parse(value).toEpochMilli() }.getOrDefault(0L)
    }
    private fun JSONObject.optNullableDouble(key: String): Double? =
        if (has(key) && !isNull(key)) optDouble(key).takeIf { it.isFinite() } else null
}
