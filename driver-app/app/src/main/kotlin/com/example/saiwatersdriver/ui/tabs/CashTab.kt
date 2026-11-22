package com.example.saiwatersdriver.ui.tabs

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
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.saiwatersdriver.model.CashCollectionEntry
import com.example.saiwatersdriver.model.PaymentMode
import com.example.saiwatersdriver.ui.theme.WaterBorderLight
import com.example.saiwatersdriver.ui.theme.WaterCyanPrimary
import com.example.saiwatersdriver.ui.theme.WaterEmeraldContainer
import com.example.saiwatersdriver.ui.theme.WaterEmeraldGreen
import com.example.saiwatersdriver.ui.theme.WaterNavyDark
import com.example.saiwatersdriver.ui.theme.WaterTextPrimary
import com.example.saiwatersdriver.ui.theme.WaterTextSecondary
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Cash Tab: Driver Clearing Account (1120) & Daily Cash Book
 * Real-time ledger sync with zero-balance on handover.
 * Supports Cash Handover to Central Vault (A/C 1110) or UPI Transfer to Bank (A/C 1130).
 */
@Composable
fun CashTab(
    cashCollections: List<CashCollectionEntry>,
    totalCashInHandPaise: Long,
    onHandoverClick: (amountPaise: Long, targetAccountId: Int, notes: String) -> Unit = { _, _, _ -> },
    modifier: Modifier = Modifier
) {
    val totalRupees = totalCashInHandPaise / 100.0
    var showHandoverDialog by remember { mutableStateOf(false) }
    var handoverAmountText by remember { mutableStateOf("") }
    var handoverTargetAccountId by remember { mutableIntStateOf(1110) } // 1110 = Cash Vault, 1130 = Bank / UPI
    var handoverNotes by remember { mutableStateOf("Evening cash deposit to plant") }
    var handoverNotice by remember { mutableStateOf<String?>(null) }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(6.dp))
        }

        // Hero Card: Total Cash in Driver Custody
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = WaterNavyDark),
                elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
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
                            text = "DRIVER CASH IN HAND",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF38BDF8),
                            letterSpacing = 1.sp
                        )

                        Surface(
                            shape = RoundedCornerShape(50),
                            color = if (totalCashInHandPaise > 0) Color(0x3338BDF8) else Color(0x3310B981)
                        ) {
                            Text(
                                text = if (totalCashInHandPaise > 0) "A/C 1120 IN-TRANSIT" else "VAULT CLEAR (₹0)",
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (totalCashInHandPaise > 0) Color(0xFFE0F2FE) else Color(0xFF86EFAC)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Text(
                        text = String.format(Locale.US, "₹%.2f", totalRupees),
                        style = MaterialTheme.typography.headlineMedium.copy(
                            fontWeight = FontWeight.Black,
                            color = Color.White,
                            fontSize = 32.sp
                        )
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = if (totalRupees > 0) "Physical cash in custody • Handover to Plant Vault (1110) or via UPI (1130)" else "All collections are settled. Current cash in hand is ₹0.00.",
                        fontSize = 11.sp,
                        color = Color(0xFF94A3B8)
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = {
                            if (totalCashInHandPaise > 0) {
                                handoverAmountText = String.format(Locale.US, "%.0f", totalRupees)
                                showHandoverDialog = true
                            } else {
                                handoverNotice = "Vault is clear! No pending cash in custody."
                            }
                        },
                        enabled = totalCashInHandPaise > 0,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (totalRupees > 0) Color(0xFF0284C7) else Color(0xFF334155),
                            disabledContainerColor = Color(0xFF1E293B),
                            contentColor = Color.White,
                            disabledContentColor = Color(0xFF64748B)
                        )
                    ) {
                        Icon(
                            imageVector = Icons.Default.AccountBalance,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (totalRupees > 0) "Handover Cash to Plant" else "Cash Already Settled (₹0)",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp
                        )
                    }

                    if (handoverNotice != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = handoverNotice ?: "",
                            fontSize = 11.sp,
                            color = Color(0xFF38BDF8),
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }

        // Section Title: Doorstep Collections Log
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "COLLECTIONS LOG (${cashCollections.size})",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = WaterTextSecondary
                )
                Text(
                    text = "Double-Entry Ledger",
                    fontSize = 11.sp,
                    color = WaterTextSecondary
                )
            }
        }

        if (cashCollections.isEmpty()) {
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
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Default.Payments,
                            contentDescription = null,
                            tint = Color(0xFF94A3B8),
                            modifier = Modifier.size(32.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "No Cash Collections Yet",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = WaterNavyDark
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Doorstep spot cash collections will automatically appear here.",
                            fontSize = 11.sp,
                            color = WaterTextSecondary,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        } else {
            items(cashCollections, key = { it.id }) { item ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, WaterBorderLight)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(CircleShape)
                                    .background(
                                        if (item.isHandedOver) Color(0xFFF1F5F9) else WaterEmeraldContainer
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = if (item.mode == PaymentMode.CASH) Icons.Default.Payments else Icons.Default.CreditCard,
                                    contentDescription = null,
                                    tint = if (item.isHandedOver) Color(0xFF64748B) else WaterEmeraldGreen,
                                    modifier = Modifier.size(20.dp)
                                )
                            }

                            Column {
                                Text(
                                    text = item.customerName,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = if (item.isHandedOver) Color(0xFF64748B) else WaterTextPrimary
                                )
                                Text(
                                    text = "${item.orderNumber} • ${SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date(item.timestamp))}",
                                    fontSize = 11.sp,
                                    color = WaterTextSecondary
                                )
                            }
                        }

                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = String.format(Locale.US, "+₹%.0f", item.amountRupees),
                                fontWeight = FontWeight.Black,
                                fontSize = 16.sp,
                                color = if (item.isHandedOver) Color(0xFF64748B) else WaterEmeraldGreen
                            )
                            Surface(
                                shape = RoundedCornerShape(50),
                                color = if (item.isHandedOver) Color(0xFFF1F5F9) else Color(0xFFFEF3C7)
                            ) {
                                Text(
                                    text = if (item.isHandedOver) "✓ Handed Over to Plant" else "In Transit (Handover Pending)",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (item.isHandedOver) Color(0xFF0369A1) else Color(0xFF92400E),
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(24.dp))
        }
    }

    // =========================================================================
    // HANDOVER CASH TO PLANT CONFIRMATION DIALOG (CASH OR UPI)
    // =========================================================================
    if (showHandoverDialog) {
        Dialog(onDismissRequest = { showHandoverDialog = false }) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                color = Color.White,
                shadowElevation = 8.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp)
                ) {
                    // Dialog Header
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFE0F2FE)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.AccountBalance,
                                    contentDescription = null,
                                    tint = WaterCyanPrimary,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = "Handover Cash to Plant",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Black,
                                    color = WaterNavyDark
                                )
                                Text(
                                    text = if (handoverTargetAccountId == 1110) "Target: Central Vault (A/C 1110)" else "Target: Company Bank / UPI (A/C 1130)",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (handoverTargetAccountId == 1110) Color(0xFF0284C7) else Color(0xFF059669)
                                )
                            }
                        }

                        IconButton(onClick = { showHandoverDialog = false }) {
                            Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = Color(0xFF64748B))
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Current Cash in Hand Indicator
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFFF8FAFC),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Current Transit Custody:",
                                fontSize = 12.sp,
                                color = WaterTextSecondary
                            )
                            Text(
                                text = String.format(Locale.US, "₹%.2f", totalRupees),
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Black,
                                color = WaterNavyDark
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Handover Method Toggle: Physical Cash vs UPI Transfer
                    Text(
                        text = "HANDOVER METHOD / MODE",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = WaterTextSecondary
                    )
                    Spacer(modifier = Modifier.height(6.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Cash Option (Vault 1110)
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .clickable {
                                    handoverTargetAccountId = 1110
                                    handoverNotes = "Cash handover to plant central vault"
                                },
                            shape = RoundedCornerShape(12.dp),
                            color = if (handoverTargetAccountId == 1110) WaterNavyDark else Color(0xFFF8FAFC),
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                if (handoverTargetAccountId == 1110) WaterNavyDark else Color(0xFFE2E8F0)
                            )
                        ) {
                            Row(
                                modifier = Modifier.padding(vertical = 10.dp),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Payments,
                                    contentDescription = null,
                                    tint = if (handoverTargetAccountId == 1110) Color.White else WaterTextSecondary,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "💵 Physical Cash",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (handoverTargetAccountId == 1110) Color.White else WaterTextSecondary
                                )
                            }
                        }

                        // UPI / Bank Option (Bank 1130)
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .clickable {
                                    handoverTargetAccountId = 1130
                                    handoverNotes = "UPI transfer to Sai Waters bank account"
                                },
                            shape = RoundedCornerShape(12.dp),
                            color = if (handoverTargetAccountId == 1130) Color(0xFF047857) else Color(0xFFF8FAFC),
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                if (handoverTargetAccountId == 1130) Color(0xFF047857) else Color(0xFFE2E8F0)
                            )
                        ) {
                            Row(
                                modifier = Modifier.padding(vertical = 10.dp),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.QrCode,
                                    contentDescription = null,
                                    tint = if (handoverTargetAccountId == 1130) Color.White else WaterTextSecondary,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "📱 UPI Transfer",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (handoverTargetAccountId == 1130) Color.White else WaterTextSecondary
                                )
                            }
                        }
                    }

                    if (handoverTargetAccountId == 1130) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFFECFDF5),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFA7F3D0)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Transfer to Company UPI: saiwaters@upi\n(Credits Bank A/C 1130 & clears Driver Custody)",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color(0xFF065F46)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Deposit Amount Input Field
                    Text(
                        text = "DEPOSIT AMOUNT (₹)",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = WaterTextSecondary
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    OutlinedTextField(
                        value = handoverAmountText,
                        onValueChange = { handoverAmountText = it },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        textStyle = TextStyle(
                            color = Color(0xFF0F172A),
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        ),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color(0xFF0F172A),
                            unfocusedTextColor = Color(0xFF0F172A),
                            focusedContainerColor = Color.White,
                            unfocusedContainerColor = Color.White,
                            focusedBorderColor = WaterCyanPrimary,
                            unfocusedBorderColor = Color(0xFFCBD5E1),
                            cursorColor = WaterCyanPrimary
                        )
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Deposit Notes Input Field
                    Text(
                        text = "NOTES / REMARKS",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = WaterTextSecondary
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    OutlinedTextField(
                        value = handoverNotes,
                        onValueChange = { handoverNotes = it },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        textStyle = TextStyle(
                            color = Color(0xFF0F172A),
                            fontSize = 13.sp
                        ),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color(0xFF0F172A),
                            unfocusedTextColor = Color(0xFF0F172A),
                            focusedContainerColor = Color.White,
                            unfocusedContainerColor = Color.White,
                            focusedBorderColor = WaterCyanPrimary,
                            unfocusedBorderColor = Color(0xFFCBD5E1),
                            cursorColor = WaterCyanPrimary
                        )
                    )

                    Spacer(modifier = Modifier.height(18.dp))

                    // Action Buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedButton(
                            onClick = { showHandoverDialog = false },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Cancel", fontSize = 12.sp, color = WaterTextSecondary)
                        }

                        Button(
                            onClick = {
                                val amtDouble = handoverAmountText.toDoubleOrNull() ?: totalRupees
                                val amtPaise = (amtDouble * 100).toLong()
                                onHandoverClick(amtPaise, handoverTargetAccountId, handoverNotes)
                                showHandoverDialog = false
                            },
                            modifier = Modifier.weight(1.5f),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (handoverTargetAccountId == 1130) Color(0xFF059669) else WaterEmeraldGreen
                            )
                        ) {
                            Icon(imageVector = Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = if (handoverTargetAccountId == 1130) "Confirm UPI Transfer" else "Confirm Vault Deposit",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}
