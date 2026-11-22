package com.saiwaters.admin.scanner

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
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
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FlashOff
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.FlipCameraAndroid
import androidx.compose.material3.*
import androidx.compose.runtime.*
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

@Composable
fun AdminCameraScannerView(
    modifier: Modifier = Modifier,
    scannerTitle: String = "Scan 20L Water Jar or Customer QR",
    scannerSubtitle: String = "Align QR code inside the viewfinder",
    onCloseClick: (() -> Unit)? = null,
    onBarcodeDetected: (String) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var hasFlash by remember { mutableStateOf(false) }
    var isFlashOn by remember { mutableStateOf(false) }
    var cameraLensFacing by remember { mutableIntStateOf(CameraSelector.LENS_FACING_BACK) }
    var cameraInstance by remember { mutableStateOf<Camera?>(null) }
    var lastScannedCode by remember { mutableStateOf<String?>(null) }
    var lastScanTime by remember { mutableLongStateOf(0L) }

    fun vibrateSuccess() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vibratorManager?.defaultVibrator?.vibrate(
                    VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK)
                )
            } else {
                @Suppress("DEPRECATION")
                val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator?.vibrate(VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator?.vibrate(50)
                }
            }
        } catch (_: Exception) {}
    }

    val infiniteTransition = rememberInfiniteTransition(label = "laser")
    val laserProgress by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 2000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "laser_y"
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                val previewView = PreviewView(ctx).apply {
                    scaleType = PreviewView.ScaleType.FILL_CENTER
                }
                val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                val cameraExecutor = Executors.newSingleThreadExecutor()

                cameraProviderFuture.addListener({
                    val cameraProvider = cameraProviderFuture.get()
                    val preview = Preview.Builder().build().also {
                        it.surfaceProvider = previewView.surfaceProvider
                    }

                    val barcodeOptions = BarcodeScannerOptions.Builder()
                        .setBarcodeFormats(Barcode.FORMAT_QR_CODE, Barcode.FORMAT_ALL_FORMATS)
                        .build()
                    val barcodeScanner = BarcodeScanning.getClient(barcodeOptions)

                    val imageAnalysis = ImageAnalysis.Builder()
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build()

                    imageAnalysis.setAnalyzer(cameraExecutor) { imageProxy ->
                        @androidx.annotation.OptIn(ExperimentalGetImage::class)
                        val mediaImage = imageProxy.image
                        if (mediaImage != null) {
                            val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
                            barcodeScanner.process(image)
                                .addOnSuccessListener { barcodes ->
                                    for (barcode in barcodes) {
                                        val raw = barcode.rawValue ?: continue
                                        val now = System.currentTimeMillis()
                                        if (raw != lastScannedCode || (now - lastScanTime) > 1500) {
                                            lastScannedCode = raw
                                            lastScanTime = now
                                            vibrateSuccess()
                                            onBarcodeDetected(raw)
                                        }
                                    }
                                }
                                .addOnCompleteListener {
                                    imageProxy.close()
                                }
                        } else {
                            imageProxy.close()
                        }
                    }

                    try {
                        cameraProvider.unbindAll()
                        val cameraSelector = CameraSelector.Builder()
                            .requireLensFacing(cameraLensFacing)
                            .build()

                        val cam = cameraProvider.bindToLifecycle(
                            lifecycleOwner,
                            cameraSelector,
                            preview,
                            imageAnalysis
                        )
                        cameraInstance = cam
                        hasFlash = cam.cameraInfo.hasFlashUnit()
                    } catch (_: Exception) {}
                }, ContextCompat.getMainExecutor(ctx))

                previewView
            }
        )

        // Apple-style Viewfinder Overlay
        Canvas(modifier = Modifier.fillMaxSize()) {
            val boxSize = size.width * 0.72f
            val left = (size.width - boxSize) / 2f
            val top = (size.height - boxSize) / 2.3f

            val backgroundPath = Path().apply {
                addRect(Rect(0f, 0f, size.width, size.height))
            }
            val holePath = Path().apply {
                addRoundRect(
                    RoundRect(
                        rect = Rect(left, top, left + boxSize, top + boxSize),
                        cornerRadius = CornerRadius(24.dp.toPx(), 24.dp.toPx())
                    )
                )
            }

            drawPath(
                path = Path.combine(androidx.compose.ui.graphics.PathOperation.Difference, backgroundPath, holePath),
                color = Color.Black.copy(alpha = 0.65f)
            )

            // Animated Laser Beam
            val laserY = top + (boxSize * laserProgress)
            drawLine(
                brush = Brush.horizontalGradient(
                    colors = listOf(
                        Color(0x0000E5FF),
                        Color(0xFF00E5FF),
                        Color(0xFF38BDF8),
                        Color(0x0000E5FF)
                    ),
                    startX = left + 10f,
                    endX = left + boxSize - 10f
                ),
                start = Offset(left + 15f, laserY),
                end = Offset(left + boxSize - 15f, laserY),
                strokeWidth = 3.dp.toPx(),
                cap = StrokeCap.Round
            )

            // Viewfinder Corner Brackets
            val cornerLen = 28.dp.toPx()
            val strokeW = 4.dp.toPx()
            val cornerColor = Color(0xFF00E5FF)

            // Top-Left
            drawLine(cornerColor, Offset(left, top + cornerLen), Offset(left, top), strokeW, StrokeCap.Round)
            drawLine(cornerColor, Offset(left, top), Offset(left + cornerLen, top), strokeW, StrokeCap.Round)

            // Top-Right
            drawLine(cornerColor, Offset(left + boxSize - cornerLen, top), Offset(left + boxSize, top), strokeW, StrokeCap.Round)
            drawLine(cornerColor, Offset(left + boxSize, top), Offset(left + boxSize, top + cornerLen), strokeW, StrokeCap.Round)

            // Bottom-Left
            drawLine(cornerColor, Offset(left, top + boxSize - cornerLen), Offset(left, top + boxSize), strokeW, StrokeCap.Round)
            drawLine(cornerColor, Offset(left, top + boxSize), Offset(left + cornerLen, top + boxSize), strokeW, StrokeCap.Round)

            // Bottom-Right
            drawLine(cornerColor, Offset(left + boxSize - cornerLen, top + boxSize), Offset(left + boxSize, top + boxSize), strokeW, StrokeCap.Round)
            drawLine(cornerColor, Offset(left + boxSize, top + boxSize), Offset(left + boxSize, top + boxSize - cornerLen), strokeW, StrokeCap.Round)
        }

        // Top Toolbar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 20.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (onCloseClick != null) {
                IconButton(
                    onClick = onCloseClick,
                    modifier = Modifier
                        .size(42.dp)
                        .background(Color.White.copy(alpha = 0.2f), CircleShape)
                ) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                }
            } else {
                Spacer(modifier = Modifier.size(42.dp))
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = scannerTitle,
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = scannerSubtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.8f)
                )
            }

            if (hasFlash) {
                IconButton(
                    onClick = {
                        isFlashOn = !isFlashOn
                        cameraInstance?.cameraControl?.enableTorch(isFlashOn)
                    },
                    modifier = Modifier
                        .size(42.dp)
                        .background(
                            if (isFlashOn) Color(0xFF00E5FF) else Color.White.copy(alpha = 0.2f),
                            CircleShape
                        )
                ) {
                    Icon(
                        imageVector = if (isFlashOn) Icons.Default.FlashOn else Icons.Default.FlashOff,
                        contentDescription = "Torch",
                        tint = if (isFlashOn) Color.Black else Color.White
                    )
                }
            } else {
                Spacer(modifier = Modifier.size(42.dp))
            }
        }
    }
}
