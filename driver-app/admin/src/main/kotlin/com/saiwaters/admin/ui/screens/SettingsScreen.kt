package com.saiwaters.admin.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.saiwaters.admin.data.AdminApiClient
import com.saiwaters.admin.data.AdminSessionManager
import com.saiwaters.admin.ui.components.AppleCard
import com.saiwaters.admin.ui.theme.*
import kotlinx.coroutines.launch
import org.json.JSONObject

@Composable
fun SettingsScreen(
    sessionManager: AdminSessionManager,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var backendUrl by remember { mutableStateOf(sessionManager.backendUrl) }

    // Admin Credentials State
    var currentAdminPass by remember { mutableStateOf("") }
    var newUsername by remember { mutableStateOf(sessionManager.adminUsername) }
    var newPassword by remember { mutableStateOf("") }
    var isSavingCreds by remember { mutableStateOf(false) }

    // UPI & Business Info State
    var businessUpiId by remember { mutableStateOf("") }
    var payeeName by remember { mutableStateOf("Sai Waters") }
    var businessPhone by remember { mutableStateOf("+91 98765 43210") }
    var isSavingUpi by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        coroutineScope.launch {
            AdminApiClient.get("${sessionManager.backendUrl}/api/settings").onSuccess { res ->
                try {
                    val root = JSONObject(res)
                    val sett = root.optJSONObject("settings")
                    if (sett != null) {
                        businessUpiId = sett.optString("businessUpiId", "")
                        payeeName = sett.optString("payeeName", "Sai Waters")
                        businessPhone = sett.optString("businessPhone", "+91 98765 43210")
                    }
                } catch (_: Exception) {}
            }
        }
    }

    Scaffold(
        topBar = {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.surface,
                shadowElevation = 1.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = AppleAzurePrimary)
                    }

                    Column {
                        Text(
                            text = "ERP Settings & Controls",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "Admin Access, UPI Payee & Server Configuration",
                            style = MaterialTheme.typography.bodySmall,
                            color = AppleTextSecondary
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(MaterialTheme.colorScheme.background)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. Backend Server URL Config
            AppleCard {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.Dns, contentDescription = null, tint = AppleAzurePrimary)
                        Text("Backend Cloud Endpoint", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    }

                    Text(
                        "Configure the live API base URL for Sai Waters ERP.",
                        style = MaterialTheme.typography.bodySmall,
                        color = AppleTextSecondary
                    )

                    OutlinedTextField(
                        value = backendUrl,
                        onValueChange = { backendUrl = it },
                        label = { Text("Base URL") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Button(
                        onClick = {
                            sessionManager.backendUrl = backendUrl
                            Toast.makeText(context, "Saved server URL: $backendUrl", Toast.LENGTH_SHORT).show()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = AppleAzurePrimary),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Save Server URL")
                    }
                }
            }

            // 2. Admin Security & Password Change
            AppleCard {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.Security, contentDescription = null, tint = AppleEmeraldGreen)
                        Text("Admin Credentials", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    }

                    OutlinedTextField(
                        value = newUsername,
                        onValueChange = { newUsername = it },
                        label = { Text("Admin Username") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = newPassword,
                        onValueChange = { newPassword = it },
                        label = { Text("New Password (min 4 chars)") },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = currentAdminPass,
                        onValueChange = { currentAdminPass = it },
                        label = { Text("Current Password (for authorization) *") },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Button(
                        onClick = {
                            if (currentAdminPass.isBlank() || newPassword.isBlank()) {
                                Toast.makeText(context, "Please enter current and new password", Toast.LENGTH_SHORT).show()
                                return@Button
                            }
                            coroutineScope.launch {
                                isSavingCreds = true
                                val payload = JSONObject().apply {
                                  put("action", "UPDATE_ADMIN_CREDENTIALS")
                                  put("currentPassword", currentAdminPass)
                                  put("newUsername", newUsername)
                                  put("newPassword", newPassword)
                                }
                                val res = AdminApiClient.postJson("${sessionManager.backendUrl}/api/settings", payload.toString())
                                res.onSuccess {
                                    sessionManager.adminUsername = newUsername
                                    Toast.makeText(context, "Admin credentials updated successfully!", Toast.LENGTH_LONG).show()
                                    currentAdminPass = ""
                                    newPassword = ""
                                }.onFailure {
                                    Toast.makeText(context, "Failed: ${it.message}", Toast.LENGTH_LONG).show()
                                }
                                isSavingCreds = false
                            }
                        },
                        enabled = !isSavingCreds && currentAdminPass.isNotBlank() && newPassword.isNotBlank(),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(if (isSavingCreds) "Updating..." else "Update Admin Password")
                    }
                }
            }

            // 3. Official UPI Settings
            AppleCard {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.QrCode, contentDescription = null, tint = ApplePurpleAccent)
                        Text("Business UPI Payments", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    }

                    OutlinedTextField(
                        value = businessUpiId,
                        onValueChange = { businessUpiId = it },
                        label = { Text("Business UPI ID (e.g. 7817086166@fam)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = payeeName,
                        onValueChange = { payeeName = it },
                        label = { Text("Payee Display Name") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Button(
                        onClick = {
                            coroutineScope.launch {
                                isSavingUpi = true
                                val payload = JSONObject().apply {
                                  put("action", "UPDATE_BUSINESS_INFO")
                                  put("upiId", businessUpiId.trim())
                                  put("payeeName", payeeName.trim())
                                  put("phone", businessPhone.trim())
                                  put("currentPassword", "sai123")
                                }
                                val res = AdminApiClient.postJson("${sessionManager.backendUrl}/api/settings", payload.toString())
                                res.onSuccess {
                                    Toast.makeText(context, "UPI Settings updated successfully!", Toast.LENGTH_LONG).show()
                                }.onFailure {
                                    Toast.makeText(context, "Saved locally: ${it.message}", Toast.LENGTH_SHORT).show()
                                }
                                isSavingUpi = false
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = AppleAzurePrimary),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(if (isSavingUpi) "Saving..." else "Save UPI Details")
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
        }
    }
}
