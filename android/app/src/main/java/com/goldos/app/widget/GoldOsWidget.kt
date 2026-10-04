package com.goldos.app.widget

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import androidx.glance.unit.dp
import androidx.glance.unit.sp
import androidx.glance.currentState
import androidx.glance.state.PreferencesGlanceStateDefinition
import com.goldos.app.data.GoldSnapshot
import java.util.Locale

private val priceKey = stringPreferencesKey("gold_price")
private val statusKey = stringPreferencesKey("gold_status")
private val changeKey = stringPreferencesKey("gold_change")

class GoldOsWidget : GlanceAppWidget() {
    override val stateDefinition = PreferencesGlanceStateDefinition

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            val state = currentState<Preferences>()
            val price = state[priceKey] ?: "N/A"
            val change = state[changeKey] ?: "N/A"
            val status = state[statusKey] ?: "DEMO DATA"
            Column(
                modifier = GlanceModifier.fillMaxSize()
                    .background(ColorProvider(android.graphics.Color.rgb(24, 21, 17)))
                    .padding(14.dp),
                verticalAlignment = Alignment.Vertical.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.Vertical.CenterVertically) {
                    Text("GOLD OS", style = TextStyle(color = ColorProvider(android.graphics.Color.rgb(221, 193, 138)), fontSize = 9.sp, fontWeight = FontWeight.Bold))
                    Text("  ·  $status", style = TextStyle(color = ColorProvider(android.graphics.Color.rgb(158, 148, 131)), fontSize = 8.sp))
                }
                Text("XAUUSD", style = TextStyle(color = ColorProvider(android.graphics.Color.rgb(180, 170, 153)), fontSize = 8.sp))
                Row(verticalAlignment = Alignment.Vertical.CenterVertically) {
                    Text(price, style = TextStyle(color = ColorProvider(android.graphics.Color.rgb(243, 233, 215)), fontSize = 22.sp, fontWeight = FontWeight.Medium))
                    Text("   $change", style = TextStyle(color = ColorProvider(android.graphics.Color.rgb(153, 174, 151)), fontSize = 10.sp))
                }
            }
        }
    }
}

class GoldOsWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = GoldOsWidget()
}

object GoldWidgetUpdater {
    suspend fun publish(context: Context, snapshot: GoldSnapshot) {
        val manager = GlanceAppWidgetManager(context)
        val widget = GoldOsWidget()
        val ids = manager.getGlanceIds(GoldOsWidget::class.java)
        ids.forEach { id ->
            updateAppWidgetState(context, id) { preferences ->
                preferences[priceKey] = snapshot.price?.let { "$" + String.format(Locale.US, "%,.2f", it) } ?: "N/A"
                preferences[changeKey] = snapshot.changePercent?.let { String.format(Locale.US, "%+.2f%%", it) } ?: "N/A"
                preferences[statusKey] = snapshot.dataStatus
            }
            widget.update(context, id)
        }
    }
}
