package com.goldos.app.repository

import android.content.Context
import com.goldos.app.data.BiQuoteGoldPriceProvider
import com.goldos.app.data.DemoGoldPriceProvider
import com.goldos.app.data.GoldCacheDao
import com.goldos.app.data.GoldDatabase
import com.goldos.app.data.GoldSnapshot
import com.goldos.app.data.toCacheEntity
import com.goldos.app.data.toSnapshot

/** UI and widgets depend on a repository, never directly on a vendor endpoint. */
class GoldRepository(
    context: Context,
    private val demoProvider: DemoGoldPriceProvider = DemoGoldPriceProvider(),
    private val liveProvider: BiQuoteGoldPriceProvider = BiQuoteGoldPriceProvider(),
    private val cache: GoldCacheDao = GoldDatabase.get(context).goldCacheDao(),
) {
    suspend fun snapshot(mode: String, timeframe: String): GoldSnapshot {
        if (mode != "live") return demoProvider.getSnapshot(timeframe)
        return try {
            liveProvider.getSnapshot(timeframe).also { cache.upsert(it.toCacheEntity()) }
        } catch (error: Exception) {
            val saved = cache.get(timeframe) ?: throw error
            saved.toSnapshot(status = "DATA DELAYED")
        }
    }
}
