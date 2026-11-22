package com.example.saiwatersdriver.ui.tabs

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.saiwatersdriver.model.DeliveryOrder
import com.example.saiwatersdriver.model.DeliveryStatus
import com.example.saiwatersdriver.model.DriverProfile
import com.example.saiwatersdriver.ui.components.DeliveryCard
import com.example.saiwatersdriver.ui.components.DoorstepDeliveryDialog
import com.example.saiwatersdriver.ui.components.NotificationPermissionCard
import com.example.saiwatersdriver.ui.theme.WaterBorderLight
import com.example.saiwatersdriver.ui.theme.WaterCyanContainer
import com.example.saiwatersdriver.ui.theme.WaterCyanPrimary
import com.example.saiwatersdriver.ui.theme.WaterEmeraldGreen
import com.example.saiwatersdriver.ui.theme.WaterNavyDark
import com.example.saiwatersdriver.ui.theme.WaterOnCyanContainer
import com.example.saiwatersdriver.ui.theme.WaterTextPrimary
import com.example.saiwatersdriver.ui.theme.WaterTextSecondary

enum class DeliveryFilter {
    ALL,
    PENDING,
    DELIVERED
}

/**
 * Deliveries Tab: Assigned Orders & Trip Management
 * Live synced with Sai Waters ERP Backend.
 */
@Composable
fun DeliveriesTab(
    orders: List<DeliveryOrder>,
    driverProfile: DriverProfile,
    hasNotificationPermission: Boolean,
    onRequestNotificationPermission: () -> Unit,
    onRefresh: () -> Unit,
    onConfirmDelivery: (
        orderId: String,
        deliveredJars: List<String>,
        collectedEmptyJars: List<String>,
        cashAmountPaise: Long,
        paymentMode: com.example.saiwatersdriver.model.PaymentMode,
        notes: String
    ) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedFilter by remember { mutableStateOf(DeliveryFilter.ALL) }
    var activeDeliveryOrder by remember { mutableStateOf<DeliveryOrder?>(null) }

    val deliveredCount = orders.count { it.status == DeliveryStatus.DELIVERED }
    val totalCount = orders.size
    val progress = if (totalCount > 0) deliveredCount.toFloat() / totalCount.toFloat() else 0f

    val filteredOrders = when (selectedFilter) {
        DeliveryFilter.ALL -> orders
        DeliveryFilter.PENDING -> orders.filter { it.status != DeliveryStatus.DELIVERED }
        DeliveryFilter.DELIVERED -> orders.filter { it.status == DeliveryStatus.DELIVERED }
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(4.dp))
        }

        // Notification Permission Alert (if not granted)
        if (!hasNotificationPermission) {
            item {
                NotificationPermissionCard(
                    onRequestPermission = onRequestNotificationPermission
                )
            }
        }

        // Active Trip Progress Banner
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = WaterNavyDark),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
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
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.LocalShipping,
                                contentDescription = null,
                                tint = Color(0xFF38BDF8),
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "TRIP #${driverProfile.activeTripId}",
                                fontWeight = FontWeight.Black,
                                fontSize = 13.sp,
                                color = Color.White
                            )
                        }

                        Text(
                            text = "$deliveredCount of $totalCount Delivered",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF38BDF8)
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    LinearProgressIndicator(
                        progress = { progress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        color = Color(0xFF38BDF8),
                        trackColor = Color(0xFF1E293B),
                        strokeCap = StrokeCap.Round
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Vehicle: ${driverProfile.vehicleNumber}",
                            fontSize = 11.sp,
                            color = Color(0xFF94A3B8)
                        )
                        val remainingJars = orders.filter { it.status != DeliveryStatus.DELIVERED }.sumOf { it.jarQuantity }
                        Text(
                            text = "$remainingJars Jars Remaining",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFE2E8F0)
                        )
                    }
                }
            }
        }

        // Filter Chips Row
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val filters = listOf(
                    DeliveryFilter.ALL to "All (${orders.size})",
                    DeliveryFilter.PENDING to "Pending (${orders.count { it.status != DeliveryStatus.DELIVERED }})",
                    DeliveryFilter.DELIVERED to "Delivered ($deliveredCount)"
                )
                for ((filter, label) in filters) {
                    val isSelected = selectedFilter == filter
                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .clickable { selectedFilter = filter },
                        shape = RoundedCornerShape(12.dp),
                        color = if (isSelected) WaterCyanPrimary else Color.White,
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (isSelected) WaterCyanPrimary else WaterBorderLight
                        )
                    ) {
                        Text(
                            text = label,
                            modifier = Modifier.padding(vertical = 8.dp),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isSelected) Color.White else WaterTextSecondary,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        }

        // Deliveries List or Empty State
        if (filteredOrders.isEmpty()) {
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = Color.White,
                    border = androidx.compose.foundation.BorderStroke(1.dp, WaterBorderLight)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(28.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFF1F5F9)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Inbox,
                                contentDescription = null,
                                tint = Color(0xFF94A3B8),
                                modifier = Modifier.size(28.dp)
                            )
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        Text(
                            text = if (selectedFilter == DeliveryFilter.DELIVERED) "No Deliveries Completed Yet" else "No Deliveries Assigned",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = WaterNavyDark
                        )

                        Spacer(modifier = Modifier.height(6.dp))

                        Text(
                            text = "Deliveries allotted to you from Sai Waters Admin Portal will appear here live.",
                            fontSize = 12.sp,
                            color = WaterTextSecondary,
                            textAlign = TextAlign.Center,
                            lineHeight = 16.sp
                        )

                        Spacer(modifier = Modifier.height(18.dp))

                        Button(
                            onClick = onRefresh,
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = WaterCyanPrimary)
                        ) {
                            Icon(imageVector = Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Refresh Orders", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        } else {
            items(filteredOrders, key = { it.id }) { order ->
                DeliveryCard(
                    order = order,
                    onStartDelivery = { selectedOrder ->
                        activeDeliveryOrder = selectedOrder
                    }
                )
            }
        }

        item {
            Spacer(modifier = Modifier.height(24.dp))
        }
    }

    // Doorstep Delivery & Cash Settle Dialog
    activeDeliveryOrder?.let { order ->
        DoorstepDeliveryDialog(
            order = order,
            onDismiss = { activeDeliveryOrder = null },
            onConfirmDelivery = { orderId, delJars, empJars, cashAmt, mode, notes ->
                onConfirmDelivery(orderId, delJars, empJars, cashAmt, mode, notes)
                activeDeliveryOrder = null
            }
        )
    }
}
