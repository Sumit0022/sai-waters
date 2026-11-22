package com.saiwaters.admin.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.saiwaters.admin.ui.theme.AppleBorderLight

@Composable
fun AppleCard(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 20.dp,
    containerColor: Color = MaterialTheme.colorScheme.surface,
    borderColor: Color = MaterialTheme.colorScheme.outlineVariant,
    elevation: Dp = 0.dp,
    content: @Composable BoxScope.() -> Unit
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(cornerRadius),
        color = containerColor,
        border = BorderStroke(1.dp, borderColor),
        shadowElevation = elevation
    ) {
        Box {
            content()
        }
    }
}
