package com.goldos.app.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import org.json.JSONArray
import org.json.JSONObject

@Entity(tableName = "gold_snapshot_cache")
data class GoldCacheEntity(
    @PrimaryKey val timeframe: String,
    val payload: String,
    val savedAt: Long,
)

@Dao
interface GoldCacheDao {
    @Query("SELECT * FROM gold_snapshot_cache WHERE timeframe = :timeframe LIMIT 1")
    suspend fun get(timeframe: String): GoldCacheEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: GoldCacheEntity)
}

@Database(entities = [GoldCacheEntity::class], version = 1, exportSchema = false)
abstract class GoldDatabase : RoomDatabase() {
    abstract fun goldCacheDao(): GoldCacheDao

    companion object {
        @Volatile private var instance: GoldDatabase? = null
        fun get(context: Context): GoldDatabase = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(context.applicationContext, GoldDatabase::class.java, "gold-os-cache.db")
                .fallbackToDestructiveMigration()
                .build()
                .also { instance = it }
        }
    }
}

fun GoldSnapshot.toCacheEntity(): GoldCacheEntity {
    val json = JSONObject()
        .put("symbol", symbol)
        .put("timeframe", timeframe)
        .put("price", price ?: JSONObject.NULL)
        .put("changePercent", changePercent ?: JSONObject.NULL)
        .put("high", high ?: JSONObject.NULL)
        .put("low", low ?: JSONObject.NULL)
        .put("timestamp", timestamp)
        .put("quoteAgeSeconds", quoteAgeSeconds)
        .put("marketStatus", marketStatus)
        .put("trend", trend ?: JSONObject.NULL)
        .put("rsi", rsi ?: JSONObject.NULL)
        .put("vwap", vwap ?: JSONObject.NULL)
        .put("volatility", volatility)
    val bars = JSONArray()
    candles.forEach { candle ->
        bars.put(JSONObject()
            .put("openTime", candle.openTime)
            .put("open", candle.open)
            .put("high", candle.high)
            .put("low", candle.low)
            .put("close", candle.close)
            .put("volume", candle.volume)
            .put("isOpen", candle.isOpen))
    }
    json.put("candles", bars)
    return GoldCacheEntity(timeframe = timeframe, payload = json.toString(), savedAt = System.currentTimeMillis())
}

fun GoldCacheEntity.toSnapshot(status: String): GoldSnapshot {
    val json = JSONObject(payload)
    val barsJson = json.optJSONArray("candles") ?: JSONArray()
    val bars = buildList {
        for (index in 0 until barsJson.length()) {
            val item = barsJson.optJSONObject(index) ?: continue
            add(GoldCandle(
                openTime = item.optLong("openTime"),
                open = item.optDouble("open"),
                high = item.optDouble("high"),
                low = item.optDouble("low"),
                close = item.optDouble("close"),
                volume = item.optDouble("volume", 0.0),
                isOpen = item.optBoolean("isOpen", false),
            ))
        }
    }
    return GoldSnapshot(
        symbol = json.optString("symbol", "XAUUSD"),
        timeframe = timeframe,
        price = json.nullableDouble("price"),
        changePercent = json.nullableDouble("changePercent"),
        high = json.nullableDouble("high"),
        low = json.nullableDouble("low"),
        timestamp = json.optLong("timestamp", savedAt),
        quoteAgeSeconds = ((System.currentTimeMillis() - json.optLong("timestamp", savedAt)).coerceAtLeast(0L) / 1000L),
        marketStatus = json.optString("marketStatus", "unknown"),
        dataStatus = status,
        isDemo = false,
        trend = json.nullableString("trend"),
        rsi = json.nullableDouble("rsi"),
        vwap = json.nullableDouble("vwap"),
        volatility = json.optString("volatility", "N/A"),
        candles = bars,
    )
}

private fun JSONObject.nullableDouble(key: String): Double? =
    if (!has(key) || isNull(key)) null else optDouble(key).takeIf { it.isFinite() }
private fun JSONObject.nullableString(key: String): String? =
    if (!has(key) || isNull(key)) null else optString(key)
