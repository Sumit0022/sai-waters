package com.saiwaters.admin.ui.tabs

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.saiwaters.admin.model.DashboardStats
import com.saiwaters.admin.model.OrderItem
import com.saiwaters.admin.ui.components.AppleCard
import com.saiwaters.admin.ui.components.MetricCard
import com.saiwaters.admin.ui.components.StatusPill
import com.saiwaters.admin.ui.theme.*

@Composable
fun OverviewTab(
    stats: DashboardStats,
    onNavigateToTab: (Int) -> Unit,
    onQuickScanClick: () -> Unit,
    onQuickAddCustomer: () -> Unit,
    onQuickAddJars: () -> Unit,
    onQuickBackup: () -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 100.dp)
    ) {
        // 1. Hero KPI Banner: Logistics & Revenue
        item {
            AppleCard(
                containerColor = MaterialTheme.colorScheme.secondary,
                borderColor = Color.Transparent
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "TODAY'S OPERATIONS",
                            style = MaterialTheme.typography.labelSmall,
                            color = AppleWaterCyan,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        )

                        if (stats.isTrialBalanceBalanced) {
                            StatusPill(
                                text = "LEDGER BALANCED",
                                textColor = AppleEmeraldGreen,
                                backgroundColor = AppleEmeraldContainer.copy(alpha = 0.2f)
                            )
                        } else {
                            StatusPill(
                                text = "TRIAL VARIANCE",
                                textColor = AppleRoseDanger,
                                backgroundColor = AppleRoseContainer.copy(alpha = 0.2f)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Bottom
                    ) {
                        Column {
                            Text(
                                text = "${stats.todayDelivered} / ${stats.todayTotalOrders}",
                                style = MaterialTheme.typography.headlineLarge,
                                color = Color.White,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Delivered / Scheduled Orders",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.White.copy(alpha = 0.7f)
                            )
                        }

                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "₹${stats.totalRevenuePaise / 100}",
                                style = MaterialTheme.typography.headlineMedium,
                                color = AppleWaterCyan,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Gross Revenue",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.White.copy(alpha = 0.7f)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Progress bar
                    val progress = if (stats.todayTotalOrders > 0) {
                        stats.todayDelivered.toFloat() / stats.todayTotalOrders.toFloat()
                    } else 0f

                    LinearProgressIndicator(
                        progress = { progress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp),
                        color = AppleWaterCyan,
                        trackColor = Color.White.copy(alpha = 0.2f),
                    )
                }
            }
        }

        // 2. Secondary Metric Grid (2x2)
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                MetricCard(
                    modifier = Modifier.weight(1f),
                    title = "Driver Collections",
                    value = "₹${stats.driverClearingPaise / 100}",
                    subtitle = "${stats.pendingCashDrivers} drivers uncleared",
                    icon = Icons.Default.Payments,
                    iconTint = AppleAmberWarning,
                    iconBgColor = AppleAmberContainer,
                    accentPillText = if (stats.driverClearingPaise > 0) "UNCLEARED" else "CLEARED",
                    accentPillColor = if (stats.driverClearingPaise > 0) AppleAmberWarning else AppleEmeraldGreen,
                    accentPillBg = if (stats.driverClearingPaise > 0) AppleAmberContainer else AppleEmeraldContainer
                )

                MetricCard(
                    modifier = Modifier.weight(1f),
                    title = "Plant Cash Vault",
                    value = "₹${stats.vaultCashPaise / 100}",
                    subtitle = "Safe locked physical cash",
                    icon = Icons.Default.AccountBalance,
                    iconTint = AppleEmeraldGreen,
                    iconBgColor = AppleEmeraldContainer
                )
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                MetricCard(
                    modifier = Modifier.weight(1f),
                    title = "Jars in Custody",
                    value = "${stats.withCustomerJars} Jars",
                    subtitle = "${stats.recurringCustomers} recurring grahak",
                    icon = Icons.Default.People,
                    iconTint = AppleAzurePrimary,
                    iconBgColor = AppleCyanContainer
                )

                MetricCard(
                    modifier = Modifier.weight(1f),
                    title = "Plant Stock Ready",
                    value = "${stats.availableJars} Jars",
                    subtitle = "${stats.totalJars} total pool inventory",
                    icon = Icons.Default.WaterDrop,
                    iconTint = AppleWaterCyan,
                    iconBgColor = AppleCyanContainer
                )
            }
        }

        // 3. Quick Action Chips
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "QUICK ACTIONS",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    QuickActionButton(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.QrCodeScanner,
                        label = "Scan QR",
                        color = AppleAzurePrimary,
                        onClick = onQuickScanClick
                    )
                    QuickActionButton(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.PersonAdd,
                        label = "Add Grahak",
                        color = AppleEmeraldGreen,
                        onClick = onQuickAddCustomer
                    )
                    QuickActionButton(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.AddBox,
                        label = "Add Jars",
                        color = ApplePurpleAccent,
                        onClick = onQuickAddJars
                    )
                    QuickActionButton(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.CloudSync,
                        label = "Backup",
                        color = AppleAmberWarning,
                        onClick = onQuickBackup
                    )
                }
            }
        }

        // 4. Recent Operations / Deliveries
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "RECENT DELIVERIES & ORDERS",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )

                Text(
                    text = "View All",
                    style = MaterialTheme.typography.labelSmall,
                    color = AppleAzurePrimary,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.clickable { onNavigateToTab(2) } // Customers / Orders
                )
            }
        }

        if (stats.recentOrders.isEmpty()) {
            item {
                AppleCard {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "No recent orders logged yet today",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        } else {
            items(stats.recentOrders.take(5)) { order ->
                RecentOrderCard(order = order)
            }
        }
    }
}

@Composable
fun QuickActionButton(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    label: String,
    color: Color,
    onClick: () -> Unit
) {
    AppleCard(
        modifier = modifier.clickable { onClick() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp, horizontal = 4.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .background(color.copy(alpha = 0.12f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = label,
                    tint = color,
                    modifier = Modifier.size(18.dp)
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1
            )
        }
    }
}

@Composable
fun RecentOrderCard(order: OrderItem) {
    AppleCard {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(AppleCyanContainer, RoundedCornerShape(12.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.LocalShipping,
                        contentDescription = null,
                        tint = AppleAzureDark,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Column {
                    Text(
                        text = order.customerName,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "${order.orderNumber} • ${order.quantityJars} Jars",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "₹${order.totalAmountPaise / 100}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(2.dp))
                StatusPill(
                    text = order.status,
                    textColor = if (order.status == "DELIVERED") AppleEmeraldGreen else AppleAmberWarning,
                    backgroundColor = if (order.status == "DELIVERED") AppleEmeraldContainer else AppleAmberContainer
                )
            }
        }
    }
}
