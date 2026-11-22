package com.example.saiwatersdriver.ui.main

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.Crossfade
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.saiwatersdriver.data.DriverRepository
import com.example.saiwatersdriver.model.DeliveryStatus
import com.example.saiwatersdriver.notification.SaiNotificationManager
import com.example.saiwatersdriver.ui.components.CustomTopBar
import com.example.saiwatersdriver.ui.tabs.CashTab
import com.example.saiwatersdriver.ui.tabs.DeliveriesTab
import com.example.saiwatersdriver.ui.tabs.ScannerTab
import com.example.saiwatersdriver.ui.tabs.ShiftTab
import com.example.saiwatersdriver.ui.theme.WaterCyanPrimary
import com.example.saiwatersdriver.ui.theme.WaterTextSecondary
import kotlinx.coroutines.launch

/**
 * Main Container Screen for Sai Waters Driver App
 * Material 3 layout with live ERP sync, custom heads-up notifications, and CameraX scanner.
 */
@Composable
fun MainScreen(
    onLogout: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    val repository = remember { DriverRepository(context) }
    val notificationManager = remember { SaiNotificationManager(context) }

    val driverProfile by repository.driverProfile.collectAsStateWithLifecycle()
    val orders by repository.orders.collectAsStateWithLifecycle()
    val scannedJars by repository.scannedJars.collectAsStateWithLifecycle()
    val cashCollections by repository.cashCollections.collectAsStateWithLifecycle()
    val lastScannedJar by repository.lastScannedJar.collectAsStateWithLifecycle()
    val isRefreshing by repository.isRefreshing.collectAsStateWithLifecycle()
    val networkError by repository.networkError.collectAsStateWithLifecycle()

    var selectedTab by remember { mutableIntStateOf(0) }
    var hasNotificationPermission by remember { mutableStateOf(notificationManager.hasNotificationPermission()) }

    // Runtime Permission Launcher for Android 13+ Notifications
    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        hasNotificationPermission = isGranted
        if (isGranted) {
            scope.launch {
                snackbarHostState.showSnackbar("Notifications enabled! You will receive live dispatch alerts.")
            }
        }
    }

    // Auto-request notification permission on first launch if on Android 13+
    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !notificationManager.hasNotificationPermission()) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    // Show network errors if backend is unreachable
    LaunchedEffect(networkError) {
        networkError?.let { err ->
            snackbarHostState.showSnackbar("Live Sync: $err")
        }
    }

    val pendingOrdersCount = orders.count { it.status != DeliveryStatus.DELIVERED }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            CustomTopBar(
                driverProfile = driverProfile,
                onSimulateDispatchClick = {
                    repository.simulateNewTaskAllotment()
                    scope.launch {
                        snackbarHostState.showSnackbar("💧 New Delivery Allotted! Notification triggered.")
                    }
                },
                onSyncClick = {
                    repository.syncFromBackend()
                    scope.launch {
                        snackbarHostState.showSnackbar("Refreshing live orders & cash records...")
                    }
                }
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = Color.White,
                tonalElevation = 6.dp,
                modifier = Modifier
                    .background(Color.White)
                    .navigationBarsPadding()
            ) {
                // Tab 0: Deliveries
                NavigationBarItem(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    icon = {
                        BadgedBox(
                            badge = {
                                if (pendingOrdersCount > 0) {
                                    Badge(
                                        containerColor = Color(0xFFDC2626),
                                        contentColor = Color.White
                                    ) {
                                        Text("$pendingOrdersCount")
                                    }
                                }
                            }
                        ) {
                            Icon(
                                imageVector = Icons.Default.LocalShipping,
                                contentDescription = "Deliveries"
                            )
                        }
                    },
                    label = {
                        Text(
                            text = "Deliveries",
                            fontWeight = if (selectedTab == 0) FontWeight.Bold else FontWeight.Medium,
                            fontSize = 11.sp
                        )
                    },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = WaterCyanPrimary,
                        selectedTextColor = WaterCyanPrimary,
                        indicatorColor = Color(0xFFE0F2FE),
                        unselectedIconColor = WaterTextSecondary,
                        unselectedTextColor = WaterTextSecondary
                    )
                )

                // Tab 1: Scanner (Hero Action)
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    icon = {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(if (selectedTab == 1) WaterCyanPrimary else Color(0xFFF1F5F9)),
                            contentAlignment = androidx.compose.ui.Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.QrCodeScanner,
                                contentDescription = "Scanner",
                                tint = if (selectedTab == 1) Color.White else WaterTextSecondary,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    },
                    label = {
                        Text(
                            text = "QR Scanner",
                            fontWeight = if (selectedTab == 1) FontWeight.Bold else FontWeight.Medium,
                            fontSize = 11.sp
                        )
                    },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = WaterCyanPrimary,
                        selectedTextColor = WaterCyanPrimary,
                        indicatorColor = Color.Transparent,
                        unselectedIconColor = WaterTextSecondary,
                        unselectedTextColor = WaterTextSecondary
                    )
                )

                // Tab 2: Cash Book
                NavigationBarItem(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    icon = {
                        Icon(
                            imageVector = Icons.Default.Payments,
                            contentDescription = "Cash Book"
                        )
                    },
                    label = {
                        Text(
                            text = "Cash Book",
                            fontWeight = if (selectedTab == 2) FontWeight.Bold else FontWeight.Medium,
                            fontSize = 11.sp
                        )
                    },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = WaterCyanPrimary,
                        selectedTextColor = WaterCyanPrimary,
                        indicatorColor = Color(0xFFE0F2FE),
                        unselectedIconColor = WaterTextSecondary,
                        unselectedTextColor = WaterTextSecondary
                    )
                )

                // Tab 3: Shift / Vehicle
                NavigationBarItem(
                    selected = selectedTab == 3,
                    onClick = { selectedTab = 3 },
                    icon = {
                        Icon(
                            imageVector = Icons.Default.Badge,
                            contentDescription = "Shift"
                        )
                    },
                    label = {
                        Text(
                            text = "My Shift",
                            fontWeight = if (selectedTab == 3) FontWeight.Bold else FontWeight.Medium,
                            fontSize = 11.sp
                        )
                    },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = WaterCyanPrimary,
                        selectedTextColor = WaterCyanPrimary,
                        indicatorColor = Color(0xFFE0F2FE),
                        unselectedIconColor = WaterTextSecondary,
                        unselectedTextColor = WaterTextSecondary
                    )
                )
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Crossfade(
            targetState = selectedTab,
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            label = "TabCrossfade"
        ) { tabIndex ->
            when (tabIndex) {
                0 -> DeliveriesTab(
                    orders = orders,
                    driverProfile = driverProfile,
                    hasNotificationPermission = hasNotificationPermission,
                    onRequestNotificationPermission = {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                        }
                    },
                    onRefresh = {
                        repository.syncFromBackend()
                    },
                    onConfirmDelivery = { orderId, delJars, empJars, cashAmt, mode, notes ->
                        repository.completeDelivery(orderId, delJars, empJars, cashAmt, mode, notes)
                        scope.launch {
                            snackbarHostState.showSnackbar("✅ Delivery confirmed! Synced with ERP ledger.")
                        }
                    }
                )
                1 -> ScannerTab(
                    scannedJars = scannedJars,
                    lastScannedJar = lastScannedJar,
                    onJarScanned = { qrToken, isReturnEmpty ->
                        repository.recordJarScan(qrToken, isReturnEmpty)
                        scope.launch {
                            snackbarHostState.showSnackbar(
                                if (isReturnEmpty) "Empty jar recorded: $qrToken"
                                else "Outgoing jar verified: $qrToken"
                            )
                        }
                    },
                    onDismissScanNotice = {
                        repository.dismissLastScanNotice()
                    }
                )
                2 -> CashTab(
                    cashCollections = cashCollections,
                    totalCashInHandPaise = repository.totalCashInHandPaise
                )
                3 -> ShiftTab(
                    driverProfile = driverProfile,
                    totalDeliveredJars = orders.filter { it.status == DeliveryStatus.DELIVERED }.sumOf { it.jarQuantity },
                    totalEmptyCollected = orders.sumOf { it.collectedEmptyJars.size },
                    onSyncClick = {
                        repository.syncFromBackend()
                        scope.launch {
                            snackbarHostState.showSnackbar("Live ERP data refreshed.")
                        }
                    },
                    onLogoutClick = onLogout
                )
            }
        }
    }
}
