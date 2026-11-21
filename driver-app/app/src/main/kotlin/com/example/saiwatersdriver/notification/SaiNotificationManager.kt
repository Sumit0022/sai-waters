package com.example.saiwatersdriver.notification

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.example.saiwatersdriver.MainActivity
import com.example.saiwatersdriver.R
import com.example.saiwatersdriver.model.DeliveryOrder

/**
 * Custom Notification Manager for Sai Waters Driver Dispatch
 * Builds highly customized, high-priority heads-up delivery assignment alerts
 */
class SaiNotificationManager(private val context: Context) {

    companion object {
        const val CHANNEL_DISPATCH_ALERTS = "sai_waters_dispatch_alerts"
        const val CHANNEL_TRIP_PROGRESS = "sai_waters_trip_progress"
        const val NOTIFICATION_ID_BASE = 2026
    }

    init {
        createNotificationChannels()
    }

    /**
     * Creates dedicated high-importance notification channels
     */
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // 1. Dispatch Assignment Channel (High Priority with Sound & Vibration)
            val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val audioAttributes = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build()

            val dispatchChannel = NotificationChannel(
                CHANNEL_DISPATCH_ALERTS,
                context.getString(R.string.notification_channel_name),
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = context.getString(R.string.notification_channel_desc)
                enableLights(true)
                lightColor = 0xFF0284C7.toInt() // Sai Waters Brand Cyan
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 250, 150, 350)
                setSound(soundUri, audioAttributes)
                setShowBadge(true)
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
            }

            // 2. Ongoing Trip Progress Channel (Low Priority silent background)
            val tripChannel = NotificationChannel(
                CHANNEL_TRIP_PROGRESS,
                "Ongoing Trip Status",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows active delivery route and jar counts"
                setShowBadge(false)
            }

            notificationManager.createNotificationChannel(dispatchChannel)
            notificationManager.createNotificationChannel(tripChannel)
        }
    }

    /**
     * Checks if notification permission is granted
     */
    fun hasNotificationPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ActivityCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            NotificationManagerCompat.from(context).areNotificationsEnabled()
        }
    }

    /**
     * Posts a rich custom dispatch notification when a new order/trip is allotted to the driver
     */
    fun notifyNewOrderAllotted(order: DeliveryOrder) {
        if (!hasNotificationPermission()) return

        val notificationId = NOTIFICATION_ID_BASE + (order.orderNumber.hashCode() % 1000)

        // Main Tap Action: Open Sai Waters Driver App directly to this order
        val contentIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("EXTRA_ORDER_ID", order.id)
            putExtra("EXTRA_ORDER_NO", order.orderNumber)
        }
        val contentPendingIntent = PendingIntent.getActivity(
            context,
            notificationId,
            contentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Action 1: Call Customer
        val dialIntent = Intent(Intent.ACTION_DIAL).apply {
            data = Uri.parse("tel:${order.customerPhone}")
        }
        val dialPendingIntent = PendingIntent.getActivity(
            context,
            notificationId + 1,
            dialIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Action 2: Open Google Maps Navigation
        val mapUri = Uri.parse("google.navigation:q=${Uri.encode("${order.address}, ${order.area}")}")
        val mapIntent = Intent(Intent.ACTION_VIEW, mapUri)
        val mapPendingIntent = PendingIntent.getActivity(
            context,
            notificationId + 2,
            mapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val amountStr = String.format("₹%.2f", order.totalAmountRupees)
        val title = "💧 New Delivery Allotted: ${order.customerName}"
        val shortBody = "${order.jarQuantity} Jars (20L) • Total: $amountStr • ${order.area}"

        val bigText = StringBuilder()
            .append("📦 Order: ${order.orderNumber}\n")
            .append("👤 Customer: ${order.customerName}\n")
            .append("📍 Address: ${order.address}, ${order.area}\n")
            .append("💧 Jars: ${order.jarQuantity} x 20L Water Jars\n")
            .append("💰 Net Payable: $amountStr\n")
            .append("📞 Phone: ${order.customerPhone}")
            .toString()

        val notification = NotificationCompat.Builder(context, CHANNEL_DISPATCH_ALERTS)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(title)
            .setContentText(shortBody)
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .setBigContentTitle("💧 New Delivery Assignment • Sai Waters")
                    .bigText(bigText)
                    .setSummaryText("Trip Dispatch")
            )
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_EVENT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setColor(0xFF0284C7.toInt()) // Brand Cyan
            .setAutoCancel(true)
            .setContentIntent(contentPendingIntent)
            .addAction(R.drawable.ic_launcher_foreground, "📞 Call Customer", dialPendingIntent)
            .addAction(R.drawable.ic_launcher_foreground, "🗺️ Navigate", mapPendingIntent)
            .setVibrate(longArrayOf(0, 300, 200, 400))
            .build()

        try {
            NotificationManagerCompat.from(context).notify(notificationId, notification)
        } catch (e: SecurityException) {
            // Permission revoked
        }
    }
}
