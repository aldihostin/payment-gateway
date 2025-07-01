module.exports = (app) => {
  // Debug endpoint to view all active transactions
  app.get("/api/qris/debug/transactions", (req, res) => {
    try {
      const transactions = []

      if (global.transactions && global.transactions.size > 0) {
        for (const [transactionId, transaction] of global.transactions) {
          transactions.push({
            id: transactionId,
            amount: transaction.amount,
            originalAmount: transaction.originalAmount,
            status: transaction.status,
            createdAt: transaction.createdAt,
            expired: transaction.expired,
            wasAmountAdjusted: transaction.wasAmountAdjusted,
            amountAdjustment: transaction.amountAdjustment,
          })
        }
      }

      res.json({
        status: true,
        message: "Active transactions retrieved",
        data: {
          totalTransactions: transactions.length,
          transactions: transactions,
        },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("✗ Error getting debug transactions:", error)
      res.status(500).json({
        status: false,
        message: "Failed to get transactions",
        error: error.message,
      })
    }
  })

  // Debug endpoint to manually clean up transactions
  app.post("/api/qris/debug/cleanup", (req, res) => {
    try {
      let cleanedCount = 0
      const now = new Date()

      if (global.transactions && global.transactions.size > 0) {
        for (const [transactionId, transaction] of global.transactions) {
          // Clean up completed or expired transactions
          if (transaction.status !== "pending" || new Date(transaction.expired) < now) {
            global.transactions.delete(transactionId)
            cleanedCount++
            console.log("▷ Manual cleanup:", transactionId)
          }
        }
      }

      res.json({
        status: true,
        message: `Cleanup completed: ${cleanedCount} transactions removed`,
        data: {
          cleanedCount: cleanedCount,
          remainingTransactions: global.transactions ? global.transactions.size : 0,
        },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("✗ Error in manual cleanup:", error)
      res.status(500).json({
        status: false,
        message: "Failed to cleanup transactions",
        error: error.message,
      })
    }
  })
}
