package com.saiwaters.admin.ui.main

import android.os.Environment
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.saiwaters.admin.data.AdminRepository
import com.saiwaters.admin.data.AdminSessionManager
import com.saiwaters.admin.model.*
import com.saiwaters.admin.scanner.AdminCameraScannerView
import com.saiwaters.admin.ui.components.CustomAdminTopBar
import com.saiwaters.admin.ui.tabs.*
import com.saiwaters.admin.ui.theme.*
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun AdminMainScreen(
    sessionManager: AdminSessionManager,
    onLogout: () -> Unit,
    onOpenServerConfig: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val repository = remember { AdminRepository(context) }

    var currentTab by remember { mutableIntStateOf(0) }
    var isSyncing by remember { mutableStateOf(false) }
    var isBackingUp by remember { mutableStateOf(false) }
    var isCameraScannerOpen by remember { mutableStateOf(false) }

    // State holders
    var stats by remember { mutableStateOf(DashboardStats()) }
    var jars by remember { mutableStateOf<List<JarItem>>(emptyList()) }
    var customers by remember { mutableStateOf<List<CustomerItem>>(emptyList()) }
    var trialBalance by remember { mutableStateOf(TrialBalanceSummary()) }
    var pnl by remember { mutableStateOf(ProfitAndLossSummary()) }
    var cashSubmissions by remember { mutableStateOf<List<CashSubmission>>(emptyList()) }
    var driverHandovers by remember { mutableStateOf<List<DriverHandoverSummary>>(emptyList()) }

    fun refreshAll() {
        coroutineScope.launch {
            isSyncing = true
            repository.fetchDashboardStats().onSuccess { stats = it }
            repository.fetchJars().onSuccess { jars = it }
            repository.fetchCustomers().onSuccess { customers = it }
            repository.fetchTrialBalance().onSuccess { trialBalance = it }
            repository.fetchProfitAndLoss().onSuccess { pnl = it }
            repository.fetchCashData().onSuccess { (subs, hovs) ->
                cashSubmissions = subs
                driverHandovers = hovs
            }
            isSyncing = false
        }
    }

    LaunchedEffect(Unit) {
        refreshAll()
    }

    if (isCameraScannerOpen) {
        AdminCameraScannerView(
            onCloseClick = { isCameraScannerOpen = false },
            onBarcodeDetected = { scannedCode ->
                isCameraScannerOpen = false
                val code = scannedCode.trim()
                Toast.makeText(context, "Scanned: $code", Toast.LENGTH_SHORT).show()

                // Smart Route based on barcode prefix
                if (code.startsWith("CUST-", ignoreCase = true) || code.startsWith("urn:sw:c:", ignoreCase = true)) {
                    currentTab = 2 // Customers Tab
                } else {
                    currentTab = 1 // Jars Tab
                }
            }
        )
        return
    }

    Scaffold(
        topBar = {
            CustomAdminTopBar(
                adminName = sessionManager.adminFullName,
                isSyncing = isSyncing,
                onRefreshClick = { refreshAll() },
                onLogoutClick = {
                    sessionManager.logout()
                    onLogout()
                },
                onOpenServerConfig = onOpenServerConfig
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                tonalElevation = 8.dp
            ) {
                val navItems = listOf(
                    Triple(0, "Overview", Icons.Default.Dashboard),
                    Triple(1, "20L Jars", Icons.Default.WaterDrop),
                    Triple(2, "Grahak", Icons.Default.People),
                    Triple(3, "Ledger", Icons.Default.AccountBalance),
                    Triple(4, "Backup", Icons.Default.CloudSync)
                )

                navItems.forEach { (index, title, icon) ->
                    val selected = currentTab == index
                    NavigationBarItem(
                        selected = selected,
                        onClick = { currentTab = index },
                        icon = {
                            Icon(
                                imageVector = icon,
                                contentDescription = title,
                                tint = if (selected) AppleAzurePrimary else AppleTextSecondary
                            )
                        },
                        label = {
                            Text(
                                text = title,
                                color = if (selected) AppleAzurePrimary else AppleTextSecondary,
                                style = MaterialTheme.typography.labelSmall
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            indicatorColor = AppleCyanContainer
                        )
                    )
                }
            }
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { isCameraScannerOpen = true },
                containerColor = AppleAzurePrimary,
                contentColor = Color.White,
                shape = CircleShape
            ) {
                Icon(Icons.Default.QrCodeScanner, contentDescription = "Scan QR")
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when (currentTab) {
                0 -> OverviewTab(
                    stats = stats,
                    onNavigateToTab = { currentTab = it },
                    onQuickScanClick = { isCameraScannerOpen = true },
                    onQuickAddCustomer = { currentTab = 2 },
                    onQuickAddJars = { currentTab = 1 },
                    onQuickBackup = { currentTab = 4 }
                )
                1 -> JarsInventoryTab(
                    jars = jars,
                    isLoading = isSyncing,
                    onAddJarBatch = { count ->
                        coroutineScope.launch {
                            repository.addJarBatch(count).onSuccess {
                                Toast.makeText(context, "Added $count 20L Jars to Inventory", Toast.LENGTH_SHORT).show()
                                refreshAll()
                            }.onFailure {
                                Toast.makeText(context, "Failed: ${it.message}", Toast.LENGTH_LONG).show()
                            }
                        }
                    },
                    onRelabelJar = { jarId, newQr ->
                        coroutineScope.launch {
                            repository.relabelJar(jarId, newQr).onSuccess {
                                Toast.makeText(context, "QR Token updated successfully", Toast.LENGTH_SHORT).show()
                                refreshAll()
                            }.onFailure {
                                Toast.makeText(context, "Failed: ${it.message}", Toast.LENGTH_LONG).show()
                            }
                        }
                    },
                    onReportLoss = { jarId, reason ->
                        coroutineScope.launch {
                            repository.reportJarLoss(jarId, reason).onSuccess {
                                Toast.makeText(context, "Loss recorded. Asset ledger adjusted.", Toast.LENGTH_SHORT).show()
                                refreshAll()
                            }.onFailure {
                                Toast.makeText(context, "Failed: ${it.message}", Toast.LENGTH_LONG).show()
                            }
                        }
                    },
                    onScanJarClick = { isCameraScannerOpen = true }
                )
                2 -> CustomersTab(
                    customers = customers,
                    isLoading = isSyncing,
                    onAddCustomer = { name, phone, addr, quota, rate ->
                        coroutineScope.launch {
                            repository.saveCustomer(name, phone, addr, quota, rate).onSuccess {
                                Toast.makeText(context, "Customer $name registered successfully", Toast.LENGTH_SHORT).show()
                                refreshAll()
                            }.onFailure {
                                Toast.makeText(context, "Failed: ${it.message}", Toast.LENGTH_LONG).show()
                            }
                        }
                    },
                    onRefresh = { refreshAll() }
                )
                3 -> AccountingTab(
                    trialBalance = trialBalance,
                    pnl = pnl,
                    cashSubmissions = cashSubmissions,
                    driverHandovers = driverHandovers,
                    isLoading = isSyncing,
                    onVerifyHandover = { driverId, declared, verified, notes ->
                        coroutineScope.launch {
                            repository.verifyVaultHandover(driverId, declared, verified, notes).onSuccess {
                                Toast.makeText(context, "Accepted ₹${verified / 100} into Vault 1110. Driver clearing zeroed.", Toast.LENGTH_SHORT).show()
                                refreshAll()
                            }.onFailure {
                                Toast.makeText(context, "Failed: ${it.message}", Toast.LENGTH_LONG).show()
                            }
                        }
                    },
                    onRefresh = { refreshAll() }
                )
                4 -> BackupSettingsTab(
                    sessionManager = sessionManager,
                    isBackingUp = isBackingUp,
                    onTriggerManualBackup = {
                        coroutineScope.launch {
                            isBackingUp = true
                            repository.triggerBackupSnapshot().onSuccess { (filename, rawJson) ->
                                try {
                                    val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                                    val backupFolder = File(downloadsDir, "SaiWatersBackups")
                                    if (!backupFolder.exists()) backupFolder.mkdirs()

                                    val targetFile = if (backupFolder.canWrite()) {
                                        File(backupFolder, filename)
                                    } else {
                                        File(context.getExternalFilesDir("backups"), filename)
                                    }

                                    FileOutputStream(targetFile).use { fos ->
                                        fos.write(rawJson.toByteArray(Charsets.UTF_8))
                                        fos.flush()
                                    }

                                    sessionManager.lastBackupTimestamp = System.currentTimeMillis()
                                    sessionManager.lastBackupFilename = filename
                                    sessionManager.lastBackupSize = targetFile.length()

                                    Toast.makeText(context, "Backup Saved: ${targetFile.name} (${targetFile.length() / 1024} KB)", Toast.LENGTH_LONG).show()
                                } catch (e: Exception) {
                                    Toast.makeText(context, "Saved snapshot, file write note: ${e.message}", Toast.LENGTH_LONG).show()
                                }
                            }.onFailure {
                                Toast.makeText(context, "Backup failed: ${it.message}", Toast.LENGTH_LONG).show()
                            }
                            isBackingUp = false
                        }
                    },
                    onRestoreJsonFile = { jsonString ->
                        coroutineScope.launch {
                            repository.restoreBackup(jsonString).onSuccess {
                                Toast.makeText(context, "Database restored successfully!", Toast.LENGTH_LONG).show()
                                refreshAll()
                            }.onFailure {
                                Toast.makeText(context, "Restore failed: ${it.message}", Toast.LENGTH_LONG).show()
                            }
                        }
                    }
                )
            }
        }
    }
}
