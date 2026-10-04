package com.goldos.app

import android.app.Application
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.goldos.app.data.GoldDatabase
import com.goldos.app.repository.GoldRepository
import com.goldos.app.worker.GoldRefreshWorker
import java.util.concurrent.TimeUnit

class GoldOsApplication : Application() {
    lateinit var repository: GoldRepository
        private set

    override fun onCreate() {
        super.onCreate()
        repository = GoldRepository(this, cache = GoldDatabase.get(this).goldCacheDao())
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .setRequiresBatteryNotLow(true)
            .build()
        val request = PeriodicWorkRequestBuilder<GoldRefreshWorker>(15, TimeUnit.MINUTES)
            .setConstraints(constraints)
            .build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            GoldRefreshWorker.UNIQUE_NAME,
            ExistingPeriodicWorkPolicy.UPDATE,
            request,
        )
    }
}
