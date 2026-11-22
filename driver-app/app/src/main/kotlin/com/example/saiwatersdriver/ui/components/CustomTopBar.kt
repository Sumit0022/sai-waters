package com.example.saiwatersdriver.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ElevatedButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.saiwatersdriver.model.DriverProfile
import com.example.saiwatersdriver.ui.theme.WaterBorderLight
import com.example.saiwatersdriver.ui.theme.WaterCyanContainer
import com.example.saiwatersdriver.ui.theme.WaterCyanPrimary
import com.example.saiwatersdriver.ui.theme.WaterEmeraldGreen
import com.example.saiwatersdriver.ui.theme.WaterNavyDark
import com.example.saiwatersdriver.ui.theme.WaterOnCyanContainer
import com.example.saiwatersdriver.ui.theme.WaterTextSecondary

/**
 * Custom Material 3 Header Top Bar for Sai Waters Driver App
 * Includes statusBarsPadding to prevent Android status bar overlap.
 */
@Composable
fun CustomTopBar(
    driverProfile: DriverProfile,
    pendingSyncCount: Int = 0,
    isOnline: Boolean = true,
    onSyncClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .statusBarsPadding(),
        color = Color.White,
        shadowElevation = 2.dp,
        border = androidx.compose.foundation.BorderStroke(1.dp, WaterBorderLight)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left: Brand Logo & Driver Info
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Apple-Style Brand Avatar Icon
                    androidx.compose.foundation.Image(
                        painter = androidx.compose.ui.res.painterResource(id = com.example.saiwatersdriver.R.drawable.apple_water_logo),
                        contentDescription = "Sai Waters",
                        modifier = Modifier
                            .size(40.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .border(1.dp, Color(0x3338BDF8), RoundedCornerShape(10.dp))
                    )

                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "Sai Waters",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Black,
                                    color = WaterNavyDark,
                                    letterSpacing = (-0.5).sp
                                )
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            // Status Pill (Dynamically reflects Live Sync / Offline Queue)
                            val pillBg = when {
                                pendingSyncCount > 0 -> Color(0xFFFEF3C7)
                                isOnline -> Color(0xFFDCFCE7)
                                else -> Color(0xFFE0F2FE)
                            }
                            val pillBorder = when {
                                pendingSyncCount > 0 -> Color(0xFFFDE68A)
                                isOnline -> Color(0xFF86EFAC)
                                else -> Color(0xFFBAE6FD)
                            }
                            val pillDot = when {
                                pendingSyncCount > 0 -> Color(0xFFD97706)
                                isOnline -> WaterEmeraldGreen
                                else -> Color(0xFF0284C7)
                            }
                            val pillText = when {
                                pendingSyncCount > 0 -> "SYNCING ($pendingSyncCount)"
                                isOnline -> "LIVE SYNC"
                                else -> "OFFLINE READY"
                            }
                            val pillTextColor = when {
                                pendingSyncCount > 0 -> Color(0xFF92400E)
                                isOnline -> Color(0xFF166534)
                                else -> Color(0xFF0369A1)
                            }

                            Surface(
                                shape = RoundedCornerShape(50),
                                color = pillBg,
                                border = androidx.compose.foundation.BorderStroke(1.dp, pillBorder)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(6.dp)
                                            .clip(CircleShape)
                                            .background(pillDot)
                                    )
                                    Text(
                                        text = pillText,
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = pillTextColor
                                    )
                                }
                            }
                        }

                        Text(
                            text = "${driverProfile.fullName} • ${driverProfile.vehicleNumber}",
                            style = MaterialTheme.typography.bodySmall.copy(
                                color = WaterTextSecondary,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 11.sp
                            )
                        )
                    }
                }

                // Right Actions
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    if (onSyncClick != null) {
                        IconButton(
                            onClick = onSyncClick,
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Sync,
                                contentDescription = "Sync",
                                tint = WaterCyanPrimary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
