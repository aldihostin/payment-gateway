class QRISPaymentGateway {
  constructor() {
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

        // Check if amount was adjusted
        if (result.data.wasAmountAdjusted) {
          const originalAmount = result.data.originalAmount.toLocaleString("id-ID")
          const finalAmount = result.data.jumlah.toLocaleString("id-ID")
        } else {
          this.showToast("QRIS berhasil dibuat! Mengalihkan ke halaman pembayaran...", "success")
        }

        // FIXED: Multiple redirect options for better compatibility
        setTimeout(
          () => {
            this.redirectToStatus(result.data.idtransaksi)
          },
          result.data.wasAmountAdjusted ? 3000 : 1500,
        )
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

  // FIXED: Better redirect handling for Vercel
  redirectToStatus(transactionId) {
    console.log("🔄 Redirecting to status page for:", transactionId)

    // Try multiple redirect methods for better compatibility
    const redirectMethods = [
      // Method 1: Try status.html directly
      () => {
        window.location.href = `/status.html?id=${transactionId}`
      },
      // Method 2: Try without .html extension
      () => {
        window.location.href = `/status?id=${transactionId}`
      },
      // Method 3: Try with relative path
      () => {
        window.location.href = `./status.html?id=${transactionId}`
      },
      // Method 4: Use window.location.assign
      () => {
        window.location.assign(`/status.html?id=${transactionId}`)
      },
      // Method 5: Fallback - show status on same page
      () => {
        this.showStatusOnSamePage(transactionId)
      },
    ]

    // Try first method
    try {
      redirectMethods[0]()
    } catch (error) {
      console.error("❌ Redirect failed, trying fallback:", error)
      // If redirect fails, show status on same page
      this.showStatusOnSamePage(transactionId)
    }
  }

  // Fallback: Show status on the same page
  showStatusOnSamePage(transactionId) {
    console.log("🔄 Showing status on same page for:", transactionId)

    // Hide create section
    const createSection = document.getElementById("createSection")
    if (createSection) {
      createSection.classList.add("hidden")
    }

    // Show status section (if exists)
    const statusSection = document.getElementById("statusSection")
    if (statusSection) {
      statusSection.classList.remove("hidden")
      this.loadTransactionStatus(transactionId)
    } else {
      // Create a simple status display
      this.createStatusDisplay(transactionId)
    }
  }

  async loadTransactionStatus(transactionId) {
    try {
      const response = await fetch(`/api/qris/status/${transactionId}`)
      const result = await response.json()

      if (result.status && result.data) {
        this.displayTransactionStatus(result.data)
      } else {
        this.showToast("Gagal memuat status transaksi", "error")
      }
    } catch (error) {
      console.error("❌ Error loading transaction status:", error)
      this.showToast("Terjadi kesalahan saat memuat status", "error")
    }
  }

  displayTransactionStatus(transaction) {
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

    // Display QRIS image
    if (transaction.imageqris?.url) {
      const qrisImage = document.getElementById("qrisImage")
      const qrisLoading = document.getElementById("qrisLoading")

      if (qrisImage && qrisLoading) {
        qrisLoading.style.display = "none"
        qrisImage.src = transaction.imageqris.url
        qrisImage.style.display = "block"
        qrisImage.classList.remove("hidden")
      }
    }

    this.showToast("Status transaksi berhasil dimuat!", "success")
  }

  createStatusDisplay(transactionId) {
    // Create a simple status display if status section doesn't exist
    const mainContent = document.querySelector(".app-main")
    if (!mainContent) return

    const statusHTML = `
      <section class="section-card">
        <div class="card-header">
          <div class="header-icon">
            <i class="fas fa-qrcode"></i>
          </div>
          <div class="header-content">
            <h2>Status Pembayaran</h2>
            <p>Transaksi ID: <strong>${transactionId}</strong></p>
          </div>
        </div>
        
        <div style="text-align: center; padding: 2rem;">
          <div class="loading-spinner-large"></div>
          <p>Memuat status pembayaran...</p>
          <br>
          <button onclick="window.location.reload()" class="create-btn" style="margin-top: 1rem;">
            <i class="fas fa-refresh"></i>
            Refresh Halaman
          </button>
          <br><br>
          <a href="/" class="create-btn" style="background: #6b7280; text-decoration: none; display: inline-block; margin-top: 0.5rem;">
            <i class="fas fa-home"></i>
            Kembali ke Beranda
          </a>
        </div>
      </section>
    `

    mainContent.innerHTML = statusHTML

    // Try to load the actual status
    this.loadTransactionStatus(transactionId)
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

    // Show toast with animation
    setTimeout(() => {
      toast.classList.add("show")
    }, 100)

    // Auto remove after 5 seconds
    setTimeout(() => {
      toast.classList.remove("show")
      setTimeout(() => {
        if (toast.parentElement) {
          toast.remove()
        }
      }, 300)
    }, 5000)

    console.log(`📢 Toast: ${message} (${type})`)
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
