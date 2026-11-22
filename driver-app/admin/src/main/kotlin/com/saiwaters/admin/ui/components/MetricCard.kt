package com.saiwaters.admin.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.saiwaters.admin.ui.theme.*

@Composable
fun MetricCard(
    modifier: Modifier = Modifier,
    title: String,
    value: String,
    subtitle: String? = null,
    icon: ImageVector? = null,
    iconTint: Color = AppleAzurePrimary,
    iconBgColor: Color = AppleCyanContainer,
    accentPillText: String? = null,
    accentPillColor: Color = AppleEmeraldGreen,
    accentPillBg: Color = AppleEmeraldContainer
) {
    AppleCard(
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (icon != null) {
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .background(iconBgColor, RoundedCornerShape(12.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            tint = iconTint,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                if (accentPillText != null) {
                    Box(
                        modifier = Modifier
                            .background(accentPillBg, RoundedCornerShape(8.dp))
                            .padding(horizontal = 8.dp, vertical = 3.dp)
                    ) {
                        Text(
                            text = accentPillText,
                            style = MaterialTheme.typography.labelSmall,
                            color = accentPillColor,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = value,
                style = MaterialTheme.typography.headlineMedium.copy(fontSize = 22.sp),
                color = MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(2.dp))

            Text(
                text = title,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            if (subtitle != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.labelSmall,
                    color = AppleTextSecondary
                )
            }
        }
    }
}

@Composable
fun StatusPill(
    text: String,
    textColor: Color = AppleAzureDark,
    backgroundColor: Color = AppleCyanContainer,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .background(backgroundColor, RoundedCornerShape(8.dp))
            .padding(horizontal = 10.dp, vertical = 4.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .background(textColor, CircleShape)
            )
            Text(
                text = text,
                style = MaterialTheme.typography.labelSmall,
                color = textColor,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}
