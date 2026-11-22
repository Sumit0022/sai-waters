package com.example.saiwatersdriver.scanner

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material.icons.filled.FlashOff
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.FlipCameraAndroid
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors

/**
 * Ultra-smooth CameraX + ML Kit QR Code Scanner for 20L Water Jars
 * Includes animated laser overlay, haptic feedback, flash control, and debounce.
 */
@Composable
fun CameraScannerView(
    modifier: Modifier = Modifier,
    scannerTitle: String = "Scan 20L Water Jar QR",
    scannerSubtitle: String = "Align QR code inside the viewfinder",
    autoDismissOnScan: Boolean = false,
    onCloseClick: (() -> Unit)? = null,
    onBarcodeDetected: (String) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var hasFlash by remember { mutableStateOf(false) }
    var isFlashOn by remember { mutableStateOf(false) }
    var cameraSelector by remember { mutableStateOf(CameraSelector.DEFAULT_BACK_CAMERA) }
    var cameraInstance by remember { mutableStateOf<Camera?>(null) }
    var lastScannedCode by remember { mutableStateOf<String?>(null) }
    var lastScannedTimestamp by remember { mutableStateOf(0L) }
    var isBarcodeHandled by remember { mutableStateOf(false) }

    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }
    val barcodeScanner = remember {
        val options = BarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_QR_CODE, Barcode.FORMAT_CODE_128, Barcode.FORMAT_EAN_13)
            .build()
        BarcodeScanning.getClient(options)
    }

    DisposableEffect(Unit) {
        onDispose {
            cameraExecutor.shutdown()
            barcodeScanner.close()
        }
    }

    fun triggerHapticFeedback() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vibratorManager.defaultVibrator.vibrate(
                    VibrationEffect.createOneShot(70, VibrationEffect.DEFAULT_AMPLITUDE)
                )
            } else {
                @Suppress("DEPRECATION")
                val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(70, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(70)
                }
            }
        } catch (e: Exception) {
            // Ignore vibration errors on devices without vibrator
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        // CameraX Live Preview View
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                val previewView = PreviewView(ctx).apply {
                    scaleType = PreviewView.ScaleType.FILL_CENTER
                }

                val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                cameraProviderFuture.addListener({
                    val cameraProvider = cameraProviderFuture.get()

                    val preview = Preview.Builder().build().also {
                        it.surfaceProvider = previewView.surfaceProvider
                    }

                    @androidx.annotation.OptIn(ExperimentalGetImage::class)
                    val imageAnalysis = ImageAnalysis.Builder()
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build()
                        .also { analysis ->
                            analysis.setAnalyzer(cameraExecutor) { imageProxy ->
                                val mediaImage = imageProxy.image
                                if (mediaImage != null) {
                                    val image = InputImage.fromMediaImage(
                                        mediaImage,
                                        imageProxy.imageInfo.rotationDegrees
                                    )
                                    barcodeScanner.process(image)
                                        .addOnSuccessListener { barcodes ->
                                            for (barcode in barcodes) {
                                                val rawValue = barcode.rawValue ?: continue
                                                val now = System.currentTimeMillis()
                                                if (!isBarcodeHandled && (rawValue != lastScannedCode || (now - lastScannedTimestamp) > 1500L)) {
                                                    lastScannedCode = rawValue
                                                    lastScannedTimestamp = now
                                                    if (autoDismissOnScan) {
                                                        isBarcodeHandled = true
                                                    }
                                                    triggerHapticFeedback()
                                                    onBarcodeDetected(rawValue)
                                                }
                                            }
                                        }
                                        .addOnFailureListener {
                                            Log.e("CameraScanner", "MLKit scan failed", it)
                                        }
                                        .addOnCompleteListener {
                                            imageProxy.close()
                                        }
                                } else {
                                    imageProxy.close()
                                }
                            }
                        }

                    try {
                        cameraProvider.unbindAll()
                        val camera = cameraProvider.bindToLifecycle(
                            lifecycleOwner,
                            cameraSelector,
                            preview,
                            imageAnalysis
                        )
                        cameraInstance = camera
                        hasFlash = camera.cameraInfo.hasFlashUnit()
                    } catch (exc: Exception) {
                        Log.e("CameraScanner", "Use case binding failed", exc)
                    }
                }, ContextCompat.getMainExecutor(ctx))

                previewView
            }
        )

        // Custom Animated Viewfinder Overlay
        ScannerAnimatedOverlay(
            modifier = Modifier.fillMaxSize()
        )

        // Top Header Controls with statusBarsPadding
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(top = 12.dp, start = 16.dp, end = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                if (onCloseClick != null) {
                    IconButton(
                        onClick = onCloseClick,
                        modifier = Modifier
                            .size(42.dp)
                            .clip(CircleShape)
                            .background(Color(0xBB0F172A))
                            .border(1.dp, Color(0x40FFFFFF), CircleShape)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close Camera",
                            tint = Color.White,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                } else {
                    Spacer(modifier = Modifier.size(42.dp))
                }

                Surface(
                    color = Color(0xCC0F172A),
                    shape = RoundedCornerShape(20.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x4038BDF8))
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.QrCodeScanner,
                            contentDescription = null,
                            tint = Color(0xFF38BDF8),
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = scannerTitle,
                            style = MaterialTheme.typography.titleSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                fontSize = 13.sp
                            )
                        )
                    }
                }

                if (hasFlash) {
                    IconButton(
                        onClick = {
                            isFlashOn = !isFlashOn
                            cameraInstance?.cameraControl?.enableTorch(isFlashOn)
                        },
                        modifier = Modifier
                            .size(42.dp)
                            .clip(CircleShape)
                            .background(if (isFlashOn) Color(0xFF0284C7) else Color(0xBB0F172A))
                            .border(1.dp, Color(0x40FFFFFF), CircleShape)
                    ) {
                        Icon(
                            imageVector = if (isFlashOn) Icons.Default.FlashOn else Icons.Default.FlashOff,
                            contentDescription = "Torch",
                            tint = if (isFlashOn) Color.White else Color(0xFFCBD5E1),
                            modifier = Modifier.size(18.dp)
                        )
                    }
                } else {
                    Spacer(modifier = Modifier.size(42.dp))
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = scannerSubtitle,
                color = Color(0xEEFFFFFF),
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center
            )
        }

        // Bottom Action Bar: Flash and Switch Camera
        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(bottom = 36.dp, start = 32.dp, end = 32.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Flashlight Toggle
            if (hasFlash) {
                IconButton(
                    onClick = {
                        isFlashOn = !isFlashOn
                        cameraInstance?.cameraControl?.enableTorch(isFlashOn)
                    },
                    modifier = Modifier
                        .size(54.dp)
                        .clip(CircleShape)
                        .background(if (isFlashOn) Color(0xFF0284C7) else Color(0x990F172A))
                        .border(1.dp, Color(0x66FFFFFF), CircleShape)
                ) {
                    Icon(
                        imageVector = if (isFlashOn) Icons.Default.FlashOn else Icons.Default.FlashOff,
                        contentDescription = "Torch",
                        tint = if (isFlashOn) Color.White else Color(0xFFCBD5E1)
                    )
                }
            }

            // Camera Switch (Back / Front)
            IconButton(
                onClick = {
                    cameraSelector = if (cameraSelector == CameraSelector.DEFAULT_BACK_CAMERA) {
                        CameraSelector.DEFAULT_FRONT_CAMERA
                    } else {
                        CameraSelector.DEFAULT_BACK_CAMERA
                    }
                },
                modifier = Modifier
                    .size(54.dp)
                    .clip(CircleShape)
                    .background(Color(0x990F172A))
                    .border(1.dp, Color(0x66FFFFFF), CircleShape)
            ) {
                Icon(
                    imageVector = Icons.Default.FlipCameraAndroid,
                    contentDescription = "Switch Camera",
                    tint = Color.White
                )
            }
        }
    }
}

/**
 * Custom Canvas drawing for Scanner with pulsating laser line and cyan corner brackets
 */
@Composable
fun ScannerAnimatedOverlay(
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "LaserTransition")
    val laserProgress by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 2000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "LaserProgress"
    )

    Canvas(modifier = modifier) {
        val canvasWidth = size.width
        val canvasHeight = size.height

        val boxSize = (canvasWidth * 0.72f).coerceAtMost(300.dp.toPx())
        val left = (canvasWidth - boxSize) / 2f
        val top = (canvasHeight - boxSize) / 2f
        val right = left + boxSize
        val bottom = top + boxSize

        // 1. Draw darkened backdrop outside cutout
        val cutoutPath = Path().apply {
            addRoundRect(
                RoundRect(
                    rect = Rect(left, top, right, bottom),
                    cornerRadius = CornerRadius(24.dp.toPx())
                )
            )
        }

        // Draw translucent dark vignette
        drawRect(color = Color(0x99070D1A))

        // Cut out the clear viewing window
        drawPath(
            path = cutoutPath,
            color = Color.Transparent,
            blendMode = BlendMode.Clear
        )

        // 2. Draw Cyan Corner Accents (Material 3 Framing)
        val cornerLength = 36.dp.toPx()
        val cornerStroke = 4.dp.toPx()
        val cornerColor = Color(0xFF38BDF8)

        // Top-Left
        drawLine(
            color = cornerColor,
            start = Offset(left, top + 18.dp.toPx()),
            end = Offset(left, top),
            strokeWidth = cornerStroke,
            cap = StrokeCap.Round
        )
        drawLine(
            color = cornerColor,
            start = Offset(left, top),
            end = Offset(left + cornerLength, top),
            strokeWidth = cornerStroke,
            cap = StrokeCap.Round
        )

        // Top-Right
        drawLine(
            color = cornerColor,
            start = Offset(right, top + 18.dp.toPx()),
            end = Offset(right, top),
            strokeWidth = cornerStroke,
            cap = StrokeCap.Round
        )
        drawLine(
            color = cornerColor,
            start = Offset(right - cornerLength, top),
            end = Offset(right, top),
            strokeWidth = cornerStroke,
            cap = StrokeCap.Round
        )

        // Bottom-Left
        drawLine(
            color = cornerColor,
            start = Offset(left, bottom - 18.dp.toPx()),
            end = Offset(left, bottom),
            strokeWidth = cornerStroke,
            cap = StrokeCap.Round
        )
        drawLine(
            color = cornerColor,
            start = Offset(left, bottom),
            end = Offset(left + cornerLength, bottom),
            strokeWidth = cornerStroke,
            cap = StrokeCap.Round
        )

        // Bottom-Right
        drawLine(
            color = cornerColor,
            start = Offset(right, bottom - 18.dp.toPx()),
            end = Offset(right, bottom),
            strokeWidth = cornerStroke,
            cap = StrokeCap.Round
        )
        drawLine(
            color = cornerColor,
            start = Offset(right - cornerLength, bottom),
            end = Offset(right, bottom),
            strokeWidth = cornerStroke,
            cap = StrokeCap.Round
        )

        // 3. Draw Animated Scanning Laser Beam
        val laserY = top + (bottom - top) * laserProgress
        val laserBrush = Brush.horizontalGradient(
            colors = listOf(
                Color(0x0038BDF8),
                Color(0xFF38BDF8),
                Color(0xFF0284C7),
                Color(0xFF38BDF8),
                Color(0x0038BDF8)
            ),
            startX = left,
            endX = right
        )

        drawLine(
            brush = laserBrush,
            start = Offset(left + 8.dp.toPx(), laserY),
            end = Offset(right - 8.dp.toPx(), laserY),
            strokeWidth = 3.dp.toPx(),
            cap = StrokeCap.Round
        )
    }
}
