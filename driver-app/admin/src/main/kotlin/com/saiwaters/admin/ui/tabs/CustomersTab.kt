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
import com.saiwaters.admin.model.CustomerItem
import com.saiwaters.admin.ui.components.AppleCard
import com.saiwaters.admin.ui.components.StatusPill
import com.saiwaters.admin.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomersTab(
    customers: List<CustomerItem>,
    isLoading: Boolean,
    onAddCustomer: (name: String, phone: String, address: String, dailyQuota: Int, ratePaise: Long) -> Unit,
    onRefresh: () -> Unit
) {
    val context = LocalContext.current
    var searchQuery by remember { mutableStateOf("") }
    var showAddDialog by remember { mutableStateOf(false) }
    var selectedCustomerForDetails by remember { mutableStateOf<CustomerItem?>(null) }

    val filteredCustomers = customers.filter { cust ->
        if (searchQuery.isBlank()) true else {
            cust.fullName.contains(searchQuery, ignoreCase = true) ||
            cust.customerCode.contains(searchQuery, ignoreCase = true) ||
            cust.phone.contains(searchQuery, ignoreCase = true) ||
            cust.deliveryAddress.contains(searchQuery, ignoreCase = true)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Search & Add Customer Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search by name, phone, code...") },
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

            Button(
                onClick = { showAddDialog = true },
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AppleAzurePrimary),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 14.dp)
            ) {
                Icon(Icons.Default.PersonAdd, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Add", fontWeight = FontWeight.Bold)
            }
        }

        // Customer Count Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "ACTIVE DIRECTORY (${filteredCustomers.size})",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp
            )

            Text(
                text = "${filteredCustomers.sumOf { it.heldJarsCount }} Total Jars in Custody",
                style = MaterialTheme.typography.labelSmall,
                color = AppleAzurePrimary,
                fontWeight = FontWeight.SemiBold
            )
        }

        // List of Customers
        if (filteredCustomers.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = if (isLoading) "Loading customers..." else "No customers found.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = AppleTextSecondary
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(top = 8.dp, bottom = 100.dp)
            ) {
                items(filteredCustomers, key = { it.id }) { customer ->
                    CustomerCard(
                        customer = customer,
                        onViewDetails = { selectedCustomerForDetails = customer },
                        onShareWhatsApp = {
                            shareWhatsAppLedger(context, customer)
                        },
                        onCallPhone = {
                            if (customer.phone.isNotBlank()) {
                                val intent = Intent(Intent.ACTION_DIAL).apply {
                                    data = Uri.parse("tel:${customer.phone}")
                                }
                                context.startActivity(intent)
                            }
                        }
                    )
                }
            }
        }
    }

    // Add Customer Dialog
    if (showAddDialog) {
        var fullName by remember { mutableStateOf("") }
        var phone by remember { mutableStateOf("") }
        var address by remember { mutableStateOf("") }
        var dailyQuota by remember { mutableStateOf("1") }
        var rateText by remember { mutableStateOf("35") }

        AlertDialog(
            onDismissRequest = { showAddDialog = false },
            title = { Text("Register New Grahak", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = fullName,
                        onValueChange = { fullName = it },
                        label = { Text("Customer Name *") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it },
                        label = { Text("Phone Number *") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = address,
                        onValueChange = { address = it },
                        label = { Text("Delivery Address / Location") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = dailyQuota,
                            onValueChange = { dailyQuota = it },
                            label = { Text("Daily Quota (Jars)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = rateText,
                            onValueChange = { rateText = it },
                            label = { Text("Rate per Jar (₹)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (fullName.isNotBlank()) {
                            val quota = dailyQuota.toIntOrNull() ?: 1
                            val rate = (rateText.toDoubleOrNull() ?: 35.0) * 100
                            onAddCustomer(fullName, phone, address, quota, rate.toLong())
                            showAddDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AppleAzurePrimary)
                ) {
                    Text("Register Customer")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Customer Details & Ledger Bottom Sheet
    selectedCustomerForDetails?.let { customer ->
        ModalBottomSheet(
            onDismissRequest = { selectedCustomerForDetails = null },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
            containerColor = MaterialTheme.colorScheme.surface
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
                    .navigationBarsPadding(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = customer.fullName,
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "${customer.customerCode} • ${customer.phone}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = AppleTextSecondary
                        )
                    }

                    StatusPill(
                        text = "DAILY ${customer.dailyQuota} JARS",
                        textColor = AppleEmeraldGreen,
                        backgroundColor = AppleEmeraldContainer
                    )
                }

                if (customer.deliveryAddress.isNotBlank()) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Icon(Icons.Default.LocationOn, contentDescription = null, tint = AppleTextSecondary, modifier = Modifier.size(16.dp))
                        Text(customer.deliveryAddress, style = MaterialTheme.typography.bodySmall, color = AppleTextSecondary)
                    }
                }

                Divider(color = MaterialTheme.colorScheme.outlineVariant)

                // Custody Jars Section
                Text(
                    text = "PHYSICAL 20L JARS CURRENTLY HELD (${customer.heldJarsCount})",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Bold
                )

                if (customer.jarsInCustody.isEmpty()) {
                    Text(
                        text = "No jars currently marked in customer custody.",
                        style = MaterialTheme.typography.bodySmall,
                        color = AppleTextSecondary
                    )
                } else {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(customer.jarsInCustody) { jar ->
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = AppleCyanContainer,
                                border = androidx.compose.foundation.BorderStroke(1.dp, AppleAzurePrimary.copy(alpha = 0.3f))
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(Icons.Default.WaterDrop, contentDescription = null, tint = AppleAzureDark, modifier = Modifier.size(14.dp))
                                    Text(
                                        text = jar.jarCode,
                                        style = MaterialTheme.typography.labelMedium,
                                        color = AppleAzureDark,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }

                Divider(color = MaterialTheme.colorScheme.outlineVariant)

                // Rate & Pricing Agreement
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("ALLOTTED RATE", style = MaterialTheme.typography.labelSmall, color = AppleTextSecondary)
                        Text(
                            "₹${customer.jarPricePaise / 100} / jar",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }

                    Column(horizontalAlignment = Alignment.End) {
                        Text("BILLING FREQUENCY", style = MaterialTheme.typography.labelSmall, color = AppleTextSecondary)
                        Text(
                            customer.paymentType,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = ApplePurpleAccent
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Actions: WhatsApp share & Call
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Button(
                        onClick = { shareWhatsAppLedger(context, customer) },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = AppleEmeraldGreen),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("WhatsApp Statement")
                    }

                    OutlinedButton(
                        onClick = { selectedCustomerForDetails = null },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Text("Close")
                    }
                }
            }
        }
    }
}

@Composable
fun CustomerCard(
    customer: CustomerItem,
    onViewDetails: () -> Unit,
    onShareWhatsApp: () -> Unit,
    onCallPhone: () -> Unit
) {
    AppleCard {
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
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .background(AppleCyanContainer, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = null,
                            tint = AppleAzureDark,
                            modifier = Modifier.size(22.dp)
                        )
                    }

                    Column {
                        Text(
                            text = customer.fullName,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "${customer.customerCode} • ${customer.phone}",
                            style = MaterialTheme.typography.bodySmall,
                            color = AppleTextSecondary
                        )
                    }
                }

                StatusPill(
                    text = "DAILY ${customer.dailyQuota} JARS",
                    textColor = AppleEmeraldGreen,
                    backgroundColor = AppleEmeraldContainer
                )
            }

            if (customer.deliveryAddress.isNotBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = AppleTextSecondary,
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = customer.deliveryAddress,
                        style = MaterialTheme.typography.bodySmall,
                        color = AppleTextSecondary,
                        maxLines = 1
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            Divider(color = MaterialTheme.colorScheme.outlineVariant, thickness = 0.5.dp)
            Spacer(modifier = Modifier.height(10.dp))

            // Metrics row: Allotted rate & held count
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "ALLOTTED RATE",
                        style = MaterialTheme.typography.labelSmall,
                        color = AppleTextSecondary,
                        fontSize = 9.sp
                    )
                    Text(
                        text = "₹${customer.jarPricePaise / 100} / jar",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "JARS IN CUSTODY",
                        style = MaterialTheme.typography.labelSmall,
                        color = AppleTextSecondary,
                        fontSize = 9.sp
                    )
                    Text(
                        text = "${customer.heldJarsCount} Jars Held",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        color = if (customer.heldJarsCount > 0) ApplePurpleAccent else AppleTextSecondary
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Actions Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedButton(
                    onClick = onViewDetails,
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Default.MenuBook, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Ledger", style = MaterialTheme.typography.labelSmall)
                }

                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    IconButton(onClick = onCallPhone, modifier = Modifier.size(34.dp)) {
                        Icon(Icons.Default.Phone, contentDescription = "Call", tint = AppleAzurePrimary, modifier = Modifier.size(18.dp))
                    }
                    IconButton(onClick = onShareWhatsApp, modifier = Modifier.size(34.dp)) {
                        Icon(Icons.Default.Share, contentDescription = "WhatsApp", tint = AppleEmeraldGreen, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }
    }
}

private fun shareWhatsAppLedger(context: Context, customer: CustomerItem) {
    try {
        val message = """
            Namaste ${customer.fullName} ji,
            Sai Waters ERP Delivery Statement:
            Customer Code: ${customer.customerCode}
            20L Water Jars in Custody: ${customer.heldJarsCount} Jars
            Allotted Rate: ₹${customer.jarPricePaise / 100} per jar
            Delivery Quota: ${customer.dailyQuota} jars/day
            
            Thank you for choosing Sai Waters!
        """.trimIndent()

        val cleanPhone = customer.phone.replace("+", "").replace(" ", "").replace("-", "")
        val uri = Uri.parse("https://api.whatsapp.com/send?phone=$cleanPhone&text=${Uri.encode(message)}")
        val intent = Intent(Intent.ACTION_VIEW, uri)
        context.startActivity(intent)
    } catch (_: Exception) {
        val shareIntent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, "Sai Waters Statement for ${customer.fullName}: ${customer.heldJarsCount} Jars in custody.")
        }
        context.startActivity(Intent.createChooser(shareIntent, "Share Customer Statement"))
    }
}
