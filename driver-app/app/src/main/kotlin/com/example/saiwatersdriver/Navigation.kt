package com.example.saiwatersdriver

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.navigation3.runtime.entryProvider
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.ui.NavDisplay
import com.example.saiwatersdriver.data.SessionManager
import com.example.saiwatersdriver.ui.login.LoginScreen
import com.example.saiwatersdriver.ui.main.MainScreen

@Composable
fun MainNavigation() {
    val context = LocalContext.current
    val sessionManager = remember { SessionManager(context) }
    val initialKey = if (sessionManager.isLoggedIn) Main else Login
    val backStack = rememberNavBackStack(initialKey)

    NavDisplay(
        backStack = backStack,
        onBack = { backStack.removeLastOrNull() },
        entryProvider = entryProvider {
            entry<Login> {
                LoginScreen(
                    sessionManager = sessionManager,
                    onLoginSuccess = {
                        backStack.clear()
                        backStack.add(Main)
                    }
                )
            }
            entry<Main> {
                MainScreen(
                    onLogout = {
                        sessionManager.clearSession()
                        backStack.clear()
                        backStack.add(Login)
                    }
                )
            }
        }
    )
}
