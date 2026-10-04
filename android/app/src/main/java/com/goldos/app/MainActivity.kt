package com.goldos.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import com.goldos.app.ui.GoldOsDashboard
import com.goldos.app.ui.DashboardViewModel

class MainActivity : ComponentActivity() {
    private val dashboardViewModel: DashboardViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { GoldOsDashboard(viewModel = dashboardViewModel) }
    }

    override fun onStart() {
        super.onStart()
        dashboardViewModel.startUpdates()
    }

    override fun onStop() {
        dashboardViewModel.stopUpdates()
        super.onStop()
    }
}
