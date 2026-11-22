package com.saiwaters.admin.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.saiwaters.admin.model.JournalEntryItem
import com.saiwaters.admin.ui.components.AppleCard
import com.saiwaters.admin.ui.components.StatusPill
import com.saiwaters.admin.ui.theme.*

@Composable
fun JournalEntriesScreen(
    journalEntries: List<JournalEntryItem>,
    isLoading: Boolean,
    onBack: () -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }

    val filtered = journalEntries.filter { entry ->
        if (searchQuery.isBlank()) true else {
            entry.entryNumber.contains(searchQuery, ignoreCase = true) ||
            entry.narration.contains(searchQuery, ignoreCase = true) ||
            entry.sourceDocumentType.contains(searchQuery, ignoreCase = true)
        }
    }

    Scaffold(
        topBar = {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.surface,
                shadowElevation = 1.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = AppleAzurePrimary)
                    }

                    Column {
                        Text(
                            text = "General Ledger Journal",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "Audited Double-Entry Vouchers & Lines",
                            style = MaterialTheme.typography.bodySmall,
                            color = AppleTextSecondary
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(MaterialTheme.colorScheme.background)
        ) {
            // Search Bar
            Box(modifier = Modifier.padding(16.dp)) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Search by voucher #, narration...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = AppleTextSecondary) },
                    modifier = Modifier.fillMaxWidth(),
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

            if (filtered.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (isLoading) "Loading journal entries..." else "No journal entries found.",
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
                    contentPadding = PaddingValues(bottom = 32.dp)
                ) {
                    items(filtered, key = { it.id }) { entry ->
                        JournalEntryCard(entry = entry)
                    }
                }
            }
        }
    }
}

@Composable
fun JournalEntryCard(entry: JournalEntryItem) {
    AppleCard {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .background(AppleCyanContainer, RoundedCornerShape(8.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Book, contentDescription = null, tint = AppleAzureDark, modifier = Modifier.size(16.dp))
                    }
                    Column {
                        Text(
                            text = entry.entryNumber,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "${entry.entryDate} • ${entry.sourceDocumentType}",
                            style = MaterialTheme.typography.bodySmall,
                            color = AppleTextSecondary
                        )
                    }
                }

                StatusPill(
                    text = if (entry.isPosted) "POSTED" else "DRAFT",
                    textColor = if (entry.isPosted) AppleEmeraldGreen else AppleAmberWarning,
                    backgroundColor = if (entry.isPosted) AppleEmeraldContainer else AppleAmberContainer
                )
            }

            if (entry.narration.isNotBlank()) {
                Text(
                    text = entry.narration,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant, thickness = 0.5.dp)

            // Debit and Credit Lines
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                entry.lines.forEach { line ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            val isDebit = line.debitPaise > 0
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .background(if (isDebit) AppleEmeraldGreen else AppleAzurePrimary, CircleShape)
                            )
                            Text(
                                text = "${line.accountCode} - ${line.accountName}",
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }

                        if (line.debitPaise > 0) {
                            Text(
                                text = "Dr ₹${line.debitPaise / 100}",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = AppleEmeraldGreen
                            )
                        } else {
                            Text(
                                text = "Cr ₹${line.creditPaise / 100}",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = AppleAzurePrimary
                            )
                        }
                    }
                }
            }
        }
    }
}
