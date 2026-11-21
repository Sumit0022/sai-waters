package com.example.saiwatersdriver.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val SaiWatersLightColorScheme = lightColorScheme(
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

    background = WaterSlateBackground,
    onBackground = WaterTextPrimary,

    surface = WaterWhiteCard,
    onSurface = WaterTextPrimary,
    surfaceVariant = WaterBorderSubtle,
    onSurfaceVariant = WaterTextSecondary,

    outline = WaterBorderLight,
    outlineVariant = WaterBorderSubtle,

    error = WaterRoseDanger,
    onError = Color.White,
    errorContainer = WaterRoseContainer,
    onErrorContainer = WaterOnRoseContainer
)

private val SaiWatersDarkColorScheme = darkColorScheme(
    primary = WaterCyanLight,
    onPrimary = WaterNavyDark,
    primaryContainer = WaterNavyCard,
    onPrimaryContainer = WaterCyanLight,

    secondary = Color.White,
    onSecondary = WaterNavyDark,
    secondaryContainer = WaterNavyCard,
    onSecondaryContainer = Color.White,

    tertiary = WaterEmeraldGreen,
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFF064E3B),
    onTertiaryContainer = WaterEmeraldContainer,

    background = WaterNavyDark,
    onBackground = Color.White,

    surface = WaterNavyCard,
    onSurface = Color.White,
    surfaceVariant = Color(0xFF1E293B),
    onSurfaceVariant = Color(0xFF94A3B8),

    outline = Color(0xFF334155),
    outlineVariant = Color(0xFF1E293B),

    error = WaterRoseDanger,
    onError = Color.White,
    errorContainer = Color(0xFF881337),
    onErrorContainer = WaterRoseContainer
)

@Composable
fun SaiWatersDriverTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) SaiWatersDarkColorScheme else SaiWatersLightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
