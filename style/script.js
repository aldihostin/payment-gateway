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

        // Redirect to status page with transaction ID
        setTimeout(
          () => {
            window.location.href = `/status.html?id=${result.data.idtransaksi}`
          },
          result.data.wasAmountAdjusted ? 3000 : 1500,
        ) // Longer delay if amount was adjusted
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
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.paymentGateway = new QRISPaymentGateway()
  console.log("✅ Payment Gateway ready!")
})
