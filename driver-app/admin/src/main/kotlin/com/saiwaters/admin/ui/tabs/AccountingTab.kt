package com.saiwaters.admin.ui.tabs

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.saiwaters.admin.model.*
import com.saiwaters.admin.ui.components.AppleCard
import com.saiwaters.admin.ui.components.MetricCard
import com.saiwaters.admin.ui.components.StatusPill
import com.saiwaters.admin.ui.theme.*

@Composable
fun AccountingTab(
    trialBalance: TrialBalanceSummary,
    pnl: ProfitAndLossSummary,
    cashSubmissions: List<CashSubmission>,
    driverHandovers: List<DriverHandoverSummary>,
    isLoading: Boolean,
    onVerifyHandover: (driverId: String, declaredPaise: Long, verifiedPaise: Long, notes: String) -> Unit,
    onRefresh: () -> Unit
) {
    var selectedSection by remember { mutableStateOf("HANDOVER") }
    var selectedDriverForHandover by remember { mutableStateOf<DriverHandoverSummary?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Section Navigation Pills
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .clickable { selectedSection = "HANDOVER" },
                shape = RoundedCornerShape(12.dp),
                color = if (selectedSection == "HANDOVER") AppleAzurePrimary else MaterialTheme.colorScheme.surface,
                border = if (selectedSection == "HANDOVER") null else androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
            ) {
                Box(modifier = Modifier.padding(vertical = 10.dp), contentAlignment = Alignment.Center) {
                    Text(
                        text = "Driver Vault Handover",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = if (selectedSection == "HANDOVER") Color.White else MaterialTheme.colorScheme.onSurface
                    )
                }
            }

            Surface(
                modifier = Modifier
                    .weight(1f)
                    .clickable { selectedSection = "TRIAL_BALANCE" },
                shape = RoundedCornerShape(12.dp),
                color = if (selectedSection == "TRIAL_BALANCE") AppleAzurePrimary else MaterialTheme.colorScheme.surface,
                border = if (selectedSection == "TRIAL_BALANCE") null else androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
            ) {
                Box(modifier = Modifier.padding(vertical = 10.dp), contentAlignment = Alignment.Center) {
                    Text(
                        text = "General Ledger & TB",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = if (selectedSection == "TRIAL_BALANCE") Color.White else MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            contentPadding = PaddingValues(top = 4.dp, bottom = 100.dp)
        ) {
            if (selectedSection == "HANDOVER") {
                // Driver Handover Section
                item {
                    Text(
                        text = "UNCLEARED DRIVER COLLECTIONS (CLEARING ACC 1120)",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                }

                if (driverHandovers.isEmpty() || driverHandovers.all { it.totalUnclearedPaise == 0L }) {
                    item {
                        AppleCard {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(24.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = AppleEmeraldGreen, modifier = Modifier.size(36.dp))
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "All Driver Cash is Settled",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "No pending collections currently in driver clearing. Vault is 100% matched.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = AppleTextSecondary
                                )
                            }
                        }
                    }
                } else {
                    items(driverHandovers.filter { it.totalUnclearedPaise > 0L }) { driver ->
                        DriverHandoverCard(
                            driver = driver,
                            onAcceptHandover = { selectedDriverForHandover = driver }
                        )
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = "RECENT COLLECTIONS LOG (DOUBLE-ENTRY)",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                }

                items(cashSubmissions.take(15)) { sub ->
                    AppleCard {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                Box(
                                    modifier = Modifier
                                        .size(34.dp)
                                        .background(AppleCyanContainer, CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.Payment, contentDescription = null, tint = AppleAzureDark, modifier = Modifier.size(16.dp))
                                }
                                Column {
                                    Text(
                                        text = sub.customerName.ifBlank { "Doorstep Customer" },
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Text(
                                        text = "${sub.driverName} • ${sub.collectionTimeIST.ifBlank { sub.collectionDateIST }}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = AppleTextSecondary
                                    )
                                }
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = "+₹${sub.amountCollectedPaise / 100}",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                StatusPill(
                                    text = if (sub.isHandedOver) "Handed Over" else "With Driver",
                                    textColor = if (sub.isHandedOver) AppleEmeraldGreen else AppleAmberWarning,
                                    backgroundColor = if (sub.isHandedOver) AppleEmeraldContainer else AppleAmberContainer
                                )
                            }
                        }
                    }
                }
            } else {
                // Trial Balance & General Ledger Section
                item {
                    AppleCard(
                        containerColor = if (trialBalance.isBalanced) AppleEmeraldContainer.copy(alpha = 0.2f) else AppleRoseContainer.copy(alpha = 0.2f),
                        borderColor = if (trialBalance.isBalanced) AppleEmeraldGreen else AppleRoseDanger
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = if (trialBalance.isBalanced) "TRIAL BALANCE IS BALANCED" else "VARIANCE DETECTED",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = if (trialBalance.isBalanced) AppleEmeraldGreen else AppleRoseDanger
                                )
                                Text(
                                    text = "Debits: ₹${trialBalance.totalDebitsPaise / 100} • Credits: ₹${trialBalance.totalCreditsPaise / 100}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = AppleTextSecondary
                                )
                            }

                            Icon(
                                imageVector = if (trialBalance.isBalanced) Icons.Default.CheckCircle else Icons.Default.Error,
                                contentDescription = null,
                                tint = if (trialBalance.isBalanced) AppleEmeraldGreen else AppleRoseDanger,
                                modifier = Modifier.size(28.dp)
                            )
                        }
                    }
                }

                item {
                    Text(
                        text = "CHART OF ACCOUNTS BREAKDOWN",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                }

                items(trialBalance.balances) { acc ->
                    AppleCard {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "${acc.accountCode} - ${acc.accountName}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = "${acc.accountType} (${acc.normalBalance})",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = AppleTextSecondary
                                )
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                val netAmount = if (acc.netDebitPaise > 0) acc.netDebitPaise else acc.netCreditPaise
                                val prefix = if (acc.netDebitPaise > 0) "Dr" else "Cr"
                                Text(
                                    text = "$prefix ₹${netAmount / 100}",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // Verify Driver Handover Dialog
    selectedDriverForHandover?.let { driver ->
        var amountText by remember { mutableStateOf((driver.totalUnclearedPaise / 100).toString()) }
        var notesText by remember { mutableStateOf("Physical cash handover verified into plant vault") }

        AlertDialog(
            onDismissRequest = { selectedDriverForHandover = null },
            title = { Text("Accept Cash Handover to Vault", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        "Driver ${driver.driverName} currently holds ₹${driver.totalUnclearedPaise / 100} across ${driver.pendingCount} collections.",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    OutlinedTextField(
                        value = amountText,
                        onValueChange = { amountText = it },
                        label = { Text("Physical Cash Verified (₹)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = notesText,
                        onValueChange = { notesText = it },
                        label = { Text("Vault Notes") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val verifiedRupees = amountText.toDoubleOrNull() ?: (driver.totalUnclearedPaise / 100.0)
                        val verifiedPaise = (verifiedRupees * 100).toLong()
                        onVerifyHandover(driver.driverId, driver.totalUnclearedPaise, verifiedPaise, notesText)
                        selectedDriverForHandover = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AppleAzurePrimary)
                ) {
                    Text("Accept Into Vault 1110")
                }
            },
            dismissButton = {
                TextButton(onClick = { selectedDriverForHandover = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun DriverHandoverCard(
    driver: DriverHandoverSummary,
    onAcceptHandover: () -> Unit
) {
    AppleCard {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = driver.driverName,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "${driver.pendingCount} Doorstep collections pending",
                    style = MaterialTheme.typography.bodySmall,
                    color = AppleTextSecondary
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "₹${driver.totalUnclearedPaise / 100}",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = AppleAmberWarning
                )
            }

            Button(
                onClick = onAcceptHandover,
                colors = ButtonDefaults.buttonColors(containerColor = AppleAzurePrimary),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Accept Handover")
            }
        }
    }
}
