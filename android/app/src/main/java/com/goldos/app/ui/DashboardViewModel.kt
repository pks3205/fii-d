package com.goldos.app.ui

import android.app.Application
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.goldos.app.GoldOsApplication
import com.goldos.app.data.GoldSnapshot
import com.goldos.app.widget.GoldWidgetUpdater
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

private val BATTERY_INTERVALS = mapOf("saver" to 60_000L, "balanced" to 15_000L, "fast" to 5_000L)

data class DashboardUiState(
    val snapshot: GoldSnapshot? = null,
    val timeframe: String = "5m",
    val dataMode: String = "demo",
    val batteryMode: String = "balanced",
    val isRefreshing: Boolean = false,
    val error: String? = null,
)

class DashboardViewModel(application: Application) : AndroidViewModel(application) {
    private val app = application as GoldOsApplication
    private val repository = app.repository
    private val preferences = application.getSharedPreferences("gold_os_settings", Context.MODE_PRIVATE)
    private val mutex = Mutex()
    private val mutableState = MutableStateFlow(
        DashboardUiState(
            timeframe = preferences.getString("timeframe", "5m") ?: "5m",
            dataMode = preferences.getString("data_mode", "demo") ?: "demo",
            batteryMode = preferences.getString("battery_mode", "balanced") ?: "balanced",
        ),
    )
    val state: StateFlow<DashboardUiState> = mutableState.asStateFlow()
    private var refreshJob: Job? = null

    fun startUpdates() {
        if (refreshJob?.isActive == true) return
        refreshJob = viewModelScope.launch {
            while (isActive) {
                refreshSnapshot()
                delay(BATTERY_INTERVALS[mutableState.value.batteryMode] ?: BATTERY_INTERVALS.getValue("balanced"))
            }
        }
    }

    fun stopUpdates() {
        refreshJob?.cancel()
        refreshJob = null
    }

    fun refreshNow() { viewModelScope.launch { refreshSnapshot() } }

    fun setTimeframe(value: String) {
        if (value !in setOf("1m", "5m", "15m", "1h")) return
        mutableState.update { it.copy(timeframe = value) }
        preferences.edit().putString("timeframe", value).apply()
        refreshNow()
    }

    fun setDataMode(value: String) {
        if (value !in setOf("demo", "live")) return
        mutableState.update { it.copy(dataMode = value, snapshot = null, error = null) }
        preferences.edit().putString("data_mode", value).apply()
        refreshNow()
    }

    fun setBatteryMode(value: String) {
        if (value !in BATTERY_INTERVALS) return
        mutableState.update { it.copy(batteryMode = value) }
        preferences.edit().putString("battery_mode", value).apply()
    }

    private suspend fun refreshSnapshot() = mutex.withLock {
        mutableState.update { it.copy(isRefreshing = true, error = null) }
        val current = mutableState.value
        try {
            val snapshot = repository.snapshot(current.dataMode, current.timeframe)
            mutableState.update { it.copy(snapshot = snapshot, isRefreshing = false, error = null) }
            GoldWidgetUpdater.publish(getApplication(), snapshot)
        } catch (error: Exception) {
            mutableState.update { it.copy(isRefreshing = false, error = error.message ?: "Gold data is unavailable") }
        }
    }
}
