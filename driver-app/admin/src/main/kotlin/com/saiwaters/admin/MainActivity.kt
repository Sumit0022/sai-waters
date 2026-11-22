package com.saiwaters.admin

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import com.saiwaters.admin.data.AdminRepository
import com.saiwaters.admin.data.AdminSessionManager
import com.saiwaters.admin.ui.login.AdminLoginScreen
import com.saiwaters.admin.ui.main.AdminMainScreen
import com.saiwaters.admin.ui.theme.SaiWatersAdminTheme
import com.saiwaters.admin.worker.AutoBackupWorker
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private lateinit var sessionManager: AdminSessionManager

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { _ ->
        // Permissions handled
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        sessionManager = AdminSessionManager.getInstance(this)

        requestRequiredPermissions()

        // Schedule WorkManager if auto-backup enabled
        if (sessionManager.autoBackupEnabled) {
            AutoBackupWorker.scheduleDailyBackup(
                this,
                sessionManager.autoBackupHour,
                sessionManager.autoBackupMinute
            )
        }

        setContent {
            SaiWatersAdminTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    var isLoggedIn by remember { mutableStateOf(sessionManager.isLoggedIn) }
                    var loginError by remember { mutableStateOf<String?>(null) }
                    var isLoggingIn by remember { mutableStateOf(false) }
                    val coroutineScope = rememberCoroutineScope()
                    val repository = remember { AdminRepository(this@MainActivity) }

                    if (!isLoggedIn) {
                        AdminLoginScreen(
                            sessionManager = sessionManager,
                            isLoading = isLoggingIn,
                            errorMessage = loginError,
                            onLoginClick = { user, pass ->
                                coroutineScope.launch {
                                    isLoggingIn = true
                                    loginError = null
                                    repository.login(user, pass).onSuccess {
                                        isLoggedIn = true
                                        Toast.makeText(this@MainActivity, "Welcome, ${sessionManager.adminFullName}", Toast.LENGTH_SHORT).show()
                                    }.onFailure {
                                        loginError = it.message ?: "Authentication failed"
                                    }
                                    isLoggingIn = false
                                }
                            }
                        )
                    } else {
                        AdminMainScreen(
                            sessionManager = sessionManager,
                            onLogout = {
                                isLoggedIn = false
                            },
                            onOpenServerConfig = {
                                // Handled in MainScreen or TopBar
                            }
                        )
                    }
                }
            }
        }
    }

    private fun requestRequiredPermissions() {
        val permissionsToRequest = mutableListOf<String>()

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.CAMERA)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        if (permissionsToRequest.isNotEmpty()) {
            permissionLauncher.launch(permissionsToRequest.toTypedArray())
        }
    }
}
