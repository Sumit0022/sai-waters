package com.example.saiwatersdriver.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val SaiWatersColorScheme = lightColorScheme(
    primary = WaterCyanPrimary,
    onPrimary = Color.White,
    primaryContainer = WaterCyanContainer,
    onPrimaryContainer = WaterOnCyanContainer,

    secondary = WaterNavyDark,
    onSecondary = Color.White,
    secondaryContainer = WaterSlateBackground,
    onSecondaryContainer = WaterTextPrimary,

    tertiary = WaterEmeraldGreen,
    onTertiary = Color.White,
    tertiaryContainer = WaterEmeraldContainer,
    onTertiaryContainer = WaterOnEmeraldContainer,

    background = Color(0xFFF8FAFC),
    onBackground = Color(0xFF0F172A),

    surface = Color.White,
    onSurface = Color(0xFF0F172A),
    surfaceVariant = Color(0xFFF1F5F9),
    onSurfaceVariant = Color(0xFF475569),

    outline = Color(0xFFCBD5E1),
    outlineVariant = Color(0xFFE2E8F0),

    error = WaterRoseDanger,
    onError = Color.White,
    errorContainer = WaterRoseContainer,
    onErrorContainer = WaterOnRoseContainer
)

@Composable
fun SaiWatersDriverTheme(
    content: @Composable () -> Unit
) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = Color.White.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = true
        }
    }

    MaterialTheme(
        colorScheme = SaiWatersColorScheme,
        typography = Typography,
        content = content
    )
}
