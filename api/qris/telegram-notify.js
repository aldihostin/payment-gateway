const { Telegraf } = require("telegraf")

// Initialize bot (will be created when needed)
let bot = null

function initializeBot() {
  const token = process.env.TELEGRAM_TOKEN
  if (!token) {
    throw new Error("TELEGRAM_TOKEN not found in environment variables")
  }

  if (!bot) {
    bot = new Telegraf(token)
    console.log("🤖 Telegram bot initialized")
  }

  return bot
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatDateTime(dateString) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date)
}

async function sendPaymentNotification(paymentData) {
  try {
    const bot = initializeBot()
    const ownerId = process.env.OWNER_ID

    if (!ownerId) {
      throw new Error("OWNER_ID not found in environment variables")
    }

    // Create notification message
    let message = `🎉 *PEMBAYARAN BERHASIL!*\n\n`
    message += `💰 *Jumlah:* ${formatCurrency(paymentData.amount)}\n`
    message += `🆔 *ID Transaksi:* \`${paymentData.transactionId}\`\n`
    message += `⏰ *Waktu:* ${formatDateTime(paymentData.paidAt || new Date())}\n`
    message += `💳 *Metode:* QRIS\n`
    message += `✅ *Status:* BERHASIL\n\n`

    // Add adjustment info if applicable
    if (paymentData.wasAmountAdjusted && paymentData.originalAmount) {
      const originalAmount = formatCurrency(paymentData.originalAmount)
      const finalAmount = formatCurrency(paymentData.amount)
      message += `📝 *Penyesuaian Jumlah:*\n`
      message += `   ${originalAmount} → ${finalAmount}\n`
      message += `   (+${paymentData.amountAdjustment || 1})\n\n`
    }

    message += `🔗 *QRIS Gateway*\n`
    message += `Powered by @krsna_081`

    // Send message to owner
    await bot.telegram.sendMessage(ownerId, message, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    })

    console.log("✅ Telegram notification sent to owner:", ownerId)
    return { success: true, message: "Notification sent successfully" }
  } catch (error) {
    console.error("❌ Error sending Telegram notification:", error.message)
    return { success: false, message: error.message }
  }
}

module.exports = (app) => {
  app.post("/api/qris/telegram-notify", async (req, res) => {
    try {
      const { transactionId, amount, originalAmount, wasAmountAdjusted, amountAdjustment, paidAt } = req.body

      console.log("📱 Received Telegram notification request:", {
        transactionId,
        amount,
        wasAmountAdjusted,
      })

      // Validate required data
      if (!transactionId || !amount) {
        return res.status(400).json({
          status: false,
          message: "Missing required payment data",
        })
      }

      // Check if Telegram is configured
      const telegramToken = process.env.TELEGRAM_TOKEN
      const ownerId = process.env.OWNER_ID

      if (!telegramToken || !ownerId) {
        console.log("⚠️ Telegram not configured - skipping notification")
        return res.json({
          status: true,
          message: "Telegram not configured - notification skipped",
        })
      }

      // Send notification
      const result = await sendPaymentNotification({
        transactionId,
        amount,
        originalAmount,
        wasAmountAdjusted,
        amountAdjustment,
        paidAt,
      })

      if (result.success) {
        res.json({
          status: true,
          message: "Telegram notification sent successfully",
        })
      } else {
        res.status(500).json({
          status: false,
          message: "Failed to send Telegram notification",
          error: result.message,
        })
      }
    } catch (error) {
      console.error("❌ Error in telegram-notify endpoint:", error)
      res.status(500).json({
        status: false,
        message: "Internal server error",
        error: error.message,
      })
    }
  })

  // Test endpoint to check Telegram configuration
  app.get("/api/qris/telegram-test", async (req, res) => {
    try {
      const telegramToken = process.env.TELEGRAM_TOKEN
      const ownerId = process.env.OWNER_ID

      if (!telegramToken || !ownerId) {
        return res.json({
          status: false,
          message: "Telegram not configured",
          config: {
            hasToken: !!telegramToken,
            hasOwnerId: !!ownerId,
          },
        })
      }

      // Test sending a message
      const bot = initializeBot()
      await bot.telegram.sendMessage(ownerId, "🧪 *Test Notification*\n\nTelegram bot berhasil terkonfigurasi!", {
        parse_mode: "Markdown",
      })

      res.json({
        status: true,
        message: "Telegram test notification sent successfully",
        config: {
          hasToken: true,
          hasOwnerId: true,
          ownerId: ownerId,
        },
      })
    } catch (error) {
      console.error("❌ Telegram test failed:", error)
      res.status(500).json({
        status: false,
        message: "Telegram test failed",
        error: error.message,
      })
    }
  })
}
