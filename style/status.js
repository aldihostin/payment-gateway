class QRISStatusPage {
  constructor() {
    this.transactionId = null
    this.currentTransaction = null
    this.countdownInterval = null
    this.statusCheckInterval = null
    this.nextCheckInterval = null
    this.nextCheckSeconds = 5
    this.init()
  }

  init() {
    console.log("🚀 QRIS Status Page initialized")

    // Get transaction ID from URL
    this.transactionId = this.getTransactionIdFromURL()

    if (!this.transactionId) {
      this.showError("ID transaksi tidak ditemukan di URL")
      return
    }

    console.log("🔍 Transaction ID from URL:", this.transactionId)

    // Bind events
    this.bindEvents()

    // Load transaction data
    this.loadTransactionData()
  }

  getTransactionIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get("id")
  }

  bindEvents() {
    const cancelBtn = document.getElementById("cancelBtn")
    const newPaymentBtn = document.getElementById("newPaymentBtn")

    if (cancelBtn) cancelBtn.addEventListener("click", () => this.handleCancelPayment())
    if (newPaymentBtn) newPaymentBtn.addEventListener("click", () => this.handleNewPayment())
  }

  async loadTransactionData() {
    console.log("📥 Loading transaction data for:", this.transactionId)

    try {
      const response = await fetch(`/api/qris/status/${this.transactionId}`)
      const result = await response.json()

      console.log("📥 Transaction data loaded:", result)

      if (result.status && result.data) {
        this.currentTransaction = result.data
        this.showTransactionStatus()
        this.startAutoStatusCheck()
        this.startCountdown()
      } else {
        this.showError(result.message || "Transaksi tidak ditemukan")
      }
    } catch (error) {
      console.error("❌ Error loading transaction:", error)
      this.showError("Gagal memuat data transaksi")
    }
  }

  showTransactionStatus() {
    console.log("🔄 Showing transaction status...")

    // Hide loading, show status
    const loadingSection = document.getElementById("loadingSection")
    const statusSection = document.getElementById("statusSection")

    if (loadingSection) loadingSection.classList.add("hidden")
    if (statusSection) statusSection.classList.remove("hidden")

    // Update transaction info
    this.updateTransactionInfo()

    // Display QRIS image
    this.displayQRISImage()
  }

  updateTransactionInfo() {
    if (!this.currentTransaction) return

    const transaction = this.currentTransaction
    console.log("🔄 Updating transaction info...")

    // Update transaction ID
    const transactionIdEl = document.getElementById("transactionId")
    if (transactionIdEl) {
      transactionIdEl.textContent = transaction.idtransaksi
    }

    // Update amount with adjustment info
    const paymentAmountEl = document.getElementById("paymentAmount")
    if (paymentAmountEl) {
      let amountText = this.formatCurrency(transaction.jumlah)

      // Show adjustment info if amount was adjusted
      if (transaction.wasAmountAdjusted && transaction.originalAmount) {
        const originalAmount = this.formatCurrency(transaction.originalAmount)
        amountText += ` (disesuaikan dari ${originalAmount})`

        // Show info toast about adjustment
        this.showToast(
          `💡 Jumlah pembayaran disesuaikan dari ${originalAmount} menjadi ${this.formatCurrency(transaction.jumlah)} untuk menghindari duplikasi`,
          "info",
        )
      }

      paymentAmountEl.innerHTML = amountText
      console.log("✅ Payment amount updated:", transaction.jumlah)
    }

    // Show adjustment info if amount was adjusted
    const adjustmentInfo = document.getElementById("adjustmentInfo")
    const adjustmentText = document.getElementById("adjustmentText")

    if (transaction.wasAmountAdjusted && transaction.originalAmount && adjustmentInfo && adjustmentText) {
      const originalAmount = this.formatCurrency(transaction.originalAmount)
      const finalAmount = this.formatCurrency(transaction.jumlah)
      adjustmentText.textContent = `${originalAmount} → ${finalAmount} (+${transaction.amountAdjustment || 1})`
      adjustmentInfo.classList.remove("hidden")
      console.log("✅ Adjustment info displayed")
    } else if (adjustmentInfo) {
      adjustmentInfo.classList.add("hidden")
    }

    // Update expiry
    const paymentExpiryEl = document.getElementById("paymentExpiry")
    if (paymentExpiryEl) {
      paymentExpiryEl.textContent = this.formatDateTime(transaction.expired)
    }

    // Update status badge
    this.updateStatusBadge(transaction.status || "pending")
  }

  updateStatusBadge(status) {
    const statusBadge = document.getElementById("statusBadge")
    if (statusBadge) {
      statusBadge.className = `status-badge status-${status}`
      statusBadge.textContent = this.getStatusText(status)
    }
  }

  displayQRISImage() {
    console.log("🖼️ Displaying QRIS image...")

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
      this.showToast("QR Code berhasil dimuat!", "success")
    }

    qrisImage.onerror = (error) => {
      console.error("❌ QRIS image failed to load:", error)
      this.showImageError("Gagal memuat QR Code")
    }
  }

  // AUTO STATUS CHECK - EVERY 5 SECONDS
  startAutoStatusCheck() {
    console.log("🔄 Starting auto status check every 5 seconds...")

    // Show auto check info
    const autoCheckInfo = document.getElementById("autoCheckInfo")
    if (autoCheckInfo) {
      autoCheckInfo.classList.remove("hidden")
    }

    // Start next check countdown
    this.startNextCheckCountdown()

    // Check status immediately, then every 5 seconds
    this.checkStatus()
    this.statusCheckInterval = setInterval(() => {
      this.checkStatus()
      this.resetNextCheckCountdown()
    }, 5000)
  }

  startNextCheckCountdown() {
    this.nextCheckSeconds = 5
    this.updateNextCheckDisplay()

    this.nextCheckInterval = setInterval(() => {
      this.nextCheckSeconds--
      this.updateNextCheckDisplay()

      if (this.nextCheckSeconds <= 0) {
        this.nextCheckSeconds = 5
      }
    }, 1000)
  }

  resetNextCheckCountdown() {
    this.nextCheckSeconds = 5
    this.updateNextCheckDisplay()
  }

  updateNextCheckDisplay() {
    const nextCheckCountdown = document.getElementById("nextCheckCountdown")
    if (nextCheckCountdown) {
      nextCheckCountdown.textContent = this.nextCheckSeconds
    }
  }

  async checkStatus() {
    if (!this.transactionId) return

    try {
      console.log("🔄 Auto checking status for:", this.transactionId)

      const response = await fetch(`/api/qris/status/${this.transactionId}`, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log("📥 Status check result:", result)

      if (result.status && result.data) {
        const oldStatus = this.currentTransaction?.status || "pending"
        this.currentTransaction = result.data
        const newStatus = this.currentTransaction.status

        console.log("📊 Status update:", { oldStatus, newStatus })

        // Update status badge
        this.updateStatusBadge(newStatus)

        // Handle status changes
        if (newStatus === "success" && oldStatus !== "success") {
          this.showToast("🎉 Pembayaran berhasil!", "success")
          this.stopAutoStatusCheck()
          this.stopCountdown()
          this.showSuccessState()
        } else if (newStatus === "expired" && oldStatus !== "expired") {
          this.showToast("⏰ Pembayaran telah kedaluwarsa", "warning")
          this.stopAutoStatusCheck()
          this.stopCountdown()
          this.showExpiredState()
        }
      }
    } catch (error) {
      console.error("❌ Error in auto status check:", error)
      // Don't show error toast for auto checks to avoid spam
    }
  }

  stopAutoStatusCheck() {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval)
      this.statusCheckInterval = null
      console.log("⏹️ Auto status check stopped")
    }

    if (this.nextCheckInterval) {
      clearInterval(this.nextCheckInterval)
      this.nextCheckInterval = null
    }

    // Hide auto check info
    const autoCheckInfo = document.getElementById("autoCheckInfo")
    if (autoCheckInfo) {
      autoCheckInfo.classList.add("hidden")
    }
  }

  startCountdown() {
    if (!this.currentTransaction) return

    const startTime = new Date().getTime()
    const endTime = new Date(this.currentTransaction.expired).getTime()
    const totalDuration = endTime - startTime

    console.log("⏰ Starting countdown...")

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
      console.log("⏹️ Countdown stopped")
    }
  }

  showSuccessState() {
    const countdownSection = document.getElementById("countdownSection")
    const qrisSection = document.getElementById("qrisSection")
    const cancelBtn = document.getElementById("cancelBtn")
    const newPaymentBtn = document.getElementById("newPaymentBtn")
    const successSection = document.getElementById("successSection")

    if (countdownSection) countdownSection.classList.add("hidden")
    if (qrisSection) qrisSection.classList.add("hidden")
    if (cancelBtn) cancelBtn.classList.add("hidden")
    if (newPaymentBtn) newPaymentBtn.classList.remove("hidden")
    if (successSection) {
      successSection.classList.remove("hidden")
      const paidTime = document.getElementById("paidTime")
      if (paidTime && this.currentTransaction.paidAt) {
        paidTime.textContent = this.formatDateTime(this.currentTransaction.paidAt)
      }
    }
  }

  showExpiredState() {
    const countdownSection = document.getElementById("countdownSection")
    const qrisSection = document.getElementById("qrisSection")
    const cancelBtn = document.getElementById("cancelBtn")
    const newPaymentBtn = document.getElementById("newPaymentBtn")
    const messageSection = document.getElementById("messageSection")

    if (countdownSection) countdownSection.classList.add("hidden")
    if (qrisSection) qrisSection.classList.add("hidden")
    if (cancelBtn) cancelBtn.classList.add("hidden")
    if (newPaymentBtn) newPaymentBtn.classList.remove("hidden")
    if (messageSection) {
      messageSection.classList.remove("hidden")
      const messageTitle = document.getElementById("messageTitle")
      const messageText = document.getElementById("messageText")
      if (messageTitle) messageTitle.textContent = "Pembayaran Kedaluwarsa"
      if (messageText) messageText.textContent = "Waktu pembayaran telah habis. Silakan buat pembayaran baru."
    }
  }

  async handleCancelPayment() {
    if (!this.currentTransaction) return

    const confirmed = confirm("Apakah Anda yakin ingin membatalkan pembayaran ini?")
    if (!confirmed) return

    try {
      const response = await fetch(`/api/qris/cancel/${this.currentTransaction.idtransaksi}`, {
        method: "POST",
      })

      const result = await response.json()

      if (result.status) {
        this.currentTransaction.status = "cancelled"
        this.stopAutoStatusCheck()
        this.stopCountdown()
        this.showToast("Pembayaran berhasil dibatalkan", "success")
        this.showCancelledState()
      } else {
        this.showToast(result.message || "Gagal membatalkan pembayaran", "error")
      }
    } catch (error) {
      console.error("❌ Error cancelling payment:", error)
      this.showToast("Terjadi kesalahan saat membatalkan pembayaran", "error")
    }
  }

  showCancelledState() {
    const countdownSection = document.getElementById("countdownSection")
    const qrisSection = document.getElementById("qrisSection")
    const cancelBtn = document.getElementById("cancelBtn")
    const newPaymentBtn = document.getElementById("newPaymentBtn")
    const messageSection = document.getElementById("messageSection")

    if (countdownSection) countdownSection.classList.add("hidden")
    if (qrisSection) qrisSection.classList.add("hidden")
    if (cancelBtn) cancelBtn.classList.add("hidden")
    if (newPaymentBtn) newPaymentBtn.classList.remove("hidden")
    if (messageSection) {
      messageSection.classList.remove("hidden")
      const messageTitle = document.getElementById("messageTitle")
      const messageText = document.getElementById("messageText")
      if (messageTitle) messageTitle.textContent = "Pembayaran Dibatalkan"
      if (messageText) messageText.textContent = "Pembayaran telah dibatalkan. Anda dapat membuat pembayaran baru."
    }
  }

  handleNewPayment() {
    window.location.href = "/"
  }

  showError(message) {
    console.error("❌ Showing error:", message)

    const loadingSection = document.getElementById("loadingSection")
    const errorSection = document.getElementById("errorSection")

    if (loadingSection) loadingSection.classList.add("hidden")
    if (errorSection) errorSection.classList.remove("hidden")

    this.showToast(message, "error")
  }

  showImageError(message) {
    const qrisLoading = document.getElementById("qrisLoading")
    if (qrisLoading) {
      qrisLoading.innerHTML = `
        <div style="color: #ef4444; text-align: center; padding: 2rem;">
          <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.7;"></i>
          <p style="font-weight: 600; margin-bottom: 0.5rem;">${message}</p>
          <p style="font-size: 0.875rem; opacity: 0.8;">Silakan refresh halaman atau coba lagi</p>
          <button onclick="location.reload()" style="
            margin-top: 1rem; 
            padding: 0.5rem 1rem; 
            background: #ef4444; 
            color: white; 
            border: none; 
            border-radius: 0.5rem; 
            cursor: pointer;
            font-size: 0.875rem;
          ">
            Refresh Halaman
          </button>
        </div>
      `
      qrisLoading.style.display = "block"
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

  getStatusText(status) {
    const statusTexts = {
      pending: "MENUNGGU",
      success: "BERHASIL",
      expired: "KEDALUWARSA",
      cancelled: "DIBATALKAN",
    }
    return statusTexts[status] || status.toUpperCase()
  }
}

// Global functions
function copyTransactionId() {
  const transactionId = document.getElementById("transactionId")
  if (transactionId && window.statusPage) {
    navigator.clipboard
      .writeText(transactionId.textContent)
      .then(() => {
        window.statusPage.showToast("ID transaksi berhasil disalin!", "success")
      })
      .catch(() => {
        window.statusPage.showToast("Gagal menyalin ID transaksi", "error")
      })
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.statusPage = new QRISStatusPage()
})
