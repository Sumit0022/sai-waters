package com.saiwaters.admin.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// Apple Crisp Executive Light Color Scheme (Default)
private val AppleLightColorScheme = lightColorScheme(
    primary = AppleAzurePrimary,
    onPrimary = Color.White,
    primaryContainer = AppleCyanContainer,
    onPrimaryContainer = AppleOnCyanContainer,

    secondary = AppleTitaniumDark,
    onSecondary = Color.White,
    secondaryContainer = AppleSurfaceSubtle,
    onSecondaryContainer = AppleTextPrimary,

    tertiary = AppleEmeraldGreen,
    onTertiary = Color.White,
    tertiaryContainer = AppleEmeraldContainer,
    onTertiaryContainer = AppleOnEmeraldContainer,

    background = Color(0xFFF8FAFC),
    onBackground = Color(0xFF0F172A),

    surface = Color.White,
    onSurface = Color(0xFF0F172A),
    surfaceVariant = Color(0xFFF1F5F9),
    onSurfaceVariant = Color(0xFF475569),

    outline = Color(0xFFE2E8F0),
    outlineVariant = Color(0xFFF1F5F9),

    error = AppleRoseDanger,
    onError = Color.White,
    errorContainer = AppleRoseContainer,
    onErrorContainer = AppleOnRoseContainer
)

@Composable
fun SaiWatersAdminTheme(
    content: @Composable () -> Unit
) {
    val colorScheme = AppleLightColorScheme
    val view = LocalView.current

    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = Color.White.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = true
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = AppleTypography,
        content = content
    )
}
