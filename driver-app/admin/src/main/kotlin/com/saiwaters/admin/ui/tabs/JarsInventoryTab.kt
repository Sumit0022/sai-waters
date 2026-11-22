package com.saiwaters.admin.ui.tabs

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.saiwaters.admin.model.JarItem
import com.saiwaters.admin.ui.components.AppleCard
import com.saiwaters.admin.ui.components.StatusPill
import com.saiwaters.admin.ui.theme.*

@Composable
fun JarsInventoryTab(
    jars: List<JarItem>,
    isLoading: Boolean,
    onAddJarBatch: (Int) -> Unit,
    onRelabelJar: (jarId: String, newQr: String) -> Unit,
    onReportLoss: (jarId: String, reason: String) -> Unit,
    onScanJarClick: () -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedFilter by remember { mutableStateOf("ALL") }

    var showBatchDialog by remember { mutableStateOf(false) }
    var selectedJarForRelabel by remember { mutableStateOf<JarItem?>(null) }
    var selectedJarForLoss by remember { mutableStateOf<JarItem?>(null) }

    val filterOptions = listOf(
        "ALL" to "All Jars",
        "DELIVERED_CUSTOMER" to "With Customer",
        "AVAILABLE" to "At Plant",
        "IN_TRANSIT" to "In Transit",
        "DAMAGED" to "Damaged / Lost"
    )

    val filteredJars = jars.filter { jar ->
        val matchesFilter = when (selectedFilter) {
            "ALL" -> true
            "DELIVERED_CUSTOMER" -> jar.status == "DELIVERED_CUSTOMER"
            "AVAILABLE" -> jar.status == "AVAILABLE"
            "IN_TRANSIT" -> jar.status == "IN_TRANSIT" || jar.status == "ALLOCATED"
            "DAMAGED" -> jar.status == "DAMAGED" || jar.status == "CONFIRMED_LOST" || jar.status == "UNDER_REPAIR"
            else -> true
        }

        val matchesSearch = if (searchQuery.isBlank()) true else {
            jar.jarCode.contains(searchQuery, ignoreCase = true) ||
            jar.qrToken.contains(searchQuery, ignoreCase = true) ||
            jar.currentHolderName.contains(searchQuery, ignoreCase = true)
        }

        matchesFilter && matchesSearch
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Top Search & Batch Add Header
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Search by jar code, QR, or holder...") },
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
                    onClick = { showBatchDialog = true },
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = AppleAzurePrimary),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 14.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Batch", fontWeight = FontWeight.Bold)
                }
            }

            // Filter Chips Carousel
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(filterOptions) { (key, label) ->
                    val isSelected = selectedFilter == key
                    val count = when (key) {
                        "ALL" -> jars.size
                        "DELIVERED_CUSTOMER" -> jars.count { it.status == "DELIVERED_CUSTOMER" }
                        "AVAILABLE" -> jars.count { it.status == "AVAILABLE" }
                        "IN_TRANSIT" -> jars.count { it.status == "IN_TRANSIT" || it.status == "ALLOCATED" }
                        "DAMAGED" -> jars.count { it.status == "DAMAGED" || it.status == "CONFIRMED_LOST" }
                        else -> 0
                    }

                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = if (isSelected) AppleAzurePrimary else MaterialTheme.colorScheme.surface,
                        border = if (isSelected) null else androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                        modifier = Modifier.clickable { selectedFilter = key }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = label,
                                style = MaterialTheme.typography.labelMedium,
                                color = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurface,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                            )
                            Box(
                                modifier = Modifier
                                    .background(
                                        if (isSelected) Color.White.copy(alpha = 0.25f) else AppleCyanContainer,
                                        CircleShape
                                    )
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = "$count",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (isSelected) Color.White else AppleAzureDark,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }
        }

        // List of Jars
        if (filteredJars.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = if (isLoading) "Loading jars inventory..." else "No jars found matching your filter.",
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
                items(filteredJars, key = { it.id }) { jar ->
                    JarItemCard(
                        jar = jar,
                        onRelabelClick = { selectedJarForRelabel = jar },
                        onReportLossClick = { selectedJarForLoss = jar }
                    )
                }
            }
        }
    }

    // Add Batch Dialog
    if (showBatchDialog) {
        var countText by remember { mutableStateOf("10") }
        AlertDialog(
            onDismissRequest = { showBatchDialog = false },
            title = { Text("Add 20L Water Jars Batch", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        "Enter the number of brand new 20L jars to inject into the inventory. Unique jar codes & URN tokens will be auto-generated.",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    OutlinedTextField(
                        value = countText,
                        onValueChange = { countText = it },
                        label = { Text("Quantity (Jars)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val count = countText.toIntOrNull() ?: 10
                        onAddJarBatch(count)
                        showBatchDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AppleAzurePrimary)
                ) {
                    Text("Register Batch")
                }
            },
            dismissButton = {
                TextButton(onClick = { showBatchDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Relabel QR Dialog
    selectedJarForRelabel?.let { jar ->
        var newQrText by remember { mutableStateOf(jar.qrToken) }
        AlertDialog(
            onDismissRequest = { selectedJarForRelabel = null },
            title = { Text("Re-label Jar QR Token", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        "Updating QR mapping for ${jar.jarCode}. If the physical sticker was damaged and replaced, enter or scan the new token.",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    OutlinedTextField(
                        value = newQrText,
                        onValueChange = { newQrText = it },
                        label = { Text("New QR Token / URN") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newQrText.isNotBlank()) {
                            onRelabelJar(jar.id, newQrText)
                            selectedJarForRelabel = null
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AppleAzurePrimary)
                ) {
                    Text("Update Token")
                }
            },
            dismissButton = {
                TextButton(onClick = { selectedJarForRelabel = null }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Report Loss / Damage Dialog
    selectedJarForLoss?.let { jar ->
        var reasonText by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { selectedJarForLoss = null },
            title = { Text("Report Jar Loss / Damage", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        "Reporting ${jar.jarCode} as Damaged or Lost will adjust the Asset ledger (1210) to Scrap/Loss expense.",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    OutlinedTextField(
                        value = reasonText,
                        onValueChange = { reasonText = it },
                        label = { Text("Damage / Loss notes") },
                        placeholder = { Text("e.g. cracked during transit, unreturned after 90 days") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        onReportLoss(jar.id, reasonText.ifBlank { "Reported damaged by admin" })
                        selectedJarForLoss = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AppleRoseDanger)
                ) {
                    Text("Confirm Loss")
                }
            },
            dismissButton = {
                TextButton(onClick = { selectedJarForLoss = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun JarItemCard(
    jar: JarItem,
    onRelabelClick: () -> Unit,
    onReportLossClick: () -> Unit
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
                            .size(36.dp)
                            .background(AppleCyanContainer, RoundedCornerShape(10.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.WaterDrop,
                            contentDescription = null,
                            tint = AppleAzureDark,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    Column {
                        Text(
                            text = jar.jarCode,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = jar.qrToken,
                            style = MaterialTheme.typography.bodySmall,
                            color = AppleTextSecondary
                        )
                    }
                }

                val (pillText, textColor, bgColor) = when (jar.status) {
                    "DELIVERED_CUSTOMER" -> Triple("With Customer", ApplePurpleAccent, ApplePurpleAccent.copy(alpha = 0.15f))
                    "AVAILABLE" -> Triple("At Plant Ready", AppleEmeraldGreen, AppleEmeraldContainer)
                    "IN_TRANSIT", "ALLOCATED" -> Triple("In Transit", AppleAmberWarning, AppleAmberContainer)
                    "DAMAGED", "CONFIRMED_LOST" -> Triple("Damaged / Lost", AppleRoseDanger, AppleRoseContainer)
                    else -> Triple(jar.status, AppleTextSecondary, AppleSurfaceSubtle)
                }

                StatusPill(text = pillText, textColor = textColor, backgroundColor = bgColor)
            }

            Spacer(modifier = Modifier.height(10.dp))
            Divider(color = MaterialTheme.colorScheme.outlineVariant, thickness = 0.5.dp)
            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "PHYSICAL CUSTODY",
                        style = MaterialTheme.typography.labelSmall,
                        color = AppleTextSecondary,
                        fontSize = 9.sp
                    )
                    Text(
                        text = if (jar.currentHolderName.isNotBlank()) jar.currentHolderName else "Plant Storage",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "NET BOOK VALUE",
                        style = MaterialTheme.typography.labelSmall,
                        color = AppleTextSecondary,
                        fontSize = 9.sp
                    )
                    Text(
                        text = "₹${jar.netBookValuePaise / 100}",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        color = AppleEmeraldGreen
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Action Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(
                    onClick = onRelabelClick,
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Icon(Icons.Default.QrCode, contentDescription = null, modifier = Modifier.size(14.dp), tint = AppleAzurePrimary)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Re-QR", style = MaterialTheme.typography.labelSmall, color = AppleAzurePrimary)
                }

                TextButton(
                    onClick = onReportLossClick,
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Icon(Icons.Default.Warning, contentDescription = null, modifier = Modifier.size(14.dp), tint = AppleRoseDanger)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Loss/Damage", style = MaterialTheme.typography.labelSmall, color = AppleRoseDanger)
                }
            }
        }
    }
}
