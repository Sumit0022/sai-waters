package com.saiwaters.admin.ui.tabs

import android.app.TimePickerDialog
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import com.saiwaters.admin.data.AdminSessionManager
import com.saiwaters.admin.ui.components.AppleCard
import com.saiwaters.admin.ui.components.StatusPill
import com.saiwaters.admin.ui.theme.*
import com.saiwaters.admin.worker.AutoBackupWorker
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun BackupSettingsTab(
    sessionManager: AdminSessionManager,
    isBackingUp: Boolean,
    onTriggerManualBackup: () -> Unit,
    onRestoreJsonFile: (String) -> Unit
) {
    val context = LocalContext.current
    var autoBackupEnabled by remember { mutableStateOf(sessionManager.autoBackupEnabled) }
    var backupHour by remember { mutableIntStateOf(sessionManager.autoBackupHour) }
    var backupMinute by remember { mutableIntStateOf(sessionManager.autoBackupMinute) }

    var localBackups by remember { mutableStateOf(getLocalBackupFiles(context)) }

    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            try {
                val jsonString = context.contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() }
                if (!jsonString.isNullOrBlank()) {
                    onRestoreJsonFile(jsonString)
                }
            } catch (_: Exception) {}
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 100.dp)
    ) {
        // 1. Manual Backup & Restore Action Hero Card
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
                            text = "DATABASE SNAPSHOT & BACKUP",
                            style = MaterialTheme.typography.labelSmall,
                            color = AppleWaterCyan,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        )

                        StatusPill(
                            text = "OFFLINE COMPATIBLE",
                            textColor = AppleEmeraldGreen,
                            backgroundColor = AppleEmeraldContainer.copy(alpha = 0.2f)
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = "Instant Disaster Recovery",
                        style = MaterialTheme.typography.headlineSmall,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )

                    Text(
                        text = "Take a full cryptographic snapshot of customers, 20L jars, double-entry accounting ledgers, and delivery logs. Saves directly to your phone as a JSON file.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = 0.75f)
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = {
                                onTriggerManualBackup()
                                localBackups = getLocalBackupFiles(context)
                            },
                            enabled = !isBackingUp,
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = AppleWaterCyan),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            if (isBackingUp) {
                                CircularProgressIndicator(modifier = Modifier.size(16.dp), color = AppleObsidianDark, strokeWidth = 2.dp)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Backing up...", color = AppleObsidianDark, fontWeight = FontWeight.Bold)
                            } else {
                                Icon(Icons.Default.Download, contentDescription = null, tint = AppleObsidianDark, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Backup Now", color = AppleObsidianDark, fontWeight = FontWeight.Bold)
                            }
                        }

                        OutlinedButton(
                            onClick = { filePickerLauncher.launch("application/json") },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.4f)),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White)
                        ) {
                            Icon(Icons.Default.Upload, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Restore File", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // 2. Automated Daily Scheduled Backup Card
        item {
            AppleCard {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
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
                                Icon(Icons.Default.Schedule, contentDescription = null, tint = AppleAzureDark, modifier = Modifier.size(20.dp))
                            }

                            Column {
                                Text(
                                    text = "Daily Auto-Backup",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = "Automatic background snapshot via WorkManager",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = AppleTextSecondary
                                )
                            }
                        }

                        Switch(
                            checked = autoBackupEnabled,
                            onCheckedChange = { isChecked ->
                                autoBackupEnabled = isChecked
                                sessionManager.autoBackupEnabled = isChecked
                                if (isChecked) {
                                    AutoBackupWorker.scheduleDailyBackup(context, backupHour, backupMinute)
                                } else {
                                    AutoBackupWorker.cancelDailyBackup(context)
                                }
                            },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Color.White,
                                checkedTrackColor = AppleAzurePrimary
                            )
                        )
                    }

                    if (autoBackupEnabled) {
                        Divider(color = MaterialTheme.colorScheme.outlineVariant, thickness = 0.5.dp)

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "SCHEDULED BACKUP TIME",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = AppleTextSecondary,
                                    fontSize = 9.sp
                                )
                                val timeFormatted = String.format("%02d:%02d %s",
                                    if (backupHour % 12 == 0) 12 else backupHour % 12,
                                    backupMinute,
                                    if (backupHour >= 12) "PM" else "AM"
                                )
                                Text(
                                    text = timeFormatted,
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = AppleAzurePrimary
                                )
                            }

                            Button(
                                onClick = {
                                    TimePickerDialog(
                                        context,
                                        { _, h, m ->
                                            backupHour = h
                                            backupMinute = m
                                            sessionManager.autoBackupHour = h
                                            sessionManager.autoBackupMinute = m
                                            AutoBackupWorker.scheduleDailyBackup(context, h, m)
                                        },
                                        backupHour,
                                        backupMinute,
                                        false
                                    ).show()
                                },
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = AppleSurfaceSubtle)
                            ) {
                                Text("Change Time", color = AppleTextPrimary, fontWeight = FontWeight.SemiBold)
                            }
                        }

                        // Status notification info
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(AppleCyanContainer.copy(alpha = 0.4f), RoundedCornerShape(10.dp))
                                .padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Default.NotificationsActive, contentDescription = null, tint = AppleAzureDark, modifier = Modifier.size(16.dp))
                            Text(
                                text = "Phone will automatically wake, save backup to storage, and alert you upon completion.",
                                style = MaterialTheme.typography.bodySmall,
                                color = AppleAzureDark
                            )
                        }
                    }
                }
            }
        }

        // 3. Local Backups on Device Storage
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "LOCAL BACKUP ARCHIVE ON DEVICE",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )

                IconButton(
                    onClick = { localBackups = getLocalBackupFiles(context) },
                    modifier = Modifier.size(30.dp)
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = AppleAzurePrimary, modifier = Modifier.size(16.dp))
                }
            }
        }

        if (localBackups.isEmpty()) {
            item {
                AppleCard {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "No local backup files saved yet. Click 'Backup Now' to create one.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = AppleTextSecondary
                        )
                    }
                }
            }
        } else {
            items(localBackups) { file ->
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
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .background(AppleEmeraldContainer, RoundedCornerShape(10.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.DataObject, contentDescription = null, tint = AppleEmeraldGreen, modifier = Modifier.size(18.dp))
                            }

                            Column {
                                Text(
                                    text = file.name,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    maxLines = 1
                                )
                                Text(
                                    text = "${file.length() / 1024} KB • ${SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.getDefault()).format(Date(file.lastModified()))}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = AppleTextSecondary
                                )
                            }
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            IconButton(
                                onClick = {
                                    try {
                                        val uri = FileProvider.getUriForFile(
                                            context,
                                            "${context.packageName}.fileprovider",
                                            file
                                        )
                                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                            type = "application/json"
                                            putExtra(Intent.EXTRA_STREAM, uri)
                                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                        }
                                        context.startActivity(Intent.createChooser(shareIntent, "Share Sai Waters Backup"))
                                    } catch (_: Exception) {}
                                },
                                modifier = Modifier.size(34.dp)
                            ) {
                                Icon(Icons.Default.Share, contentDescription = "Share", tint = AppleAzurePrimary, modifier = Modifier.size(18.dp))
                            }

                            IconButton(
                                onClick = {
                                    val text = file.readText()
                                    onRestoreJsonFile(text)
                                },
                                modifier = Modifier.size(34.dp)
                            ) {
                                Icon(Icons.Default.Restore, contentDescription = "Restore", tint = AppleEmeraldGreen, modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun getLocalBackupFiles(context: Context): List<File> {
    val list = mutableListOf<File>()
    try {
        val pubDir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "SaiWatersBackups")
        if (pubDir.exists() && pubDir.isDirectory) {
            pubDir.listFiles { f -> f.extension == "json" }?.let { list.addAll(it) }
        }
        val intDir = context.getExternalFilesDir("backups")
        if (intDir != null && intDir.exists() && intDir.isDirectory) {
            intDir.listFiles { f -> f.extension == "json" }?.let { list.addAll(it) }
        }
    } catch (_: Exception) {}
    return list.sortedByDescending { it.lastModified() }
}
