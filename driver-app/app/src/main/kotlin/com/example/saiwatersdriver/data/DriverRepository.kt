package com.example.saiwatersdriver.data

import android.content.Context
import com.example.saiwatersdriver.model.CashCollectionEntry
import com.example.saiwatersdriver.model.DeliveryOrder
import com.example.saiwatersdriver.model.DeliveryStatus
import com.example.saiwatersdriver.model.DriverProfile
import com.example.saiwatersdriver.model.OrderBillingType
import com.example.saiwatersdriver.model.PaymentMode
import com.example.saiwatersdriver.model.ScannedJar
import com.example.saiwatersdriver.notification.SaiNotificationManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * In-memory & reactive repository powering the driver application.
 * Mirrors the Sai Waters ERP backend schema and double-entry driver clearing rules.
 */
class DriverRepository(private val context: Context) {

    private val notificationManager = SaiNotificationManager(context)

    private val _driverProfile = MutableStateFlow(
        DriverProfile(
            driverId = "drv_ramesh",
            fullName = "Ramesh Kumar",
            phone = "+91 98765 43210",
            vehicleNumber = "UP-25-AT-4821",
            vehicleType = "Mahindra Bolero Maxi Truck (40 Jars Load)",
            activeTripId = "TRIP-2026-1121",
            isOnDuty = true
        )
    )
    val driverProfile: StateFlow<DriverProfile> = _driverProfile.asStateFlow()

    private val _orders = MutableStateFlow<List<DeliveryOrder>>(initialOrders())
    val orders: StateFlow<List<DeliveryOrder>> = _orders.asStateFlow()

    private val _scannedJars = MutableStateFlow<List<ScannedJar>>(emptyList())
    val scannedJars: StateFlow<List<ScannedJar>> = _scannedJars.asStateFlow()

    private val _cashCollections = MutableStateFlow<List<CashCollectionEntry>>(initialCashEntries())
    val cashCollections: StateFlow<List<CashCollectionEntry>> = _cashCollections.asStateFlow()

    private val _lastScannedJar = MutableStateFlow<ScannedJar?>(null)
    val lastScannedJar: StateFlow<ScannedJar?> = _lastScannedJar.asStateFlow()

    /**
     * Mark an order as delivered with scanned jar tokens & cash collected
     */
    fun completeDelivery(
        orderId: String,
        deliveredJarTokens: List<String>,
        collectedEmptyTokens: List<String>,
        cashAmountPaise: Long,
        paymentMode: PaymentMode,
        notes: String = ""
    ) {
        val nowFormatted = SimpleDateFormat("dd MMM, hh:mm a", Locale.getDefault()).format(Date())

        _orders.update { currentList ->
            currentList.map { order ->
                if (order.id == orderId) {
                    val newPaid = order.alreadyPaidPaise + cashAmountPaise
                    val newDue = (order.totalAmountPaise - newPaid).coerceAtLeast(0L)

                    order.copy(
                        status = DeliveryStatus.DELIVERED,
                        deliveredJars = (order.deliveredJars + deliveredJarTokens).distinct(),
                        collectedEmptyJars = (order.collectedEmptyJars + collectedEmptyTokens).distinct(),
                        paymentCollectedPaise = cashAmountPaise,
                        alreadyPaidPaise = newPaid,
                        netDuePaise = newDue,
                        paymentMode = paymentMode,
                        deliveredAt = nowFormatted,
                        notes = notes
                    )
                } else order
            }
        }

        // Record Cash in Driver Clearing Account (1120) if cash received
        if (cashAmountPaise > 0) {
            val matchingOrder = _orders.value.find { it.id == orderId }
            val entry = CashCollectionEntry(
                id = "csh_${System.currentTimeMillis()}",
                orderNumber = matchingOrder?.orderNumber ?: "ORD-REC",
                customerName = matchingOrder?.customerName ?: "Customer",
                amountPaise = cashAmountPaise,
                mode = paymentMode,
                timestamp = System.currentTimeMillis()
            )
            _cashCollections.update { listOf(entry) + it }
        }
    }

    /**
     * Record a scanned 20L Water Jar
     */
    fun recordJarScan(qrToken: String, isReturnEmpty: Boolean): ScannedJar {
        // Resolve Jar Code from QR (e.g. "qr_tok_4a8b1c" -> "JAR-2026-0042")
        val jarCode = if (qrToken.startsWith("JAR-")) {
            qrToken
        } else {
            "JAR-${qrToken.takeLast(4).uppercase()}"
        }

        val scan = ScannedJar(
            qrToken = qrToken,
            jarCode = jarCode,
            isReturnEmpty = isReturnEmpty,
            scannedAt = System.currentTimeMillis()
        )

        _scannedJars.update { listOf(scan) + it }
        _lastScannedJar.value = scan
        return scan
    }

    /**
     * Clear last scanned jar notice
     */
    fun clearLastScanNotice() {
        _lastScannedJar.value = null
    }

    /**
     * Simulates admin allotting a brand new delivery task to the driver
     * Fires the custom high-priority notification with sound & vibration!
     */
    fun simulateNewTaskAllotment() {
        val nextIndex = _orders.value.size + 1
        val newOrderNo = "ORD-2026-${String.format(Locale.US, "%04d", nextIndex * 15)}"
        val names = listOf(
            "Verma Medical Center",
            "Anand Bhavan Sweets",
            "Blue Sapphire Banquet",
            "Dr. Saxena Dental Clinic",
            "Priya Sharma Residence"
        )
        val areas = listOf("Civil Lines", "Rampur Garden", "Station Road", "Subhash Nagar", "Model Town")
        val chosenName = names[nextIndex % names.size]
        val chosenArea = areas[nextIndex % areas.size]
        val jarCount = if (nextIndex % 3 == 0) 5 else 2
        val totalPaise = jarCount * 3500L

        val newOrder = DeliveryOrder(
            id = "ord_live_${System.currentTimeMillis()}",
            orderNumber = newOrderNo,
            customerId = "cust_${nextIndex}",
            customerName = chosenName,
            customerPhone = "+91 98370 ${10000 + nextIndex * 47}",
            address = "Shop #${12 + nextIndex}, Near Central Bank",
            area = chosenArea,
            jarQuantity = jarCount,
            ratePerJarPaise = 3500L,
            totalAmountPaise = totalPaise,
            alreadyPaidPaise = 0L,
            netDuePaise = totalPaise,
            emptyJarsDue = jarCount,
            status = DeliveryStatus.IN_TRANSIT,
            billingType = if (jarCount > 4) OrderBillingType.BULK_EVENT else OrderBillingType.DAILY_SPOT,
            allocatedJars = (1..jarCount).map { "JAR-2026-${String.format(Locale.US, "%04d", 100 + it)}" }
        )

        _orders.update { listOf(newOrder) + it }

        // Trigger the Custom Notification with Heads-Up Alert!
        notificationManager.notifyNewOrderAllotted(newOrder)
    }

    /**
     * Total cash currently held in driver custody (Doorstep Cash Collections)
     */
    val totalCashInHandPaise: Long
        get() = _cashCollections.value
            .filter { it.mode == PaymentMode.CASH && !it.isHandedOver }
            .sumOf { it.amountPaise }

    /**
     * Initial seeded deliveries matching Sai Waters customer profiles
     */
    private fun initialOrders(): List<DeliveryOrder> {
        return listOf(
            DeliveryOrder(
                id = "ord_001",
                orderNumber = "ORD-2026-0038",
                customerId = "cust_verma",
                customerName = "Verma Diagnostics & Clinic",
                customerPhone = "+91 98371 44520",
                address = "Plot 14-B, Near Ayub Khan Chauraha",
                area = "Civil Lines",
                jarQuantity = 2,
                ratePerJarPaise = 3500L,
                totalAmountPaise = 7000L,
                alreadyPaidPaise = 0L,
                netDuePaise = 7000L,
                emptyJarsDue = 2,
                status = DeliveryStatus.IN_TRANSIT,
                billingType = OrderBillingType.DAILY_SPOT,
                allocatedJars = listOf("JAR-2026-0012", "JAR-2026-0013")
            ),
            DeliveryOrder(
                id = "ord_002",
                orderNumber = "ORD-2026-0039",
                customerId = "cust_gupta",
                customerName = "Gupta Ji Provision Store",
                customerPhone = "+91 97580 91823",
                address = "Shop 4, Gandhi Stadium Market",
                area = "Rampur Garden",
                jarQuantity = 3,
                ratePerJarPaise = 3500L,
                totalAmountPaise = 10500L,
                alreadyPaidPaise = 0L,
                netDuePaise = 10500L,
                emptyJarsDue = 3,
                status = DeliveryStatus.IN_TRANSIT,
                billingType = OrderBillingType.DAILY_SPOT,
                allocatedJars = listOf("JAR-2026-0014", "JAR-2026-0015", "JAR-2026-0016")
            ),
            DeliveryOrder(
                id = "ord_003",
                orderNumber = "ORD-2026-0040",
                customerId = "cust_royal",
                customerName = "Hotel Royal Palace (Banquet Hall)",
                customerPhone = "+91 99270 33119",
                address = "Badaun Road Bypass, Near Railway Crossing",
                area = "Subhash Nagar",
                jarQuantity = 10,
                ratePerJarPaise = 3000L,
                totalAmountPaise = 30000L,
                alreadyPaidPaise = 15000L,
                netDuePaise = 15000L,
                emptyJarsDue = 10,
                status = DeliveryStatus.IN_TRANSIT,
                billingType = OrderBillingType.BULK_EVENT,
                allocatedJars = (1..10).map { "JAR-2026-${String.format(Locale.US, "%04d", 20 + it)}" }
            ),
            DeliveryOrder(
                id = "ord_004",
                orderNumber = "ORD-2026-0035",
                customerId = "cust_sharma",
                customerName = "Sunil Sharma Residence",
                customerPhone = "+91 94122 55890",
                address = "House 102, Sector 3, Avas Vikas Colony",
                area = "Rajendra Nagar",
                jarQuantity = 1,
                ratePerJarPaise = 3500L,
                totalAmountPaise = 3500L,
                alreadyPaidPaise = 3500L,
                netDuePaise = 0L,
                emptyJarsDue = 1,
                status = DeliveryStatus.DELIVERED,
                billingType = OrderBillingType.REGULAR_MONTHLY,
                allocatedJars = listOf("JAR-2026-0005"),
                deliveredJars = listOf("JAR-2026-0005"),
                collectedEmptyJars = listOf("JAR-2026-0002"),
                deliveredAt = "10:15 AM",
                paymentCollectedPaise = 3500L,
                paymentMode = PaymentMode.CASH
            )
        )
    }

    private fun initialCashEntries(): List<CashCollectionEntry> {
        return listOf(
            CashCollectionEntry(
                id = "csh_init_01",
                orderNumber = "ORD-2026-0035",
                customerName = "Sunil Sharma Residence",
                amountPaise = 3500L,
                mode = PaymentMode.CASH,
                timestamp = System.currentTimeMillis() - 7200000L
            )
        )
    }
}
