package com.example.saiwatersdriver.ui.tabs

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Today
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.saiwatersdriver.data.DriverRepository
import com.example.saiwatersdriver.model.DayTimelineSummary
import com.example.saiwatersdriver.model.TimelineItem
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

data class DayItem(
    val dateString: String,      // YYYY-MM-DD
    val dayName: String,        // Mon, Tue, etc.
    val dayNumber: String,      // 22
    val monthName: String,      // Nov
    val isToday: Boolean
)

/**
 * Timeline Tab: Full Day Time-Wise Driver Activity Log
 * Supports browsing past dates via Custom Apple-aesthetic horizontal date strip.
 * Strictly avoids default Android calendar dialog.
 */
@Composable
fun TimelineTab(
    repository: DriverRepository,
    modifier: Modifier = Modifier
) {
    val scope = rememberCoroutineScope()
    val todayCalendar = remember { Calendar.getInstance() }
    val ymdFormat = remember { SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()) }
    val displayFormat = remember { SimpleDateFormat("EEE, dd MMM yyyy", Locale.getDefault()) }

    val todayStr = remember { ymdFormat.format(todayCalendar.time) }
    var selectedDateStr by remember { mutableStateOf(todayStr) }
    var timelineSummary by remember { mutableStateOf<DayTimelineSummary?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    // Generate date strip: 14 days back to today + 2 days ahead
    val dayItems = remember {
        val list = mutableListOf<DayItem>()
        val cal = Calendar.getInstance()
        cal.add(Calendar.DAY_OF_YEAR, -14)

        val dayNameFmt = SimpleDateFormat("EEE", Locale.getDefault())
        val dayNumFmt = SimpleDateFormat("dd", Locale.getDefault())
        val monthFmt = SimpleDateFormat("MMM", Locale.getDefault())

        for (i in 0..16) {
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

    val dateStripListState = rememberLazyListState(initialFirstVisibleItemIndex = 11)

    // Load timeline whenever selectedDateStr changes
    fun loadTimeline(date: String) {
        isLoading = true
        errorMessage = null
        scope.launch {
            val result = repository.fetchTimelineForDate(date)
            isLoading = false
            result.fold(
                onSuccess = { summary ->
                    timelineSummary = summary
                },
                onFailure = { err ->
                    errorMessage = err.message ?: "Failed to load timeline"
                }
            )
        }
    }

    LaunchedEffect(selectedDateStr) {
        loadTimeline(selectedDateStr)
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(6.dp))
        }

        // =========================================================================
        // CUSTOM APPLE-STYLE DATE STRIP & HEADER
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
                    // Header Bar with Prev / Next and Today Button
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.CalendarToday,
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

                        // Quick Controls: Prev Day, Today, Next Day
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            IconButton(
                                onClick = {
                                    val c = Calendar.getInstance()
                                    try {
                                        c.time = ymdFormat.parse(selectedDateStr) ?: Date()
                                    } catch (e: Exception) {}
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
                                    try {
                                        c.time = ymdFormat.parse(selectedDateStr) ?: Date()
                                    } catch (e: Exception) {}
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

                    // Horizontal Date Strip (Scrollable pills)
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

        // =========================================================================
        // DAILY SUMMARY CARDS
        // =========================================================================
        item {
            val deliveriesCount = timelineSummary?.totalDeliveries ?: 0
            val jarsCount = timelineSummary?.totalJars ?: 0
            val cashRupees = timelineSummary?.totalCashRupees ?: 0.0

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Card 1: Deliveries
                Surface(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(14.dp),
                    color = Color(0xFFF0FDF4),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFBBF7D0))
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(text = "DELIVERIES", fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF166534))
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(text = "$deliveriesCount", fontSize = 20.sp, fontWeight = FontWeight.Black, color = Color(0xFF14532D))
                    }
                }

                // Card 2: Jars Given
                Surface(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(14.dp),
                    color = Color(0xFFEFF6FF),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFBFDBFE))
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(text = "JARS GIVEN", fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF1E40AF))
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(text = "$jarsCount", fontSize = 20.sp, fontWeight = FontWeight.Black, color = Color(0xFF1E3A8A))
                    }
                }

                // Card 3: Cash Collected
                Surface(
                    modifier = Modifier.weight(1.2f),
                    shape = RoundedCornerShape(14.dp),
                    color = Color(0xFFFAF5FF),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE9D5FF))
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(text = "CASH RECORDED", fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF6B21A8))
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(text = String.format(Locale.US, "₹%.0f", cashRupees), fontSize = 18.sp, fontWeight = FontWeight.Black, color = Color(0xFF581C87))
                    }
                }
            }
        }

        // =========================================================================
        // TIMELINE EVENTS FEED
        // =========================================================================
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "TIME-WISE ACTIVITY FEED",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = WaterTextSecondary
                )
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = WaterCyanPrimary, strokeWidth = 2.dp)
                }
            }
        }

        if (isLoading && timelineSummary == null) {
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    CircularProgressIndicator(color = WaterCyanPrimary, modifier = Modifier.size(32.dp))
                    Spacer(modifier = Modifier.height(10.dp))
                    Text("Loading day timeline...", fontSize = 12.sp, color = WaterTextSecondary)
                }
            }
        } else if (timelineSummary == null || timelineSummary?.timeline.isNullOrEmpty()) {
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
                        Icon(
                            imageVector = Icons.Default.Schedule,
                            contentDescription = null,
                            tint = Color(0xFF94A3B8),
                            modifier = Modifier.size(36.dp)
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = "No Activity Recorded",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = WaterNavyDark
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Is din koi delivery ya cash handover record nahi hui hai.",
                            fontSize = 11.sp,
                            color = WaterTextSecondary,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = { loadTimeline(selectedDateStr) },
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = WaterCyanPrimary)
                        ) {
                            Icon(imageVector = Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Refresh", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        } else {
            val items = timelineSummary!!.timeline
            items(items, key = { it.id }) { event ->
                TimelineCard(event = event)
            }
        }

        item {
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

/**
 * Individual Activity Item Card in Timeline
 */
@Composable
fun TimelineCard(event: TimelineItem) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            // Header Row: Time Badge + Status
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // Time pill
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = WaterNavyDark
                    ) {
                        Text(
                            text = event.time.ifBlank { "Recorded" },
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    if (event.type == "CASH_HANDOVER") {
                        Surface(
                            shape = RoundedCornerShape(50),
                            color = Color(0xFFFEF3C7),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFDE68A))
                        ) {
                            Text(
                                text = "🏦 Vault Handover",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF92400E),
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    } else {
                        Surface(
                            shape = RoundedCornerShape(50),
                            color = Color(0xFFDCFCE7),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF86EFAC))
                        ) {
                            Text(
                                text = "Delivered",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF166534),
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }
                }

                // Right quantity / amount badge
                if (event.type != "CASH_HANDOVER") {
                    Surface(
                        shape = RoundedCornerShape(50),
                        color = Color(0xFFE0F2FE)
                    ) {
                        Text(
                            text = "${event.quantityJars} Jars (20L)",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF0369A1),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Body: Customer / Vault details
            Text(
                text = if (event.type == "CASH_HANDOVER") "Cash Handed Over to Plant Vault" else event.customerName,
                fontSize = 14.sp,
                fontWeight = FontWeight.Black,
                color = WaterNavyDark
            )

            if (event.customerCode.isNotBlank()) {
                Text(
                    text = "Customer Code: ${event.customerCode}",
                    fontSize = 10.sp,
                    color = Color(0xFF64748B)
                )
            }

            if (event.address.isNotBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(imageVector = Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(13.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = event.address,
                        fontSize = 11.sp,
                        color = WaterTextSecondary
                    )
                }
            }

            // Jar codes tags (if any)
            if (event.jarCodes.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                LazyRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(event.jarCodes) { code ->
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = Color(0xFFF1F5F9),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                        ) {
                            Text(
                                text = code,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = WaterNavyDark,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Footer: Bill & Cash Collected
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp),
                color = Color(0xFFF8FAFC)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 10.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (event.type == "CASH_HANDOVER") {
                        Text(
                            text = "Plant Vault A/C 1110",
                            fontSize = 11.sp,
                            color = WaterTextSecondary
                        )
                        Text(
                            text = String.format(Locale.US, "Deposited: ₹%.0f", event.cashCollectedRupees),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFFB45309)
                        )
                    } else {
                        Text(
                            text = String.format(Locale.US, "Bill: ₹%.0f", event.totalAmountRupees),
                            fontSize = 11.sp,
                            color = WaterTextSecondary
                        )
                        Text(
                            text = if (event.cashCollectedPaise > 0) String.format(Locale.US, "Cash Mila: ₹%.0f", event.cashCollectedRupees) else "Monthly Khata (₹0)",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Black,
                            color = if (event.cashCollectedPaise > 0) WaterEmeraldGreen else Color(0xFF0284C7)
                        )
                    }
                }
            }
        }
    }
}
