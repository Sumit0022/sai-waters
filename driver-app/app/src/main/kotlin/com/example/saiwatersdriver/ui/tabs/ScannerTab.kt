package com.example.saiwatersdriver.ui.tabs

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Image
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Keyboard
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material3.AlertDialog
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
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.example.saiwatersdriver.data.DriverRepository
import com.example.saiwatersdriver.model.DeliverySuccessReceipt
import com.example.saiwatersdriver.model.PaymentMode
import com.example.saiwatersdriver.model.ResolvedCustomer
import com.example.saiwatersdriver.model.ScannedJar
import com.example.saiwatersdriver.scanner.CameraScannerView
import com.example.saiwatersdriver.ui.theme.WaterBorderLight
import com.example.saiwatersdriver.ui.theme.WaterCyanContainer
import com.example.saiwatersdriver.ui.theme.WaterCyanPrimary
import com.example.saiwatersdriver.ui.theme.WaterEmeraldContainer
import com.example.saiwatersdriver.ui.theme.WaterEmeraldGreen
import com.example.saiwatersdriver.ui.theme.WaterNavyDark
import com.example.saiwatersdriver.ui.theme.WaterOnEmeraldContainer
import com.example.saiwatersdriver.ui.theme.WaterRoseDanger
import com.example.saiwatersdriver.ui.theme.WaterTextPrimary
import com.example.saiwatersdriver.ui.theme.WaterTextSecondary
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import kotlinx.coroutines.launch

/**
 * Generate a standard UPI QR code bitmap using ZXing
 * Formats: upi://pay?pa=<upi_id>&pn=<payee>&am=<amount>&cu=INR
 * Scannable by any UPI app in India (PhonePe, Google Pay, Paytm, BHIM)
 */
fun generateUpiQrBitmap(upiId: String, payeeName: String, amountRupees: Int): Bitmap? {
    return try {
        val cleanUpi = upiId.trim()
        if (cleanUpi.isBlank() || !cleanUpi.contains("@")) return null
        val encodedName = Uri.encode(payeeName.ifBlank { "Sai Waters" })
        val upiUri = if (amountRupees > 0) {
            "upi://pay?pa=$cleanUpi&pn=$encodedName&am=$amountRupees&cu=INR&tn=Sai%20Waters%20Jar%20Delivery"
        } else {
            "upi://pay?pa=$cleanUpi&pn=$encodedName&cu=INR&tn=Sai%20Waters"
        }
        val size = 512
        val hints = java.util.EnumMap<EncodeHintType, Any>(EncodeHintType::class.java).apply {
            put(EncodeHintType.MARGIN, 1)
        }
        val bitMatrix = QRCodeWriter().encode(upiUri, BarcodeFormat.QR_CODE, size, size, hints)
        val w = bitMatrix.width
        val h = bitMatrix.height
        val bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        for (x in 0 until w) {
            for (y in 0 until h) {
                bitmap.setPixel(x, y, if (bitMatrix.get(x, y)) android.graphics.Color.BLACK else android.graphics.Color.WHITE)
            }
        }
        bitmap
    } catch (e: Exception) {
        null
    }
}

enum class DeliveryWorkflowStep {
    STEP1_CUSTOMER_SCAN,
    STEP2_JARS_AND_PAYMENT,
    STEP3_CONFIRMATION_RECEIPT
}

/**
 * Scanner Tab: PhonePe-Style Delivery & QR Scanner Workflow
 * Matches Sai Waters /driver system logic:
 * Step 1: Scan Customer Station QR
 * Step 2: Scan Jars Delivered + Empty Returns + Doorstep Cash
 * Step 3: PhonePe-style Celebratory Receipt
 * Camera only opens when user explicitly taps "Open Camera Scanner".
 */
@Composable
fun ScannerTab(
    repository: DriverRepository,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    // Live sync business settings from Admin Dashboard
    val liveUpiId by repository.upiId.collectAsState()
    val liveBusinessName by repository.businessName.collectAsState()

    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        )
    }

    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        hasCameraPermission = isGranted
    }

    fun triggerVibration(isError: Boolean = false) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                val duration = if (isError) 200L else 70L
                vm.defaultVibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                val v = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                val duration = if (isError) 200L else 70L
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    v.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    v.vibrate(duration)
                }
            }
        } catch (_: Exception) {}
    }

    // Workflow State
    var currentStep by remember { mutableStateOf(DeliveryWorkflowStep.STEP1_CUSTOMER_SCAN) }
    var isCameraActive by remember { mutableStateOf(false) }
    var scanTarget by remember { mutableStateOf("CUSTOMER") }

    // Step 1: Customer State
    var customerInfo by remember { mutableStateOf<ResolvedCustomer?>(null) }
    var manualCustomerInput by remember { mutableStateOf("") }
    var isResolvingCustomer by remember { mutableStateOf(false) }
    var customerError by remember { mutableStateOf<String?>(null) }

    // Step 2: Jars & Payment State
    var scannedJars by remember { mutableStateOf<List<String>>(emptyList()) }
    var emptyJarsCount by remember { mutableIntStateOf(2) }
    var paymentMode by remember { mutableStateOf(PaymentMode.CASH) }
    var cashCollectedRupees by remember { mutableStateOf("70") }
    var showManualJarDialog by remember { mutableStateOf(false) }
    var manualJarInput by remember { mutableStateOf("") }
    var isSubmittingDelivery by remember { mutableStateOf(false) }
    var deliveryError by remember { mutableStateOf<String?>(null) }

    // Step 3: Success Receipt State
    var successReceipt by remember { mutableStateOf<DeliverySuccessReceipt?>(null) }

    // Toast/Notice state during multi-jar camera scanning
    var inScannerNotice by remember { mutableStateOf<String?>(null) }

    // Logic: Resolve Customer by QR or Code
    fun resolveCustomer(raw: String) {
        val code = raw.trim()
        if (code.isBlank()) return

        isResolvingCustomer = true
        customerError = null

        scope.launch {
            val result = repository.resolveCustomerByQrOrCode(code)
            isResolvingCustomer = false

            result.fold(
                onSuccess = { cust ->
                    triggerVibration(isError = false)
                    customerInfo = cust
                    emptyJarsCount = cust.defaultQuantity
                    scannedJars = emptyList()
                    val isBulkEvent = cust.billingCycle.uppercase().contains("EVENT") || cust.billingCycle.uppercase().contains("ONE_TIME")
                    if (!isBulkEvent) {
                        // Recurring & Daily customers default to Monthly Khata (Account ledger)
                        paymentMode = PaymentMode.MONTHLY_CREDIT
                        cashCollectedRupees = "0"
                    } else {
                        paymentMode = PaymentMode.CASH
                        cashCollectedRupees = (cust.defaultQuantity * (cust.ratePerJarRupees.toInt())).toString()
                    }
                    currentStep = DeliveryWorkflowStep.STEP2_JARS_AND_PAYMENT
                    isCameraActive = false
                },
                onFailure = { err ->
                    triggerVibration(isError = true)
                    customerError = err.message ?: "Customer could not be resolved"
                }
            )
        }
    }

    // Logic: Add Jar Code in Step 2 with Deduplication & Vice-Versa Guard
    fun addJarCode(raw: String): Boolean {
        val clean = raw.replace("urn:sw:j:", "").trim()
        if (clean.isBlank()) return false

        // GUARD 1: Reject Customer Station QR in Jar Step
        val isCustomerQr = clean.startsWith("urn:sw:c:") ||
                clean.uppercase().startsWith("CUST-") ||
                (customerInfo != null && (clean == customerInfo?.customerCode || clean == customerInfo?.id || clean == customerInfo?.phone))

        if (isCustomerQr) {
            triggerVibration(isError = true)
            inScannerNotice = "❌ Galat QR! Ye Customer Station QR hai, 20L Water Jar nahi."
            return false
        }

        // GUARD 2: Deduplication (Single delivery cannot have duplicate jar code)
        if (scannedJars.contains(clean)) {
            triggerVibration(isError = true)
            inScannerNotice = "⚠️ Jar '$clean' pehle se shamil hai!"
            return false
        }

        triggerVibration(isError = false)
        val updated = scannedJars + clean
        scannedJars = updated

        // Recalculate cash amount only if in cash mode
        if (paymentMode == PaymentMode.CASH) {
            val unitRate = customerInfo?.ratePerJarRupees?.toInt() ?: 35
            cashCollectedRupees = (updated.size * unitRate).toString()
        }
        inScannerNotice = "✅ Jar '$clean' added! (${updated.size} Jars Total)"
        return true
    }

    // Logic: Submit Complete Doorstep Delivery
    fun completeDelivery() {
        val cust = customerInfo ?: return
        if (scannedJars.isEmpty()) {
            deliveryError = "Please scan at least 1 Water Jar to deliver"
            return
        }

        isSubmittingDelivery = true
        deliveryError = null

        val cashPaise = ((cashCollectedRupees.toDoubleOrNull() ?: 0.0) * 100).toLong()

        scope.launch {
            val result = repository.submitDoorstepDelivery(
                customer = cust,
                jarCodes = scannedJars,
                emptyJarsCount = emptyJarsCount,
                cashCollectedPaise = cashPaise,
                paymentMode = paymentMode
            )
            isSubmittingDelivery = false

            result.fold(
                onSuccess = { receipt ->
                    triggerVibration(isError = false)
                    successReceipt = receipt
                    currentStep = DeliveryWorkflowStep.STEP3_CONFIRMATION_RECEIPT
                },
                onFailure = { err ->
                    triggerVibration(isError = true)
                    deliveryError = err.message ?: "Failed to record delivery on server"
                }
            )
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        // =========================================================================
        // FULLSCREEN CAMERAX SCANNER OVERLAY (Only rendered when isCameraActive = true)
        // =========================================================================
        if (isCameraActive) {
            if (hasCameraPermission) {
                CameraScannerView(
                    modifier = Modifier.fillMaxSize(),
                    scannerTitle = if (scanTarget == "CUSTOMER") "Scan Customer Station QR" else "Scan 20L Water Jar QR",
                    scannerSubtitle = if (scanTarget == "CUSTOMER") {
                        "Point camera at Grahak QR sticker on wall/gate"
                    } else {
                        "Scan jar QR sticker on cap or neck • ${scannedJars.size} Jars recorded"
                    },
                    onCloseClick = {
                        isCameraActive = false
                        inScannerNotice = null
                    },
                    onBarcodeDetected = { rawBarcode ->
                        if (scanTarget == "CUSTOMER") {
                            resolveCustomer(rawBarcode)
                        } else {
                            addJarCode(rawBarcode)
                        }
                    }
                )

                // In-Scanner Live Feedback Banner
                AnimatedVisibility(
                    visible = inScannerNotice != null,
                    enter = fadeIn(),
                    exit = fadeOut(),
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 90.dp, start = 20.dp, end = 20.dp)
                ) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xEE0F172A),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF38BDF8))
                    ) {
                        Text(
                            text = inScannerNotice ?: "",
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                            textAlign = TextAlign.Center
                        )
                    }
                }

                // If in JAR scan mode, show "Done Scanning" button
                if (scanTarget == "JAR" && scannedJars.isNotEmpty()) {
                    Button(
                        onClick = {
                            isCameraActive = false
                            inScannerNotice = null
                        },
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .padding(bottom = 30.dp, start = 24.dp, end = 24.dp)
                            .fillMaxWidth()
                            .height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = WaterEmeraldGreen)
                    ) {
                        Icon(imageVector = Icons.Default.Check, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Done Scanning (${scannedJars.size} Jars)",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                    }
                }
            } else {
                // Permission Request Card inside Camera State
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFF0F172A)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(72.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF1E293B)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.CameraAlt,
                                contentDescription = null,
                                tint = WaterCyanPrimary,
                                modifier = Modifier.size(36.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Camera Permission Needed",
                            color = Color.White,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Sai Waters needs camera access to scan Customer and Water Jar QR codes.",
                            color = Color(0xFF94A3B8),
                            fontSize = 12.sp,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(20.dp))
                        Button(
                            onClick = { cameraPermissionLauncher.launch(Manifest.permission.CAMERA) },
                            colors = ButtonDefaults.buttonColors(containerColor = WaterCyanPrimary),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Grant Camera Permission")
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                        OutlinedButton(
                            onClick = { isCameraActive = false },
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White)
                        ) {
                            Text("Back to Delivery")
                        }
                    }
                }
            }
        } else {
            // =========================================================================
            // CALM DASHBOARD VIEW (STEP 1, STEP 2, or STEP 3)
            // =========================================================================
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFFF8FAFC))
            ) {
                // Stepper Progress Header (PhonePe style)
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = Color.White,
                    shadowElevation = 1.dp,
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        val steps = listOf(
                            Triple(DeliveryWorkflowStep.STEP1_CUSTOMER_SCAN, "1. Grahak QR", currentStep == DeliveryWorkflowStep.STEP1_CUSTOMER_SCAN),
                            Triple(DeliveryWorkflowStep.STEP2_JARS_AND_PAYMENT, "2. Jars & Cash", currentStep == DeliveryWorkflowStep.STEP2_JARS_AND_PAYMENT),
                            Triple(DeliveryWorkflowStep.STEP3_CONFIRMATION_RECEIPT, "3. Receipt", currentStep == DeliveryWorkflowStep.STEP3_CONFIRMATION_RECEIPT)
                        )

                        steps.forEachIndexed { index, (_, label, isActive) ->
                            val isDone = (index == 0 && currentStep != DeliveryWorkflowStep.STEP1_CUSTOMER_SCAN) ||
                                    (index == 1 && currentStep == DeliveryWorkflowStep.STEP3_CONFIRMATION_RECEIPT)

                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(24.dp)
                                        .clip(CircleShape)
                                        .background(
                                            when {
                                                isDone -> WaterEmeraldGreen
                                                isActive -> WaterCyanPrimary
                                                else -> Color(0xFFCBD5E1)
                                            }
                                        ),
                                    contentAlignment = Alignment.Center
                                ) {
                                    if (isDone) {
                                        Icon(imageVector = Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                                    } else {
                                        Text(text = "${index + 1}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                    }
                                }
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = label,
                                    fontSize = 11.sp,
                                    fontWeight = if (isActive) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isActive) WaterNavyDark else Color(0xFF64748B)
                                )
                            }

                            if (index < steps.size - 1) {
                                Box(
                                    modifier = Modifier
                                        .width(16.dp)
                                        .height(2.dp)
                                        .background(Color(0xFFE2E8F0))
                                )
                            }
                        }
                    }
                }

                // STEP 1 CONTENT: CUSTOMER STATION QR SCAN
                if (currentStep == DeliveryWorkflowStep.STEP1_CUSTOMER_SCAN) {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        item { Spacer(modifier = Modifier.height(4.dp)) }

                        // PhonePe-Style Big Action Scan Hero Card
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(20.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(22.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    // Hero Scanner Button
                                    Box(
                                        modifier = Modifier
                                            .size(90.dp)
                                            .clip(CircleShape)
                                            .background(
                                                Brush.linearGradient(
                                                    listOf(Color(0xFF0284C7), Color(0xFF0369A1))
                                                )
                                            )
                                            .border(4.dp, Color(0xFFBAE6FD), CircleShape)
                                            .clickable {
                                                scanTarget = "CUSTOMER"
                                                isCameraActive = true
                                            },
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.QrCodeScanner,
                                            contentDescription = "Scan Customer Station QR",
                                            tint = Color.White,
                                            modifier = Modifier.size(46.dp)
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(16.dp))

                                    Text(
                                        text = "Scan Customer Station QR",
                                        fontSize = 17.sp,
                                        fontWeight = FontWeight.Black,
                                        color = WaterNavyDark,
                                        textAlign = TextAlign.Center
                                    )

                                    Spacer(modifier = Modifier.height(6.dp))

                                    Text(
                                        text = "Pehle grahak ke ghar ya shop par lage QR sticker ko scan karein.",
                                        fontSize = 12.sp,
                                        color = WaterTextSecondary,
                                        textAlign = TextAlign.Center,
                                        lineHeight = 16.sp
                                    )

                                    Spacer(modifier = Modifier.height(20.dp))

                                    Button(
                                        onClick = {
                                            scanTarget = "CUSTOMER"
                                            isCameraActive = true
                                        },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(50.dp),
                                        shape = RoundedCornerShape(12.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = WaterCyanPrimary)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.CameraAlt,
                                            contentDescription = null,
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = "Tap to Open Camera Scanner",
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }
                        }

                        // Error Banner if Customer not found
                        if (customerError != null) {
                            item {
                                Surface(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    color = Color(0xFFFEF2F2),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFECACA))
                                ) {
                                    Row(
                                        modifier = Modifier.padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.ErrorOutline,
                                            contentDescription = null,
                                            tint = Color(0xFFDC2626),
                                            modifier = Modifier.size(20.dp)
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = customerError ?: "",
                                            fontSize = 12.sp,
                                            color = Color(0xFF991B1B),
                                            fontWeight = FontWeight.Medium
                                        )
                                    }
                                }
                            }
                        }

                        // Manual Code Entry Fallback Card
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Text(
                                        text = "Ya Customer Code / Phone Type Karein",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = WaterNavyDark
                                    )
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        OutlinedTextField(
                                            value = manualCustomerInput,
                                            onValueChange = {
                                                manualCustomerInput = it
                                                customerError = null
                                            },
                                            placeholder = { Text("e.g. CUST-001 or 98370...", fontSize = 12.sp, color = Color(0xFF94A3B8)) },
                                            modifier = Modifier.weight(1f),
                                            singleLine = true,
                                            shape = RoundedCornerShape(10.dp),
                                            textStyle = androidx.compose.ui.text.TextStyle(color = Color(0xFF0F172A), fontSize = 13.sp),
                                            colors = OutlinedTextFieldDefaults.colors(
                                                focusedTextColor = Color(0xFF0F172A),
                                                unfocusedTextColor = Color(0xFF0F172A),
                                                focusedContainerColor = Color.White,
                                                unfocusedContainerColor = Color.White,
                                                cursorColor = WaterCyanPrimary
                                            )
                                        )
                                        Button(
                                            onClick = { resolveCustomer(manualCustomerInput) },
                                            enabled = manualCustomerInput.isNotBlank() && !isResolvingCustomer,
                                            shape = RoundedCornerShape(10.dp),
                                            colors = ButtonDefaults.buttonColors(containerColor = WaterNavyDark)
                                        ) {
                                            if (isResolvingCustomer) {
                                                CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                                            } else {
                                                Text("Verify", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        item { Spacer(modifier = Modifier.height(24.dp)) }
                    }
                }

                // STEP 2 CONTENT: JARS ALLOCATION, EMPTIES & PAYMENT
                if (currentStep == DeliveryWorkflowStep.STEP2_JARS_AND_PAYMENT && customerInfo != null) {
                    val cust = customerInfo!!
                    val unitRate = cust.ratePerJarRupees.toInt()
                    val totalBill = scannedJars.size * unitRate

                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        item { Spacer(modifier = Modifier.height(4.dp)) }

                        // Verified Customer Banner Card
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFBAE6FD))
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Box(
                                                modifier = Modifier
                                                    .size(36.dp)
                                                    .clip(CircleShape)
                                                    .background(Color(0xFFE0F2FE)),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.Person,
                                                    contentDescription = null,
                                                    tint = WaterCyanPrimary,
                                                    modifier = Modifier.size(20.dp)
                                                )
                                            }
                                            Spacer(modifier = Modifier.width(10.dp))
                                            Column {
                                                Text(
                                                    text = cust.fullName,
                                                    fontSize = 15.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = WaterNavyDark
                                                )
                                                Text(
                                                    text = "${cust.customerCode} • ₹$unitRate / Jar",
                                                    fontSize = 11.sp,
                                                    color = WaterCyanPrimary,
                                                    fontWeight = FontWeight.SemiBold
                                                )
                                            }
                                        }

                                        Text(
                                            text = "Change",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFFDC2626),
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(6.dp))
                                                .clickable {
                                                    currentStep = DeliveryWorkflowStep.STEP1_CUSTOMER_SCAN
                                                    scannedJars = emptyList()
                                                }
                                                .padding(6.dp)
                                        )
                                    }

                                    if (cust.fullAddress.isNotBlank()) {
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(imageVector = Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(14.dp))
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text(text = cust.fullAddress, fontSize = 11.sp, color = WaterTextSecondary)
                                        }
                                    }
                                }
                            }
                        }

                        // Jars Delivered Section
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "20L WATER JARS DELIVERED",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = WaterTextSecondary
                                        )
                                        Surface(
                                            shape = RoundedCornerShape(50),
                                            color = if (scannedJars.isNotEmpty()) Color(0xFFDCFCE7) else Color(0xFFF1F5F9)
                                        ) {
                                            Text(
                                                text = "${scannedJars.size} Jars",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (scannedJars.isNotEmpty()) Color(0xFF166534) else Color(0xFF64748B),
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(12.dp))

                                    // Scanned Jars Chips List
                                    if (scannedJars.isEmpty()) {
                                        Surface(
                                            modifier = Modifier.fillMaxWidth(),
                                            shape = RoundedCornerShape(10.dp),
                                            color = Color(0xFFF8FAFC),
                                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                                        ) {
                                            Text(
                                                text = "Abhi koi jar scan nahi kiya hai. Neeche button se scan karein.",
                                                fontSize = 11.sp,
                                                color = Color(0xFF94A3B8),
                                                modifier = Modifier.padding(14.dp),
                                                textAlign = TextAlign.Center
                                            )
                                        }
                                    } else {
                                        LazyRow(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            items(scannedJars) { jarCode ->
                                                Surface(
                                                    shape = RoundedCornerShape(10.dp),
                                                    color = Color(0xFFE0F2FE),
                                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFBAE6FD))
                                                ) {
                                                    Row(
                                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                                                        verticalAlignment = Alignment.CenterVertically
                                                    ) {
                                                        Icon(imageVector = Icons.Default.WaterDrop, contentDescription = null, tint = WaterCyanPrimary, modifier = Modifier.size(14.dp))
                                                        Spacer(modifier = Modifier.width(4.dp))
                                                        Text(text = jarCode, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = WaterNavyDark)
                                                        Spacer(modifier = Modifier.width(6.dp))
                                                        Icon(
                                                            imageVector = Icons.Default.Close,
                                                            contentDescription = "Remove",
                                                            tint = Color(0xFF64748B),
                                                            modifier = Modifier
                                                                .size(14.dp)
                                                                .clickable {
                                                                    val updated = scannedJars.filter { it != jarCode }
                                                                    scannedJars = updated
                                                                    cashCollectedRupees = (updated.size * unitRate).toString()
                                                                }
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(14.dp))

                                    // Action buttons for Jars
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        Button(
                                            onClick = {
                                                scanTarget = "JAR"
                                                isCameraActive = true
                                            },
                                            modifier = Modifier
                                                .weight(1f)
                                                .height(44.dp),
                                            shape = RoundedCornerShape(10.dp),
                                            colors = ButtonDefaults.buttonColors(containerColor = WaterCyanPrimary)
                                        ) {
                                            Icon(imageVector = Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(16.dp))
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text("+ Scan Jar QR", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                        }

                                        OutlinedButton(
                                            onClick = { showManualJarDialog = true },
                                            modifier = Modifier.height(44.dp),
                                            shape = RoundedCornerShape(10.dp)
                                        ) {
                                            Text("+ Manual", fontSize = 12.sp)
                                        }
                                    }
                                }
                            }
                        }

                        // Empty Returns Stepper Section
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(
                                            text = "KHAALI JAR VAAPAS LIYE",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = WaterTextSecondary
                                        )
                                        Text(
                                            text = "Empty Returns Count",
                                            fontSize = 10.sp,
                                            color = Color(0xFF94A3B8)
                                        )
                                    }

                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                                    ) {
                                        IconButton(
                                            onClick = { if (emptyJarsCount > 0) emptyJarsCount-- },
                                            modifier = Modifier
                                                .size(36.dp)
                                                .clip(CircleShape)
                                                .background(Color(0xFFF1F5F9))
                                        ) {
                                            Icon(imageVector = Icons.Default.Remove, contentDescription = "Decrease", tint = WaterNavyDark)
                                        }

                                        Text(
                                            text = "$emptyJarsCount Empties",
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.Black,
                                            color = WaterNavyDark
                                        )

                                        IconButton(
                                            onClick = { emptyJarsCount++ },
                                            modifier = Modifier
                                                .size(36.dp)
                                                .clip(CircleShape)
                                                .background(Color(0xFFF1F5F9))
                                        ) {
                                            Icon(imageVector = Icons.Default.Add, contentDescription = "Increase", tint = WaterNavyDark)
                                        }
                                    }
                                }
                            }
                        }

                        // Payment & Doorstep Cash Collection Section
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "TOTAL BILL AMOUNT",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = WaterTextSecondary
                                        )
                                        Text(
                                            text = "₹$totalBill",
                                            fontSize = 18.sp,
                                            fontWeight = FontWeight.Black,
                                            color = WaterNavyDark
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(12.dp))

                                    // Payment Mode Selector Tabs
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        val modes = listOf(
                                            PaymentMode.CASH to "Cash (Doorstep)",
                                            PaymentMode.MONTHLY_CREDIT to "Monthly Khata",
                                            PaymentMode.UPI_QR to "UPI / Online"
                                        )
                                        modes.forEach { (mode, label) ->
                                            val isSelected = paymentMode == mode
                                            Surface(
                                                modifier = Modifier
                                                    .weight(1f)
                                                    .clickable {
                                                        paymentMode = mode
                                                        if (mode == PaymentMode.CASH) {
                                                            cashCollectedRupees = totalBill.toString()
                                                        } else {
                                                            cashCollectedRupees = "0"
                                                        }
                                                    },
                                                shape = RoundedCornerShape(10.dp),
                                                color = if (isSelected) WaterNavyDark else Color(0xFFF8FAFC),
                                                border = androidx.compose.foundation.BorderStroke(1.dp, if (isSelected) WaterNavyDark else Color(0xFFE2E8F0))
                                            ) {
                                                Text(
                                                    text = label,
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = if (isSelected) Color.White else WaterTextSecondary,
                                                    modifier = Modifier.padding(vertical = 8.dp),
                                                    textAlign = TextAlign.Center
                                                )
                                            }
                                        }
                                    }

                                    if (paymentMode == PaymentMode.CASH) {
                                        Spacer(modifier = Modifier.height(14.dp))
                                        OutlinedTextField(
                                             value = cashCollectedRupees,
                                             onValueChange = { cashCollectedRupees = it },
                                             label = { Text("Cash Collected at Doorstep (₹)") },
                                             modifier = Modifier.fillMaxWidth(),
                                             singleLine = true,
                                             shape = RoundedCornerShape(10.dp),
                                             textStyle = androidx.compose.ui.text.TextStyle(color = Color(0xFF0F172A), fontSize = 14.sp, fontWeight = FontWeight.Bold),
                                             colors = OutlinedTextFieldDefaults.colors(
                                                 focusedTextColor = Color(0xFF0F172A),
                                                 unfocusedTextColor = Color(0xFF0F172A),
                                                 focusedContainerColor = Color.White,
                                                 unfocusedContainerColor = Color.White,
                                                 cursorColor = WaterCyanPrimary
                                             )
                                         )
                                     } else if (paymentMode == PaymentMode.UPI_QR) {
                                         Spacer(modifier = Modifier.height(14.dp))
                                         Surface(
                                             shape = RoundedCornerShape(16.dp),
                                             color = Color(0xFFF0F9FF),
                                             border = androidx.compose.foundation.BorderStroke(1.5.dp, Color(0xFFBAE6FD)),
                                             modifier = Modifier.fillMaxWidth()
                                         ) {
                                             Column(
                                                 modifier = Modifier.padding(16.dp),
                                                 horizontalAlignment = Alignment.CenterHorizontally
                                             ) {
                                                 // Header row with Live status
                                                 Row(
                                                     modifier = Modifier.fillMaxWidth(),
                                                     horizontalArrangement = Arrangement.SpaceBetween,
                                                     verticalAlignment = Alignment.CenterVertically
                                                 ) {
                                                     Row(verticalAlignment = Alignment.CenterVertically) {
                                                         Icon(
                                                             imageVector = Icons.Default.QrCode,
                                                             contentDescription = null,
                                                             tint = Color(0xFF0284C7),
                                                             modifier = Modifier.size(18.dp)
                                                         )
                                                         Spacer(modifier = Modifier.width(6.dp))
                                                         Text(
                                                             text = "Scan & Pay via UPI",
                                                             fontSize = 13.sp,
                                                             fontWeight = FontWeight.Bold,
                                                             color = Color(0xFF0369A1)
                                                         )
                                                     }
                                                     Surface(
                                                         shape = RoundedCornerShape(50),
                                                         color = Color(0xFFDCFCE7),
                                                         border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF86EFAC))
                                                     ) {
                                                         Text(
                                                             text = "● LIVE SYNC",
                                                             fontSize = 9.sp,
                                                             fontWeight = FontWeight.ExtraBold,
                                                             color = Color(0xFF15803D),
                                                             modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
                                                         )
                                                     }
                                                 }

                                                 Spacer(modifier = Modifier.height(14.dp))

                                                 // Medium-sized QR Code Card
                                                 val upiQrBitmap = remember(liveUpiId, liveBusinessName, totalBill) {
                                                     generateUpiQrBitmap(liveUpiId, liveBusinessName, totalBill)
                                                 }

                                                 Surface(
                                                     shape = RoundedCornerShape(16.dp),
                                                     color = Color.White,
                                                     border = androidx.compose.foundation.BorderStroke(1.5.dp, Color(0xFFE2E8F0)),
                                                     shadowElevation = 3.dp
                                                 ) {
                                                     Box(
                                                         modifier = Modifier.padding(14.dp),
                                                         contentAlignment = Alignment.Center
                                                     ) {
                                                         if (upiQrBitmap != null) {
                                                             Image(
                                                                 bitmap = upiQrBitmap.asImageBitmap(),
                                                                 contentDescription = "UPI Payment QR Code",
                                                                 modifier = Modifier.size(190.dp)
                                                             )
                                                         } else {
                                                             Column(
                                                                 horizontalAlignment = Alignment.CenterHorizontally,
                                                                 modifier = Modifier
                                                                     .size(190.dp)
                                                                     .padding(16.dp),
                                                                 verticalArrangement = Arrangement.Center
                                                             ) {
                                                                 Icon(
                                                                     imageVector = Icons.Default.QrCode,
                                                                     contentDescription = null,
                                                                     tint = Color(0xFF94A3B8),
                                                                     modifier = Modifier.size(48.dp)
                                                                 )
                                                                 Spacer(modifier = Modifier.height(8.dp))
                                                                 Text(
                                                                     text = "UPI QR Code Taiyar Ho Raha Hai...",
                                                                     fontSize = 11.sp,
                                                                     color = Color(0xFF64748B),
                                                                     textAlign = TextAlign.Center
                                                                 )
                                                             }
                                                         }
                                                     }
                                                 }

                                                 Spacer(modifier = Modifier.height(12.dp))

                                                 // Amount to be paid
                                                 Text(
                                                     text = "₹" + totalBill,
                                                     fontSize = 22.sp,
                                                     fontWeight = FontWeight.Black,
                                                     color = Color(0xFF0F172A)
                                                 )

                                                 Spacer(modifier = Modifier.height(8.dp))

                                                 // Live UPI ID with One-Tap Copy
                                                 Surface(
                                                     shape = RoundedCornerShape(10.dp),
                                                     color = Color.White,
                                                     border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFCBD5E1)),
                                                     modifier = Modifier
                                                         .fillMaxWidth()
                                                         .clickable {
                                                             try {
                                                                 val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                                                                 val clip = android.content.ClipData.newPlainText("UPI ID", liveUpiId)
                                                                 clipboard.setPrimaryClip(clip)
                                                                 triggerVibration(isError = false)
                                                                 inScannerNotice = "UPI ID Copied: " + liveUpiId
                                                             } catch (_: Exception) {}
                                                         }
                                                 ) {
                                                     Row(
                                                         modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                                         horizontalArrangement = Arrangement.SpaceBetween,
                                                         verticalAlignment = Alignment.CenterVertically
                                                     ) {
                                                         Column {
                                                             Text(
                                                                 text = "UPI ID (" + (if (liveBusinessName.isNotBlank()) liveBusinessName else "Sai Waters") + ")",
                                                                 fontSize = 9.sp,
                                                                 color = Color(0xFF64748B),
                                                                 fontWeight = FontWeight.Medium
                                                             )
                                                             Text(
                                                                 text = liveUpiId,
                                                                 fontSize = 13.sp,
                                                                 fontWeight = FontWeight.Bold,
                                                                 color = Color(0xFF0284C7)
                                                             )
                                                         }
                                                         Surface(
                                                             shape = RoundedCornerShape(6.dp),
                                                             color = Color(0xFFE0F2FE)
                                                         ) {
                                                             Row(
                                                                 modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                                                 verticalAlignment = Alignment.CenterVertically
                                                             ) {
                                                                 Icon(
                                                                     imageVector = Icons.Default.ContentCopy,
                                                                     contentDescription = "Copy",
                                                                     tint = Color(0xFF0284C7),
                                                                     modifier = Modifier.size(13.dp)
                                                                 )
                                                                 Spacer(modifier = Modifier.width(4.dp))
                                                                 Text("Copy", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0284C7))
                                                             }
                                                         }
                                                     }
                                                 }

                                                 Spacer(modifier = Modifier.height(10.dp))

                                                 Text(
                                                     text = "Grahak kisi bhi app (Google Pay, PhonePe, Paytm, BHIM) se scan karein.\nPaisa sidha Company Bank Account (1130) mein jayega (Driver Cash = ₹0).",
                                                     fontSize = 10.sp,
                                                     color = Color(0xFF475569),
                                                     textAlign = TextAlign.Center,
                                                     lineHeight = 14.sp
                                                 )
                                             }
                                         }
                                     } else {
                                         Spacer(modifier = Modifier.height(12.dp))
                                         Surface(
                                             shape = RoundedCornerShape(10.dp),
                                             color = Color(0xFFF0FDF4),
                                             border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFBBF7D0)),
                                             modifier = Modifier.fillMaxWidth()
                                         ) {
                                             Column(modifier = Modifier.padding(12.dp)) {
                                                 Text("Monthly Khata (Account Billing)", fontSize = 11.sp, fontWeight = FontWeight.Black, color = Color(0xFF166534))
                                                 Spacer(modifier = Modifier.height(4.dp))
                                                 Text("Doorstep cash: ₹0 • ₹$totalBill customer ke monthly ledger hisaab mein judega.", fontSize = 10.sp, color = Color(0xFF14532D))
                                             }
                                         }
                                     }
                                }
                            }
                        }

                        // Delivery Error Alert
                        if (deliveryError != null) {
                            item {
                                Surface(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    color = Color(0xFFFEF2F2),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFECACA))
                                ) {
                                    Row(modifier = Modifier.padding(12.dp)) {
                                        Icon(imageVector = Icons.Default.ErrorOutline, contentDescription = null, tint = Color(0xFFDC2626), modifier = Modifier.size(18.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(text = deliveryError ?: "", fontSize = 12.sp, color = Color(0xFF991B1B))
                                    }
                                }
                            }
                        }

                        // Big Sticky Confirmation Button
                        item {
                            Button(
                                onClick = { completeDelivery() },
                                enabled = scannedJars.isNotEmpty() && !isSubmittingDelivery,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(54.dp),
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = WaterEmeraldGreen,
                                    disabledContainerColor = Color(0xFF94A3B8)
                                )
                            ) {
                                if (isSubmittingDelivery) {
                                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Text("Recording Delivery...", fontWeight = FontWeight.Bold)
                                } else {
                                    Icon(imageVector = Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(20.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "Confirm & Complete Delivery (₹$cashCollectedRupees)",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Black
                                    )
                                }
                            }
                        }

                        item { Spacer(modifier = Modifier.height(24.dp)) }
                    }
                }

                // STEP 3 CONTENT: PHONEPE-STYLE CELEBRATORY RECEIPT
                if (currentStep == DeliveryWorkflowStep.STEP3_CONFIRMATION_RECEIPT && successReceipt != null) {
                    val receipt = successReceipt!!
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        item {
                            // PhonePe Animated Emerald Checkmark
                            Box(
                                modifier = Modifier
                                    .size(90.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFDCFCE7))
                                    .border(3.dp, WaterEmeraldGreen, CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Check,
                                    contentDescription = "Success",
                                    tint = WaterEmeraldGreen,
                                    modifier = Modifier.size(54.dp)
                                )
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            Text(
                                text = "Delivery Recorded Successfully!",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Black,
                                color = WaterNavyDark,
                                textAlign = TextAlign.Center
                            )

                            Spacer(modifier = Modifier.height(6.dp))

                            Text(
                                text = "₹${receipt.cashCollectedRupees.toInt()} Paid via Cash (Driver A/C 1120)",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = WaterEmeraldGreen
                            )

                            Spacer(modifier = Modifier.height(24.dp))

                            // PhonePe Receipt Summary Card
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(18.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                            ) {
                                Column(modifier = Modifier.padding(18.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(text = "Customer", fontSize = 12.sp, color = WaterTextSecondary)
                                        Text(text = receipt.customerName, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = WaterNavyDark)
                                    }
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(text = "Order Number", fontSize = 12.sp, color = WaterTextSecondary)
                                        Text(text = receipt.orderNumber, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = WaterNavyDark)
                                    }
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(text = "Jars Delivered", fontSize = 12.sp, color = WaterTextSecondary)
                                        Text(text = "${receipt.jarsDelivered} Jars (${receipt.jarCodes.joinToString(", ")})", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = WaterNavyDark)
                                    }
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(text = "Empty Returns", fontSize = 12.sp, color = WaterTextSecondary)
                                        Text(text = "${receipt.emptyJarsCollected} Empties", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = WaterNavyDark)
                                    }
                                    if (receipt.receiptNumber != null) {
                                        Spacer(modifier = Modifier.height(10.dp))
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(text = "Cash Receipt", fontSize = 12.sp, color = WaterTextSecondary)
                                            Text(text = receipt.receiptNumber, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = WaterCyanPrimary)
                                        }
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(28.dp))

                            // Start Next Delivery Button
                            Button(
                                onClick = {
                                    customerInfo = null
                                    scannedJars = emptyList()
                                    emptyJarsCount = 2
                                    cashCollectedRupees = "70"
                                    successReceipt = null
                                    currentStep = DeliveryWorkflowStep.STEP1_CUSTOMER_SCAN
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(52.dp),
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = WaterCyanPrimary)
                            ) {
                                Icon(imageVector = Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(text = "Start Next Delivery", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }

        // Manual Jar Input Dialog
        if (showManualJarDialog) {
            AlertDialog(
                onDismissRequest = {
                    showManualJarDialog = false
                    manualJarInput = ""
                },
                title = { Text("Enter 20L Water Jar Code", fontWeight = FontWeight.Bold) },
                text = {
                    Column {
                        Text(
                            text = "Enter jar number (e.g. 0035 or JAR-20L-0035):",
                            fontSize = 12.sp,
                            color = WaterTextSecondary
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        OutlinedTextField(
                            value = manualJarInput,
                            onValueChange = { manualJarInput = it },
                            placeholder = { Text("e.g. JAR-20L-0035", color = Color(0xFF94A3B8)) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            textStyle = androidx.compose.ui.text.TextStyle(color = Color(0xFF0F172A), fontSize = 13.sp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color(0xFF0F172A),
                                unfocusedTextColor = Color(0xFF0F172A),
                                focusedContainerColor = Color.White,
                                unfocusedContainerColor = Color.White,
                                cursorColor = WaterCyanPrimary
                            )
                        )
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            val input = manualJarInput.trim()
                            if (input.isNotBlank()) {
                                val full = if (!input.startsWith("JAR-")) "JAR-20L-$input" else input
                                addJarCode(full)
                            }
                            showManualJarDialog = false
                            manualJarInput = ""
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = WaterCyanPrimary)
                    ) {
                        Text("Add Jar")
                    }
                },
                dismissButton = {
                    OutlinedButton(onClick = {
                        showManualJarDialog = false
                        manualJarInput = ""
                    }) {
                        Text("Cancel")
                    }
                }
            )
        }
    }
}
