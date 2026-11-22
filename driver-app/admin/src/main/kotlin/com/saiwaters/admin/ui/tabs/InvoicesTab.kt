package com.saiwaters.admin.ui.tabs

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.saiwaters.admin.model.InvoiceItem
import com.saiwaters.admin.ui.components.AppleCard
import com.saiwaters.admin.ui.components.StatusPill
import com.saiwaters.admin.ui.theme.*

@Composable
fun InvoicesTab(
    invoices: List<InvoiceItem>,
    isLoading: Boolean,
    onSettleInvoice: (invoiceId: String, amountPaise: Long, paymentMode: String) -> Unit,
    onTriggerBatchBilling: () -> Unit,
    onRefresh: () -> Unit
) {
    val context = LocalContext.current
    var searchQuery by remember { mutableStateOf("") }
    var statusFilter by remember { mutableStateOf("ALL") } // ALL, DUE, PAID
    var selectedInvoiceForSettle by remember { mutableStateOf<InvoiceItem?>(null) }

    val filteredInvoices = invoices.filter { inv ->
        val matchesStatus = when (statusFilter) {
            "ALL" -> true
            "DUE" -> inv.status != "PAID"
            "PAID" -> inv.status == "PAID"
            else -> true
        }
        val matchesSearch = if (searchQuery.isBlank()) true else {
            inv.invoiceNumber.contains(searchQuery, ignoreCase = true) ||
            inv.customerName.contains(searchQuery, ignoreCase = true) ||
            inv.customerCode.contains(searchQuery, ignoreCase = true) ||
            inv.customerPhone.contains(searchQuery, ignoreCase = true)
        }
        matchesStatus && matchesSearch
    }

    val totalInvoiced = invoices.sumOf { it.totalAmountPaise }
    val totalDue = invoices.filter { it.status != "PAID" }.sumOf { it.totalAmountPaise - it.paidAmountPaise }
    val dueCount = invoices.count { it.status != "PAID" }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Summary & Batch Header
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Hero KPI Card
            AppleCard(
                containerColor = MaterialTheme.colorScheme.surface,
                borderColor = MaterialTheme.colorScheme.outline
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
                            text = "TOTAL UNPAID / DUE",
                            style = MaterialTheme.typography.labelSmall,
                            color = AppleTextSecondary,
                            fontSize = 9.sp
                        )
                        Text(
                            text = "₹${totalDue / 100}",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = if (totalDue > 0) AppleAmberWarning else AppleEmeraldGreen
                        )
                        Text(
                            text = "$dueCount Invoices Pending Settlement",
                            style = MaterialTheme.typography.bodySmall,
                            color = AppleTextSecondary
                        )
                    }

                    Button(
                        onClick = onTriggerBatchBilling,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = AppleAzurePrimary)
                    ) {
                        Icon(Icons.Default.ReceiptLong, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Monthly Batch", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium)
                    }
                }
            }

            // Search Bar & Filter Chips
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Search invoice #, customer...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = AppleTextSecondary) },
                    trailingIcon = {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = { searchQuery = "" }) {
                                Icon(Icons.Default.Close, contentDescription = "Clear", tint = AppleTextSecondary)
                            }
                        }
                    },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = MaterialTheme.colorScheme.surface,
                        unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                        focusedBorderColor = AppleAzurePrimary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant
                    ),
                    singleLine = true
                )
            }

            // Filter Tabs
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                listOf(
                    "ALL" to "All (${invoices.size})",
                    "DUE" to "Due / Pending ($dueCount)",
                    "PAID" to "Paid (${invoices.count { it.status == "PAID" }})"
                ).forEach { (key, label) ->
                    val isSelected = statusFilter == key
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = if (isSelected) AppleAzurePrimary else MaterialTheme.colorScheme.surface,
                        border = if (isSelected) null else androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                        modifier = Modifier.clickable { statusFilter = key }
                    ) {
                        Box(modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp)) {
                            Text(
                                text = label,
                                style = MaterialTheme.typography.labelSmall,
                                color = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurface,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                            )
                        }
                    }
                }
            }
        }

        // List of Invoices
        if (filteredInvoices.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = if (isLoading) "Loading invoices..." else "No invoices found.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = AppleTextSecondary
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(top = 4.dp, bottom = 100.dp)
            ) {
                items(filteredInvoices, key = { it.id }) { invoice ->
                    InvoiceCard(
                        invoice = invoice,
                        onSettleClick = { selectedInvoiceForSettle = invoice },
                        onShareWhatsApp = { shareWhatsAppInvoice(context, invoice) }
                    )
                }
            }
        }
    }

    // Settle Invoice Dialog
    selectedInvoiceForSettle?.let { inv ->
        val remainingPaise = inv.totalAmountPaise - inv.paidAmountPaise
        var amountText by remember { mutableStateOf((remainingPaise / 100).toString()) }
        var selectedMode by remember { mutableStateOf("CASH") }

        AlertDialog(
            onDismissRequest = { selectedInvoiceForSettle = null },
            title = { Text("Settle Invoice Payment", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        "Settling payment for ${inv.customerName} (${inv.invoiceNumber}).",
                        style = MaterialTheme.typography.bodyMedium
                    )

                    OutlinedTextField(
                        value = amountText,
                        onValueChange = { amountText = it },
                        label = { Text("Settlement Amount (₹)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Text("Payment Mode", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOf("CASH" to "Cash", "UPI" to "UPI / Online", "BANK_TRANSFER" to "Bank").forEach { (mode, label) ->
                            val isSel = selectedMode == mode
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = if (isSel) AppleAzurePrimary else AppleSurfaceSubtle,
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { selectedMode = mode }
                            ) {
                                Box(modifier = Modifier.padding(vertical = 8.dp), contentAlignment = Alignment.Center) {
                                    Text(
                                        text = label,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = if (isSel) Color.White else AppleTextPrimary,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val rupees = amountText.toDoubleOrNull() ?: (remainingPaise / 100.0)
                        val paise = (rupees * 100).toLong()
                        onSettleInvoice(inv.id, paise, selectedMode)
                        selectedInvoiceForSettle = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AppleEmeraldGreen)
                ) {
                    Text("Confirm Settlement")
                }
            },
            dismissButton = {
                TextButton(onClick = { selectedInvoiceForSettle = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun InvoiceCard(
    invoice: InvoiceItem,
    onSettleClick: () -> Unit,
    onShareWhatsApp: () -> Unit
) {
    AppleCard {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .background(AppleCyanContainer, RoundedCornerShape(10.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Receipt,
                            contentDescription = null,
                            tint = AppleAzureDark,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    Column {
                        Text(
                            text = invoice.customerName,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "${invoice.invoiceNumber} • ${invoice.invoiceDate}",
                            style = MaterialTheme.typography.bodySmall,
                            color = AppleTextSecondary
                        )
                    }
                }

                StatusPill(
                    text = invoice.status,
                    textColor = if (invoice.status == "PAID") AppleEmeraldGreen else AppleAmberWarning,
                    backgroundColor = if (invoice.status == "PAID") AppleEmeraldContainer else AppleAmberContainer
                )
            }

            Spacer(modifier = Modifier.height(10.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant, thickness = 0.5.dp)
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "TOTAL AMOUNT",
                        style = MaterialTheme.typography.labelSmall,
                        color = AppleTextSecondary,
                        fontSize = 9.sp
                    )
                    Text(
                        text = "₹${invoice.totalAmountPaise / 100}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }

                if (invoice.status != "PAID") {
                    Column(horizontalAlignment = Alignment.End) {
                        val pendingPaise = invoice.totalAmountPaise - invoice.paidAmountPaise
                        Text(
                            text = "BALANCE DUE",
                            style = MaterialTheme.typography.labelSmall,
                            color = AppleTextSecondary,
                            fontSize = 9.sp
                        )
                        Text(
                            text = "₹${pendingPaise / 100}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = AppleRoseDanger
                        )
                    }
                } else {
                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = "PAID IN FULL",
                            style = MaterialTheme.typography.labelSmall,
                            color = AppleEmeraldGreen,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Action Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = invoice.billingType,
                    style = MaterialTheme.typography.labelSmall,
                    color = ApplePurpleAccent,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold
                )

                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    if (invoice.status != "PAID") {
                        Button(
                            onClick = onSettleClick,
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = AppleEmeraldGreen),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text("Settle", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                        }
                    }

                    IconButton(onClick = onShareWhatsApp, modifier = Modifier.size(34.dp)) {
                        Icon(Icons.Default.Share, contentDescription = "WhatsApp", tint = AppleAzurePrimary, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }
    }
}

private fun shareWhatsAppInvoice(context: Context, invoice: InvoiceItem) {
    try {
        val pending = invoice.totalAmountPaise - invoice.paidAmountPaise
        val message = """
            Namaste ${invoice.customerName} ji,
            Sai Waters ERP Invoice:
            Invoice #: ${invoice.invoiceNumber}
            Date: ${invoice.invoiceDate}
            Total Amount: ₹${invoice.totalAmountPaise / 100}
            Balance Due: ₹${pending / 100}
            Status: ${invoice.status}
            
            Kripya online UPI ya agle delivery visit par settle karein.
            Dhanyawad, Sai Waters!
        """.trimIndent()

        val cleanPhone = invoice.customerPhone.replace("+", "").replace(" ", "").replace("-", "")
        val uri = Uri.parse("https://api.whatsapp.com/send?phone=$cleanPhone&text=${Uri.encode(message)}")
        val intent = Intent(Intent.ACTION_VIEW, uri)
        context.startActivity(intent)
    } catch (_: Exception) {
        val shareIntent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, "Sai Waters Invoice ${invoice.invoiceNumber} for ${invoice.customerName}: ₹${invoice.totalAmountPaise / 100}")
        }
        context.startActivity(Intent.createChooser(shareIntent, "Share Invoice"))
    }
}
