package com.saiwaters.admin.ui.theme

import android.app.Activity
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

private val LightColorScheme = lightColorScheme(
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

    background = AppleBackgroundLight,
    onBackground = AppleTextPrimary,

    surface = AppleCardLight,
    onSurface = AppleTextPrimary,
    surfaceVariant = AppleSurfaceSubtle,
    onSurfaceVariant = AppleTextSecondary,

    outline = AppleBorderLight,
    outlineVariant = AppleBorderSubtle,

    error = AppleRoseDanger,
    onError = Color.White,
    errorContainer = AppleRoseContainer,
    onErrorContainer = AppleOnRoseContainer
)

private val DarkColorScheme = darkColorScheme(
    primary = AppleWaterCyan,
    onPrimary = AppleObsidianDark,
    primaryContainer = AppleAzureDark,
    onPrimaryContainer = Color.White,

    secondary = AppleSurfaceSubtle,
    onSecondary = AppleObsidianDark,
    secondaryContainer = AppleSlateCardDark,
    onSecondaryContainer = Color.White,

    tertiary = AppleEmeraldGreen,
    onTertiary = Color.White,
    tertiaryContainer = AppleOnEmeraldContainer,
    onTertiaryContainer = AppleEmeraldContainer,

    background = AppleObsidianDark,
    onBackground = Color.White,

    surface = AppleTitaniumDark,
    onSurface = Color.White,
    surfaceVariant = AppleSlateCardDark,
    onSurfaceVariant = AppleTextMuted,

    outline = Color(0xFF334155),
    outlineVariant = Color(0xFF1E293B),

    error = AppleRoseDanger,
    onError = Color.White,
    errorContainer = AppleOnRoseContainer,
    onErrorContainer = AppleRoseContainer
)

@Composable
fun SaiWatersAdminTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
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
        typography = AppleTypography,
        content = content
    )
}
