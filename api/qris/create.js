const crypto = require("crypto")
const QRCode = require("qrcode")
const axios = require("axios")

function convertCRC16(str) {
  let crc = 0xffff
  const strlen = str.length

  for (let c = 0; c < strlen; c++) {
    crc ^= str.charCodeAt(c) << 8

    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021
      } else {
        crc = crc << 1
      }
    }
  }

  let hex = crc & 0xffff
  hex = ("000" + hex.toString(16).toUpperCase()).slice(-4)

  return hex
}

function generateTransactionId() {
  return `QRIS-${crypto.randomBytes(4).toString("hex").toUpperCase()}`
}

function generateExpirationTime() {
  const expirationTime = new Date()
  expirationTime.setMinutes(expirationTime.getMinutes() + 5) // 5 minutes
  return expirationTime
}

async function checkExistingPayments(ordId, ordApikey) {
  try {
    console.log("🔍 Checking existing payments from OrderKuota API...")

    const url = `https://gateway.okeconnect.com/api/mutasi/qris/${ordId}/${ordApikey}`
    console.log("📤 Calling OrderKuota API:", url)

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
      console.log("✅ Successfully retrieved", payments.length, "payment records")

      // Extract amounts from existing payments
      const existingAmounts = payments
        .filter((payment) => payment.type === "CR" && payment.qris === "static")
        .map((payment) => Number.parseInt(payment.amount))
        .filter((amount) => !isNaN(amount))

      console.log("💰 Existing payment amounts:", existingAmounts)
      return existingAmounts
    } else {
      console.log("❌ OrderKuota API returned error or invalid response:", response.data)
      return []
    }
  } catch (error) {
    console.error("❌ Error checking existing payments:", {
      message: error.message,
      code: error.code,
      response: error.response?.status,
    })
    // Return empty array if API fails, so we can still create QRIS
    return []
  }
}

async function findUniqueAmount(baseAmount, ordId, ordApikey) {
  let amount = baseAmount
  let attempts = 0
  const maxAttempts = 100 // Prevent infinite loop

  console.log("🔍 Finding unique amount, base amount:", baseAmount)

  // Get existing payments from OrderKuota API
  const existingAmounts = await checkExistingPayments(ordId, ordApikey)

  // Also check global memory for pending transactions
  const pendingAmounts = []
  if (global.transactions && global.transactions.size > 0) {
    for (const [transactionId, transaction] of global.transactions) {
      if (transaction.status === "pending") {
        pendingAmounts.push(transaction.amount)
      }
    }
  }

  console.log("🔍 Pending amounts in memory:", pendingAmounts)

  // Combine both sources
  const allExistingAmounts = [...existingAmounts, ...pendingAmounts]
  console.log("🔍 All existing amounts to check:", allExistingAmounts)

  while (attempts < maxAttempts) {
    // Check if this amount exists in existing payments or pending transactions
    const amountExists = allExistingAmounts.includes(amount)

    if (!amountExists) {
      console.log(`✅ Found unique amount: ${amount} (original: ${baseAmount}, attempts: ${attempts})`)
      return {
        finalAmount: amount,
        wasAdjusted: amount !== baseAmount,
        adjustedBy: amount - baseAmount,
      }
    }

    console.log(`🔄 Amount ${amount} exists, trying ${amount + 1}... (attempt ${attempts + 1})`)
    amount += 1
    attempts += 1
  }

  // If we can't find unique amount after max attempts, use random suffix
  const randomSuffix = Math.floor(Math.random() * 1000) + 100
  const finalAmount = baseAmount + randomSuffix
  console.log(`⚠️ Max attempts reached, using random amount: ${finalAmount}`)

  return {
    finalAmount: finalAmount,
    wasAdjusted: true,
    adjustedBy: finalAmount - baseAmount,
  }
}

async function createQRIS(amount, codeqr) {
  try {
    console.log("🔄 Creating QRIS for amount:", amount)
    console.log("🔄 CODEQR length:", codeqr ? codeqr.length : 0)

    if (!codeqr || codeqr.length < 10) {
      throw new Error("Invalid CODEQR - too short or empty")
    }

    let qrisData = codeqr.trim()

    // Remove existing CRC (last 4 characters)
    qrisData = qrisData.slice(0, -4)
    console.log("🔄 QRIS data after CRC removal:", qrisData.substring(0, 50) + "...")

    // Replace static with dynamic
    const step1 = qrisData.replace("010211", "010212")
    const step2 = step1.split("5802ID")

    if (step2.length !== 2) {
      throw new Error("Invalid QRIS format - cannot split by 5802ID")
    }

    amount = amount.toString()
    let uang = "54" + ("0" + amount.length).slice(-2) + amount
    uang += "5802ID"

    const finalQrisString = step2[0] + uang + step2[1] + convertCRC16(step2[0] + uang + step2[1])

    console.log("✅ Final QRIS string generated, length:", finalQrisString.length)
    console.log("🔄 Sample QRIS string:", finalQrisString.substring(0, 100) + "...")

    // Generate QR code with multiple format options
    const qrOptions = {
      width: 512,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
      type: "image/png",
    }

    // Generate both data URL and buffer for debugging
    const qrDataURL = await QRCode.toDataURL(finalQrisString, qrOptions)
    const qrBuffer = await QRCode.toBuffer(finalQrisString, qrOptions)

    console.log("✅ QR Code generated successfully!")
    console.log("📊 QR Data URL length:", qrDataURL.length)
    console.log("📊 QR Buffer length:", qrBuffer.length)
    console.log("🔍 QR Data URL prefix:", qrDataURL.substring(0, 50))

    // Validate the data URL
    if (!qrDataURL.startsWith("data:image/png;base64,")) {
      throw new Error("Invalid QR code data URL format")
    }

    const transactionData = {
      idtransaksi: generateTransactionId(),
      jumlah: Number.parseInt(amount),
      expired: generateExpirationTime(),
      qrisString: finalQrisString,
      imageqris: {
        url: qrDataURL,
        format: "base64",
        size: "512x512",
        type: "image/png",
      },
      debug: {
        qrisLength: finalQrisString.length,
        imageSize: qrBuffer.length,
        timestamp: new Date().toISOString(),
      },
    }

    console.log("✅ Transaction data created:", {
      id: transactionData.idtransaksi,
      amount: transactionData.jumlah,
      imageUrlLength: transactionData.imageqris.url.length,
    })

    return transactionData
  } catch (error) {
    console.error("❌ Error in createQRIS:", error.message)
    console.error("❌ Stack trace:", error.stack)
    throw error
  }
}

module.exports = (app) => {
  app.get("/api/qris/create", async (req, res) => {
    try {
      const { amount } = req.body

      console.log("📥 Received create QRIS request:", { amount, timestamp: new Date().toISOString() })

      // Validation
      if (!amount || amount <= 0) {
        return res.status(400).json({
          status: false,
          message: "Jumlah harus diisi dan lebih dari 0",
        })
      }

      // Check environment variables
      const codeqr = process.env.CODEQR
      const ordId = process.env.ORD_ID
      const ordApikey = process.env.ORD_APIKEY

      console.log("🔍 Environment check:", {
        codeqr: codeqr ? `Available (${codeqr.length} chars)` : "Missing",
        ordId: ordId ? "Available" : "Missing",
        ordApikey: ordApikey ? "Available" : "Missing",
      })

      if (!codeqr) {
        console.error("❌ CODEQR environment variable not found")
        return res.status(500).json({
          status: false,
          message: "Konfigurasi QRIS tidak ditemukan. Pastikan CODEQR sudah diset di file .env",
          debug: "CODEQR environment variable is missing",
        })
      }

      if (!ordId || !ordApikey) {
        console.error("❌ OrderKuota credentials missing")
        return res.status(500).json({
          status: false,
          message: "Konfigurasi OrderKuota tidak ditemukan. Pastikan ORD_ID dan ORD_APIKEY sudah diset di file .env",
          debug: "OrderKuota credentials missing",
        })
      }

      // Find unique amount by checking OrderKuota API first
      console.log("🔍 Checking for duplicate amounts via OrderKuota API...")
      const amountResult = await findUniqueAmount(amount, ordId, ordApikey)
      const finalAmount = amountResult.finalAmount

      console.log("💰 Amount processing result:", {
        originalAmount: amount,
        finalAmount: amountResult.finalAmount,
        wasAdjusted: amountResult.wasAdjusted,
        adjustedBy: amountResult.adjustedBy,
      })

      // Create QRIS with final amount
      const qrisResult = await createQRIS(finalAmount, codeqr)

      // Store transaction in memory
      global.transactions.set(qrisResult.idtransaksi, {
        ...qrisResult,
        status: "pending",
        createdAt: new Date(),
        amount: finalAmount,
        originalAmount: amount, // Keep track of original amount
        wasAmountAdjusted: amountResult.wasAdjusted,
        amountAdjustment: amountResult.adjustedBy,
      })

      console.log(`✅ QRIS Created Successfully:`)
      console.log(`   ID: ${qrisResult.idtransaksi}`)
      console.log(`   Original Amount: Rp ${amount.toLocaleString("id-ID")}`)
      console.log(`   Final Amount: Rp ${finalAmount.toLocaleString("id-ID")}`)
      console.log(`   Amount Adjusted: ${amountResult.wasAdjusted ? "Yes" : "No"}`)
      console.log(`   Adjustment: +${amountResult.adjustedBy}`)
      console.log(`   Image URL Length: ${qrisResult.imageqris.url.length}`)
      console.log(`   Expires: ${qrisResult.expired}`)

      // Send response with adjustment info
      const response = {
        status: true,
        message: amountResult.wasAdjusted
          ? `QRIS berhasil dibuat dengan penyesuaian jumlah (Rp ${amount.toLocaleString("id-ID")} → Rp ${finalAmount.toLocaleString("id-ID")})`
          : "QRIS berhasil dibuat",
        data: {
          ...qrisResult,
          originalAmount: amount,
          wasAmountAdjusted: amountResult.wasAdjusted,
          amountAdjustment: amountResult.adjustedBy,
        },
        timestamp: new Date().toISOString(),
      }

      res.json(response)
    } catch (error) {
      console.error("❌ Error in /api/qris/create:", error.message)
      console.error("❌ Full error:", error)

      res.status(500).json({
        status: false,
        message: "Gagal membuat QRIS. Silakan coba lagi.",
        error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
        debug: process.env.NODE_ENV === "development" ? error.stack : undefined,
      })
    }
  })
}
