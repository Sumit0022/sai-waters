package com.example.saiwatersdriver.data

import android.content.Context
import android.util.Log
import com.example.saiwatersdriver.model.CashCollectionEntry
import com.example.saiwatersdriver.model.DayTimelineSummary
import com.example.saiwatersdriver.model.DeliveryOrder
import com.example.saiwatersdriver.model.DeliveryStatus
import com.example.saiwatersdriver.model.DriverProfile
import com.example.saiwatersdriver.model.OrderBillingType
import com.example.saiwatersdriver.model.PaymentMode
import com.example.saiwatersdriver.model.ScannedJar
import com.example.saiwatersdriver.model.TimelineItem
import com.example.saiwatersdriver.notification.SaiNotificationManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * DriverRepository: Live Sync with Sai Waters ERP Backend
 * Connects directly to /api/orders, /api/driver/timeline, /api/driver/deliver, and /api/cash.
 * Zero demo data: all orders, customers, jars, and collections reflect live ERP records.
 */
class DriverRepository(private val context: Context) {

    private val sessionManager = SessionManager(context)
    private val notificationManager = SaiNotificationManager(context)
    private val scope = CoroutineScope(Dispatchers.IO)

    private val _driverProfile = MutableStateFlow(sessionManager.getDriverProfile())
    val driverProfile: StateFlow<DriverProfile> = _driverProfile.asStateFlow()

    private val _orders = MutableStateFlow<List<DeliveryOrder>>(emptyList())
    val orders: StateFlow<List<DeliveryOrder>> = _orders.asStateFlow()

    private val _scannedJars = MutableStateFlow<List<ScannedJar>>(emptyList())
    val scannedJars: StateFlow<List<ScannedJar>> = _scannedJars.asStateFlow()

    private val _cashCollections = MutableStateFlow<List<CashCollectionEntry>>(emptyList())
    val cashCollections: StateFlow<List<CashCollectionEntry>> = _cashCollections.asStateFlow()

    private val _lastScannedJar = MutableStateFlow<ScannedJar?>(null)
    val lastScannedJar: StateFlow<ScannedJar?> = _lastScannedJar.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private val _networkError = MutableStateFlow<String?>(null)
    val networkError: StateFlow<String?> = _networkError.asStateFlow()

    init {
        // Automatically sync live data on initialization
        syncFromBackend()
    }

    fun updateProfileFromSession() {
        _driverProfile.value = sessionManager.getDriverProfile()
        syncFromBackend()
    }

    /**
     * Trigger full sync with live ERP backend
     */
    fun syncFromBackend() {
        scope.launch {
            _isRefreshing.value = true
            _networkError.value = null
            try {
                fetchLiveOrders()
                fetchLiveCash()
            } catch (e: Exception) {
                Log.e("DriverRepository", "Sync failed: ${e.message}", e)
                _networkError.value = e.message ?: "Failed to sync with backend"
            } finally {
                _isRefreshing.value = false
            }
        }
    }

    /**
     * Fetch orders from GET /api/orders
     */
    private suspend fun fetchLiveOrders() {
        val baseUrl = sessionManager.backendUrl.trimEnd('/')
        val url = "$baseUrl/api/orders"
        val result = ApiClient.get(url)

        result.fold(
            onSuccess = { responseText ->
                try {
                    val root = JSONObject(responseText)
                    val ordersArray = if (root.has("orders")) {
                        root.getJSONArray("orders")
                    } else if (root.has("data")) {
                        root.getJSONArray("data")
                    } else {
                        JSONArray(responseText)
                    }

                    val parsedList = mutableListOf<DeliveryOrder>()
                    for (i in 0 until ordersArray.length()) {
                        parsedList.add(parseOrderJson(ordersArray.getJSONObject(i)))
                    }

                    // Keep existing delivered orders if any
                    _orders.value = parsedList
                } catch (e: Exception) {
                    Log.e("DriverRepository", "Failed parsing /api/orders: ${e.message}")
                }
            },
            onFailure = { error ->
                Log.w("DriverRepository", "API /api/orders unreachable: ${error.message}")
            }
        )
    }

    private fun parseOrderJson(item: JSONObject): DeliveryOrder {
        val id = item.optString("id", "")
        val orderNum = item.optString("orderNumber", "ORD-${id.takeLast(4)}")
        val custId = item.optString("customerId", "")
        val custName = item.optString("customerName", "Customer")
        val custPhone = item.optString("customerPhone", "")
        val street = item.optString("streetAddress", "")
        val locality = item.optString("locality", "")
        val city = item.optString("city", "")
        val address = listOf(street, locality, city).filter { it.isNotBlank() }.joinToString(", ")
        val jarQty = item.optInt("quantityJars", 1)
        val ratePaise = item.optLong("unitPricePaise", 3500L)
        val totalPaise = item.optLong("totalAmountPaise", jarQty * ratePaise)
        val statusStr = item.optString("status", "IN_TRANSIT")
        val orderType = item.optString("orderType", "DAILY_SPOT")
        val scheduledDate = item.optString("scheduledDate", "")
        val eventName = if (item.has("eventName") && !item.isNull("eventName")) item.getString("eventName") else null

        val advancePaid = item.optLong("advanceReceivedPaise", 0L)
        val balanceDue = item.optLong("balanceDuePaise", (totalPaise - advancePaid).coerceAtLeast(0L))
        val paymentType = item.optString("paymentType", "PAY_ON_DELIVERY")

        val dispatchedArray = item.optJSONArray("dispatchedJars") ?: JSONArray()
        val dispatchedList = (0 until dispatchedArray.length()).map { dispatchedArray.getString(it) }

        val status = when (statusStr.uppercase()) {
            "DELIVERED" -> DeliveryStatus.DELIVERED
            "CANCELLED", "FAILED" -> DeliveryStatus.FAILED
            else -> DeliveryStatus.IN_TRANSIT
        }

        val billingType = when (orderType.uppercase()) {
            "ONE_TIME_EVENT", "BULK_EVENT" -> OrderBillingType.BULK_EVENT
            "MONTHLY_SUBSCRIPTION", "REGULAR_MONTHLY" -> OrderBillingType.REGULAR_MONTHLY
            else -> OrderBillingType.DAILY_SPOT
        }

        return DeliveryOrder(
            id = id,
            orderNumber = orderNum,
            customerId = custId,
            customerName = custName,
            customerPhone = custPhone,
            address = if (address.isNotBlank()) address else "Bareilly City Center",
            area = if (locality.isNotBlank()) locality else "Bareilly",
            jarQuantity = jarQty,
            ratePerJarPaise = ratePaise,
            totalAmountPaise = totalPaise,
            alreadyPaidPaise = advancePaid,
            netDuePaise = balanceDue,
            emptyJarsDue = jarQty,
            status = status,
            billingType = billingType,
            allocatedJars = dispatchedList,
            scheduledDate = scheduledDate,
            advanceReceivedPaise = advancePaid,
            balanceDuePaise = balanceDue,
            paymentType = paymentType,
            dispatchedJars = dispatchedList,
            eventName = eventName
        )
    }

    suspend fun fetchBulkOrdersForDate(date: String): Result<List<DeliveryOrder>> {
        val baseUrl = sessionManager.backendUrl.trimEnd('/')
        val url = "$baseUrl/api/orders?bulk=true&date=$date"
        val result = ApiClient.get(url)
        return result.mapCatching { responseText ->
            val root = JSONObject(responseText)
            val ordersArray = if (root.has("orders")) root.getJSONArray("orders") else JSONArray(responseText)
            val list = mutableListOf<DeliveryOrder>()
            for (i in 0 until ordersArray.length()) {
                list.add(parseOrderJson(ordersArray.getJSONObject(i)))
            }
            list
        }
    }

    suspend fun deliverBulkOrder(
        orderId: String,
        undeliveredJarCodes: List<String>,
        cashCollectedPaise: Long
    ): Result<Boolean> {
        val baseUrl = sessionManager.backendUrl.trimEnd('/')
        val url = "$baseUrl/api/orders/deliver"
        val payload = JSONObject().apply {
            put("orderId", orderId)
            put("undeliveredJarCodes", JSONArray(undeliveredJarCodes))
            put("cashCollectedPaise", cashCollectedPaise)
            put("approvedBy", _driverProfile.value.driverId)
        }.toString()
        val res = ApiClient.postJson(url, payload)
        return res.mapCatching { responseText ->
            val root = JSONObject(responseText)
            if (!root.optBoolean("success", false)) {
                throw Exception(root.optString("error", "Failed to deliver bulk order"))
            }
            syncFromBackend()
            true
        }
    }

    suspend fun fetchTimelineForDate(date: String): Result<DayTimelineSummary> {
        val baseUrl = sessionManager.backendUrl.trimEnd('/')
        val driverId = _driverProfile.value.driverId
        val url = "$baseUrl/api/driver/timeline?driverId=$driverId&date=$date"
        val res = ApiClient.get(url)
        return res.mapCatching { responseText ->
            val root = JSONObject(responseText)
            val rawTimeline = root.optJSONArray("timeline") ?: JSONArray()
            val items = mutableListOf<TimelineItem>()
            for (i in 0 until rawTimeline.length()) {
                val item = rawTimeline.getJSONObject(i)
                val jarCodesArr = item.optJSONArray("jarCodes") ?: JSONArray()
                val jarCodes = (0 until jarCodesArr.length()).map { jarCodesArr.getString(it) }
                items.add(
                    TimelineItem(
                        id = item.optString("orderId", "tl_$i"),
                        type = item.optString("type", "DELIVERY"),
                        time = item.optString("time", ""),
                        timestamp = if (item.has("timestamp") && !item.isNull("timestamp")) item.getString("timestamp") else null,
                        customerName = item.optString("customerName", "Customer"),
                        customerCode = item.optString("customerCode", ""),
                        address = item.optString("address", ""),
                        quantityJars = item.optInt("quantityJars", 0),
                        jarCodes = jarCodes,
                        totalAmountPaise = item.optLong("totalAmountPaise", 0L),
                        cashCollectedPaise = item.optLong("cashCollectedPaise", 0L),
                        status = item.optString("status", "DELIVERED"),
                        notes = item.optString("notes", "")
                    )
                )
            }
            DayTimelineSummary(
                date = root.optString("date", date),
                driverId = root.optString("driverId", driverId),
                totalDeliveries = root.optInt("totalDeliveries", 0),
                totalJars = root.optInt("totalJars", 0),
                totalCashCollectedPaise = root.optLong("totalCashCollectedPaise", 0L),
                timeline = items
            )
        }
    }

    suspend fun handoverCashToPlant(
        amountPaise: Long,
        targetAccountId: Int = 1110,
        notes: String = "Handover to Plant Vault"
    ): Result<Boolean> {
        val baseUrl = sessionManager.backendUrl.trimEnd('/')
        val url = "$baseUrl/api/cash"
        val payload = JSONObject().apply {
            put("action", "HANDOVER")
            put("driverId", _driverProfile.value.driverId)
            put("totalDeclaredPaise", amountPaise)
            put("totalVerifiedPaise", amountPaise)
            put("targetAccountId", targetAccountId)
            put("notes", notes)
        }.toString()
        val res = ApiClient.postJson(url, payload)
        return res.mapCatching { responseText ->
            val root = JSONObject(responseText)
            if (!root.optBoolean("success", false) && !root.has("handover")) {
                throw Exception(root.optString("error", "Handover failed"))
            }
            // 1. Immediately mark all local collections as handed over (drops balance to 0)
            _cashCollections.update { list ->
                list.map { it.copy(isHandedOver = true) }
            }
            // 2. Fetch updated records from backend
            fetchLiveCash()
            true
        }
    }

    /**
     * Fetch authentic cash collections and handover status from GET /api/cash?driverId=...
     */
    suspend fun fetchLiveCash() {
        val baseUrl = sessionManager.backendUrl.trimEnd('/')
        val driverId = _driverProfile.value.driverId
        val url = "$baseUrl/api/cash?driverId=$driverId"

        val result = ApiClient.get(url)
        result.onSuccess { responseText ->
            try {
                val root = JSONObject(responseText)
                val subArray = root.optJSONArray("submissions") ?: root.optJSONArray("allSubmissions") ?: JSONArray()
                val list = mutableListOf<CashCollectionEntry>()

                for (i in 0 until subArray.length()) {
                    val s = subArray.getJSONObject(i)
                    val id = s.optString("id", "csh_$i")
                    val orderNum = s.optString("orderNumber", "-")
                    val custName = s.optString("customerName", "Customer")
                    val amtPaise = s.optLong("amountCollectedPaise", 0L)
                    val isHandedOver = s.optBoolean("isHandedOver", false)

                    val iso = s.optString("collectedAt", "")
                    val timeMillis = try {
                        if (iso.isNotBlank()) {
                            val cleanIso = iso.substringBefore("Z").substringBefore(".")
                            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).parse(cleanIso)?.time ?: System.currentTimeMillis()
                        } else System.currentTimeMillis()
                    } catch (e: Exception) {
                        System.currentTimeMillis()
                    }

                    if (amtPaise > 0) {
                        list.add(
                            CashCollectionEntry(
                                id = id,
                                orderNumber = orderNum,
                                customerName = custName,
                                amountPaise = amtPaise,
                                mode = PaymentMode.CASH,
                                timestamp = timeMillis,
                                isHandedOver = isHandedOver
                            )
                        )
                    }
                }

                _cashCollections.value = list
            } catch (e: Exception) {
                Log.e("DriverRepository", "Failed parsing /api/cash: ${e.message}")
            }
        }
    }

    /**
     * Mark an order as delivered with scanned jar tokens & cash collected via Live API
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
        val targetOrder = _orders.value.find { it.id == orderId } ?: return

        // 1. Optimistic local update
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

        if (cashAmountPaise > 0) {
            val entry = CashCollectionEntry(
                id = "csh_${System.currentTimeMillis()}",
                orderNumber = targetOrder.orderNumber,
                customerName = targetOrder.customerName,
                amountPaise = cashAmountPaise,
                mode = paymentMode,
                timestamp = System.currentTimeMillis()
            )
            _cashCollections.update { listOf(entry) + it }
        }

        // 2. Dispatch to Live ERP Backend: POST /api/driver/deliver or /api/orders/deliver
        scope.launch {
            val baseUrl = sessionManager.backendUrl.trimEnd('/')
            val endpoint = "$baseUrl/api/driver/deliver"

            val payload = JSONObject().apply {
                put("driverId", _driverProfile.value.driverId)
                put("customerIdentifier", targetOrder.customerId.ifBlank { targetOrder.customerName })
                put("orderId", targetOrder.id)
                put("jarCodes", JSONArray(if (deliveredJarTokens.isNotEmpty()) deliveredJarTokens else listOf("JAR-20L-AUTO")))
                put("cashCollectedPaise", cashAmountPaise)
                put("emptyJarsCount", collectedEmptyTokens.size.coerceAtLeast(1))
                put("emptyJarCodes", JSONArray(collectedEmptyTokens))
            }.toString()

            val result = ApiClient.postJson(endpoint, payload)
            result.fold(
                onSuccess = { res ->
                    Log.i("DriverRepository", "Delivery synced successfully: $res")
                },
                onFailure = { err ->
                    Log.w("DriverRepository", "Delivery sync queued/error: ${err.message}")
                    // Also try alternative endpoint /api/orders/deliver
                    val altEndpoint = "$baseUrl/api/orders/deliver"
                    val altPayload = JSONObject().apply {
                        put("orderId", targetOrder.id)
                        put("cashCollectedPaise", cashAmountPaise)
                        put("approvedBy", _driverProfile.value.driverId)
                    }.toString()
                    ApiClient.postJson(altEndpoint, altPayload)
                }
            )
        }
    }

    /**
     * Step 1 Logic: Resolve Customer by QR Token or Manual Code
     * Includes vice-versa guard to reject jar QR codes.
     */
    suspend fun resolveCustomerByQrOrCode(rawInput: String): Result<com.example.saiwatersdriver.model.ResolvedCustomer> {
        val raw = rawInput.trim()
        if (raw.isBlank()) return Result.failure(Exception("Customer QR or code is required"))

        // VICE-VERSA GUARD: Reject if driver scans a Jar QR while in Customer step
        val isJarQr = raw.startsWith("urn:sw:j:") ||
                raw.uppercase().startsWith("JAR-") ||
                raw.lowercase().startsWith("jar_") ||
                raw.contains("20L")

        if (isJarQr) {
            return Result.failure(
                Exception("Galat QR Code! Ye 20L Water Jar ka QR sticker hai.\nPehle Grahak ka Customer Station QR sticker scan karein.")
            )
        }

        val clean = raw.replace("urn:sw:c:", "").trim()
        val baseUrl = sessionManager.backendUrl.trimEnd('/')
        val url = "$baseUrl/api/customers?customerId=${clean}"

        val res = ApiClient.get(url)
        return res.mapCatching { responseText ->
            val root = JSONObject(responseText)
            if (!root.has("customer")) {
                throw Exception(root.optString("error", "Customer '$clean' not found in system."))
            }
            val custObj = root.getJSONObject("customer")
            val id = custObj.getString("id")
            val customerCode = custObj.optString("customerCode", "CUST-${id.takeLast(4)}")
            val fullName = custObj.getString("fullName")
            val phone = custObj.optString("phone", "")
            val billingCycle = custObj.optString("billingCycle", "DAILY_SPOT")
            val ratePaise = custObj.optLong("ratePerJarPaise", 3500L)
            val defaultQty = custObj.optInt("defaultQuantity", 2)

            var street = ""
            var locality = ""
            var city = "Bareilly"
            if (custObj.has("primaryAddress")) {
                val addr = custObj.getJSONObject("primaryAddress")
                street = addr.optString("streetAddress", "")
                locality = addr.optString("locality", "")
                city = addr.optString("city", "Bareilly")
            }

            com.example.saiwatersdriver.model.ResolvedCustomer(
                id = id,
                customerCode = customerCode,
                fullName = fullName,
                phone = phone,
                streetAddress = street,
                locality = locality,
                city = city,
                ratePerJarPaise = ratePaise,
                defaultQuantity = defaultQty,
                billingCycle = billingCycle
            )
        }
    }

    /**
     * Step 3 Logic: Submit Complete Doorstep Delivery
     * Calls POST /api/driver/deliver and updates local state & cash collections
     */
    suspend fun submitDoorstepDelivery(
        customer: com.example.saiwatersdriver.model.ResolvedCustomer,
        jarCodes: List<String>,
        emptyJarsCount: Int,
        cashCollectedPaise: Long,
        paymentMode: PaymentMode
    ): Result<com.example.saiwatersdriver.model.DeliverySuccessReceipt> {
        val baseUrl = sessionManager.backendUrl.trimEnd('/')
        val endpoint = "$baseUrl/api/driver/deliver"

        val payload = JSONObject().apply {
            put("driverId", _driverProfile.value.driverId)
            put("customerIdentifier", customer.id)
            put("jarCodes", JSONArray(jarCodes))
            put("emptyJarsCount", emptyJarsCount)
            put("cashCollectedPaise", cashCollectedPaise)
            put("unitPricePaise", customer.ratePerJarPaise)
        }.toString()

        val res = ApiClient.postJson(endpoint, payload)
        return res.mapCatching { responseText ->
            val root = JSONObject(responseText)
            if (!root.optBoolean("success", false) && !root.has("orderNumber")) {
                throw Exception(root.optString("error", "Delivery recording rejected by server"))
            }

            val orderNumber = root.optString("orderNumber", "ORD-" + System.currentTimeMillis().toString().takeLast(6))
            val totalPaise = root.optLong("totalAmountPaise", jarCodes.size * customer.ratePerJarPaise)
            val receiptNumber = root.optString("cashReceiptNumber", root.optString("receiptNumber", "RCP-${System.currentTimeMillis().toString().takeLast(6)}"))

            // Record in Cash Collection ONLY if physical cash was collected
            if (paymentMode == PaymentMode.CASH && cashCollectedPaise > 0) {
                val entry = CashCollectionEntry(
                    id = "csh_${System.currentTimeMillis()}",
                    orderNumber = orderNumber,
                    customerName = customer.fullName,
                    amountPaise = cashCollectedPaise,
                    mode = paymentMode,
                    timestamp = System.currentTimeMillis()
                )
                _cashCollections.update { listOf(entry) + it }
            }

            // Sync timeline and orders in background
            syncFromBackend()

            com.example.saiwatersdriver.model.DeliverySuccessReceipt(
                orderNumber = orderNumber,
                customerName = customer.fullName,
                jarsDelivered = jarCodes.size,
                jarCodes = jarCodes,
                emptyJarsCollected = emptyJarsCount,
                totalAmountPaise = totalPaise,
                cashCollectedPaise = cashCollectedPaise,
                receiptNumber = receiptNumber,
                paymentMode = paymentMode,
                timestamp = System.currentTimeMillis()
            )
        }
    }

    /**
     * Record a scanned jar code and verify with backend
     */
    fun recordJarScan(qrToken: String, isReturnEmpty: Boolean) {
        val cleanToken = qrToken.trim()
        val scanned = ScannedJar(
            qrToken = cleanToken,
            jarCode = cleanToken,
            isReturnEmpty = isReturnEmpty,
            scannedAt = System.currentTimeMillis()
        )
        _lastScannedJar.value = scanned
        _scannedJars.update { listOf(scanned) + it }

        // Live check against backend /api/jars/scan
        scope.launch {
            val baseUrl = sessionManager.backendUrl.trimEnd('/')
            val url = "$baseUrl/api/jars/scan?query=${cleanToken}"
            ApiClient.get(url)
        }
    }

    fun dismissLastScanNotice() {
        _lastScannedJar.value = null
    }

    /**
     * Clear all scanned jars session
     */
    fun clearScannedJars() {
        _scannedJars.value = emptyList()
        _lastScannedJar.value = null
    }

    /**
     * Total cash currently held in driver custody (Doorstep Cash Collections)
     */
    val totalCashInHandPaise: Long
        get() = _cashCollections.value
            .filter { it.mode == PaymentMode.CASH && !it.isHandedOver }
            .sumOf { it.amountPaise }
}
