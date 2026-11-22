package com.saiwaters.admin.data

import android.content.Context
import com.saiwaters.admin.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class AdminRepository(private val context: Context) {
    private val sessionManager = AdminSessionManager.getInstance(context)

    private fun getBaseUrl(): String = sessionManager.backendUrl

    suspend fun login(user: String, pass: String): Result<Boolean> = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("username", user.trim())
            put("password", pass.trim())
        }
        val url = "${getBaseUrl()}/api/auth/login"
        val res = AdminApiClient.postJson(url, payload.toString())
        res.fold(
            onSuccess = { responseText ->
                try {
                    val json = JSONObject(responseText)
                    if (json.optBoolean("success", false)) {
                        val userObj = json.optJSONObject("user")
                        val username = userObj?.optString("username", user) ?: user
                        val fullName = userObj?.optString("fullName", "Sai (Owner)") ?: "Sai (Owner)"
                        sessionManager.saveLogin(username, fullName)
                        Result.success(true)
                    } else {
                        Result.failure(Exception(json.optString("error", "Invalid credentials")))
                    }
                } catch (e: Exception) {
                    Result.failure(e)
                }
            },
            onFailure = { Result.failure(it) }
        )
    }

    suspend fun fetchDashboardStats(): Result<DashboardStats> = withContext(Dispatchers.IO) {
        val url = "${getBaseUrl()}/api/dashboard/stats"
        val res = AdminApiClient.get(url)
        res.fold(
            onSuccess = { responseText ->
                try {
                    val root = JSONObject(responseText)
                    val jarsObj = root.optJSONObject("jars") ?: JSONObject()
                    val logObj = root.optJSONObject("logistics") ?: JSONObject()
                    val finObj = root.optJSONObject("financials") ?: JSONObject()
                    val crmObj = root.optJSONObject("crm") ?: JSONObject()

                    val recentOrdersArray = logObj.optJSONArray("recentOrders") ?: JSONArray()
                    val recentOrders = mutableListOf<OrderItem>()
                    for (i in 0 until recentOrdersArray.length()) {
                        val o = recentOrdersArray.getJSONObject(i)
                        recentOrders.add(
                            OrderItem(
                                id = o.optString("id"),
                                orderNumber = o.optString("orderNumber"),
                                orderType = o.optString("orderType", "RECURRING"),
                                scheduledDate = o.optString("scheduledDate"),
                                quantityJars = o.optInt("quantityJars", 1),
                                unitPricePaise = o.optLong("unitPricePaise", 3500L),
                                totalAmountPaise = o.optLong("totalAmountPaise", 3500L),
                                status = o.optString("status", "CONFIRMED"),
                                customerName = o.optString("customerName", "Customer"),
                                customerPhone = o.optString("customerPhone", ""),
                                customerCode = o.optString("customerCode", "")
                            )
                        )
                    }

                    val stats = DashboardStats(
                        totalJars = jarsObj.optInt("total", 0),
                        availableJars = jarsObj.optInt("available", 0),
                        inTransitJars = jarsObj.optInt("inTransit", 0),
                        withCustomerJars = jarsObj.optInt("withCustomer", 0),
                        returnedInspectJars = jarsObj.optInt("returnedInspect", 0),
                        underRepairJars = jarsObj.optInt("underRepair", 0),
                        missingOrLostJars = jarsObj.optInt("missingOrLost", 0),

                        todayTotalOrders = logObj.optInt("todayTotalOrders", 0),
                        todayDelivered = logObj.optInt("todayDelivered", 0),
                        todayDispatched = logObj.optInt("todayDispatched", 0),
                        todayPending = logObj.optInt("todayPending", 0),
                        todayTotalJarsScheduled = logObj.optInt("todayTotalJarsScheduled", 0),
                        todayTotalJarsDelivered = logObj.optInt("todayTotalJarsDelivered", 0),

                        vaultCashPaise = finObj.optLong("vaultCashPaise", 0L),
                        driverClearingPaise = finObj.optLong("driverClearingPaise", 0L),
                        bankBalancePaise = finObj.optLong("bankBalancePaise", 0L),
                        accountsReceivablePaise = finObj.optLong("accountsReceivablePaise", 0L),
                        jarAssetValuePaise = finObj.optLong("jarAssetValuePaise", 0L),
                        totalRevenuePaise = finObj.optLong("totalRevenuePaise", 0L),
                        netProfitPaise = finObj.optLong("netProfitPaise", 0L),
                        isTrialBalanceBalanced = finObj.optBoolean("isTrialBalanceBalanced", true),
                        pendingCashDrivers = finObj.optInt("pendingCashDrivers", 0),
                        dueInvoicesCount = finObj.optInt("dueInvoicesCount", 0),
                        totalDueAmountPaise = finObj.optLong("totalDueAmountPaise", 0L),

                        totalCustomers = crmObj.optInt("totalCustomers", 0),
                        recurringCustomers = crmObj.optInt("recurringCustomers", 0),
                        bulkCustomers = crmObj.optInt("bulkCustomers", 0),
                        recentOrders = recentOrders
                    )
                    Result.success(stats)
                } catch (e: Exception) {
                    Result.failure(e)
                }
            },
            onFailure = { Result.failure(it) }
        )
    }

    suspend fun fetchCustomers(query: String = ""): Result<List<CustomerItem>> = withContext(Dispatchers.IO) {
        val url = "${getBaseUrl()}/api/customers"
        val res = AdminApiClient.get(url)
        res.fold(
            onSuccess = { responseText ->
                try {
                    val root = JSONObject(responseText)
                    val array = root.optJSONArray("customers") ?: JSONArray()
                    val list = mutableListOf<CustomerItem>()
                    for (i in 0 until array.length()) {
                        val c = array.getJSONObject(i)
                        val name = c.optString("fullName", "")
                        val code = c.optString("customerCode", "")
                        val phone = c.optString("phone", "")

                        if (query.isNotBlank() &&
                            !name.contains(query, ignoreCase = true) &&
                            !code.contains(query, ignoreCase = true) &&
                            !phone.contains(query, ignoreCase = true)
                        ) {
                            continue
                        }

                        val jarsArr = c.optJSONArray("jarsInCustody") ?: JSONArray()
                        val custodyJars = mutableListOf<CustomerHeldJar>()
                        for (j in 0 until jarsArr.length()) {
                            val jObj = jarsArr.getJSONObject(j)
                            custodyJars.add(
                                CustomerHeldJar(
                                    id = jObj.optString("id"),
                                    jarCode = jObj.optString("jarCode"),
                                    qrToken = jObj.optString("qrToken"),
                                    status = jObj.optString("status", "DELIVERED_CUSTOMER"),
                                    assignedAt = jObj.optString("assignedAt", "")
                                )
                            )
                        }

                        list.add(
                            CustomerItem(
                                id = c.optString("id"),
                                customerCode = code,
                                fullName = name,
                                phone = phone,
                                deliveryAddress = c.optString("deliveryAddress", ""),
                                customerType = c.optString("customerType", "RESIDENTIAL"),
                                isActive = c.optBoolean("isActive", true),
                                jarPricePaise = c.optLong("jarPricePaise", 3500L),
                                dailyQuota = c.optInt("dailyQuota", 1),
                                deliveryFrequency = c.optString("deliveryFrequency", "DAILY"),
                                paymentType = c.optString("paymentType", "MONTHLY_BILL"),
                                heldJarsCount = c.optInt("heldJarsCount", custodyJars.size),
                                jarsInCustody = custodyJars
                            )
                        )
                    }
                    Result.success(list)
                } catch (e: Exception) {
                    Result.failure(e)
                }
            },
            onFailure = { Result.failure(it) }
        )
    }

    suspend fun saveCustomer(
        fullName: String,
        phone: String,
        address: String,
        dailyQuota: Int,
        jarPricePaise: Long,
        paymentType: String = "MONTHLY_BILL"
    ): Result<Boolean> = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("fullName", fullName.trim())
            put("phone", phone.trim())
            put("address", address.trim())
            put("dailyQuota", dailyQuota)
            put("jarPricePaise", jarPricePaise)
            put("customerType", "RESIDENTIAL")
            put("deliveryFrequency", "DAILY")
            put("paymentType", paymentType)
        }
        val url = "${getBaseUrl()}/api/customers"
        val res = AdminApiClient.postJson(url, payload.toString())
        res.fold(
            onSuccess = { Result.success(true) },
            onFailure = { Result.failure(it) }
        )
    }

    suspend fun fetchJars(statusFilter: String = "ALL", query: String = ""): Result<List<JarItem>> = withContext(Dispatchers.IO) {
        val url = "${getBaseUrl()}/api/jars"
        val res = AdminApiClient.get(url)
        res.fold(
            onSuccess = { responseText ->
                try {
                    val root = JSONObject(responseText)
                    val array = root.optJSONArray("jars") ?: JSONArray()
                    val list = mutableListOf<JarItem>()
                    for (i in 0 until array.length()) {
                        val j = array.getJSONObject(i)
                        val code = j.optString("jarCode", "")
                        val qr = j.optString("qrToken", "")
                        val status = j.optString("currentStatus", "AVAILABLE")
                        val holderName = j.optString("currentHolderName", "")

                        if (statusFilter != "ALL" && !status.equals(statusFilter, ignoreCase = true)) {
                            continue
                        }
                        if (query.isNotBlank() &&
                            !code.contains(query, ignoreCase = true) &&
                            !qr.contains(query, ignoreCase = true) &&
                            !holderName.contains(query, ignoreCase = true)
                        ) {
                            continue
                        }

                        list.add(
                            JarItem(
                                id = j.optString("id"),
                                jarCode = code,
                                qrToken = qr,
                                status = status,
                                currentHolderType = j.optString("currentHolderType", ""),
                                currentHolderId = j.optString("currentHolderId", ""),
                                currentHolderName = holderName,
                                lifecycleAgeMonths = j.optInt("lifecycleAgeMonths", 1),
                                netBookValuePaise = j.optLong("netBookValuePaise", 38333L),
                                originalCostPaise = j.optLong("originalCostPaise", 40000L),
                                totalTripCycles = j.optInt("totalTripCycles", 0),
                                isDamaged = j.optBoolean("isDamaged", false)
                            )
                        )
                    }
                    Result.success(list)
                } catch (e: Exception) {
                    Result.failure(e)
                }
            },
            onFailure = { Result.failure(it) }
        )
    }

    suspend fun addJarBatch(count: Int): Result<Boolean> = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("action", "BATCH_ADD")
            put("count", count)
            put("costPaise", 40000L)
        }
        val url = "${getBaseUrl()}/api/jars"
        val res = AdminApiClient.postJson(url, payload.toString())
        res.fold(
            onSuccess = { Result.success(true) },
            onFailure = { Result.failure(it) }
        )
    }

    suspend fun relabelJar(jarId: String, newQrToken: String): Result<Boolean> = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("jarId", jarId)
            put("newQrToken", newQrToken.trim())
        }
        val url = "${getBaseUrl()}/api/jars/relabel"
        val res = AdminApiClient.postJson(url, payload.toString())
        res.fold(
            onSuccess = { Result.success(true) },
            onFailure = { Result.failure(it) }
        )
    }

    suspend fun reportJarLoss(jarId: String, notes: String): Result<Boolean> = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("jarId", jarId)
            put("notes", notes.trim())
        }
        val url = "${getBaseUrl()}/api/jars/loss"
        val res = AdminApiClient.postJson(url, payload.toString())
        res.fold(
            onSuccess = { Result.success(true) },
            onFailure = { Result.failure(it) }
        )
    }

    suspend fun fetchCashData(): Result<Pair<List<CashSubmission>, List<DriverHandoverSummary>>> = withContext(Dispatchers.IO) {
        val url = "${getBaseUrl()}/api/cash"
        val res = AdminApiClient.get(url)
        res.fold(
            onSuccess = { responseText ->
                try {
                    val root = JSONObject(responseText)
                    val subsArr = root.optJSONArray("allSubmissions") ?: root.optJSONArray("submissions") ?: JSONArray()
                    val subs = mutableListOf<CashSubmission>()
                    for (i in 0 until subsArr.length()) {
                        val s = subsArr.getJSONObject(i)
                        subs.add(
                            CashSubmission(
                                id = s.optString("id"),
                                driverId = s.optString("driverId"),
                                driverName = s.optString("driverName", "Driver"),
                                orderNumber = s.optString("orderNumber", ""),
                                customerName = s.optString("customerName", "Customer"),
                                customerCode = s.optString("customerCode", ""),
                                amountCollectedPaise = s.optLong("amountCollectedPaise", 0L),
                                collectedAt = s.optString("collectedAt", ""),
                                collectionDateIST = s.optString("collectionDateIST", ""),
                                collectionTimeIST = s.optString("collectionTimeIST", ""),
                                isHandedOver = s.optBoolean("isHandedOver", false),
                                handoverId = s.optString("handoverId", "")
                            )
                        )
                    }

                    val pendArr = root.optJSONArray("pendingByDriver") ?: JSONArray()
                    val handovers = mutableListOf<DriverHandoverSummary>()
                    for (i in 0 until pendArr.length()) {
                        val p = pendArr.getJSONObject(i)
                        handovers.add(
                            DriverHandoverSummary(
                                driverId = p.optString("driverId"),
                                driverName = p.optString("driverName", "Driver"),
                                pendingCount = p.optInt("pendingCount", 0),
                                totalUnclearedPaise = p.optLong("totalUnclearedPaise", 0L)
                            )
                        )
                    }

                    Result.success(Pair(subs, handovers))
                } catch (e: Exception) {
                    Result.failure(e)
                }
            },
            onFailure = { Result.failure(it) }
        )
    }

    suspend fun verifyVaultHandover(
        driverId: String,
        declaredPaise: Long,
        verifiedPaise: Long,
        notes: String = "Physical cash handover accepted at plant vault"
    ): Result<Boolean> = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("action", "HANDOVER")
            put("driverId", driverId)
            put("totalDeclaredPaise", declaredPaise)
            put("totalVerifiedPaise", verifiedPaise)
            put("targetAccountId", 1110) // Plant Cash Vault
            put("notes", notes)
        }
        val url = "${getBaseUrl()}/api/cash"
        val res = AdminApiClient.postJson(url, payload.toString())
        res.fold(
            onSuccess = { Result.success(true) },
            onFailure = { Result.failure(it) }
        )
    }

    suspend fun fetchTrialBalance(): Result<TrialBalanceSummary> = withContext(Dispatchers.IO) {
        val url = "${getBaseUrl()}/api/accounting/trial-balance"
        val res = AdminApiClient.get(url)
        res.fold(
            onSuccess = { responseText ->
                try {
                    val root = JSONObject(responseText)
                    val tb = root.optJSONObject("trialBalance") ?: root
                    val balArr = tb.optJSONArray("balances") ?: JSONArray()
                    val balances = mutableListOf<TrialBalanceItem>()
                    for (i in 0 until balArr.length()) {
                        val b = balArr.getJSONObject(i)
                        balances.add(
                            TrialBalanceItem(
                                accountId = b.optInt("id"),
                                accountCode = b.optString("code"),
                                accountName = b.optString("name"),
                                accountType = b.optString("type"),
                                normalBalance = b.optString("normalBalance"),
                                debitPaise = b.optLong("debitPaise", 0L),
                                creditPaise = b.optLong("creditPaise", 0L),
                                netDebitPaise = b.optLong("netDebitPaise", 0L),
                                netCreditPaise = b.optLong("netCreditPaise", 0L)
                            )
                        )
                    }

                    val summary = TrialBalanceSummary(
                        totalDebitsPaise = tb.optLong("totalDebitsPaise", 0L),
                        totalCreditsPaise = tb.optLong("totalCreditsPaise", 0L),
                        variancePaise = tb.optLong("variancePaise", 0L),
                        isBalanced = tb.optBoolean("isBalanced", true),
                        balances = balances
                    )
                    Result.success(summary)
                } catch (e: Exception) {
                    Result.failure(e)
                }
            },
            onFailure = { Result.failure(it) }
        )
    }

    suspend fun fetchProfitAndLoss(): Result<ProfitAndLossSummary> = withContext(Dispatchers.IO) {
        val url = "${getBaseUrl()}/api/accounting/financial-statements"
        val res = AdminApiClient.get(url)
        res.fold(
            onSuccess = { responseText ->
                try {
                    val root = JSONObject(responseText)
                    val pnl = root.optJSONObject("pnl") ?: JSONObject()
                    val summary = ProfitAndLossSummary(
                        totalRevenuePaise = pnl.optLong("totalRevenuePaise", 0L),
                        totalCostPaise = pnl.optLong("totalCostPaise", 0L),
                        totalExpensePaise = pnl.optLong("totalExpensePaise", 0L),
                        netProfitPaise = pnl.optLong("netProfitPaise", 0L),
                        asOfDate = root.optString("asOfDate", "")
                    )
                    Result.success(summary)
                } catch (e: Exception) {
                    Result.failure(e)
                }
            },
            onFailure = { Result.failure(it) }
        )
    }

    suspend fun triggerBackupSnapshot(): Result<Pair<String, String>> = withContext(Dispatchers.IO) {
        val url = "${getBaseUrl()}/api/backup"
        val res = AdminApiClient.postJson(url, "{}")
        res.fold(
            onSuccess = { responseText ->
                try {
                    val root = JSONObject(responseText)
                    val backupObj = root.optJSONObject("backup") ?: JSONObject()
                    val filename = backupObj.optString("filename", "sai_waters_backup.json")
                    val rawData = root.optJSONObject("backupData")?.toString() ?: responseText
                    Result.success(Pair(filename, rawData))
                } catch (e: Exception) {
                    Result.failure(e)
                }
            },
            onFailure = { Result.failure(it) }
        )
    }

    suspend fun restoreBackup(jsonData: String): Result<Boolean> = withContext(Dispatchers.IO) {
        val url = "${getBaseUrl()}/api/backup/restore"
        val payload = JSONObject().apply {
            put("backupData", JSONObject(jsonData))
        }
        val res = AdminApiClient.postJson(url, payload.toString())
        res.fold(
            onSuccess = { Result.success(true) },
            onFailure = { Result.failure(it) }
        )
    }
}
