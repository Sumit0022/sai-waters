package com.saiwaters.admin.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.File
import java.io.FileOutputStream
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

object AdminApiClient {
    private const val CONNECT_TIMEOUT_MS = 25000
    private const val READ_TIMEOUT_MS = 45000

    suspend fun get(urlString: String): Result<String> = withContext(Dispatchers.IO) {
        try {
            val url = URL(urlString)
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = CONNECT_TIMEOUT_MS
                readTimeout = READ_TIMEOUT_MS
                setRequestProperty("Accept", "application/json")
                setRequestProperty("User-Agent", "SaiWatersAdminApp/1.0")
            }

            val statusCode = conn.responseCode
            val inputStream = if (statusCode in 200..299) conn.inputStream else conn.errorStream
            val responseText = inputStream?.bufferedReader()?.use(BufferedReader::readText) ?: ""

            if (statusCode in 200..299) {
                Result.success(responseText)
            } else {
                val errorMsg = try {
                    JSONObject(responseText).optString("error", "Server HTTP $statusCode")
                } catch (e: Exception) {
                    "Server error ($statusCode)"
                }
                Result.failure(Exception(errorMsg))
            }
        } catch (e: java.net.SocketTimeoutException) {
            Result.failure(Exception("Connection timeout. Please check your network connection."))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun postJson(urlString: String, jsonPayload: String): Result<String> = withContext(Dispatchers.IO) {
        try {
            val url = URL(urlString)
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = CONNECT_TIMEOUT_MS
                readTimeout = READ_TIMEOUT_MS
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                setRequestProperty("Accept", "application/json")
                setRequestProperty("User-Agent", "SaiWatersAdminApp/1.0")
            }

            OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { writer ->
                writer.write(jsonPayload)
                writer.flush()
            }

            val statusCode = conn.responseCode
            val inputStream = if (statusCode in 200..299) conn.inputStream else conn.errorStream
            val responseText = inputStream?.bufferedReader()?.use(BufferedReader::readText) ?: ""

            if (statusCode in 200..299) {
                Result.success(responseText)
            } else {
                val errorMsg = try {
                    JSONObject(responseText).optString("error", "Server HTTP $statusCode")
                } catch (e: Exception) {
                    "Server error ($statusCode)"
                }
                Result.failure(Exception(errorMsg))
            }
        } catch (e: java.net.SocketTimeoutException) {
            Result.failure(Exception("Connection timeout. Please try again."))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun downloadToFile(urlString: String, destinationFile: File): Result<Long> = withContext(Dispatchers.IO) {
        try {
            val url = URL(urlString)
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = CONNECT_TIMEOUT_MS
                readTimeout = READ_TIMEOUT_MS
                setRequestProperty("User-Agent", "SaiWatersAdminApp/1.0")
            }

            val statusCode = conn.responseCode
            if (statusCode !in 200..299) {
                val errText = conn.errorStream?.bufferedReader()?.use(BufferedReader::readText) ?: ""
                val msg = try { JSONObject(errText).optString("error", "HTTP $statusCode") } catch (_: Exception) { "HTTP $statusCode" }
                return@withContext Result.failure(Exception(msg))
            }

            destinationFile.parentFile?.mkdirs()
            var bytesWritten = 0L
            conn.inputStream.use { input ->
                FileOutputStream(destinationFile).use { output ->
                    val buffer = ByteArray(8192)
                    var bytesRead: Int
                    while (input.read(buffer).also { bytesRead = it } != -1) {
                        output.write(buffer, 0, bytesRead)
                        bytesWritten += bytesRead
                    }
                    output.flush()
                }
            }
            Result.success(bytesWritten)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
