class QRISPaymentGateway {
  constructor() {
    this.currentTransaction = null
    this.statusCheckInterval = null
    this.countdownInterval = null
    this.init()
  }

  init() {
    this.bindEvents()
    this.setupAmountInput()
    console.log("🚀 QRIS Payment Gateway initialized")
  }

  bindEvents() {
    const paymentForm = document.getElementById("paymentForm")
    if (paymentForm) paymentForm.addEventListener("submit", (e) => this.handleCreatePayment(e))
  }

  setupAmountInput() {
    const amountInput = document.getElementById("amount")
    if (!amountInput) return

    // Format input as user types
    amountInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "")
      if (value) {
        value = Number.parseInt(value).toLocaleString("id-ID")
        e.target.value = value
      }
    })

    // Remove formatting on focus for easier editing
    amountInput.addEventListener("focus", (e) => {
      const value = e.target.value.replace(/\./g, "")
      e.target.value = value
    })

    // Add formatting back on blur
    amountInput.addEventListener("blur", (e) => {
      const value = e.target.value.replace(/\D/g, "")
      if (value) {
        e.target.value = Number.parseInt(value).toLocaleString("id-ID")
      }
    })
  }

  async handleCreatePayment(e) {
    e.preventDefault()

    const amountInput = document.getElementById("amount")
    if (!amountInput) {
      console.error("❌ Amount input not found")
      return
    }

    const rawAmount = amountInput.value.replace(/\D/g, "")
    const amount = Number.parseInt(rawAmount)

    console.log("💰 Creating payment for amount:", amount)

    if (!amount || amount <= 0) {
      this.showToast("Jumlah harus diisi dan lebih dari 0", "error")
      return
    }

    this.setCreateButtonLoading(true)

    try {
      console.log("📤 Sending request to /api/qris/create...")

      const response = await fetch("/api/qris/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      })

      console.log("📥 Response status:", response.status)

      const result = await response.json()
      console.log("📥 Full API response:", result)

      if (result.status && result.data) {
        console.log("✅ Payment created successfully!")
        this.currentTransaction = result.data

        // Check if amount was adjusted
        if (result.data.wasAmountAdjusted) {
          const originalAmount = result.data.originalAmount.toLocaleString("id-ID")
          const finalAmount = result.data.jumlah.toLocaleString("id-ID")
          this.showToast(
            `💡 Jumlah disesuaikan dari Rp ${originalAmount} menjadi Rp ${finalAmount} untuk menghindari duplikasi.`,
            "info",
          )
        } else {
          this.showToast("QRIS berhasil dibuat! Silakan scan untuk membayar.", "success")
        }

        // NO REDIRECT - Show status on same page
        this.showPaymentStatus()
      } else {
        console.error("❌ Failed to create payment:", result.message)
        this.showToast(result.message || "Gagal membuat QRIS", "error")
      }
    } catch (error) {
      console.error("❌ Error creating payment:", error)
      this.showToast("Terjadi kesalahan saat membuat QRIS", "error")
    } finally {
      this.setCreateButtonLoading(false)
    }
  }

  showPaymentStatus() {
    // Hide create section, show status section
    const createSection = document.getElementById("createSection")
    const statusSection = document.getElementById("statusSection")

    if (createSection) createSection.classList.add("hidden")
    if (statusSection) {
      statusSection.classList.remove("hidden")
      this.updateStatusDisplay()
      this.startStatusCheck()
      this.startCountdown()
    }
  }

  updateStatusDisplay() {
    if (!this.currentTransaction) return

    const transaction = this.currentTransaction

    // Update transaction ID
    const transactionIdEl = document.getElementById("transactionId")
    if (transactionIdEl) {
      transactionIdEl.textContent = transaction.idtransaksi
    }

    // Update amount
    const paymentAmountEl = document.getElementById("paymentAmount")
    if (paymentAmountEl) {
      paymentAmountEl.textContent = this.formatCurrency(transaction.jumlah)
    }

    // Update expiry
    const paymentExpiryEl = document.getElementById("paymentExpiry")
    if (paymentExpiryEl) {
      paymentExpiryEl.textContent = this.formatDateTime(transaction.expired)
    }

    // Show adjustment info if needed
    const adjustmentInfo = document.getElementById("adjustmentInfo")
    const adjustmentText = document.getElementById("adjustmentText")

    if (transaction.wasAmountAdjusted && transaction.originalAmount && adjustmentInfo && adjustmentText) {
      const originalAmount = this.formatCurrency(transaction.originalAmount)
      const finalAmount = this.formatCurrency(transaction.jumlah)
      adjustmentText.textContent = `${originalAmount} → ${finalAmount} (+${transaction.amountAdjustment || 1})`
      adjustmentInfo.classList.remove("hidden")
    } else if (adjustmentInfo) {
      adjustmentInfo.classList.add("hidden")
    }

    // Display QRIS image
    this.displayQRISImage()
  }

  displayQRISImage() {
    if (!this.currentTransaction?.imageqris?.url) {
      console.error("❌ No QRIS image data")
      return
    }

    const qrisLoading = document.getElementById("qrisLoading")
    const qrisImage = document.getElementById("qrisImage")

    if (!qrisImage) {
      console.error("❌ QRIS image element not found!")
      return
    }

    // Hide loading
    if (qrisLoading) {
      qrisLoading.style.display = "none"
    }

    // Show and configure image
    qrisImage.style.display = "block"
    qrisImage.style.width = "280px"
    qrisImage.style.height = "280px"
    qrisImage.style.objectFit = "contain"
    qrisImage.style.border = "2px solid #e5e7eb"
    qrisImage.style.borderRadius = "12px"
    qrisImage.style.backgroundColor = "white"
    qrisImage.style.boxShadow = "0 4px 6px -1px rgb(0 0 0 / 0.1)"
    qrisImage.classList.remove("hidden")

    // Set the source
    qrisImage.src = this.currentTransaction.imageqris.url
    qrisImage.alt = `QRIS Payment Code - ${this.currentTransaction.idtransaksi}`

    // Event listeners
    qrisImage.onload = () => {
      console.log("✅ QRIS image loaded successfully!")
    }

    qrisImage.onerror = (error) => {
      console.error("❌ QRIS image failed to load:", error)
      this.showToast("Gagal memuat QR Code", "error")
    }
  }

  startStatusCheck() {
    if (!this.currentTransaction) return

    this.statusCheckInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/qris/status/${this.currentTransaction.idtransaksi}`)
        const result = await response.json()

        if (result.status && result.data) {
          const oldStatus = this.currentTransaction.status
          this.currentTransaction = result.data

          if (oldStatus !== this.currentTransaction.status) {
            if (this.currentTransaction.status === "success") {
              this.showToast("🎉 Pembayaran berhasil!", "success")
              this.stopStatusCheck()
              this.stopCountdown()
              this.showSuccessState()
            } else if (this.currentTransaction.status === "expired") {
              this.showToast("⏰ Pembayaran telah kedaluwarsa", "warning")
              this.stopStatusCheck()
              this.stopCountdown()
              this.showExpiredState()
            }
          }
        }
      } catch (error) {
        console.error("❌ Error checking status:", error)
      }
    }, 5000)
  }

  stopStatusCheck() {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval)
      this.statusCheckInterval = null
    }
  }

  startCountdown() {
    if (!this.currentTransaction) return

    const startTime = new Date().getTime()
    const endTime = new Date(this.currentTransaction.expired).getTime()
    const totalDuration = endTime - startTime

    const updateCountdown = () => {
      const now = new Date().getTime()
      const timeLeft = endTime - now

      if (timeLeft <= 0) {
        const minutesEl = document.getElementById("minutes")
        const secondsEl = document.getElementById("seconds")
        const progressFill = document.getElementById("progressFill")

        if (minutesEl) minutesEl.textContent = "00"
        if (secondsEl) secondsEl.textContent = "00"
        if (progressFill) progressFill.style.width = "0%"

        this.stopCountdown()
        return
      }

      const minutes = Math.floor(timeLeft / 60000)
      const seconds = Math.floor((timeLeft % 60000) / 1000)

      const minutesEl = document.getElementById("minutes")
      const secondsEl = document.getElementById("seconds")
      const progressFill = document.getElementById("progressFill")

      if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, "0")
      if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, "0")

      const progress = (timeLeft / totalDuration) * 100
      if (progressFill) progressFill.style.width = `${progress}%`
    }

    updateCountdown()
    this.countdownInterval = setInterval(updateCountdown, 1000)
  }

  stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval)
      this.countdownInterval = null
    }
  }

  showSuccessState() {
    const countdownSection = document.getElementById("countdownSection")
    const qrisSection = document.getElementById("qrisSection")
    const successSection = document.getElementById("successSection")

    if (countdownSection) countdownSection.classList.add("hidden")
    if (qrisSection) qrisSection.classList.add("hidden")
    if (successSection) successSection.classList.remove("hidden")
  }

  showExpiredState() {
    const countdownSection = document.getElementById("countdownSection")
    const qrisSection = document.getElementById("qrisSection")
    const messageSection = document.getElementById("messageSection")

    if (countdownSection) countdownSection.classList.add("hidden")
    if (qrisSection) qrisSection.classList.add("hidden")
    if (messageSection) {
      messageSection.classList.remove("hidden")
      const messageTitle = document.getElementById("messageTitle")
      const messageText = document.getElementById("messageText")
      if (messageTitle) messageTitle.textContent = "Pembayaran Kedaluwarsa"
      if (messageText) messageText.textContent = "Waktu pembayaran telah habis. Silakan buat pembayaran baru."
    }
  }

  setCreateButtonLoading(loading) {
    const createBtn = document.getElementById("createBtn")
    if (createBtn) {
      if (loading) {
        createBtn.classList.add("loading")
        createBtn.disabled = true
      } else {
        createBtn.classList.remove("loading")
        createBtn.disabled = false
      }
    }
  }

  showToast(message, type = "success") {
    const toastContainer = document.getElementById("toastContainer")
    if (!toastContainer) return

    const toast = document.createElement("div")
    toast.className = `toast toast-${type}`

    toast.innerHTML = `
      <div class="toast-icon">
        <i class="fas ${this.getToastIcon(type)}"></i>
      </div>
      <div class="toast-message">${message}</div>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `

    toastContainer.appendChild(toast)

    setTimeout(() => toast.classList.add("show"), 100)
    setTimeout(() => {
      toast.classList.remove("show")
      setTimeout(() => toast.remove(), 300)
    }, 5000)
  }

  getToastIcon(type) {
    const icons = {
      success: "fa-check-circle",
      error: "fa-exclamation-circle",
      warning: "fa-exclamation-triangle",
      info: "fa-info-circle",
    }
    return icons[type] || icons.info
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  formatDateTime(dateString) {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date)
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.paymentGateway = new QRISPaymentGateway()
  console.log("✅ Payment Gateway ready!")
})
