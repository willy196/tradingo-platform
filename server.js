// server.js - Tradingo Backend Server
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const WebSocket = require('ws');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

console.log(`
╔══════════════════════════════════════╗
║        🤖 TRADINGO SERVER            ║
║    AI Crypto Trading Platform        ║
╚══════════════════════════════════════╝
`);

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tradingo';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected to Tradingo');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    // For production, you might want to retry or exit
    if (process.env.NODE_ENV === 'production') {
      setTimeout(connectDB, 5000); // Retry after 5 seconds
    }
  }
};
connectDB();

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  tradingoApiKey: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// Trade Schema
const tradeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  symbol: String,
  side: String, // buy/sell
  quantity: Number,
  price: Number,
  profit: Number,
  timestamp: { type: Date, default: Date.now }
});
const Trade = mongoose.model('Trade', tradeSchema);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'Tradingo AI Trading Platform',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

// API Routes
app.get('/api/tradingo/status', (req, res) => {
  res.json({
    platform: 'Tradingo AI Trading',
    version: '1.0.0',
    status: 'operational',
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

// User Registration
app.post('/api/tradingo/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      tradingoApiKey: `TGO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });
    
    await user.save();
    
    res.json({
      success: true,
      message: '🎉 Welcome to Tradingo! Account created successfully.',
      userId: user._id,
      tradingoApiKey: user.tradingoApiKey
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// User Login
app.post('/api/tradingo/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'tradingo-secret-key',
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'Login successful! Welcome back to Tradingo.',
      token,
      user: {
        id: user._id,
        email: user.email,
        tradingoApiKey: user.tradingoApiKey
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Start Trading Bot
app.post('/api/tradingo/bot/start', async (req, res) => {
  try {
    const { userId, strategy = 'scalping', symbol = 'BTCUSDT', amount = 100 } = req.body;
    
    // Simulate bot starting
    const botId = `TGO-BOT-${Date.now()}`;
    
    res.json({
      success: true,
      message: '🤖 Tradingo AI Bot Started Successfully!',
      botId,
      details: {
        strategy,
        symbol,
        amount,
        status: 'running',
        startedAt: new Date()
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to start bot' });
  }
});

// Get Market Data
app.get('/api/tradingo/market/:symbol', (req, res) => {
  const { symbol } = req.params;
  const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT'];
  
  if (!symbols.includes(symbol.toUpperCase())) {
    return res.status(400).json({ error: 'Invalid symbol' });
  }
  
  // Generate fake market data
  const basePrice = {
    BTCUSDT: 50000,
    ETHUSDT: 2800,
    BNBUSDT: 300,
    ADAUSDT: 0.5,
    SOLUSDT: 100
  };
  
  const change = (Math.random() - 0.5) * 0.1; // ±5%
  const price = basePrice[symbol.toUpperCase()] * (1 + change);
  
  res.json({
    symbol: symbol.toUpperCase(),
    price: price.toFixed(2),
    change24h: (change * 100).toFixed(2),
    high: (price * 1.02).toFixed(2),
    low: (price * 0.98).toFixed(2),
    volume: (Math.random() * 1000000).toFixed(2),
    timestamp: new Date()
  });
});

// Get Recent Trades
app.get('/api/tradingo/trades/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get last 10 trades
    const trades = await Trade.find({ userId })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();
    
    // If no trades, return sample data
    if (trades.length === 0) {
      const sampleTrades = [
        { symbol: 'BTCUSDT', side: 'buy', quantity: 0.01, price: 50123.45, profit: 125.50, timestamp: new Date(Date.now() - 3600000) },
        { symbol: 'ETHUSDT', side: 'sell', quantity: 0.1, price: 2850.20, profit: -42.30, timestamp: new Date(Date.now() - 7200000) },
        { symbol: 'BNBUSDT', side: 'buy', quantity: 1, price: 302.15, profit: 18.75, timestamp: new Date(Date.now() - 10800000) }
      ];
      return res.json(sampleTrades);
    }
    
    res.json(trades);
    
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Create HTTP server for WebSocket
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`✅ Tradingo Server running on port ${PORT}`);
  console.log(`🌐 Dashboard: http://localhost:${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`🤖 API Status: http://localhost:${PORT}/api/tradingo/status`);
});

// WebSocket Server for Real-time Data
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('🔗 WebSocket client connected');
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to Tradingo Real-time Trading',
    platform: 'Tradingo',
    timestamp: new Date()
  }));
  
  // Send fake market updates every 3 seconds
  const interval = setInterval(() => {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
    symbols.forEach(symbol => {
      const change = (Math.random() - 0.5) * 0.02; // ±2%
      const basePrice = {
        BTCUSDT: 50000,
        ETHUSDT: 2800,
        BNBUSDT: 300
      };
      const price = basePrice[symbol] * (1 + change);
      
      ws.send(JSON.stringify({
        type: 'market_update',
        symbol,
        price: price.toFixed(2),
        change: (change * 100).toFixed(2),
        timestamp: new Date()
      }));
    });
  }, 3000);
  
  ws.on('close', () => {
    clearInterval(interval);
    console.log('🔒 WebSocket client disconnected');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
