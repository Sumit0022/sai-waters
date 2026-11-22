package com.saiwaters.admin.data

import android.content.Context
import com.saiwaters.admin.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

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

                        // Parse price accurately: pricePerJarPaise or customPrice
                        val pricePaise = if (c.has("pricePerJarPaise")) {
                            c.optLong("pricePerJarPaise", 3500L)
                        } else {
                            c.optJSONObject("customPrice")?.optLong("pricePerJarPaise", 3500L) ?: 3500L
                        }

                        // Parse custody jars accurately: custodyJars or jarsInCustody
                        val jarsArr = c.optJSONArray("custodyJars") ?: c.optJSONArray("jarsInCustody") ?: JSONArray()
                        val custodyJars = mutableListOf<CustomerHeldJar>()
                        for (j in 0 until jarsArr.length()) {
                            val jObj = jarsArr.getJSONObject(j)
                            val jarCode = if (jObj.has("permanentJarCode")) {
                                jObj.optString("permanentJarCode")
                            } else {
                                jObj.optString("jarCode", "JAR-20L")
                            }
                            custodyJars.add(
                                CustomerHeldJar(
                                    id = jObj.optString("jarId", jObj.optString("id")),
                                    jarCode = jarCode,
                                    qrToken = jObj.optString("qrToken", ""),
                                    status = jObj.optString("status", "DELIVERED_CUSTOMER"),
                                    assignedAt = jObj.optString("transferredAt", jObj.optString("assignedAt", ""))
                                )
                            )
                        }

                        val effectiveHeldCount = c.optInt("heldJarsCount", custodyJars.size)

                        // Address parsing
                        var addressStr = c.optString("deliveryAddress", "")
                        if (addressStr.isBlank() && c.has("address")) {
                            val addrObj = c.optJSONObject("address")
                            if (addrObj != null) {
                                val line1 = addrObj.optString("line1", "")
                                val city = addrObj.optString("city", "")
                                addressStr = "$line1, $city".trim().removePrefix(",").trim()
                            }
                        }

                        // Schedule parsing
                        val schedObj = c.optJSONObject("schedule")
                        val dailyQuota = schedObj?.optInt("dailyQuotaJars", c.optInt("dailyQuota", 1)) ?: c.optInt("dailyQuota", 1)
                        val freq = schedObj?.optString("deliveryFrequency", c.optString("deliveryFrequency", "DAILY")) ?: "DAILY"
                        val payType = schedObj?.optString("paymentPreference", c.optString("paymentType", "MONTHLY_BILL")) ?: "MONTHLY_BILL"

                        list.add(
                            CustomerItem(
                                id = c.optString("id"),
                                customerCode = code,
                                fullName = name,
                                phone = phone,
                                deliveryAddress = addressStr,
                                customerType = c.optString("customerType", "RESIDENTIAL"),
                                isActive = c.optBoolean("isActive", true),
                                jarPricePaise = pricePaise,
                                dailyQuota = dailyQuota,
                                deliveryFrequency = freq,
                                paymentType = payType,
                                heldJarsCount = effectiveHeldCount,
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
                        val code = if (j.has("permanentJarCode")) j.optString("permanentJarCode") else j.optString("jarCode", "")
                        val qr = j.optString("qrToken", "")
                        val status = j.optString("currentStatus", "AVAILABLE")
                        val holderName = if (j.has("customerName") && j.optString("customerName").isNotBlank()) {
                            "${j.optString("customerName")} (${j.optString("customerCode", "")})".trim()
                        } else {
                            j.optString("currentHolderName", "")
                        }

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

                        val lifecycleObj = j.optJSONObject("lifecycle")
                        val netVal = lifecycleObj?.optLong("netBookValuePaise") ?: j.optLong("netBookValuePaise", 38333L)
                        val elapsed = lifecycleObj?.optInt("elapsedMonths") ?: j.optInt("lifecycleAgeMonths", 1)

                        list.add(
                            JarItem(
                                id = j.optString("id"),
                                jarCode = code,
                                qrToken = qr,
                                status = status,
                                currentHolderType = j.optString("custodyType", j.optString("currentHolderType", "")),
                                currentHolderId = j.optString("currentHolderId", ""),
                                currentHolderName = holderName,
                                lifecycleAgeMonths = elapsed,
                                netBookValuePaise = netVal,
                                originalCostPaise = j.optLong("acquisitionCostPaise", 40000L),
                                totalTripCycles = j.optInt("totalUsageCycles", 0),
                                isDamaged = status == "DAMAGED" || status == "CONFIRMED_LOST"
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
            put("quantity", count)
            put("acquisitionCostPaise", 18000L)
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

    suspend fun fetchInvoices(customerId: String? = null): Result<List<InvoiceItem>> = withContext(Dispatchers.IO) {
        val queryParam = if (!customerId.isNullOrBlank()) "?customerId=$customerId" else ""
        val url = "${getBaseUrl()}/api/invoices$queryParam"
        val res = AdminApiClient.get(url)
        res.fold(
            onSuccess = { responseText ->
                try {
                    val root = JSONObject(responseText)
                    val array = root.optJSONArray("invoices") ?: JSONArray()
                    val list = mutableListOf<InvoiceItem>()
                    for (i in 0 until array.length()) {
                        val inv = array.getJSONObject(i)
                        list.add(
                            InvoiceItem(
                                id = inv.optString("id"),
                                invoiceNumber = inv.optString("invoiceNumber"),
                                customerId = inv.optString("customerId"),
                                customerName = inv.optString("customerName", "Customer"),
                                customerPhone = inv.optString("customerPhone", ""),
                                customerCode = inv.optString("customerCode", ""),
                                invoiceDate = inv.optString("invoiceDate", ""),
                                dueDate = inv.optString("dueDate", ""),
                                subtotalPaise = inv.optLong("subtotalPaise", 0L),
                                taxPaise = inv.optLong("taxPaise", 0L),
                                totalAmountPaise = inv.optLong("totalAmountPaise", 0L),
                                paidAmountPaise = inv.optLong("paidAmountPaise", 0L),
                                status = inv.optString("status", "ISSUED"),
                                billingType = inv.optString("billingType", "MONTHLY_STATEMENT"),
                                orderQuantityJars = inv.optInt("orderQuantityJars", 0)
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

    suspend fun settleInvoice(invoiceId: String, amountPaise: Long, paymentMode: String = "CASH"): Result<Boolean> = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("invoiceId", invoiceId)
            put("amountPaise", amountPaise)
            put("paymentMode", paymentMode)
            put("settledBy", "usr_owner_01")
        }
        val url = "${getBaseUrl()}/api/invoices/settle"
        val res = AdminApiClient.postJson(url, payload.toString())
        res.fold(
            onSuccess = { Result.success(true) },
            onFailure = { Result.failure(it) }
        )
    }

    suspend fun triggerMonthlyBatchBilling(): Result<Boolean> = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("action", "GENERATE_ALL")
        }
        val url = "${getBaseUrl()}/api/invoices/monthly-batch"
        val res = AdminApiClient.postJson(url, payload.toString())
        res.fold(
            onSuccess = { Result.success(true) },
            onFailure = { Result.failure(it) }
        )
    }

    suspend fun fetchJournalEntries(): Result<List<JournalEntryItem>> = withContext(Dispatchers.IO) {
        val url = "${getBaseUrl()}/api/accounting/journal-entries"
        val res = AdminApiClient.get(url)
        res.fold(
            onSuccess = { responseText ->
                try {
                    val root = JSONObject(responseText)
                    val array = root.optJSONArray("entries") ?: JSONArray()
                    val list = mutableListOf<JournalEntryItem>()
                    for (i in 0 until array.length()) {
                        val e = array.getJSONObject(i)
                        val linesArr = e.optJSONArray("lines") ?: JSONArray()
                        val lines = mutableListOf<JournalLineItem>()
                        for (j in 0 until linesArr.length()) {
                            val l = linesArr.getJSONObject(j)
                            lines.add(
                                JournalLineItem(
                                    id = l.optString("id"),
                                    accountCode = l.optString("accountCode"),
                                    accountName = l.optString("accountName"),
                                    accountType = l.optString("accountType"),
                                    debitPaise = l.optLong("debitPaise", 0L),
                                    creditPaise = l.optLong("creditPaise", 0L)
                                )
                            )
                        }

                        list.add(
                            JournalEntryItem(
                                id = e.optString("id"),
                                entryNumber = e.optString("entryNumber"),
                                entryDate = e.optString("entryDate"),
                                sourceDocumentType = e.optString("sourceDocumentType"),
                                narration = e.optString("narration"),
                                isPosted = e.optBoolean("isPosted", true),
                                postedBy = e.optString("postedBy", "System"),
                                lines = lines
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
