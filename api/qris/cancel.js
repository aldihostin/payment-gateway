module.exports = (app) => {
  app.post("/api/qris/cancel/:transactionId", (req, res) => {
    try {
      const { transactionId } = req.params

      if (!global.transactions || !global.transactions.has(transactionId)) {
        return res.status(404).json({
          status: false,
          message: "Transaction not found",
        })
      }

      const transaction = global.transactions.get(transactionId)

      if (transaction.status !== "pending") {
        return res.status(400).json({
          status: false,
          message: `Cannot cancel transaction with status: ${transaction.status}`,
        })
      }

      transaction.status = "cancelled"
      transaction.cancelledAt = new Date()
      global.transactions.set(transactionId, transaction)

      console.log("✅ Transaction cancelled:", transactionId)

      // Schedule cleanup for cancelled transaction
      setTimeout(() => {
        if (global.transactions && global.transactions.has(transactionId)) {
          global.transactions.delete(transactionId)
          console.log("🗑️ Cleaned up cancelled transaction:", transactionId)
        }
      }, 30000) // 30 seconds delay

      res.json({
        status: true,
        message: "Transaction cancelled successfully",
        data: transaction,
      })
    } catch (error) {
      console.error("Error cancelling transaction:", error)
      res.status(500).json({
        status: false,
        message: "Failed to cancel transaction",
        error: error.message,
      })
    }
  })
}
