package com.example.saiwatersdriver.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.saiwatersdriver.model.DeliveryOrder
import com.example.saiwatersdriver.model.OrderBillingType
import com.example.saiwatersdriver.model.PaymentMode
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
 * Doorstep Delivery & Cash Settlement Dialog
 * Implements full Sai Waters ERP delivery protocol:
 * 1. Jar verification
 * 2. Empty jars return accounting
 * 3. Cash collected credited to Driver Clearing Account (1120)
 */
@Composable
fun DoorstepDeliveryDialog(
    order: DeliveryOrder,
    onDismiss: () -> Unit,
    onConfirmDelivery: (
        orderId: String,
        deliveredJars: List<String>,
        collectedEmptyJars: List<String>,
        cashAmountPaise: Long,
        paymentMode: PaymentMode,
        notes: String
    ) -> Unit
) {
    var emptyJarsCount by remember { mutableIntStateOf(order.emptyJarsDue) }
    var eventUndertakingAccepted by remember { mutableStateOf(false) }
    var selectedPaymentMode by remember { mutableStateOf(PaymentMode.CASH) }

    // Cash Collected (Default to net due or zero if regular monthly)
    val defaultCashAmount = if (order.billingType == OrderBillingType.REGULAR_MONTHLY) {
        0L
    } else {
        order.netDuePaise
    }
    var cashEnteredText by remember {
        mutableStateOf(String.format("%.0f", defaultCashAmount / 100.0))
    }
    var driverNotes by remember { mutableStateOf("") }

    val enteredRupees = cashEnteredText.toDoubleOrNull() ?: 0.0
    val enteredPaise = (enteredRupees * 100).toLong()
    val remainingDuePaise = (order.netDuePaise - enteredPaise).coerceAtLeast(0L)

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.94f)
                .padding(vertical = 16.dp),
            shape = RoundedCornerShape(24.dp),
            color = Color.White,
            shadowElevation = 8.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Deliver & Settle",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Black,
                                color = WaterNavyDark,
                                fontSize = 18.sp
                            )
                        )
                        Text(
                            text = "${order.orderNumber} • ${order.customerName}",
                            style = MaterialTheme.typography.bodySmall.copy(
                                color = WaterTextSecondary,
                                fontWeight = FontWeight.Medium
                            )
                        )
                    }

                    IconButton(onClick = onDismiss) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = WaterTextSecondary
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Section 1: 20L Jars to Handover
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = Color(0xFFF8FAFC),
                    shape = RoundedCornerShape(14.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, WaterBorderLight)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(WaterCyanContainer),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.WaterDrop,
                                    contentDescription = null,
                                    tint = WaterCyanPrimary,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = "${order.jarQuantity} Jars to Deliver",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = WaterNavyDark
                                )
                                Text(
                                    text = "Rate: ₹${order.ratePerJarPaise / 100} / Jar • Total: ₹${order.totalAmountPaise / 100}",
                                    fontSize = 11.sp,
                                    color = WaterTextSecondary
                                )
                            }
                        }

                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = WaterEmeraldContainer
                        ) {
                            Text(
                                text = "VERIFIED",
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = WaterOnEmeraldContainer
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Section 2: Empty Jars Return Counter
                Text(
                    text = "EMPTY JARS COLLECTED",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = WaterTextSecondary
                )
                Spacer(modifier = Modifier.height(6.dp))

                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = Color.White,
                    shape = RoundedCornerShape(14.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, WaterBorderLight)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "$emptyJarsCount Empty 20L Jars",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = WaterNavyDark
                            )
                            Text(
                                text = "Expected return: ${order.emptyJarsDue} jars",
                                fontSize = 11.sp,
                                color = WaterTextSecondary
                            )
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            IconButton(
                                onClick = { if (emptyJarsCount > 0) emptyJarsCount-- },
                                modifier = Modifier
                                    .size(34.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFF1F5F9))
                            ) {
                                Icon(imageVector = Icons.Default.Remove, contentDescription = "Decrement", modifier = Modifier.size(16.dp))
                            }

                            Text(
                                text = "$emptyJarsCount",
                                fontWeight = FontWeight.Black,
                                fontSize = 16.sp,
                                color = WaterNavyDark
                            )

                            IconButton(
                                onClick = { emptyJarsCount++ },
                                modifier = Modifier
                                    .size(34.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFF1F5F9))
                            ) {
                                Icon(imageVector = Icons.Default.Add, contentDescription = "Increment", modifier = Modifier.size(16.dp))
                            }
                        }
                    }
                }

                // Event Undertaking if Bulk Event Order
                if (order.billingType == OrderBillingType.BULK_EVENT) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color(0xFFF5F3FF))
                            .padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = eventUndertakingAccepted,
                            onCheckedChange = { eventUndertakingAccepted = it },
                            colors = CheckboxDefaults.colors(checkedColor = Color(0xFF7C3AED))
                        )
                        Text(
                            text = "Event Undertaking: Received confirmation of custody",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF5B21B6)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Section 3: Doorstep Payment Collection
                Text(
                    text = "DOORSTEP PAYMENT COLLECTION",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = WaterTextSecondary
                )
                Spacer(modifier = Modifier.height(6.dp))

                // Mode Toggle: CASH vs UPI QR
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .clickable { selectedPaymentMode = PaymentMode.CASH },
                        shape = RoundedCornerShape(12.dp),
                        color = if (selectedPaymentMode == PaymentMode.CASH) WaterNavyDark else Color(0xFFF8FAFC),
                        border = androidx.compose.foundation.BorderStroke(1.dp, WaterBorderLight)
                    ) {
                        Row(
                            modifier = Modifier.padding(vertical = 10.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Payments,
                                contentDescription = null,
                                tint = if (selectedPaymentMode == PaymentMode.CASH) Color.White else WaterTextSecondary,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Cash in Hand",
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp,
                                color = if (selectedPaymentMode == PaymentMode.CASH) Color.White else WaterTextSecondary
                            )
                        }
                    }

                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .clickable { selectedPaymentMode = PaymentMode.UPI_QR },
                        shape = RoundedCornerShape(12.dp),
                        color = if (selectedPaymentMode == PaymentMode.UPI_QR) WaterCyanPrimary else Color(0xFFF8FAFC),
                        border = androidx.compose.foundation.BorderStroke(1.dp, WaterBorderLight)
                    ) {
                        Row(
                            modifier = Modifier.padding(vertical = 10.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.CreditCard,
                                contentDescription = null,
                                tint = if (selectedPaymentMode == PaymentMode.UPI_QR) Color.White else WaterTextSecondary,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "UPI QR Scan",
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp,
                                color = if (selectedPaymentMode == PaymentMode.UPI_QR) Color.White else WaterTextSecondary
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Cash Amount Input
                OutlinedTextField(
                    value = cashEnteredText,
                    onValueChange = { cashEnteredText = it },
                    label = { Text("Amount Collected (₹)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    textStyle = androidx.compose.ui.text.TextStyle(color = Color(0xFF0F172A), fontSize = 14.sp, fontWeight = FontWeight.Bold),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color(0xFF0F172A),
                        unfocusedTextColor = Color(0xFF0F172A),
                        focusedContainerColor = Color.White,
                        unfocusedContainerColor = Color.White,
                        focusedBorderColor = WaterCyanPrimary,
                        unfocusedBorderColor = WaterBorderLight,
                        cursorColor = WaterCyanPrimary
                    ),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Quick Denomination Chips
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    val quickAmounts = listOf(
                        "Exact" to order.netDueRupees,
                        "₹35" to 35.0,
                        "₹70" to 70.0,
                        "₹100" to 100.0,
                        "₹0 Due" to 0.0
                    )
                    for ((label, amt) in quickAmounts) {
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .clickable { cashEnteredText = String.format("%.0f", amt) },
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFFF1F5F9),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                        ) {
                            Text(
                                text = label,
                                modifier = Modifier.padding(vertical = 6.dp),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = WaterNavyDark,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Remaining Due / Fully Paid Breakdown Pill
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    color = if (remainingDuePaise == 0L) Color(0xFFDCFCE7) else Color(0xFFFEF3C7)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (remainingDuePaise == 0L) "Status: Fully Settled" else "Balance Due Remaining:",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (remainingDuePaise == 0L) Color(0xFF166534) else Color(0xFF92400E)
                        )
                        Text(
                            text = String.format("₹%.0f", remainingDuePaise / 100.0),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Black,
                            color = if (remainingDuePaise == 0L) Color(0xFF166534) else Color(0xFFDC2626)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))

                // Final Action Button
                Button(
                    onClick = {
                        val deliveredTokens = order.allocatedJars.ifEmpty {
                            listOf("JAR-2026-${order.orderNumber.takeLast(4)}")
                        }
                        val emptyTokens = (1..emptyJarsCount).map { "JAR-EMP-$it" }

                        onConfirmDelivery(
                            order.id,
                            deliveredTokens,
                            emptyTokens,
                            enteredPaise,
                            selectedPaymentMode,
                            driverNotes
                        )
                        onDismiss()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = WaterEmeraldGreen,
                        contentColor = Color.White
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Complete Delivery & Post Receipt",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                }
            }
        }
    }
}
