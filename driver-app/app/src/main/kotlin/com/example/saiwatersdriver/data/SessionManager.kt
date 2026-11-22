package com.example.saiwatersdriver.data

import android.content.Context
import android.content.SharedPreferences
import com.example.saiwatersdriver.model.DriverProfile

class SessionManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

    companion object {
        private const val PREF_NAME = "sai_waters_driver_session"
        private const val KEY_IS_LOGGED_IN = "is_logged_in"
        private const val KEY_DRIVER_ID = "driver_id"
        private const val KEY_FULL_NAME = "full_name"
        private const val KEY_PHONE = "phone"
        private const val KEY_VEHICLE_NUM = "vehicle_number"
        private const val KEY_VEHICLE_TYPE = "vehicle_type"
        private const val KEY_BACKEND_URL = "backend_url"
        private const val KEY_ACTIVE_TRIP = "active_trip_id"

        const val DEFAULT_BACKEND_URL = "https://sai-waters.vercel.app"
    }

    var isLoggedIn: Boolean
        get() = prefs.getBoolean(KEY_IS_LOGGED_IN, false)
        set(value) = prefs.edit().putBoolean(KEY_IS_LOGGED_IN, value).apply()

    var backendUrl: String
        get() = prefs.getString(KEY_BACKEND_URL, DEFAULT_BACKEND_URL) ?: DEFAULT_BACKEND_URL
        set(value) {
            val clean = value.trim().trimEnd('/')
            prefs.edit().putString(KEY_BACKEND_URL, if (clean.isEmpty()) DEFAULT_BACKEND_URL else clean).apply()
        }

    fun saveSession(
        driverId: String,
        fullName: String,
        phone: String,
        vehicleNumber: String = "UP-25-AT-4821",
        vehicleType: String = "Bolero Maxi Truck (40 Jars Load)",
        backendUrl: String? = null
    ) {
        prefs.edit()
            .putBoolean(KEY_IS_LOGGED_IN, true)
            .putString(KEY_DRIVER_ID, driverId)
            .putString(KEY_FULL_NAME, fullName)
            .putString(KEY_PHONE, phone)
            .putString(KEY_VEHICLE_NUM, vehicleNumber)
            .putString(KEY_VEHICLE_TYPE, vehicleType)
            .apply()

        if (!backendUrl.isNullOrBlank()) {
            this.backendUrl = backendUrl
        }
    }

    fun getDriverProfile(): DriverProfile {
        return DriverProfile(
            driverId = prefs.getString(KEY_DRIVER_ID, "usr_driver_01") ?: "usr_driver_01",
            fullName = prefs.getString(KEY_FULL_NAME, "Ramesh Kumar") ?: "Ramesh Kumar",
            phone = prefs.getString(KEY_PHONE, "+91 98765 43210") ?: "+91 98765 43210",
            vehicleNumber = prefs.getString(KEY_VEHICLE_NUM, "UP-25-AT-4821") ?: "UP-25-AT-4821",
            vehicleType = prefs.getString(KEY_VEHICLE_TYPE, "Bolero Maxi Truck") ?: "Bolero Maxi Truck",
            activeTripId = prefs.getString(KEY_ACTIVE_TRIP, "TRIP-" + System.currentTimeMillis().toString().takeLast(6)) ?: "TRIP-01",
            isOnDuty = true
        )
    }

    fun clearSession() {
        prefs.edit()
            .putBoolean(KEY_IS_LOGGED_IN, false)
            .remove(KEY_DRIVER_ID)
            .remove(KEY_FULL_NAME)
            .remove(KEY_PHONE)
            .remove(KEY_ACTIVE_TRIP)
            .apply()
    }
}
