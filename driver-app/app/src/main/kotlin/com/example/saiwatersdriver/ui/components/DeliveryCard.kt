package com.example.saiwatersdriver.ui.components

import android.content.Intent
import android.net.Uri
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Directions
import androidx.compose.material.icons.filled.LocalPhone
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.saiwatersdriver.model.DeliveryOrder
import com.example.saiwatersdriver.model.DeliveryStatus
import com.example.saiwatersdriver.model.OrderBillingType
import com.example.saiwatersdriver.ui.theme.WaterBorderLight
import com.example.saiwatersdriver.ui.theme.WaterCyanContainer
import com.example.saiwatersdriver.ui.theme.WaterCyanPrimary
import com.example.saiwatersdriver.ui.theme.WaterEmeraldContainer
import com.example.saiwatersdriver.ui.theme.WaterEmeraldGreen
import com.example.saiwatersdriver.ui.theme.WaterNavyDark
import com.example.saiwatersdriver.ui.theme.WaterOnCyanContainer
import com.example.saiwatersdriver.ui.theme.WaterOnEmeraldContainer
import com.example.saiwatersdriver.ui.theme.WaterTextPrimary
import com.example.saiwatersdriver.ui.theme.WaterTextSecondary

/**
 * Custom Delivery Card for Sai Waters Drivers
 * Displays order details, customer contact shortcuts, and delivery completion action
 */
@Composable
fun DeliveryCard(
    order: DeliveryOrder,
    onStartDelivery: (DeliveryOrder) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val isDelivered = order.status == DeliveryStatus.DELIVERED

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isDelivered) Color(0xFFBBF7D0) else WaterBorderLight
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // Header: Order Number & Type Badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = order.orderNumber,
                        style = MaterialTheme.typography.labelMedium.copy(
                            fontWeight = FontWeight.Black,
                            color = WaterCyanPrimary,
                            fontSize = 12.sp
                        )
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = when (order.billingType) {
                            OrderBillingType.BULK_EVENT -> Color(0xFFEDE9FE)
                            OrderBillingType.REGULAR_MONTHLY -> Color(0xFFE0F2FE)
                            OrderBillingType.DAILY_SPOT -> Color(0xFFF1F5F9)
                        }
                    ) {
                        Text(
                            text = when (order.billingType) {
                                OrderBillingType.BULK_EVENT -> "EVENT ORDER"
                                OrderBillingType.REGULAR_MONTHLY -> "REGULAR MONTHLY"
                                OrderBillingType.DAILY_SPOT -> "SPOT DELIVERY"
                            },
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            fontSize = 9.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = when (order.billingType) {
                                OrderBillingType.BULK_EVENT -> Color(0xFF6D28D9)
                                OrderBillingType.REGULAR_MONTHLY -> Color(0xFF0369A1)
                                OrderBillingType.DAILY_SPOT -> Color(0xFF475569)
                            }
                        )
                    }
                }

                // Delivery Status Pill
                if (isDelivered) {
                    Surface(
                        shape = RoundedCornerShape(50),
                        color = WaterEmeraldContainer
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = WaterEmeraldGreen,
                                modifier = Modifier.size(12.dp)
                            )
                            Text(
                                text = "DELIVERED",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = WaterOnEmeraldContainer
                            )
                        }
                    }
                } else {
                    Surface(
                        shape = RoundedCornerShape(50),
                        color = Color(0xFFFEF3C7)
                    ) {
                        Text(
                            text = "IN TRANSIT",
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF92400E)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Customer Name & Address
            Text(
                text = order.customerName,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Black,
                    color = WaterTextPrimary,
                    fontSize = 16.sp
                )
            )

            Spacer(modifier = Modifier.height(4.dp))

            Row(
                verticalAlignment = Alignment.Top,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.LocationOn,
                    contentDescription = null,
                    tint = WaterTextSecondary,
                    modifier = Modifier
                        .size(14.dp)
                        .padding(top = 2.dp)
                )
                Text(
                    text = "${order.address}, ${order.area}",
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = WaterTextSecondary,
                        fontSize = 12.sp,
                        lineHeight = 16.sp
                    )
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Key Delivery Metrics Card
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color(0xFFF8FAFC),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, WaterBorderLight)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Jars
                    Column {
                        Text(
                            text = "JARS TO DELIVER",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = WaterTextSecondary
                        )
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.WaterDrop,
                                contentDescription = null,
                                tint = WaterCyanPrimary,
                                modifier = Modifier.size(14.dp)
                            )
                            Text(
                                text = "${order.jarQuantity} Jars (20L)",
                                fontWeight = FontWeight.Black,
                                fontSize = 13.sp,
                                color = WaterNavyDark
                            )
                        }
                    }

                    // Empty Jars
                    Column {
                        Text(
                            text = "EMPTY TO COLLECT",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = WaterTextSecondary
                        )
                        Text(
                            text = "${order.emptyJarsDue} Empties",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = Color(0xFF475569)
                        )
                    }

                    // Net Amount Due
                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = "AMOUNT DUE",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = WaterTextSecondary
                        )
                        Text(
                            text = String.format("₹%.0f", order.netDueRupees),
                            fontWeight = FontWeight.Black,
                            fontSize = 14.sp,
                            color = if (order.netDuePaise > 0) Color(0xFFDC2626) else WaterEmeraldGreen
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Bottom Actions: Call, Navigate, Deliver
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Call Shortcut
                OutlinedButton(
                    onClick = {
                        val dialIntent = Intent(Intent.ACTION_DIAL).apply {
                            data = Uri.parse("tel:${order.customerPhone}")
                        }
                        context.startActivity(dialIntent)
                    },
                    modifier = Modifier.size(42.dp),
                    shape = RoundedCornerShape(12.dp),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(0.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFCBD5E1))
                ) {
                    Icon(
                        imageVector = Icons.Default.LocalPhone,
                        contentDescription = "Call Customer",
                        tint = WaterEmeraldGreen,
                        modifier = Modifier.size(18.dp)
                    )
                }

                // Navigate (Google Maps Intent)
                OutlinedButton(
                    onClick = {
                        val mapUri = Uri.parse("google.navigation:q=${Uri.encode("${order.address}, ${order.area}")}")
                        val mapIntent = Intent(Intent.ACTION_VIEW, mapUri)
                        context.startActivity(mapIntent)
                    },
                    modifier = Modifier.size(42.dp),
                    shape = RoundedCornerShape(12.dp),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(0.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFCBD5E1))
                ) {
                    Icon(
                        imageVector = Icons.Default.Directions,
                        contentDescription = "Navigate to Address",
                        tint = WaterCyanPrimary,
                        modifier = Modifier.size(20.dp)
                    )
                }

                // Main Action: Deliver / Inspect
                Button(
                    onClick = { onStartDelivery(order) },
                    modifier = Modifier
                        .weight(1f)
                        .height(42.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isDelivered) Color(0xFFF1F5F9) else WaterNavyDark,
                        contentColor = if (isDelivered) Color(0xFF475569) else Color.White
                    )
                ) {
                    if (isDelivered) {
                        Text(
                            text = "Delivered (${order.deliveredAt ?: "Done"})",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp
                        )
                    } else {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.QrCodeScanner,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = Color(0xFF38BDF8)
                            )
                            Text(
                                text = "Deliver & Collect",
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }
                    }
                }
            }
        }
    }
}
