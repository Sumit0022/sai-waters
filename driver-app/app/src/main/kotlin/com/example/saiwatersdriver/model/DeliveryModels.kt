package com.example.saiwatersdriver.model

import kotlinx.serialization.Serializable

/**
 * Delivery status lifecycle following Sai Waters ERP finite-state machine
 */
enum class DeliveryStatus {
    ASSIGNED,
    IN_TRANSIT,
    DELIVERED,
    FAILED
}

/**
 * Customer billing type
 */
enum class OrderBillingType {
    REGULAR_MONTHLY,
    DAILY_SPOT,
    BULK_EVENT
}

/**
 * Mode of doorstep payment collection
 */
enum class PaymentMode {
    CASH,
    UPI_QR,
    MONTHLY_CREDIT
}

/**
 * Individual water delivery order assigned to driver
 */
@Serializable
data class DeliveryOrder(
    val id: String,
    val orderNumber: String,
    val customerId: String,
    val customerName: String,
    val customerPhone: String,
    val address: String,
    val area: String,
    val jarQuantity: Int,
    val ratePerJarPaise: Long = 3500L,
    val totalAmountPaise: Long = 7000L,
    val alreadyPaidPaise: Long = 0L,
    val netDuePaise: Long = 7000L,
    val emptyJarsDue: Int = 2,
    val status: DeliveryStatus = DeliveryStatus.IN_TRANSIT,
    val billingType: OrderBillingType = OrderBillingType.DAILY_SPOT,
    val allocatedJars: List<String> = emptyList(),
    val deliveredJars: List<String> = emptyList(),
    val collectedEmptyJars: List<String> = emptyList(),
    val paymentCollectedPaise: Long = 0L,
    val paymentMode: PaymentMode = PaymentMode.CASH,
    val deliveredAt: String? = null,
    val notes: String = "",
    val scheduledDate: String = "",
    val advanceReceivedPaise: Long = 0L,
    val balanceDuePaise: Long = 0L,
    val paymentType: String = "PAY_ON_DELIVERY",
    val dispatchedJars: List<String> = emptyList(),
    val eventName: String? = null
) {
    val totalAmountRupees: Double get() = totalAmountPaise / 100.0
    val netDueRupees: Double get() = netDuePaise / 100.0
    val paymentCollectedRupees: Double get() = paymentCollectedPaise / 100.0
    val isFullyDelivered: Boolean get() = status == DeliveryStatus.DELIVERED
}

/**
 * Resolved Customer details from Station QR scan
 */
@Serializable
data class ResolvedCustomer(
    val id: String,
    val customerCode: String,
    val fullName: String,
    val phone: String = "",
    val streetAddress: String = "",
    val locality: String = "",
    val city: String = "Bareilly",
    val ratePerJarPaise: Long = 2000L,
    val defaultQuantity: Int = 2,
    val billingCycle: String = "DAILY_SPOT"
) {
    val ratePerJarRupees: Double get() = ratePerJarPaise / 100.0
    val fullAddress: String get() = listOf(streetAddress, locality, city).filter { it.isNotBlank() }.joinToString(", ").ifEmpty { "Bareilly" }
}

/**
 * Delivery confirmation receipt after completing transaction
 */
@Serializable
data class DeliverySuccessReceipt(
    val orderNumber: String,
    val customerName: String,
    val jarsDelivered: Int,
    val jarCodes: List<String>,
    val emptyJarsCollected: Int,
    val totalAmountPaise: Long,
    val cashCollectedPaise: Long,
    val receiptNumber: String? = null,
    val paymentMode: PaymentMode = PaymentMode.CASH,
    val timestamp: Long = System.currentTimeMillis()
) {
    val totalAmountRupees: Double get() = totalAmountPaise / 100.0
    val cashCollectedRupees: Double get() = cashCollectedPaise / 100.0
}

/**
 * Result of scanning a 20L Water Jar barcode/QR
 */
@Serializable
data class ScannedJar(
    val qrToken: String,
    val jarCode: String,
    val isReturnEmpty: Boolean = false,
    val scannedAt: Long = System.currentTimeMillis()
)

/**
 * Driver Active Shift & Session
 */
@Serializable
data class DriverProfile(
    val driverId: String = "drv_001",
    val fullName: String = "Ramesh Kumar",
    val phone: String = "+91 98765 12345",
    val vehicleNumber: String = "UP-25-AT-4821",
    val vehicleType: String = "Mahindra Bolero Maxi Truck (40 Jars Capacity)",
    val activeTripId: String = "TRIP-2026-1108",
    val isOnDuty: Boolean = true
)

/**
 * Daily Driver Cash Collection summary (Account 1120 Driver Clearing)
 */
@Serializable
data class CashCollectionEntry(
    val id: String,
    val orderNumber: String,
    val customerName: String,
    val amountPaise: Long,
    val mode: PaymentMode,
    val timestamp: Long = System.currentTimeMillis(),
    val isHandedOver: Boolean = false
) {
    val amountRupees: Double get() = amountPaise / 100.0
}

/**
 * Real-time Dispatch Task Notification for Push Alert
 */
@Serializable
data class DispatchNotification(
    val id: String,
    val title: String,
    val message: String,
    val orderId: String,
    val timestamp: Long = System.currentTimeMillis(),
    val isRead: Boolean = false
)

/**
 * Individual Activity in Daily Timeline
 */
@Serializable
data class TimelineItem(
    val id: String = "",
    val type: String = "DELIVERY", // "DELIVERY" or "CASH_HANDOVER"
    val time: String = "",
    val timestamp: String? = null,
    val customerName: String = "",
    val customerCode: String = "",
    val address: String = "",
    val quantityJars: Int = 0,
    val jarCodes: List<String> = emptyList(),
    val totalAmountPaise: Long = 0L,
    val cashCollectedPaise: Long = 0L,
    val status: String = "DELIVERED",
    val notes: String = ""
) {
    val totalAmountRupees: Double get() = totalAmountPaise / 100.0
    val cashCollectedRupees: Double get() = cashCollectedPaise / 100.0
}

/**
 * Full Day Timeline Summary from GET /api/driver/timeline
 */
@Serializable
data class DayTimelineSummary(
    val date: String = "",
    val driverId: String = "",
    val totalDeliveries: Int = 0,
    val totalJars: Int = 0,
    val totalCashCollectedPaise: Long = 0L,
    val timeline: List<TimelineItem> = emptyList()
) {
    val totalCashRupees: Double get() = totalCashCollectedPaise / 100.0
}
