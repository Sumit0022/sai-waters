package com.example.saiwatersdriver.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

object ApiClient {
    private const val CONNECT_TIMEOUT_MS = 10000
    private const val READ_TIMEOUT_MS = 15000

    suspend fun get(urlString: String): Result<String> = withContext(Dispatchers.IO) {
        try {
            val url = URL(urlString)
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = CONNECT_TIMEOUT_MS
                readTimeout = READ_TIMEOUT_MS
                setRequestProperty("Accept", "application/json")
                setRequestProperty("User-Agent", "SaiWatersDriverApp/1.0")
            }

            val statusCode = conn.responseCode
            val inputStream = if (statusCode in 200..299) conn.inputStream else conn.errorStream
            val responseText = inputStream?.bufferedReader()?.use(BufferedReader::readText) ?: ""

            if (statusCode in 200..299) {
                Result.success(responseText)
            } else {
                val errorMsg = try {
                    JSONObject(responseText).optString("error", "Server returned HTTP $statusCode")
                } catch (e: Exception) {
                    "Server error ($statusCode)"
                }
                Result.failure(Exception(errorMsg))
            }
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
                setRequestProperty("User-Agent", "SaiWatersDriverApp/1.0")
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
                    JSONObject(responseText).optString("error", "Server returned HTTP $statusCode")
                } catch (e: Exception) {
                    "Server error ($statusCode)"
                }
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
