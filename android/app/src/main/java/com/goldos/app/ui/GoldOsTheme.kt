package com.goldos.app.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val GoldDarkPalette = darkColorScheme(
    primary = Color(0xFFC3A166),
    onPrimary = Color(0xFF18140E),
    secondary = Color(0xFFDFC18A),
    background = Color(0xFF100E0C),
    surface = Color(0xFF171411),
    onBackground = Color(0xFFF2EADB),
    onSurface = Color(0xFFF2EADB),
)
private val GoldLightPalette = lightColorScheme(
    primary = Color(0xFF876834),
    onPrimary = Color(0xFFFFF9EF),
    secondary = Color(0xFF8E744C),
    background = Color(0xFFF2E9D9),
    surface = Color(0xFFF6EEDF),
    onBackground = Color(0xFF30271C),
    onSurface = Color(0xFF30271C),
)

@Composable
fun GoldOsTheme(darkTheme: Boolean = true, content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = if (darkTheme) GoldDarkPalette else GoldLightPalette, content = content)
}
