package com.example.saiwatersdriver.ui.tabs

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.EventNote
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.saiwatersdriver.data.DriverRepository
import com.example.saiwatersdriver.model.DeliveryOrder
import com.example.saiwatersdriver.model.DeliveryStatus
import com.example.saiwatersdriver.model.DriverProfile
import com.example.saiwatersdriver.model.OrderBillingType
import com.example.saiwatersdriver.ui.components.NotificationPermissionCard
import com.example.saiwatersdriver.ui.theme.WaterBorderLight
import com.example.saiwatersdriver.ui.theme.WaterCyanPrimary
import com.example.saiwatersdriver.ui.theme.WaterEmeraldGreen
import com.example.saiwatersdriver.ui.theme.WaterNavyDark
import com.example.saiwatersdriver.ui.theme.WaterTextPrimary
import com.example.saiwatersdriver.ui.theme.WaterTextSecondary
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/**
 * Deliveries Tab: Filtered strictly to BULK & EVENT ORDERS ONLY.
 * Daily recurring customers are completely excluded and scanned via QR Scanner tab.
 * Includes custom Apple-style horizontal date strip (NO default Android calendar dialog).
 */
@Composable
fun DeliveriesTab(
    orders: List<DeliveryOrder>,
    driverProfile: DriverProfile,
    repository: DriverRepository,
    hasNotificationPermission: Boolean,
    onRequestNotificationPermission: () -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val ymdFormat = remember { SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()) }
    val displayFormat = remember { SimpleDateFormat("EEE, dd MMM yyyy", Locale.getDefault()) }
    val todayCal = remember { Calendar.getInstance() }
    val todayStr = remember { ymdFormat.format(todayCal.time) }

    var selectedDateStr by remember { mutableStateOf(todayStr) }
    var activeBulkOrder by remember { mutableStateOf<DeliveryOrder?>(null) }
    var bulkOrdersForDay by remember { mutableStateOf<List<DeliveryOrder>>(emptyList()) }
    var isLoadingDayOrders by remember { mutableStateOf(false) }

    // Generate date strip: 7 days ago to today + 7 days ahead
    val dayItems = remember {
        val list = mutableListOf<DayItem>()
        val cal = Calendar.getInstance()
        cal.add(Calendar.DAY_OF_YEAR, -7)

        val dayNameFmt = SimpleDateFormat("EEE", Locale.getDefault())
        val dayNumFmt = SimpleDateFormat("dd", Locale.getDefault())
        val monthFmt = SimpleDateFormat("MMM", Locale.getDefault())

        for (i in 0..14) {
            val dStr = ymdFormat.format(cal.time)
            list.add(
                DayItem(
                    dateString = dStr,
                    dayName = dayNameFmt.format(cal.time),
                    dayNumber = dayNumFmt.format(cal.time),
                    monthName = monthFmt.format(cal.time),
                    isToday = dStr == todayStr
                )
            )
            cal.add(Calendar.DAY_OF_YEAR, 1)
        }
        list
    }

    val dateStripListState = rememberLazyListState(initialFirstVisibleItemIndex = 5)

    // Load bulk orders for selected date
    fun loadBulkOrders(date: String) {
        isLoadingDayOrders = true
        scope.launch {
            val result = repository.fetchBulkOrdersForDate(date)
            isLoadingDayOrders = false
            result.fold(
                onSuccess = { fetched ->
                    // Strictly bulk orders
                    bulkOrdersForDay = fetched.filter { it.billingType == OrderBillingType.BULK_EVENT }
                },
                onFailure = {
                    // Fallback to locally cached orders filtered by date & bulk type
                    bulkOrdersForDay = orders.filter {
                        it.billingType == OrderBillingType.BULK_EVENT &&
                                (it.scheduledDate.isBlank() || it.scheduledDate == date)
                    }
                }
            )
        }
    }

    LaunchedEffect(selectedDateStr, orders) {
        loadBulkOrders(selectedDateStr)
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(4.dp))
        }

        // Notification Permission Alert (if not granted)
        if (!hasNotificationPermission) {
            item {
                NotificationPermissionCard(
                    onRequestPermission = onRequestNotificationPermission
                )
            }
        }

        // =========================================================================
        // CUSTOM APPLE-STYLE DATE STRIP
        // =========================================================================
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    // Header Row with Date & Controls
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.EventNote,
                                contentDescription = null,
                                tint = WaterCyanPrimary,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            val parsedDate = try { ymdFormat.parse(selectedDateStr) } catch (e: Exception) { Date() }
                            Text(
                                text = if (selectedDateStr == todayStr) "Today (${displayFormat.format(parsedDate)})" else displayFormat.format(parsedDate),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Black,
                                color = WaterNavyDark
                            )
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            IconButton(
                                onClick = {
                                    val c = Calendar.getInstance()
                                    try { c.time = ymdFormat.parse(selectedDateStr) ?: Date() } catch (e: Exception) {}
                                    c.add(Calendar.DAY_OF_YEAR, -1)
                                    selectedDateStr = ymdFormat.format(c.time)
                                },
                                modifier = Modifier.size(30.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ChevronLeft,
                                    contentDescription = "Previous Day",
                                    tint = WaterNavyDark,
                                    modifier = Modifier.size(20.dp)
                                )
                            }

                            if (selectedDateStr != todayStr) {
                                Surface(
                                    modifier = Modifier.clickable { selectedDateStr = todayStr },
                                    shape = RoundedCornerShape(50),
                                    color = Color(0xFFE0F2FE)
                                ) {
                                    Text(
                                        text = "Today",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = WaterCyanPrimary,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }
                            }

                            IconButton(
                                onClick = {
                                    val c = Calendar.getInstance()
                                    try { c.time = ymdFormat.parse(selectedDateStr) ?: Date() } catch (e: Exception) {}
                                    c.add(Calendar.DAY_OF_YEAR, 1)
                                    selectedDateStr = ymdFormat.format(c.time)
                                },
                                modifier = Modifier.size(30.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ChevronRight,
                                    contentDescription = "Next Day",
                                    tint = WaterNavyDark,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Date Pills Row
                    LazyRow(
                        state = dateStripListState,
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(dayItems) { day ->
                            val isSelected = day.dateString == selectedDateStr
                            Surface(
                                modifier = Modifier
                                    .width(52.dp)
                                    .clip(RoundedCornerShape(14.dp))
                                    .clickable { selectedDateStr = day.dateString },
                                shape = RoundedCornerShape(14.dp),
                                color = if (isSelected) WaterCyanPrimary else Color(0xFFF8FAFC),
                                border = androidx.compose.foundation.BorderStroke(
                                    1.dp,
                                    if (isSelected) WaterCyanPrimary else Color(0xFFE2E8F0)
                                )
                            ) {
                                Column(
                                    modifier = Modifier.padding(vertical = 8.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text(
                                        text = day.dayName.uppercase(),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = if (isSelected) Color.White.copy(alpha = 0.85f) else Color(0xFF94A3B8)
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = day.dayNumber,
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Black,
                                        color = if (isSelected) Color.White else WaterNavyDark
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = if (day.isToday) "TODAY" else day.monthName,
                                        fontSize = 8.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isSelected) Color.White else if (day.isToday) WaterCyanPrimary else Color(0xFF64748B)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Section Title
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "SCHEDULED BULK & EVENT ORDERS (${bulkOrdersForDay.size})",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = WaterTextSecondary
                )
                if (isLoadingDayOrders) {
                    CircularProgressIndicator(modifier = Modifier.size(14.dp), color = WaterCyanPrimary, strokeWidth = 2.dp)
                }
            }
        }

        // List of Bulk Orders or Empty State
        if (bulkOrdersForDay.isEmpty()) {
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = Color.White,
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(28.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFF1F5F9)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Inbox,
                                contentDescription = null,
                                tint = Color(0xFF94A3B8),
                                modifier = Modifier.size(28.dp)
                            )
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        Text(
                            text = "No Bulk Orders Scheduled",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = WaterNavyDark
                        )

                        Spacer(modifier = Modifier.height(6.dp))

                        Text(
                            text = "Is date ($selectedDateStr) par koi bulk order scheduled nahi hai.\nDaily grahakon ki delivery 'QR Scanner' tab se scan karein.",
                            fontSize = 12.sp,
                            color = WaterTextSecondary,
                            textAlign = TextAlign.Center,
                            lineHeight = 16.sp
                        )

                        Spacer(modifier = Modifier.height(18.dp))

                        Button(
                            onClick = { loadBulkOrders(selectedDateStr) },
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = WaterCyanPrimary)
                        ) {
                            Icon(imageVector = Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Refresh Date", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        } else {
            items(bulkOrdersForDay, key = { it.id }) { order ->
                BulkOrderCard(
                    order = order,
                    onDeliverClick = { activeBulkOrder = order },
                    onCallClick = { phone ->
                        try {
                            val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))
                            context.startActivity(intent)
                        } catch (e: Exception) {}
                    }
                )
            }
        }

        item {
            Spacer(modifier = Modifier.height(24.dp))
        }
    }

    // =========================================================================
    // BULK ORDER DELIVERY & SETTLEMENT DIALOG
    // =========================================================================
    activeBulkOrder?.let { order ->
        BulkDeliverySettlementDialog(
            order = order,
            onDismiss = { activeBulkOrder = null },
            onConfirmSettle = { orderId, undeliveredJars, cashCollectedPaise ->
                scope.launch {
                    repository.deliverBulkOrder(orderId, undeliveredJars, cashCollectedPaise)
                    loadBulkOrders(selectedDateStr)
                    activeBulkOrder = null
                }
            }
        )
    }
}

/**
 * Bulk & Event Order Display Card
 */
@Composable
fun BulkOrderCard(
    order: DeliveryOrder,
    onDeliverClick: () -> Unit,
    onCallClick: (String) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header: Order Number & Status Pill
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = order.orderNumber,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Black,
                        color = WaterCyanPrimary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Surface(
                        shape = RoundedCornerShape(50),
                        color = Color(0xFFFEF3C7)
                    ) {
                        Text(
                            text = "BULK / EVENT",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color(0xFF92400E),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }

                Surface(
                    shape = RoundedCornerShape(50),
                    color = if (order.isFullyDelivered) Color(0xFFDCFCE7) else Color(0xFFFEF3C7)
                ) {
                    Text(
                        text = if (order.isFullyDelivered) "DELIVERED" else "IN TRANSIT",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (order.isFullyDelivered) Color(0xFF166534) else Color(0xFFB45309),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Event Name & Customer Name
            Text(
                text = order.eventName ?: order.customerName,
                fontSize = 16.sp,
                fontWeight = FontWeight.Black,
                color = WaterNavyDark
            )
            if (order.eventName != null && order.eventName != order.customerName) {
                Text(
                    text = "Organizer: ${order.customerName}",
                    fontSize = 11.sp,
                    color = WaterTextSecondary
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Venue / Address
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.LocationOn,
                    contentDescription = null,
                    tint = Color(0xFF94A3B8),
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = order.address,
                    fontSize = 11.sp,
                    color = WaterTextSecondary,
                    maxLines = 2
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Metrics Grid: Dispatched Jars & Financials
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
                    Column {
                        Text(text = "DISPATCHED", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF64748B))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(imageVector = Icons.Default.WaterDrop, contentDescription = null, tint = WaterCyanPrimary, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(2.dp))
                            Text(text = "${order.jarQuantity} Jars (20L)", fontSize = 13.sp, fontWeight = FontWeight.Black, color = WaterNavyDark)
                        }
                    }

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = "ADVANCE", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF64748B))
                        Text(
                            text = String.format(Locale.US, "₹%.0f", order.alreadyPaidPaise / 100.0),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF166534)
                        )
                    }

                    Column(horizontalAlignment = Alignment.End) {
                        Text(text = "DUE BALANCE", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF64748B))
                        Text(
                            text = String.format(Locale.US, "₹%.0f", order.netDueRupees),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFFDC2626)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Action Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (order.customerPhone.isNotBlank()) {
                    IconButton(
                        onClick = { onCallClick(order.customerPhone) },
                        modifier = Modifier
                            .size(44.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFFF1F5F9))
                    ) {
                        Icon(imageVector = Icons.Default.Call, contentDescription = "Call", tint = Color(0xFF0369A1))
                    }
                }

                Button(
                    onClick = onDeliverClick,
                    enabled = !order.isFullyDelivered,
                    modifier = Modifier
                        .weight(1f)
                        .height(44.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (order.isFullyDelivered) Color(0xFFCBD5E1) else WaterCyanPrimary
                    )
                ) {
                    Icon(imageVector = Icons.Default.LocalShipping, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (order.isFullyDelivered) "Delivered & Settled" else "Deliver & Settle",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

/**
 * Bulk Order Delivery & Settlement Dialog (Reverse Undelivered Protocol)
 * Explicit dark colors for text fields to fix invisible text bug.
 */
@Composable
fun BulkDeliverySettlementDialog(
    order: DeliveryOrder,
    onDismiss: () -> Unit,
    onConfirmSettle: (orderId: String, undeliveredJars: List<String>, cashCollectedPaise: Long) -> Unit
) {
    val dispatchedCount = if (order.dispatchedJars.isNotEmpty()) order.dispatchedJars.size else order.jarQuantity
    var undeliveredJarCodes by remember { mutableStateOf<List<String>>(emptyList()) }
    var manualUndeliveredCode by remember { mutableStateOf("") }
    val rejectedCount = undeliveredJarCodes.size
    val acceptedCount = (dispatchedCount - rejectedCount).coerceAtLeast(0)

    val unitRateRupees = order.ratePerJarPaise / 100.0
    val finalBillRupees = acceptedCount * unitRateRupees
    val advanceRupees = order.alreadyPaidPaise / 100.0
    val isPrepaid = order.paymentType == "PREPAID"
    val dueBalanceRupees = if (isPrepaid) 0.0 else (finalBillRupees - advanceRupees).coerceAtLeast(0.0)

    var cashCollectedText by remember { mutableStateOf(String.format(Locale.US, "%.0f", dueBalanceRupees)) }
    var isSubmitting by remember { mutableStateOf(false) }

    Dialog(onDismissRequest = onDismiss) {
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
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Deliver Bulk Order",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Black,
                            color = WaterNavyDark
                        )
                        Text(
                            text = "${order.orderNumber} • ${order.eventName ?: order.customerName}",
                            fontSize = 11.sp,
                            color = WaterTextSecondary
                        )
                    }

                    IconButton(onClick = onDismiss) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = Color(0xFF64748B))
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Calculations Card
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    color = WaterNavyDark
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Dispatched", fontSize = 10.sp, color = Color(0xFF94A3B8), fontWeight = FontWeight.Bold)
                                Text("$dispatchedCount", fontSize = 16.sp, fontWeight = FontWeight.Black, color = Color.White)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Rejected", fontSize = 10.sp, color = Color(0xFFFDA4AF), fontWeight = FontWeight.Bold)
                                Text("-$rejectedCount", fontSize = 16.sp, fontWeight = FontWeight.Black, color = Color(0xFFFDA4AF))
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Accepted", fontSize = 10.sp, color = Color(0xFF86EFAC), fontWeight = FontWeight.Bold)
                                Text("$acceptedCount", fontSize = 16.sp, fontWeight = FontWeight.Black, color = Color(0xFF86EFAC))
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Bill breakdown
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Total Bill ($acceptedCount × ₹${unitRateRupees.toInt()}):", fontSize = 11.sp, color = Color(0xFFCBD5E1))
                            Text(String.format(Locale.US, "₹%.0f", finalBillRupees), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }

                        if (advanceRupees > 0) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Advance Received:", fontSize = 11.sp, color = Color(0xFFFCD34D))
                                Text(String.format(Locale.US, "-₹%.0f", advanceRupees), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFFFCD34D))
                            }
                        }

                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Due Balance to Collect:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF38BDF8))
                            Text(String.format(Locale.US, "₹%.0f", dueBalanceRupees), fontSize = 14.sp, fontWeight = FontWeight.Black, color = Color(0xFF38BDF8))
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Cash Collected Input Field (Explicit Visible Dark Text)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "CASH COLLECTED AT VENUE (₹)",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = WaterTextSecondary
                    )
                    Text(
                        text = "Set Due ₹${dueBalanceRupees.toInt()}",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = WaterCyanPrimary,
                        modifier = Modifier.clickable {
                            cashCollectedText = String.format(Locale.US, "%.0f", dueBalanceRupees)
                        }
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))

                OutlinedTextField(
                    value = cashCollectedText,
                    onValueChange = { cashCollectedText = it },
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

                Spacer(modifier = Modifier.height(18.dp))

                // Action Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Cancel", fontSize = 12.sp, color = WaterTextSecondary)
                    }

                    Button(
                        onClick = {
                            isSubmitting = true
                            val cashAmt = ((cashCollectedText.toDoubleOrNull() ?: dueBalanceRupees) * 100).toLong()
                            onConfirmSettle(order.id, undeliveredJarCodes, cashAmt)
                        },
                        enabled = !isSubmitting,
                        modifier = Modifier.weight(1.5f),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = WaterEmeraldGreen)
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                        } else {
                            Icon(imageVector = Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Deliver $acceptedCount Jars", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
