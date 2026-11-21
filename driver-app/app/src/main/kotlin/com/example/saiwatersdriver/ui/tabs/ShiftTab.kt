package com.example.saiwatersdriver.ui.tabs

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.saiwatersdriver.model.DriverProfile
import com.example.saiwatersdriver.ui.theme.WaterBorderLight
import com.example.saiwatersdriver.ui.theme.WaterCyanContainer
import com.example.saiwatersdriver.ui.theme.WaterCyanPrimary
import com.example.saiwatersdriver.ui.theme.WaterEmeraldContainer
import com.example.saiwatersdriver.ui.theme.WaterEmeraldGreen
import com.example.saiwatersdriver.ui.theme.WaterNavyDark
import com.example.saiwatersdriver.ui.theme.WaterOnEmeraldContainer
import com.example.saiwatersdriver.ui.theme.WaterRoseDanger
import com.example.saiwatersdriver.ui.theme.WaterTextPrimary
import com.example.saiwatersdriver.ui.theme.WaterTextSecondary

/**
 * Shift Tab: Driver Profile, Truck Allocation, and Shift Summary
 */
@Composable
fun ShiftTab(
    driverProfile: DriverProfile,
    totalDeliveredJars: Int,
    totalEmptyCollected: Int,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(6.dp))
        }

        // Driver Info Hero Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, WaterBorderLight)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(18.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .clip(CircleShape)
                                    .background(WaterCyanPrimary),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "RK",
                                    fontWeight = FontWeight.Black,
                                    color = Color.White,
                                    fontSize = 18.sp
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = driverProfile.fullName,
                                    fontWeight = FontWeight.Black,
                                    fontSize = 16.sp,
                                    color = WaterTextPrimary
                                )
                                Text(
                                    text = "Driver ID: ${driverProfile.driverId}",
                                    fontSize = 11.sp,
                                    color = WaterTextSecondary
                                )
                            }
                        }

                        Surface(
                            shape = RoundedCornerShape(50),
                            color = WaterEmeraldContainer
                        ) {
                            Text(
                                text = "ACTIVE SHIFT",
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = WaterOnEmeraldContainer
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = Color(0xFFF8FAFC),
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, WaterBorderLight)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceAround
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(text = "DELIVERED", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = WaterTextSecondary)
                                Text(text = "$totalDeliveredJars Jars", fontWeight = FontWeight.Black, fontSize = 16.sp, color = WaterNavyDark)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(text = "EMPTY RETURN", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = WaterTextSecondary)
                                Text(text = "$totalEmptyCollected Jars", fontWeight = FontWeight.Black, fontSize = 16.sp, color = WaterEmeraldGreen)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(text = "TRIP", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = WaterTextSecondary)
                                Text(text = "ACTIVE", fontWeight = FontWeight.Black, fontSize = 16.sp, color = WaterCyanPrimary)
                            }
                        }
                    }
                }
            }
        }

        // Assigned Vehicle Details
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, WaterBorderLight)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "ASSIGNED VEHICLE & ROUTE",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = WaterTextSecondary
                    )
                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(WaterCyanContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.LocalShipping,
                                contentDescription = null,
                                tint = WaterCyanPrimary,
                                modifier = Modifier.size(22.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column {
                            Text(
                                text = driverProfile.vehicleNumber,
                                fontWeight = FontWeight.Black,
                                fontSize = 15.sp,
                                color = WaterNavyDark
                            )
                            Text(
                                text = driverProfile.vehicleType,
                                fontSize = 11.sp,
                                color = WaterTextSecondary
                            )
                        }
                    }
                }
            }
        }

        // Action: Sync with Sai Waters ERP Cloud
        item {
            Button(
                onClick = { /* Force Sync */ },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = WaterNavyDark,
                    contentColor = Color.White
                )
            ) {
                Icon(imageVector = Icons.Default.Sync, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Sync All Records to Sai Waters Cloud",
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )
            }
        }

        item {
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
