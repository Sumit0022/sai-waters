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
    val notes: String = ""
) {
    val totalAmountRupees: Double get() = totalAmountPaise / 100.0
    val netDueRupees: Double get() = netDuePaise / 100.0
    val paymentCollectedRupees: Double get() = paymentCollectedPaise / 100.0
    val isFullyDelivered: Boolean get() = status == DeliveryStatus.DELIVERED
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
