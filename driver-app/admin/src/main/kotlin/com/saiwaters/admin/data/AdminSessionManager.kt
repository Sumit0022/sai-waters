package com.saiwaters.admin.data

import android.content.Context
import android.content.SharedPreferences

class AdminSessionManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

    companion object {
        private const val PREF_NAME = "sai_waters_admin_prefs"
        private const val KEY_IS_LOGGED_IN = "is_logged_in"
        private const val KEY_ADMIN_USERNAME = "admin_username"
        private const val KEY_ADMIN_FULL_NAME = "admin_full_name"
        private const val KEY_BACKEND_URL = "backend_url"
        private const val KEY_AUTO_BACKUP_ENABLED = "auto_backup_enabled"
        private const val KEY_AUTO_BACKUP_HOUR = "auto_backup_hour"
        private const val KEY_AUTO_BACKUP_MINUTE = "auto_backup_minute"
        private const val KEY_LAST_BACKUP_TIMESTAMP = "last_backup_timestamp"
        private const val KEY_LAST_BACKUP_FILENAME = "last_backup_filename"
        private const val KEY_LAST_BACKUP_SIZE = "last_backup_size"

        const val DEFAULT_BACKEND_URL = "https://sai-waters.vercel.app"

        @Volatile
        private var instance: AdminSessionManager? = null

        fun getInstance(context: Context): AdminSessionManager {
            return instance ?: synchronized(this) {
                instance ?: AdminSessionManager(context.applicationContext).also { instance = it }
            }
        }
    }

    var isLoggedIn: Boolean
        get() = prefs.getBoolean(KEY_IS_LOGGED_IN, false)
        set(value) = prefs.edit().putBoolean(KEY_IS_LOGGED_IN, value).apply()

    var adminUsername: String
        get() = prefs.getString(KEY_ADMIN_USERNAME, "sai") ?: "sai"
        set(value) = prefs.edit().putString(KEY_ADMIN_USERNAME, value).apply()

    var adminFullName: String
        get() = prefs.getString(KEY_ADMIN_FULL_NAME, "Sai (Owner)") ?: "Sai (Owner)"
        set(value) = prefs.edit().putString(KEY_ADMIN_FULL_NAME, value).apply()

    var backendUrl: String
        get() = prefs.getString(KEY_BACKEND_URL, DEFAULT_BACKEND_URL) ?: DEFAULT_BACKEND_URL
        set(value) {
            val sanitized = value.trim().removeSuffix("/")
            prefs.edit().putString(KEY_BACKEND_URL, sanitized).apply()
        }

    var autoBackupEnabled: Boolean
        get() = prefs.getBoolean(KEY_AUTO_BACKUP_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_AUTO_BACKUP_ENABLED, value).apply()

    var autoBackupHour: Int
        get() = prefs.getInt(KEY_AUTO_BACKUP_HOUR, 23)
        set(value) = prefs.edit().putInt(KEY_AUTO_BACKUP_HOUR, value).apply()

    var autoBackupMinute: Int
        get() = prefs.getInt(KEY_AUTO_BACKUP_MINUTE, 0)
        set(value) = prefs.edit().putInt(KEY_AUTO_BACKUP_MINUTE, value).apply()

    var lastBackupTimestamp: Long
        get() = prefs.getLong(KEY_LAST_BACKUP_TIMESTAMP, 0L)
        set(value) = prefs.edit().putLong(KEY_LAST_BACKUP_TIMESTAMP, value).apply()

    var lastBackupFilename: String
        get() = prefs.getString(KEY_LAST_BACKUP_FILENAME, "") ?: ""
        set(value) = prefs.edit().putString(KEY_LAST_BACKUP_FILENAME, value).apply()

    var lastBackupSize: Long
        get() = prefs.getLong(KEY_LAST_BACKUP_SIZE, 0L)
        set(value) = prefs.edit().putLong(KEY_LAST_BACKUP_SIZE, value).apply()

    fun saveLogin(username: String, fullName: String) {
        prefs.edit()
            .putBoolean(KEY_IS_LOGGED_IN, true)
            .putString(KEY_ADMIN_USERNAME, username)
            .putString(KEY_ADMIN_FULL_NAME, fullName)
            .apply()
    }

    fun logout() {
        prefs.edit()
            .putBoolean(KEY_IS_LOGGED_IN, false)
            .remove(KEY_ADMIN_USERNAME)
            .remove(KEY_ADMIN_FULL_NAME)
            .apply()
    }
}
