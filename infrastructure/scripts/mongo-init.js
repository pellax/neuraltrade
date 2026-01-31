// MongoDB Initialization Script
// Creates required collections and indexes for NeuralTrade
// Safe to re-run - uses try/catch for user creation

// Authenticate as admin first
db = db.getSiblingDB('admin');

// Create application user (ignore error if exists)
try {
  db.createUser({
    user: 'neuraltrade',
    pwd: 'neuraltrade_app_2026',
    roles: [
      { role: 'readWrite', db: 'neuraltrade' },
      { role: 'dbAdmin', db: 'neuraltrade' }
    ]
  });
  print('✓ User "neuraltrade" created');
} catch (e) {
  print('ℹ User "neuraltrade" already exists');
}

// Switch to neuraltrade database
db = db.getSiblingDB('neuraltrade');

// Users collection
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: 1 });
print('✓ users collection ready');

// Encrypted API Keys
db.api_keys.createIndex({ userId: 1, exchange: 1 }, { unique: true });
db.api_keys.createIndex({ userId: 1 });
print('✓ api_keys collection ready');

// Strategies
db.strategies.createIndex({ userId: 1 });
db.strategies.createIndex({ isPublic: 1 });
db.strategies.createIndex({ createdAt: -1 });
print('✓ strategies collection ready');

// Positions
db.positions.createIndex({ userId: 1, strategyId: 1 });
db.positions.createIndex({ userId: 1, symbol: 1, status: 1 });
db.positions.createIndex({ status: 1 });
db.positions.createIndex({ createdAt: -1 });
print('✓ positions collection ready');

// Notification Preferences
db.notification_preferences.createIndex({ userId: 1 }, { unique: true });
print('✓ notification_preferences collection ready');

// Notification Logs with TTL
db.notification_logs.createIndex({ userId: 1, createdAt: -1 });
try {
  db.notification_logs.createIndex({ notificationId: 1 }, { unique: true });
} catch (e) { }
try {
  db.notification_logs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 });
} catch (e) { }
print('✓ notification_logs collection ready');

// Backtests
db.backtests.createIndex({ userId: 1, createdAt: -1 });
db.backtests.createIndex({ strategyId: 1 });
print('✓ backtests collection ready');

// ML Models
db.ml_models.createIndex({ version: -1 });
db.ml_models.createIndex({ status: 1 });
print('✓ ml_models collection ready');

// Refresh Tokens
db.refresh_tokens.createIndex({ userId: 1 });
try {
  db.refresh_tokens.createIndex({ token: 1 }, { unique: true });
} catch (e) { }
try {
  db.refresh_tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
} catch (e) { }
print('✓ refresh_tokens collection ready');

print('');
print('═══════════════════════════════════════');
print('✓ NeuralTrade MongoDB initialized');
print('═══════════════════════════════════════');
