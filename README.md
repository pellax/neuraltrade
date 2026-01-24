# NeuralTrade

> AI-Powered High-Frequency Algorithmic Trading Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11-green.svg)](https://www.python.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://docs.docker.com/compose/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🧠 Overview

NeuralTrade is an enterprise-grade algorithmic trading SaaS platform featuring:

- **Real-time Market Data Ingestion** via WebSockets (CCXT)
- **AI/ML Signal Prediction** with PyTorch LSTM models
- **FMEA Risk Assessment** for signal validation
- **Comprehensive Backtesting** with performance metrics
- **Cyber-Finance Dashboard** with dark mode UI

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            Frontend                                  │
│                   (Next.js / React / TypeScript)                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────┐
│                          API Gateway                                 │
│                   (Express / Socket.IO)                              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│   Ingestion   │         │   ML Engine   │         │  Backtesting  │
│   Service     │◄───────►│   (FastAPI)   │         │    Module     │
│  (Node.js)    │         │   (PyTorch)   │         │  (Node.js)    │
└───────────────┘         └───────────────┘         └───────────────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
                          ┌─────────────────┐
                          │    RabbitMQ     │
                          │ (Message Broker)│
                          └─────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│   InfluxDB    │         │    MongoDB    │         │     Redis     │
│  (Time-Series)│         │   (Profiles)  │         │    (Cache)    │
└───────────────┘         └───────────────┘         └───────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose

### 1. Clone & Setup

```bash
cd /home/pellax/Documents/NeuralTrade
cp .env.example .env
```

### 2. Start Infrastructure

```bash
docker-compose up -d rabbitmq influxdb mongodb redis
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Services

```bash
# Terminal 1: Ingestion Service
npm run dev --workspace=@neuraltrade/ingestion

# Terminal 2: ML Engine
cd services/ml-engine
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 3: Dashboard
npm run dev --workspace=@neuraltrade/dashboard
```

### 5. Access Dashboard

Open [http://localhost:3100](http://localhost:3100)

## 📦 Project Structure

```
NeuralTrade/
├── packages/
│   └── shared-types/        # TypeScript types
├── services/
│   ├── ingestion/           # WebSocket market data
│   ├── ml-engine/           # AI signal prediction
│   └── backtesting/         # Strategy backtesting
├── apps/
│   └── dashboard/           # Next.js frontend
├── infrastructure/
│   └── scripts/             # Database init scripts
├── docker-compose.yml       # Container orchestration
└── turbo.json               # Monorepo config
```

## 🔧 Configuration

Key environment variables in `.env`:

| Variable | Description |
|----------|-------------|
| `RABBITMQ_URL` | Message broker connection |
| `INFLUXDB_URL` | Time-series database |
| `MONGODB_URI` | User profiles & API keys |
| `AES_ENCRYPTION_KEY` | API key encryption (256-bit) |
| `ML_CONFIDENCE_THRESHOLD` | Signal confidence cutoff |

## 🧪 Testing

```bash
# Run all tests
npm test

# Ingestion service tests
npm test --workspace=@neuraltrade/ingestion

# ML Engine tests
cd services/ml-engine && pytest
```

## ⚡ Keyboard Shortcuts (Dashboard)

| Shortcut | Action |
|----------|--------|
| `Alt+1-6` | Navigate sections |
| `Alt+0` | Settings |
| `[` | Toggle sidebar |

## 📊 Metrics Calculated

- **Sharpe Ratio** - Risk-adjusted returns
- **Sortino Ratio** - Downside risk adjustment
- **Calmar Ratio** - Return vs max drawdown
- **Win Rate** - Percentage of winning trades
- **Profit Factor** - Gross profit / gross loss
- **Value at Risk (95%)** - VaR estimation

## 🔒 Security

- AES-256 encryption for exchange API keys
- FMEA-based signal risk assessment
- Dual-model verification for predictions
- Container isolation per trading bot

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.
