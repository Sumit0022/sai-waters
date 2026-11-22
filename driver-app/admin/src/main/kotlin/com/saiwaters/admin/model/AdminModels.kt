package com.saiwaters.admin.model

data class DashboardStats(
    val totalJars: Int = 0,
    val availableJars: Int = 0,
    val inTransitJars: Int = 0,
    val withCustomerJars: Int = 0,
    val returnedInspectJars: Int = 0,
    val underRepairJars: Int = 0,
    val missingOrLostJars: Int = 0,

    val todayTotalOrders: Int = 0,
    val todayDelivered: Int = 0,
    val todayDispatched: Int = 0,
    val todayPending: Int = 0,
    val todayTotalJarsScheduled: Int = 0,
    val todayTotalJarsDelivered: Int = 0,

    val vaultCashPaise: Long = 0L,
    val driverClearingPaise: Long = 0L,
    val bankBalancePaise: Long = 0L,
    val accountsReceivablePaise: Long = 0L,
    val jarAssetValuePaise: Long = 0L,
    val totalRevenuePaise: Long = 0L,
    val netProfitPaise: Long = 0L,
    val isTrialBalanceBalanced: Boolean = true,
    val pendingCashDrivers: Int = 0,
    val dueInvoicesCount: Int = 0,
    val totalDueAmountPaise: Long = 0L,

    val totalCustomers: Int = 0,
    val recurringCustomers: Int = 0,
    val bulkCustomers: Int = 0,
    val recentOrders: List<OrderItem> = emptyList()
)

data class CustomerItem(
    val id: String,
    val customerCode: String,
    val fullName: String,
    val phone: String,
    val deliveryAddress: String = "",
    val customerType: String = "RESIDENTIAL",
    val isActive: Boolean = true,
    val jarPricePaise: Long = 3500L,
    val dailyQuota: Int = 1,
    val deliveryFrequency: String = "DAILY",
    val paymentType: String = "MONTHLY_BILL",
    val heldJarsCount: Int = 0,
    val jarsInCustody: List<CustomerHeldJar> = emptyList()
)

data class CustomerHeldJar(
    val id: String,
    val jarCode: String,
    val qrToken: String,
    val status: String,
    val assignedAt: String = ""
)

data class MonthlyLedgerEntry(
    val date: String,
    val orderNumber: String,
    val deliveredJars: Int,
    val emptyReturned: Int,
    val amountPaise: Long,
    val paymentMode: String,
    val paymentStatus: String
)

data class JarItem(
    val id: String,
    val jarCode: String,
    val qrToken: String,
    val status: String,
    val currentHolderType: String = "",
    val currentHolderId: String = "",
    val currentHolderName: String = "",
    val lifecycleAgeMonths: Int = 1,
    val netBookValuePaise: Long = 38333L,
    val originalCostPaise: Long = 40000L,
    val totalTripCycles: Int = 0,
    val isDamaged: Boolean = false
)

data class OrderItem(
    val id: String,
    val orderNumber: String,
    val orderType: String = "RECURRING",
    val scheduledDate: String = "",
    val quantityJars: Int = 1,
    val unitPricePaise: Long = 3500L,
    val totalAmountPaise: Long = 3500L,
    val status: String = "CONFIRMED",
    val customerName: String = "",
    val customerPhone: String = "",
    val customerCode: String = "",
    val assignedDriverName: String = "",
    val deliveryNotes: String = ""
)

data class CashSubmission(
    val id: String,
    val driverId: String,
    val driverName: String,
    val orderNumber: String = "",
    val customerName: String = "",
    val customerCode: String = "",
    val amountCollectedPaise: Long = 0L,
    val collectedAt: String = "",
    val collectionDateIST: String = "",
    val collectionTimeIST: String = "",
    val isHandedOver: Boolean = false,
    val handoverId: String = ""
)

data class DriverHandoverSummary(
    val driverId: String,
    val driverName: String,
    val pendingCount: Int,
    val totalUnclearedPaise: Long
)

data class TrialBalanceItem(
    val accountId: Int,
    val accountCode: String,
    val accountName: String,
    val accountType: String,
    val normalBalance: String,
    val debitPaise: Long,
    val creditPaise: Long,
    val netDebitPaise: Long,
    val netCreditPaise: Long
)

data class TrialBalanceSummary(
    val totalDebitsPaise: Long = 0L,
    val totalCreditsPaise: Long = 0L,
    val variancePaise: Long = 0L,
    val isBalanced: Boolean = true,
    val balances: List<TrialBalanceItem> = emptyList()
)

data class ProfitAndLossSummary(
    val totalRevenuePaise: Long = 0L,
    val totalCostPaise: Long = 0L,
    val totalExpensePaise: Long = 0L,
    val netProfitPaise: Long = 0L,
    val asOfDate: String = ""
)

data class InvoiceItem(
    val id: String,
    val invoiceNumber: String,
    val customerId: String,
    val customerName: String,
    val customerPhone: String = "",
    val customerCode: String = "",
    val invoiceDate: String = "",
    val dueDate: String = "",
    val subtotalPaise: Long = 0L,
    val taxPaise: Long = 0L,
    val totalAmountPaise: Long = 0L,
    val paidAmountPaise: Long = 0L,
    val status: String = "ISSUED", // ISSUED, PAID, PARTIAL
    val billingType: String = "MONTHLY_STATEMENT",
    val orderQuantityJars: Int = 0
)

data class JournalLineItem(
    val id: String,
    val accountCode: String,
    val accountName: String,
    val accountType: String,
    val debitPaise: Long,
    val creditPaise: Long
)

data class JournalEntryItem(
    val id: String,
    val entryNumber: String,
    val entryDate: String,
    val sourceDocumentType: String,
    val narration: String,
    val isPosted: Boolean,
    val postedBy: String,
    val lines: List<JournalLineItem> = emptyList()
)

data class BackupItem(
    val id: String,
    val filename: String,
    val timestamp: String = "",
    val sizeBytes: Long = 0L,
    val isLocal: Boolean = false,
    val localFilePath: String = ""
)
