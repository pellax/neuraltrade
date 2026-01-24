// MongoDB Initialization Script
// Creates required collections and indexes for NeuralTrade

db = db.getSiblingDB('neuraltrade');

// Users collection with API keys storage
db.createCollection('users');
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: 1 });

// Encrypted API Keys collection (per exchange, per user)
db.createCollection('api_keys');
db.api_keys.createIndex({ userId: 1, exchange: 1 }, { unique: true });
db.api_keys.createIndex({ userId: 1 });

// Trading Bots configuration
db.createCollection('bots');
db.bots.createIndex({ userId: 1 });
db.bots.createIndex({ status: 1 });
db.bots.createIndex({ 'config.exchange': 1 });

// Backtesting Results
db.createCollection('backtests');
db.backtests.createIndex({ userId: 1, createdAt: -1 });
db.backtests.createIndex({ strategyId: 1 });

// Trading Strategies (user-defined)
db.createCollection('strategies');
db.strategies.createIndex({ userId: 1 });
db.strategies.createIndex({ isPublic: 1 });

// ML Model Metadata
db.createCollection('ml_models');
db.ml_models.createIndex({ version: -1 });
db.ml_models.createIndex({ status: 1 });

// Audit Logs (for security compliance)
db.createCollection('audit_logs', {
  capped: true,
  size: 104857600, // 100MB capped collection
  max: 100000
});
db.audit_logs.createIndex({ userId: 1, timestamp: -1 });
db.audit_logs.createIndex({ action: 1 });

print('✓ NeuralTrade MongoDB initialized successfully');
