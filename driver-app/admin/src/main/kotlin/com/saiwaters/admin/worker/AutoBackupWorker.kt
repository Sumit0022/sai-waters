package com.saiwaters.admin.worker

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.os.Environment
import androidx.core.app.NotificationCompat
import androidx.work.*
import com.saiwaters.admin.data.AdminRepository
import com.saiwaters.admin.data.AdminSessionManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

class AutoBackupWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    companion object {
        const val WORK_NAME = "sai_waters_daily_auto_backup"
        const val CHANNEL_ID = "sai_waters_backup_channel"
        const val NOTIFICATION_ID = 20261122

        fun scheduleDailyBackup(context: Context, hour: Int, minute: Int) {
            val now = Calendar.getInstance()
            val target = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, minute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }

            if (target.before(now)) {
                target.add(Calendar.DAY_OF_YEAR, 1)
            }

            val initialDelayMs = target.timeInMillis - now.timeInMillis

            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val periodicRequest = PeriodicWorkRequestBuilder<AutoBackupWorker>(24, TimeUnit.HOURS)
                .setInitialDelay(initialDelayMs, TimeUnit.MILLISECONDS)
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.UPDATE,
                periodicRequest
            )
        }

        fun cancelDailyBackup(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
        }
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val session = AdminSessionManager.getInstance(context)
        if (!session.autoBackupEnabled) {
            return@withContext Result.success()
        }

        val repository = AdminRepository(context)
        val snapshotResult = repository.triggerBackupSnapshot()

        if (snapshotResult.isFailure) {
            showNotification(
                title = "⚠️ Sai Waters Auto-Backup Failed",
                message = snapshotResult.exceptionOrNull()?.message ?: "Could not connect to ERP server."
            )
            return@withContext Result.retry()
        }

        val (filename, rawJson) = snapshotResult.getOrThrow()
        val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val actualFilename = if (filename.isNotBlank()) filename else "sai_waters_auto_backup_$timestamp.json"

        try {
            // Save to Downloads/SaiWatersBackups if possible, else internal files
            val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            val backupFolder = File(downloadsDir, "SaiWatersBackups")
            if (!backupFolder.exists()) {
                backupFolder.mkdirs()
            }

            val targetFile = if (backupFolder.canWrite()) {
                File(backupFolder, actualFilename)
            } else {
                File(context.getExternalFilesDir("backups"), actualFilename)
            }

            FileOutputStream(targetFile).use { fos ->
                fos.write(rawJson.toByteArray(Charsets.UTF_8))
                fos.flush()
            }

            session.lastBackupTimestamp = System.currentTimeMillis()
            session.lastBackupFilename = actualFilename
            session.lastBackupSize = targetFile.length()

            val sizeKb = targetFile.length() / 1024
            showNotification(
                title = "✅ Sai Waters Auto-Backup Successful",
                message = "Daily ERP database snapshot saved ($actualFilename - ${sizeKb} KB)"
            )
            Result.success()
        } catch (e: Exception) {
            showNotification(
                title = "⚠️ Sai Waters Backup Write Error",
                message = "Failed to write backup to storage: ${e.message}"
            )
            Result.failure()
        }
    }

    private fun showNotification(title: String, message: String) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Sai Waters ERP Backups",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Daily scheduled database backups"
            }
            notificationManager.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .build()

        notificationManager.notify(NOTIFICATION_ID, notification)
    }
}
