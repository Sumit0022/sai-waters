package com.example.saiwatersdriver.ui.main

import com.example.saiwatersdriver.model.DeliveryOrder
import com.example.saiwatersdriver.model.DeliveryStatus
import com.example.saiwatersdriver.model.OrderBillingType
import com.example.saiwatersdriver.model.PaymentMode
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DriverLogicTest {

  @Test
  fun orderCalculations_areAccurate() {
    val order = DeliveryOrder(
      id = "ord_test_01",
      orderNumber = "ORD-2026-0042",
      customerId = "cust_01",
      customerName = "Verma Clinic",
      customerPhone = "+91 98765 00000",
      address = "Civil Lines",
      area = "Bareilly",
      jarQuantity = 2,
      ratePerJarPaise = 3500L,
      totalAmountPaise = 7000L,
      alreadyPaidPaise = 0L,
      netDuePaise = 7000L,
      emptyJarsDue = 2,
      status = DeliveryStatus.IN_TRANSIT,
      billingType = OrderBillingType.DAILY_SPOT
    )

    assertEquals(70.0, order.totalAmountRupees, 0.01)
    assertEquals(70.0, order.netDueRupees, 0.01)
    assertEquals(false, order.isFullyDelivered)

    // Simulate Partial Doorstep Cash collection of ₹50
    val paidPaise = 5000L
    val remainingDuePaise = (order.totalAmountPaise - paidPaise).coerceAtLeast(0L)
    val updatedOrder = order.copy(
      status = DeliveryStatus.DELIVERED,
      alreadyPaidPaise = paidPaise,
      netDuePaise = remainingDuePaise,
      paymentCollectedPaise = paidPaise,
      paymentMode = PaymentMode.CASH
    )

    assertEquals(50.0, updatedOrder.paymentCollectedRupees, 0.01)
    assertEquals(20.0, updatedOrder.netDueRupees, 0.01)
    assertTrue(updatedOrder.isFullyDelivered)
  }
}
