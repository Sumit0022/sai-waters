package com.example.saiwatersdriver.data

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.util.Log
import com.example.saiwatersdriver.model.PaymentMode
import com.example.saiwatersdriver.model.ResolvedCustomer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID

/**
 * Queued offline delivery model stored locally until pushed to ERP
 */
data class QueuedDelivery(
    val clientEventId: String,
    val customerId: String,
    val customerName: String,
    val customerCode: String,
    val jarCodes: List<String>,
    val emptyJarsCount: Int,
    val cashCollectedPaise: Long,
    val unitPricePaise: Long,
    val paymentMode: PaymentMode,
    val driverId: String,
    val timestamp: Long = System.currentTimeMillis(),
    var isSynced: Boolean = false,
    var syncError: String? = null
)

/**
 * OfflineSyncManager: Enterprise Offline-First Store & Forward Engine
 * 1. Caches customer directories locally for 0ms instant QR scan resolution
 * 2. Caches deliveries in persistent queue if offline or slow network
 * 3. Monitors network connectivity and auto-pushes queued operations to server
 */
class OfflineSyncManager(private val context: Context) {

    private val scope = CoroutineScope(Dispatchers.IO)
    private val customersFile = File(context.filesDir, "cached_customers.json")
    private val queueFile = File(context.filesDir, "offline_delivery_queue.json")

    // In-memory customer index for 0ms lookups
    private val customerCache = mutableMapOf<String, ResolvedCustomer>()

    // In-memory delivery queue
    private val deliveryQueue = mutableListOf<QueuedDelivery>()

    private val _pendingSyncCount = MutableStateFlow(0)
    val pendingSyncCount: StateFlow<Int> = _pendingSyncCount.asStateFlow()

    private val _isOnline = MutableStateFlow(false)
    val isOnline: StateFlow<Boolean> = _isOnline.asStateFlow()

    private var onAutoSyncCallback: (() -> Unit)? = null

    init {
        loadCustomersFromDisk()
        loadQueueFromDisk()
        setupNetworkMonitoring()
    }

    fun setAutoSyncCallback(callback: () -> Unit) {
        onAutoSyncCallback = callback
    }

    // =========================================================================
    // 1. CUSTOMER CACHE ENGINE (Instant 0ms QR Match)
    // =========================================================================

    private fun loadCustomersFromDisk() {
        try {
            if (!customersFile.exists()) return
            val text = customersFile.readText()
            if (text.isBlank()) return
            val arr = JSONArray(text)
            synchronized(customerCache) {
                customerCache.clear()
                for (i in 0 until arr.length()) {
                    val c = parseCustomerJson(arr.getJSONObject(i))
                    indexCustomer(c)
                }
            }
            Log.i("OfflineSyncManager", "Loaded ${customerCache.size} customer lookup indices from disk")
        } catch (e: Exception) {
            Log.e("OfflineSyncManager", "Failed loading customers cache", e)
        }
    }

    private fun indexCustomer(cust: ResolvedCustomer) {
        customerCache[cust.id.lowercase()] = cust
        customerCache[cust.customerCode.lowercase()] = cust
        customerCache[cust.customerCode.replace("-", "").lowercase()] = cust
        if (cust.phone.isNotBlank()) {
            customerCache[cust.phone.trim()] = cust
        }
        val cleanCode = cust.customerCode.replace("CUST-", "", ignoreCase = true).trim()
        if (cleanCode.isNotBlank()) {
            customerCache[cleanCode.lowercase()] = cust
            customerCache["cust-$cleanCode".lowercase()] = cust
        }
        customerCache["urn:sw:c:${cust.customerCode}".lowercase()] = cust
    }

    fun saveCustomers(customers: List<ResolvedCustomer>) {
        synchronized(customerCache) {
            val arr = JSONArray()
            for (c in customers) {
                indexCustomer(c)
                val obj = JSONObject().apply {
                    put("id", c.id)
                    put("customerCode", c.customerCode)
                    put("fullName", c.fullName)
                    put("phone", c.phone)
                    put("streetAddress", c.streetAddress)
                    put("locality", c.locality)
                    put("city", c.city)
                    put("ratePerJarPaise", c.ratePerJarPaise)
                    put("defaultQuantity", c.defaultQuantity)
                    put("billingCycle", c.billingCycle)
                }
                arr.put(obj)
            }
            try {
                customersFile.writeText(arr.toString())
            } catch (e: Exception) {
                Log.e("OfflineSyncManager", "Failed saving customers to disk", e)
            }
        }
    }

    /**
     * Resolves customer instantly from memory/disk in 0ms
     */
    fun findCachedCustomer(query: String): ResolvedCustomer? {
        val clean = query.trim().replace("urn:sw:c:", "", ignoreCase = true).lowercase()
        synchronized(customerCache) {
            // Direct match
            customerCache[clean]?.let { return it }

            // Partial code match (e.g. "001" or "CUST-001")
            for ((key, cust) in customerCache) {
                if (key.contains(clean) || clean.contains(key)) {
                    return cust
                }
            }
        }
        return null
    }

    /**
     * Create provisional fallback customer so driver is NEVER blocked at customer's doorstep
     */
    fun createProvisionalCustomer(query: String): ResolvedCustomer {
        val clean = query.trim().replace("urn:sw:c:", "", ignoreCase = true)
        val code = if (clean.uppercase().startsWith("CUST-")) clean.uppercase() else "CUST-$clean"
        return ResolvedCustomer(
            id = clean,
            customerCode = code,
            fullName = "Grahak $code",
            phone = "",
            streetAddress = "Bareilly",
            locality = "Civil Lines",
            city = "Bareilly",
            ratePerJarPaise = 2000L,
            defaultQuantity = 2,
            billingCycle = "DAILY_SPOT"
        )
    }

    private fun parseCustomerJson(o: JSONObject): ResolvedCustomer {
        return ResolvedCustomer(
            id = o.optString("id", ""),
            customerCode = o.optString("customerCode", ""),
            fullName = o.optString("fullName", "Customer"),
            phone = o.optString("phone", ""),
            streetAddress = o.optString("streetAddress", ""),
            locality = o.optString("locality", ""),
            city = o.optString("city", "Bareilly"),
            ratePerJarPaise = o.optLong("ratePerJarPaise", o.optLong("pricePerJarPaise", 2000L)),
            defaultQuantity = o.optInt("defaultQuantity", 2),
            billingCycle = o.optString("billingCycle", "DAILY_SPOT")
        )
    }

    // =========================================================================
    // 2. QUEUED DELIVERIES ENGINE (Persistent Outbox)
    // =========================================================================

    private fun loadQueueFromDisk() {
        try {
            if (!queueFile.exists()) return
            val text = queueFile.readText()
            if (text.isBlank()) return
            val arr = JSONArray(text)
            synchronized(deliveryQueue) {
                deliveryQueue.clear()
                for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    val jarCodesArr = o.optJSONArray("jarCodes") ?: JSONArray()
                    val jars = (0 until jarCodesArr.length()).map { jarCodesArr.getString(it) }
                    val modeStr = o.optString("paymentMode", "CASH")
                    val mode = try { PaymentMode.valueOf(modeStr) } catch (_: Exception) { PaymentMode.CASH }

                    deliveryQueue.add(
                        QueuedDelivery(
                            clientEventId = o.optString("clientEventId", UUID.randomUUID().toString()),
                            customerId = o.optString("customerId", ""),
                            customerName = o.optString("customerName", "Customer"),
                            customerCode = o.optString("customerCode", ""),
                            jarCodes = jars,
                            emptyJarsCount = o.optInt("emptyJarsCount", 0),
                            cashCollectedPaise = o.optLong("cashCollectedPaise", 0L),
                            unitPricePaise = o.optLong("unitPricePaise", 3500L),
                            paymentMode = mode,
                            driverId = o.optString("driverId", "usr_driver_01"),
                            timestamp = o.optLong("timestamp", System.currentTimeMillis()),
                            isSynced = o.optBoolean("isSynced", false),
                            syncError = if (o.has("syncError") && !o.isNull("syncError")) o.getString("syncError") else null
                        )
                    )
                }
            }
            updatePendingCount()
        } catch (e: Exception) {
            Log.e("OfflineSyncManager", "Failed loading delivery queue", e)
        }
    }

    private fun saveQueueToDisk() {
        synchronized(deliveryQueue) {
            try {
                val arr = JSONArray()
                for (d in deliveryQueue) {
                    val o = JSONObject().apply {
                        put("clientEventId", d.clientEventId)
                        put("customerId", d.customerId)
                        put("customerName", d.customerName)
                        put("customerCode", d.customerCode)
                        put("jarCodes", JSONArray(d.jarCodes))
                        put("emptyJarsCount", d.emptyJarsCount)
                        put("cashCollectedPaise", d.cashCollectedPaise)
                        put("unitPricePaise", d.unitPricePaise)
                        put("paymentMode", d.paymentMode.name)
                        put("driverId", d.driverId)
                        put("timestamp", d.timestamp)
                        put("isSynced", d.isSynced)
                        put("syncError", d.syncError)
                    }
                    arr.put(o)
                }
                queueFile.writeText(arr.toString())
            } catch (e: Exception) {
                Log.e("OfflineSyncManager", "Failed saving delivery queue to disk", e)
            }
        }
        updatePendingCount()
    }

    private fun updatePendingCount() {
        val count = deliveryQueue.count { !it.isSynced }
        _pendingSyncCount.value = count
    }

    fun enqueueDelivery(delivery: QueuedDelivery) {
        synchronized(deliveryQueue) {
            deliveryQueue.add(delivery)
        }
        saveQueueToDisk()
        Log.i("OfflineSyncManager", "Enqueued delivery for ${delivery.customerName}. Pending: ${_pendingSyncCount.value}")
    }

    fun getPendingDeliveries(): List<QueuedDelivery> {
        synchronized(deliveryQueue) {
            return deliveryQueue.filter { !it.isSynced }
        }
    }

    fun markSynced(clientEventId: String) {
        synchronized(deliveryQueue) {
            val item = deliveryQueue.find { it.clientEventId == clientEventId }
            if (item != null) {
                item.isSynced = true
                item.syncError = null
            }
        }
        saveQueueToDisk()
    }

    fun markSyncFailed(clientEventId: String, error: String) {
        synchronized(deliveryQueue) {
            val item = deliveryQueue.find { it.clientEventId == clientEventId }
            if (item != null) {
                item.syncError = error
            }
        }
        saveQueueToDisk()
    }

    // =========================================================================
    // 3. NETWORK CONNECTIVITY MONITOR & AUTO-SYNC
    // =========================================================================

    private fun setupNetworkMonitoring() {
        try {
            val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return
            val request = NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build()

            // Initial check
            val activeNetwork = cm.activeNetwork
            val capabilities = cm.getNetworkCapabilities(activeNetwork)
            val isInitiallyOnline = capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
            _isOnline.value = isInitiallyOnline

            cm.registerNetworkCallback(request, object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    _isOnline.value = true
                    Log.i("OfflineSyncManager", "Network connected! Triggering automatic background sync...")
                    scope.launch {
                        onAutoSyncCallback?.invoke()
                    }
                }

                override fun onLost(network: Network) {
                    _isOnline.value = false
                    Log.w("OfflineSyncManager", "Network disconnected. Working in offline mode.")
                }
            })
        } catch (e: Exception) {
            Log.e("OfflineSyncManager", "Failed setting up network callback", e)
        }
    }
}
