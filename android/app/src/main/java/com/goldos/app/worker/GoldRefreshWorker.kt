package com.goldos.app.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.goldos.app.GoldOsApplication
import com.goldos.app.widget.GoldWidgetUpdater

/** Slow, constraint-based cache refresh only; foreground UI owns the shorter battery-profile loop. */
class GoldRefreshWorker(appContext: Context, params: WorkerParameters) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result {
        val preferences = applicationContext.getSharedPreferences("gold_os_settings", Context.MODE_PRIVATE)
        if (preferences.getString("data_mode", "demo") != "live") return Result.success()
        val timeframe = preferences.getString("timeframe", "5m") ?: "5m"
        return try {
            val app = applicationContext as GoldOsApplication
            val snapshot = app.repository.snapshot("live", timeframe)
            GoldWidgetUpdater.publish(applicationContext, snapshot)
            Result.success()
        } catch (error: Exception) {
            if (runAttemptCount < 3) Result.retry() else Result.failure()
        }
    }

    companion object { const val UNIQUE_NAME = "gold-os-periodic-market-cache" }
}
