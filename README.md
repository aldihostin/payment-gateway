# 🚀 QRIS Payment Gateway

> **Modern QRIS Payment Gateway with Beautiful UI/UX and Real-time Status Tracking**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-blue.svg)](https://expressjs.com/)

## ✨ Features

### 🎯 **Core Features**
- **🔥 Dynamic QRIS Generation** - Create unique payment codes instantly
- **⚡ Real-time Status Tracking** - Automatic payment monitoring every 5 seconds
- **🧠 Smart Amount Adjustment** - Prevents duplicate amounts automatically
- **📱 Telegram Notifications** - Instant payment alerts to owner
- **🗑️ Auto Cleanup** - Automatic expired transaction management

### 🎨 **Modern UI/UX**
- **✨ Glassmorphism Design** - Beautiful transparent cards with blur effects
- **🌈 Gradient Backgrounds** - Eye-catching animated gradients
- **🎭 Smooth Animations** - Professional micro-interactions
- **📱 Mobile Responsive** - Perfect on all devices
- **🌙 Modern Dark Theme** - Trendy dark interface

### 🔧 **Technical Features**
- **🔌 RESTful API** - Complete API with beautiful documentation
- **⚡ In-Memory Storage** - Lightning-fast transaction management
- **🛡️ Error Handling** - Comprehensive error management
- **🌐 CORS Enabled** - Cross-origin request support
- **🔐 Environment Config** - Secure configuration management

## 🚀 Quick Start

### 📋 Prerequisites
- Node.js 16+
- QRIS Static Code from your payment provider
- OrderKuota API credentials
- Telegram Bot Token (optional)

### ⚡ Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/krsna081/payment-gateway.git
cd payment-gateway

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the server
npm start
\`\`\`

### 🔧 Environment Configuration

\`\`\`env
# Required Configuration
CODEQR=your_qris_static_code_here
ORD_ID=your_orderkuota_id
ORD_APIKEY=your_orderkuota_api_key

# Optional Configuration
TELEGRAM_TOKEN=your_telegram_bot_token
OWNER_ID=your_telegram_user_id
PORT=3000
NODE_ENV=production
\`\`\`

## 📱 Usage

### 🌐 Web Interface
1. **💰 Create Payment** - Enter amount and generate QRIS
2. **📤 Share QR Code** - Customer scans with e-wallet app
3. **👀 Real-time Monitoring** - Automatic status updates every 5 seconds
4. **✅ Payment Confirmation** - Instant success notification with receipt

### 🔌 API Integration

\`\`\`javascript
// Create Payment
const response = await fetch('/api/qris/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 50000 })
});

// Check Status
const status = await fetch('/api/qris/status/QRIS-A1B2C3D4');

// Cancel Payment
const cancel = await fetch('/api/qris/cancel/QRIS-A1B2C3D4', {
  method: 'POST'
});
\`\`\`

## 🏗️ Project Structure

\`\`\`
qris-payment-gateway/
├── 📁 api/qris/              # API Endpoints
│   ├── 📄 create.js          # Payment creation logic
│   ├── 📄 status.js          # Status checking with OrderKuota
│   ├── 📄 cancel.js          # Payment cancellation
│   ├── 📄 telegram-notify.js # Telegram notifications
│   └── 📄 debug.js           # Debug endpoints
├── 📁 style/                 # Frontend Assets
│   ├── 📄 style.css          # Modern CSS with glassmorphism
│   └── 📄 script.js          # Interactive JavaScript
├── 📄 index.html             # Modern web interface
├── 📄 docs.html              # Beautiful API documentation
├── 📄 index.js               # Express server configuration
├── 📄 vercel.json            # Vercel deployment config
├── 📄 .env                   # Environment variables
└── 📄 README.md              # This file
\`\`\`

## 🎨 UI/UX Highlights

### 🏠 **Homepage**
- **Glassmorphism cards** with beautiful blur effects
- **Animated gradient backgrounds** with floating orbs
- **Smooth micro-interactions** and hover effects
- **Mobile-first responsive design**

### 💳 **Payment Interface**
- **Real-time countdown timer** with circular progress
- **Animated QR code display** with scan line effect
- **Status badges** with color-coded states
- **Interactive buttons** with loading states

### 📚 **API Documentation**
- **Modern documentation UI** with syntax highlighting
- **Interactive code examples** with copy functionality
- **Comprehensive endpoint reference**
- **Beautiful responsive design**

## 🔌 API Endpoints

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| `POST` | `/api/qris/create` | Create new QRIS payment | ✅ Active |
| `GET` | `/api/qris/status/:id` | Check payment status | ✅ Active |
| `POST` | `/api/qris/cancel/:id` | Cancel pending payment | ✅ Active |
| `POST` | `/api/qris/telegram-notify` | Send Telegram notification | ✅ Active |
| `GET` | `/api/qris/debug/transactions` | View active transactions | 🔧 Debug |

## 🚀 Deployment

### 🌐 Vercel (Recommended)

\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Configure environment variables in Vercel dashboard
\`\`\`

### 🖥️ Manual Deployment

\`\`\`bash
# Production mode
NODE_ENV=production npm start

# Using PM2 for process management
npm install -g pm2
pm2 start index.js --name qris-gateway
pm2 startup
pm2 save
\`\`\`

## 🛠️ Development

### 🔧 Local Development

\`\`\`bash
# Start development server
npm run dev

# View logs
npm run logs

# Test API endpoints
npm run test
\`\`\`

### 📝 Adding New Features

1. **API Endpoints** - Add new files to `api/qris/` directory
2. **Frontend Features** - Modify `style/script.js` and `style/style.css`
3. **Documentation** - Update `docs.html` with new endpoints
4. **Testing** - Add tests for new functionality

## 🔒 Security & Performance

### 🛡️ Security Features
- **Input validation** and sanitization
- **Environment variable** protection
- **CORS configuration** for cross-origin security
- **Error handling** without sensitive data exposure
- **Automatic cleanup** of expired transactions

### ⚡ Performance Optimizations
- **In-memory storage** for fast access
- **Optimized API calls** to external services
- **Automatic cleanup** prevents memory leaks
- **Efficient caching** strategies
- **Compressed responses**

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### 📋 Contribution Guidelines
- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure mobile responsiveness

## 👨‍💻 Author & Support

**@krsna_081** - Professional Payment Gateway Developer

- 📱 **WhatsApp**: [i'm krizz?](https://wa.me/6281235807940)
- 📢 **Channel**: [WhatsApp Channel](https://whatsapp.com/channel/0029VaOQ0f3BA1f7HHV9DV1J)
- 💼 **Services**: Custom payment gateway solutions

## 🙏 Acknowledgments

- **OrderKuota API** - Payment monitoring service
- **QRCode.js** - QR code generation library
- **Telegraf** - Telegram bot framework
- **Express.js** - Web application framework
- **Inter Font** - Modern typography

## 📊 Project Stats

- ⚡ **Performance**: Sub-second response times
- 🔒 **Security**: Industry-standard practices
- 📱 **Mobile**: 100% responsive design
- 🎨 **Modern**: Latest UI/UX trends
- 🚀 **Production**: Ready for scale

---

<div align="center">

### 🌟 **Star this repository if you find it helpful!** 🌟

**Made with ❤️ in Indonesia**

[⭐ Star](https://github.com/krsna081/payment-gateway) • [🐛 Issues](https://github.com/krsna081/payment-gateway/issues) • [✨ Features](https://github.com/krsna081/payment-gateway/issues) • [📖 Wiki](https://github.com/krsna081/payment-gateway/wiki)

</div>
