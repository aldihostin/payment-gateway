class QRISPaymentGateway {
  constructor() {
    this.currentTransaction = null
    this.statusCheckInterval = null
    this.countdownInterval = null
    this.nextCheckInterval = null
    this.nextCheckSeconds = 5
    this.init()
  }

  init() {
    console.log("🚀 QRIS Payment Gateway initialized")

    // Check if we need to load a specific transaction from URL
    const urlParams = new URLSearchParams(window.location.search)
    const transactionId = urlParams.get("id")

    if (transactionId) {
      console.log("🔍 Loading transaction from URL:", transactionId)
      this.loadTransactionFromURL(transactionId)
    } else {
      // Normal initialization
      this.bindEvents()
      this.setupAmountInput()
      this.showCreateSection()
    }
  }

  async loadTransactionFromURL(transactionId) {
    // Show loading section
    this.showLoadingSection()

    // Update header
    this.updateHeader("Status Pembayaran", "Memuat data transaksi...")

    try {
      const response = await fetch(`/api/qris/status/${transactionId}`)
      const result = await response.json()

      if (result.status && result.data) {
        this.currentTransaction = result.data
        this.showStatusSection()
        this.updateStatusDisplay()
        this.startAutoStatusCheck()
        this.startCountdown()
        this.bindStatusEvents()

        // Update URL without page reload
        window.history.replaceState({}, "", `/?id=${transactionId}`)
      } else {
        this.showErrorSection(result.message || "Transaksi tidak ditemukan")
      }
    } catch (error) {
      console.error("❌ Error loading transaction:", error)
      this.showErrorSection("Gagal memuat data transaksi")
    }
  }

  showCreateSection() {
    this.hideAllSections()
    document.getElementById("createSection").classList.remove("hidden")
    this.updateHeader("QRIS Gateway", "Pembayaran Digital Terpercaya")
  }

  showStatusSection() {
    this.hideAllSections()
    document.getElementById("statusSection").classList.remove("hidden")
    this.updateHeader("Status Pembayaran", "Scan QR Code untuk Membayar")
  }

  showLoadingSection() {
    this.hideAllSections()
    document.getElementById("loadingSection").classList.remove("hidden")
  }

  showErrorSection(message) {
    this.hideAllSections()
    document.getElementById("errorSection").classList.remove("hidden")
    this.updateHeader("Error", "Terjadi kesalahan")

    // Update error message if needed
    const errorContent = document.querySelector("#errorSection .error-content p")
    if (errorContent && message) {
      errorContent.textContent = message
    }
  }

  hideAllSections() {
    const sections = ["createSection", "statusSection", "loadingSection", "errorSection"]
    sections.forEach((sectionId) => {
      const section = document.getElementById(sectionId)
      if (section) section.classList.add("hidden")
    })
  }

  updateHeader(title, subtitle) {
    const headerTitle = document.getElementById("headerTitle")
    const headerSubtitle = document.getElementById("headerSubtitle")

    if (headerTitle) headerTitle.textContent = title
    if (headerSubtitle) headerSubtitle.textContent = subtitle
  }

  bindEvents() {
    const paymentForm = document.getElementById("paymentForm")
    if (paymentForm) paymentForm.addEventListener("submit", (e) => this.handleCreatePayment(e))
  }

  bindStatusEvents() {
    const cancelBtn = document.getElementById("cancelBtn")
    const newPaymentBtn = document.getElementById("newPaymentBtn")
    const checkStatusBtn = document.getElementById("checkStatusBtn")

    if (cancelBtn) cancelBtn.addEventListener("click", () => this.handleCancelPayment())
    if (newPaymentBtn) newPaymentBtn.addEventListener("click", () => this.handleNewPayment())
    if (checkStatusBtn) checkStatusBtn.addEventListener("click", () => this.handleCheckStatus())
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

        // Update URL with transaction ID
        window.history.pushState({}, "", `/?id=${result.data.idtransaksi}`)

        // Show status section
        this.showStatusSection()
        this.updateStatusDisplay()
        this.startAutoStatusCheck()
        this.startCountdown()
        this.bindStatusEvents()
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

    // Update status badge
    this.updateStatusBadge(transaction.status || "pending")

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

    // Show relevant buttons
    const cancelBtn = document.getElementById("cancelBtn")
    const checkStatusBtn = document.getElementById("checkStatusBtn")

    if (transaction.status === "pending") {
      if (cancelBtn) cancelBtn.classList.remove("hidden")
      if (checkStatusBtn) checkStatusBtn.classList.remove("hidden")
    }

    // Display QRIS image
    this.displayQRISImage()
  }

  updateStatusBadge(status) {
    const statusBadge = document.getElementById("statusBadge")
    if (statusBadge) {
      statusBadge.className = `status-badge status-${status}`
      statusBadge.textContent = this.getStatusText(status)
    }
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

  // AUTO STATUS CHECK
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
    if (!this.currentTransaction) return

    try {
      const response = await fetch(`/api/qris/status/${this.currentTransaction.idtransaksi}`)
      const result = await response.json()

      if (result.status && result.data) {
        const oldStatus = this.currentTransaction.status
        this.currentTransaction = result.data
        const newStatus = this.currentTransaction.status

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
    }
  }

  stopAutoStatusCheck() {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval)
      this.statusCheckInterval = null
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
    const cancelBtn = document.getElementById("cancelBtn")
    const checkStatusBtn = document.getElementById("checkStatusBtn")
    const newPaymentBtn = document.getElementById("newPaymentBtn")
    const successSection = document.getElementById("successSection")

    if (countdownSection) countdownSection.classList.add("hidden")
    if (qrisSection) qrisSection.classList.add("hidden")
    if (cancelBtn) cancelBtn.classList.add("hidden")
    if (checkStatusBtn) checkStatusBtn.classList.add("hidden")
    if (newPaymentBtn) newPaymentBtn.classList.remove("hidden")
    if (successSection) {
      successSection.classList.remove("hidden")

      // Fill invoice details
      this.fillInvoiceDetails()

      // Send Telegram notification to owner
      this.sendTelegramNotification()
    }
  }

  fillInvoiceDetails() {
    if (!this.currentTransaction) return

    const transaction = this.currentTransaction

    // Transaction ID
    const invoiceTransactionId = document.getElementById("invoiceTransactionId")
    if (invoiceTransactionId) {
      invoiceTransactionId.textContent = transaction.idtransaksi
    }

    // Paid Amount
    const invoicePaidAmount = document.getElementById("invoicePaidAmount")
    if (invoicePaidAmount) {
      invoicePaidAmount.textContent = this.formatCurrency(transaction.jumlah)
    }

    // Paid Time
    const invoicePaidTime = document.getElementById("invoicePaidTime")
    if (invoicePaidTime && transaction.paidAt) {
      invoicePaidTime.textContent = this.formatDateTime(transaction.paidAt)
    }

    // Show adjustment info if applicable
    const invoiceAdjustmentInfo = document.getElementById("invoiceAdjustmentInfo")
    const invoiceAdjustmentText = document.getElementById("invoiceAdjustmentText")

    if (transaction.wasAmountAdjusted && transaction.originalAmount && invoiceAdjustmentInfo && invoiceAdjustmentText) {
      const originalAmount = this.formatCurrency(transaction.originalAmount)
      const finalAmount = this.formatCurrency(transaction.jumlah)
      invoiceAdjustmentText.textContent = `${originalAmount} → ${finalAmount} (+${transaction.amountAdjustment || 1})`
      invoiceAdjustmentInfo.classList.remove("hidden")
    } else if (invoiceAdjustmentInfo) {
      invoiceAdjustmentInfo.classList.add("hidden")
    }
  }

  async sendTelegramNotification() {
    if (!this.currentTransaction) return

    try {
      console.log("📱 Sending Telegram notification to owner...")

      const response = await fetch("/api/qris/telegram-notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionId: this.currentTransaction.idtransaksi,
          amount: this.currentTransaction.jumlah,
          originalAmount: this.currentTransaction.originalAmount,
          wasAmountAdjusted: this.currentTransaction.wasAmountAdjusted,
          amountAdjustment: this.currentTransaction.amountAdjustment,
          paidAt: this.currentTransaction.paidAt,
        }),
      })

      const result = await response.json()

      if (result.status) {
        console.log("✅ Telegram notification sent successfully")
      } else {
        console.log("❌ Failed to send Telegram notification:", result.message)
      }
    } catch (error) {
      console.error("❌ Error sending Telegram notification:", error)
      // Don't show error to user as this is background notification
    }
  }

  showExpiredState() {
    const countdownSection = document.getElementById("countdownSection")
    const qrisSection = document.getElementById("qrisSection")
    const cancelBtn = document.getElementById("cancelBtn")
    const checkStatusBtn = document.getElementById("checkStatusBtn")
    const newPaymentBtn = document.getElementById("newPaymentBtn")
    const messageSection = document.getElementById("messageSection")

    if (countdownSection) countdownSection.classList.add("hidden")
    if (qrisSection) qrisSection.classList.add("hidden")
    if (cancelBtn) cancelBtn.classList.add("hidden")
    if (checkStatusBtn) checkStatusBtn.classList.add("hidden")
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
    const checkStatusBtn = document.getElementById("checkStatusBtn")
    const newPaymentBtn = document.getElementById("newPaymentBtn")
    const messageSection = document.getElementById("messageSection")

    if (countdownSection) countdownSection.classList.add("hidden")
    if (qrisSection) qrisSection.classList.add("hidden")
    if (cancelBtn) cancelBtn.classList.add("hidden")
    if (checkStatusBtn) checkStatusBtn.classList.add("hidden")
    if (newPaymentBtn) newPaymentBtn.classList.remove("hidden")
    if (messageSection) {
      messageSection.classList.remove("hidden")
      const messageTitle = document.getElementById("messageTitle")
      const messageText = document.getElementById("messageText")
      if (messageTitle) messageTitle.textContent = "Pembayaran Dibatalkan"
      if (messageText) messageText.textContent = "Pembayaran telah dibatalkan. Anda dapat membuat pembayaran baru."
    }
  }

  handleCheckStatus() {
    if (this.currentTransaction) {
      this.checkStatus()
      this.showToast("Status pembayaran diperbarui", "info")
    }
  }

  handleNewPayment() {
    // Reset everything
    this.currentTransaction = null
    this.stopAutoStatusCheck()
    this.stopCountdown()

    // Clear URL
    window.history.pushState({}, "", "/")

    // Show create section
    this.showCreateSection()

    // Reset form
    const amountInput = document.getElementById("amount")
    if (amountInput) amountInput.value = ""

    // Rebind events
    this.bindEvents()
    this.setupAmountInput()

    console.log("🔄 Ready for new payment")
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

  getStatusText(status) {
    const statusTexts = {
      pending: "MENUNGGU",
      success: "BERHASIL",
      expired: "KEDALUWARSA",
      cancelled: "DIBATALKAN",
    }
    return statusTexts[status] || status.toUpperCase()
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

// Global functions
function copyTransactionId() {
  const transactionId = document.getElementById("transactionId")
  if (transactionId && window.paymentGateway) {
    navigator.clipboard
      .writeText(transactionId.textContent)
      .then(() => {
        window.paymentGateway.showToast("ID transaksi berhasil disalin!", "success")
      })
      .catch(() => {
        window.paymentGateway.showToast("Gagal menyalin ID transaksi", "error")
      })
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.paymentGateway = new QRISPaymentGateway()
  console.log("✅ Payment Gateway ready!")
})

// Handle browser back/forward buttons
window.addEventListener("popstate", () => {
  window.location.reload()
})
