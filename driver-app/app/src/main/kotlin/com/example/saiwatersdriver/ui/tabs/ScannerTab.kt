package com.example.saiwatersdriver.ui.tabs

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.saiwatersdriver.model.ScannedJar
import com.example.saiwatersdriver.scanner.CameraScannerView
import com.example.saiwatersdriver.ui.theme.WaterBorderLight
import com.example.saiwatersdriver.ui.theme.WaterCyanContainer
import com.example.saiwatersdriver.ui.theme.WaterCyanPrimary
import com.example.saiwatersdriver.ui.theme.WaterEmeraldContainer
import com.example.saiwatersdriver.ui.theme.WaterEmeraldGreen
import com.example.saiwatersdriver.ui.theme.WaterNavyDark
import com.example.saiwatersdriver.ui.theme.WaterOnEmeraldContainer
import com.example.saiwatersdriver.ui.theme.WaterTextPrimary
import com.example.saiwatersdriver.ui.theme.WaterTextSecondary

enum class ScannerMode {
    DELIVER_JAR,
    COLLECT_EMPTY
}

/**
 * Scanner Tab: Embedded Smooth CameraX Barcode Scanner for 20L Water Jars
 */
@Composable
fun ScannerTab(
    scannedJars: List<ScannedJar>,
    lastScannedJar: ScannedJar?,
    onJarScanned: (qrToken: String, isReturnEmpty: Boolean) -> Unit,
    onDismissScanNotice: () -> Unit,
    modifier: Modifier = Modifier
) {
    var scannerMode by remember { mutableStateOf(ScannerMode.DELIVER_JAR) }
    var showManualInputDialog by remember { mutableStateOf(false) }
    var manualJarCodeInput by remember { mutableStateOf("") }

    Box(modifier = modifier.fillMaxSize()) {
        // High-Performance CameraX Scanner Surface
        CameraScannerView(
            modifier = Modifier.fillMaxSize(),
            scannerTitle = if (scannerMode == ScannerMode.DELIVER_JAR) {
                "Scan Outgoing Jar QR"
            } else {
                "Scan Returning Empty Jar"
            },
            scannerSubtitle = "Place jar QR within brackets • Auto haptic feedback",
            onBarcodeDetected = { token ->
                onJarScanned(token, scannerMode == ScannerMode.COLLECT_EMPTY)
            }
        )

        // Mode Switcher Header
        Column(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .padding(top = 110.dp, start = 20.dp, end = 20.dp)
        ) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color(0xDD0F172A),
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x33FFFFFF))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(4.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    val isDeliver = scannerMode == ScannerMode.DELIVER_JAR
                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .clickable { scannerMode = ScannerMode.DELIVER_JAR },
                        shape = RoundedCornerShape(12.dp),
                        color = if (isDeliver) WaterCyanPrimary else Color.Transparent
                    ) {
                        Text(
                            text = "Deliver Outgoing",
                            modifier = Modifier.padding(vertical = 8.dp),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                    }

                    val isReturn = scannerMode == ScannerMode.COLLECT_EMPTY
                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .clickable { scannerMode = ScannerMode.COLLECT_EMPTY },
                        shape = RoundedCornerShape(12.dp),
                        color = if (isReturn) Color(0xFF7C3AED) else Color.Transparent
                    ) {
                        Text(
                            text = "Collect Empty",
                            modifier = Modifier.padding(vertical = 8.dp),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                    }
                }
            }
        }

        // Live Last Scanned Notice & Manual Fallback Button
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(bottom = 100.dp, start = 16.dp, end = 16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Last Scanned Floating Confirmation Pill
            AnimatedVisibility(
                visible = lastScannedJar != null,
                enter = fadeIn(),
                exit = fadeOut()
            ) {
                lastScannedJar?.let { jar ->
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        color = Color(0xF00F172A),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF38BDF8)),
                        shadowElevation = 6.dp
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(CircleShape)
                                        .background(if (jar.isReturnEmpty) Color(0xFF7C3AED) else WaterCyanPrimary),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.WaterDrop,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text(
                                        text = jar.jarCode,
                                        fontWeight = FontWeight.Black,
                                        fontSize = 14.sp,
                                        color = Color.White
                                    )
                                    Text(
                                        text = if (jar.isReturnEmpty) "Empty Return Recorded" else "Outgoing Jar Verified",
                                        fontSize = 11.sp,
                                        color = Color(0xFF94A3B8)
                                    )
                                }
                            }

                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = WaterEmeraldContainer
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.CheckCircle,
                                        contentDescription = null,
                                        tint = WaterEmeraldGreen,
                                        modifier = Modifier.size(12.dp)
                                    )
                                    Text(
                                        text = "RECORDED",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = WaterOnEmeraldContainer
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Manual Code Entry Fallback Pill
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { showManualInputDialog = true },
                shape = RoundedCornerShape(12.dp),
                color = Color(0xCC0F172A),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x33FFFFFF))
            ) {
                Row(
                    modifier = Modifier.padding(vertical = 10.dp, horizontal = 16.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = null,
                        tint = Color(0xFF38BDF8),
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Scratched QR? Enter Jar Code Manually",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }
        }
    }

    // Manual Jar Entry Dialog
    if (showManualInputDialog) {
        AlertDialog(
            onDismissRequest = { showManualInputDialog = false },
            title = {
                Text(
                    text = "Manual Jar Code Entry",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                Column {
                    Text(
                        text = "Enter permanent jar code (e.g. JAR-2026-0042)",
                        fontSize = 12.sp,
                        color = WaterTextSecondary
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedTextField(
                        value = manualJarCodeInput,
                        onValueChange = { manualJarCodeInput = it },
                        placeholder = { Text("JAR-2026-XXXX") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (manualJarCodeInput.isNotBlank()) {
                            onJarScanned(manualJarCodeInput.trim(), scannerMode == ScannerMode.COLLECT_EMPTY)
                            manualJarCodeInput = ""
                            showManualInputDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = WaterNavyDark)
                ) {
                    Text("Add Jar")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showManualInputDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
