package com.saiwaters.admin.ui.login

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.saiwaters.admin.R
import com.saiwaters.admin.data.AdminSessionManager
import com.saiwaters.admin.ui.components.AppleCard
import com.saiwaters.admin.ui.theme.*

@Composable
fun AdminLoginScreen(
    sessionManager: AdminSessionManager,
    isLoading: Boolean,
    errorMessage: String?,
    onLoginClick: (user: String, pass: String) -> Unit
) {
    var username by remember { mutableStateOf(sessionManager.adminUsername.ifBlank { "sai" }) }
    var password by remember { mutableStateOf("") }
    var isPasswordVisible by remember { mutableStateOf(false) }

    var showServerDialog by remember { mutableStateOf(false) }
    var backendUrlText by remember { mutableStateOf(sessionManager.backendUrl) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF070B14),
                        Color(0xFF0F172A),
                        Color(0xFF070B14)
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp)
                .statusBarsPadding()
                .navigationBarsPadding(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Apple-style Water Droplet Brand Logo
            Box(
                modifier = Modifier
                    .size(90.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(Color.White.copy(alpha = 0.05f)),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    painter = painterResource(id = R.drawable.apple_admin_logo),
                    contentDescription = "Sai Waters Logo",
                    modifier = Modifier.size(80.dp)
                )
            }

            Spacer(modifier = Modifier.height(18.dp))

            Text(
                text = "Sai Waters",
                style = MaterialTheme.typography.headlineLarge,
                color = Color.White,
                fontWeight = FontWeight.Bold
            )

            Text(
                text = "Plant ERP & Owner Operations Dashboard",
                style = MaterialTheme.typography.bodyMedium,
                color = AppleWaterCyan.copy(alpha = 0.9f)
            )

            Spacer(modifier = Modifier.height(30.dp))

            // Login Card
            AppleCard(
                containerColor = Color(0xFF1E293B).copy(alpha = 0.85f),
                borderColor = Color.White.copy(alpha = 0.12f),
                cornerRadius = 24.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    if (!errorMessage.isNullOrBlank()) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = AppleRoseContainer.copy(alpha = 0.2f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, AppleRoseDanger)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(Icons.Default.Error, contentDescription = null, tint = AppleRoseDanger, modifier = Modifier.size(18.dp))
                                Text(
                                    text = errorMessage,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = AppleRoseDanger
                                )
                            }
                        }
                    }

                    OutlinedTextField(
                        value = username,
                        onValueChange = { username = it },
                        label = { Text("Admin Username", color = Color.White.copy(alpha = 0.7f)) },
                        leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = AppleWaterCyan) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = AppleWaterCyan,
                            unfocusedBorderColor = Color.White.copy(alpha = 0.2f)
                        ),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next)
                    )

                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("Password", color = Color.White.copy(alpha = 0.7f)) },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = AppleWaterCyan) },
                        trailingIcon = {
                            IconButton(onClick = { isPasswordVisible = !isPasswordVisible }) {
                                Icon(
                                    imageVector = if (isPasswordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    contentDescription = null,
                                    tint = Color.White.copy(alpha = 0.6f)
                                )
                            }
                        },
                        visualTransformation = if (isPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = AppleWaterCyan,
                            unfocusedBorderColor = Color.White.copy(alpha = 0.2f)
                        ),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = {
                            if (username.isNotBlank() && password.isNotBlank()) {
                                onLoginClick(username, password)
                            }
                        })
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Button(
                        onClick = {
                            if (username.isNotBlank() && password.isNotBlank()) {
                                onLoginClick(username, password)
                            }
                        },
                        enabled = !isLoading && username.isNotBlank() && password.isNotBlank(),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = AppleAzurePrimary),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Authenticating...", fontWeight = FontWeight.Bold)
                        } else {
                            Text("Log In as Owner", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Server config shortcut
            TextButton(
                onClick = { showServerDialog = true }
            ) {
                Icon(Icons.Default.Settings, contentDescription = null, tint = Color.White.copy(alpha = 0.6f), modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "Server: ${sessionManager.backendUrl}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.6f)
                )
            }
        }
    }

    // Change server endpoint dialog
    if (showServerDialog) {
        AlertDialog(
            onDismissRequest = { showServerDialog = false },
            title = { Text("Server API URL", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Change backend endpoint URL (default is live production).", style = MaterialTheme.typography.bodySmall)
                    OutlinedTextField(
                        value = backendUrlText,
                        onValueChange = { backendUrlText = it },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        sessionManager.backendUrl = backendUrlText
                        showServerDialog = false
                    }
                ) {
                    Text("Save URL")
                }
            },
            dismissButton = {
                TextButton(onClick = { showServerDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
