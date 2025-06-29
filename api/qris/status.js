const axios = require("axios")

module.exports = (app) => {
  app.get("/api/qris/status/:transactionId", async (req, res) => {
    try {
      const { transactionId } = req.params

      console.log("🔍 Checking status for transaction:", transactionId)

      // Check if transaction exists in global memory
      if (!global.transactions || !global.transactions.has(transactionId)) {
        console.log("❌ Transaction not found in global memory")
        return res.status(404).json({
          status: false,
          message: "Transaction not found",
        })
      }

      const transaction = global.transactions.get(transactionId)
      const now = new Date()
      const expiredTime = new Date(transaction.expired)

      console.log("⏰ Time check:", {
        now: now.toISOString(),
        expiredTime: expiredTime.toISOString(),
        currentStatus: transaction.status,
        timeLeft: Math.floor((expiredTime.getTime() - now.getTime()) / 1000) + " seconds",
      })

      // FIXED: Check if expired (at actual expiry time, not 5 minutes before)
      if (now >= expiredTime && transaction.status === "pending") {
        console.log("⏰ Transaction expired - updating status")
        transaction.status = "expired"
        global.transactions.set(transactionId, transaction)

        return res.json({
          status: true,
          message: "Transaction expired",
          data: {
            ...transaction,
            status: "expired",
          },
        })
      }

      // If still pending and not expired, check payment status from OrderKuota
      if (transaction.status === "pending") {
        try {
          const ordId = process.env.ORD_ID
          const ordApikey = process.env.ORD_APIKEY

          console.log("🔍 Checking OrderKuota API:", {
            ordId: ordId ? "Available" : "Missing",
            ordApikey: ordApikey ? "Available" : "Missing",
          })

          if (!ordId || !ordApikey) {
            console.log("❌ OrderKuota credentials missing")
            throw new Error("OrderKuota credentials not configured")
          }

          const url = `https://gateway.okeconnect.com/api/mutasi/qris/${ordId}/${ordApikey}`
          console.log("📤 Calling OrderKuota API:", url)

          // FIXED: Add timeout and better error handling
          const response = await axios.get(url, {
            timeout: 10000, // 10 seconds timeout
            headers: {
              "User-Agent": "QRIS-Gateway/1.0",
              Accept: "application/json",
            },
          })

          console.log("📥 OrderKuota API response:", {
            status: response.status,
            dataStatus: response.data?.status,
            dataLength: response.data?.data ? response.data.data.length : 0,
          })

          if (response.data && response.data.status === "success") {
            const payments = response.data.data || []

            console.log("🔍 Searching for payment in", payments.length, "transactions")

            // Find successful payment
            const successfulPayment = payments.find((payment) => {
              const match = payment.type === "CR" && payment.qris === "static" && payment.amount == transaction.amount

              console.log("🔍 Checking payment:", {
                paymentType: payment.type,
                paymentQris: payment.qris,
                paymentAmount: payment.amount,
                transactionAmount: transaction.amount,
                match: match,
              })

              return match
            })

            if (successfulPayment) {
              console.log("✅ Payment found! Updating transaction status")
              const oldStatus = transaction.status
              transaction.status = "success"
              transaction.paidAt = new Date()
              transaction.paymentDetails = successfulPayment
              global.transactions.set(transactionId, transaction)

              console.log("✅ Transaction status updated to success:", transactionId)

              // Handle status changes
              if (transaction.status === "success" && oldStatus !== "success") {
                console.log("🎉 Pembayaran berhasil!")
                // Send Telegram notification to owner
                sendOwnerNotification(transaction)
              }
            } else {
              console.log("💭 No matching payment found yet")
            }
          } else {
            console.log("❌ OrderKuota API returned error or invalid response:", response.data)
          }
        } catch (apiError) {
          console.error("❌ Error checking OrderKuota API:", {
            message: apiError.message,
            code: apiError.code,
            response: apiError.response?.status,
            timeout: apiError.code === "ECONNABORTED",
          })

          // Don't throw error, just log it and continue with current status
          // This prevents the whole status check from failing
        }
      }

      console.log("📊 Final transaction status:", transaction.status)

      // Clean up completed transactions (success, cancelled, expired)
      if (transaction.status !== "pending") {
        console.log("🧹 Scheduling cleanup for completed transaction:", transactionId)
        // Clean up after 1 minute to allow final status checks
        setTimeout(() => {
          if (global.transactions && global.transactions.has(transactionId)) {
            const finalTransaction = global.transactions.get(transactionId)
            if (finalTransaction.status !== "pending") {
              global.transactions.delete(transactionId)
              console.log("🗑️ Cleaned up completed transaction:", transactionId)
            }
          }
        }, 60000) // 1 minute delay
      }

      // Always return current transaction status
      res.json({
        status: true,
        message: "Transaction status retrieved",
        data: transaction,
      })
    } catch (error) {
      console.error("❌ Error getting transaction status:", error)
      res.status(500).json({
        status: false,
        message: "Failed to get transaction status",
        error: error.message,
      })
    }
  })

  async function sendOwnerNotification(transaction) {
    try {
      console.log("📱 Sending owner notification for successful payment...")

      const response = await fetch("https://qris-krizz.vercel.app/api/qris/telegram-notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionId: transaction.idtransaksi,
          amount: transaction.amount,
          originalAmount: transaction.originalAmount,
          wasAmountAdjusted: transaction.wasAmountAdjusted,
          amountAdjustment: transaction.amountAdjustment,
          paidAt: new Date().toISOString(),
        }),
      })

      const result = await response.json()

      if (result.status) {
        console.log("✅ Owner notification sent successfully")
      } else {
        console.log("❌ Failed to send owner notification:", result.message)
      }
    } catch (error) {
      console.error("❌ Error sending owner notification:", error)
      // Don't show error to user as this is background notification
    }
  }
}
