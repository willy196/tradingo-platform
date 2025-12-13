// app.js - Tradingo Frontend JavaScript

// Global variables
let socket = null;
let isBotRunning = false;
let currentUserId = null;

// API Base URL
const API_BASE = window.location.origin;
const WS_URL = window.location.origin.replace('http', 'ws');

// Initialize app
async function initApp() {
    console.log('🚀 Tradingo App Initializing...');
    
    // Check if user is logged in
    checkAuthStatus();
    
    // Load initial data
    await loadMarketData();
    await loadRecentTrades();
    updateStats();
    
    // Setup event listeners
    setupEventListeners();
    
    // Connect to WebSocket
    connectWebSocket();
    
    console.log('✅ Tradingo App Ready!');
}

// Check authentication status
function checkAuthStatus() {
    const token = localStorage.getItem('tradingo_token');
    if (token) {
        // Validate token
        currentUserId = localStorage.getItem('tradingo_userId');
        updateUIForLoggedInUser();
    }
}

// Update UI for logged in user
function updateUIForLoggedInUser() {
    const userEmail = localStorage.getItem('tradingo_userEmail');
    if (userEmail) {
        // Update UI elements
        const accountBtn = document.querySelector('[href="#account"]');
        if (accountBtn) {
            accountBtn.textContent = userEmail.split('@')[0];
        }
    }
}

// Load market data
async function loadMarketData() {
    try {
        const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT'];
        const marketContainer = document.getElementById('marketPrices');
        
        if (!marketContainer) return;
        
        marketContainer.innerHTML = '';
        
        // Create market items
        symbols.forEach(symbol => {
            const marketItem = document.createElement('div');
            marketItem.className = 'market-item';
            marketItem.id = `market-${symbol}`;
            marketItem.innerHTML = `
                <div class="symbol">${symbol}</div>
                <div class="price">Loading...</div>
                <div class="change">0.00%</div>
            `;
            marketContainer.appendChild(marketItem);
        });
        
        // Fetch actual data
        await fetchMarketData();
        
    } catch (error) {
        console.error('Error loading market data:', error);
    }
}

// Fetch market data from API
async function fetchMarketData() {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT'];
    
    for (const symbol of symbols) {
        try {
            const response = await fetch(`${API_BASE}/api/tradingo/market/${symbol}`);
            if (response.ok) {
                const data = await response.json();
                updateMarketItem(symbol, data);
            }
        } catch (error) {
            console.error(`Error fetching ${symbol}:`, error);
            // Use fake data if API fails
            generateFakeMarketData(symbol);
        }
    }
}

// Update market item with data
function updateMarketItem(symbol, data) {
    const item = document.getElementById(`market-${symbol}`);
    if (!item) return;
    
    const change = parseFloat(data.change24h || data.change);
    const changeClass = change >= 0 ? 'positive' : 'negative';
    const changeSign = change >= 0 ? '+' : '';
    
    item.innerHTML = `
        <div class="symbol">${symbol}</div>
        <div class="price">$${data.price}</div>
        <div class="change ${changeClass}">${changeSign}${change.toFixed(2)}%</div>
    `;
}

// Generate fake market data (fallback)
function generateFakeMarketData(symbol) {
    const basePrices = {
        'BTCUSDT': 50000,
        'ETHUSDT': 2800,
        'BNBUSDT': 300,
        'ADAUSDT': 0.5,
        'SOLUSDT': 100
    };
    
    const change = (Math.random() - 0.5) * 0.1; // ±5%
    const price = basePrices[symbol] * (1 + change);
    
    updateMarketItem(symbol, {
        price: price.toFixed(2),
        change24h: (change * 100).toFixed(2)
    });
}

// Load recent trades
async function loadRecentTrades() {
    try {
        const tradesContainer = document.getElementById('tradesTable');
        if (!tradesContainer) return;
        
        // Show loading state
        const existingRows = tradesContainer.querySelectorAll('.trade-row:not(.header)');
        existingRows.forEach(row => row.remove());
        
        // If user is logged in, fetch their trades
        if (currentUserId) {
            await fetchUserTrades(currentUserId);
        } else {
            // Show sample trades for demo
            showSampleTrades();
        }
        
    } catch (error) {
        console.error('Error loading trades:', error);
        showSampleTrades();
    }
}

// Fetch user trades from API
async function fetchUserTrades(userId) {
    try {
        const response = await fetch(`${API_BASE}/api/tradingo/trades/${userId}`);
        if (response.ok) {
            const trades = await response.json();
            displayTrades(trades);
        }
    } catch (error) {
        console.error('Error fetching trades:', error);
        showSampleTrades();
    }
}

// Display trades in table
function displayTrades(trades) {
    const tradesContainer = document.getElementById('tradesTable');
    
    trades.forEach(trade => {
        const tradeRow = document.createElement('div');
        tradeRow.className = 'trade-row';
        
        const profit = parseFloat(trade.profit || 0);
        const profitClass = profit >= 0 ? 'positive' : 'negative';
        const profitSign = profit >= 0 ? '+' : '';
        
        const time = new Date(trade.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        tradeRow.innerHTML = `
            <div class="trade-symbol">${trade.symbol}</div>
            <div class="trade-side ${trade.side}">${trade.side.toUpperCase()}</div>
            <div>$${parseFloat(trade.price).toFixed(2)}</div>
            <div class="trade-profit ${profitClass}">${profitSign}$${Math.abs(profit).toFixed(2)}</div>
            <div>${time}</div>
        `;
        
        tradesContainer.appendChild(tradeRow);
    });
}

// Show sample trades for demo
function showSampleTrades() {
    const sampleTrades = [
        { symbol: 'BTCUSDT', side: 'buy', price: 50123.45, profit: 125.50, timestamp: new Date(Date.now() - 3600000) },
        { symbol: 'ETHUSDT', side: 'sell', price: 2850.20, profit: -42.30, timestamp: new Date(Date.now() - 7200000) },
        { symbol: 'BNBUSDT', side: 'buy', price: 302.15, profit: 18.75, timestamp: new Date(Date.now() - 10800000) },
        { symbol: 'ADAUSDT', side: 'buy', price: 0.52, profit: 2.10, timestamp: new Date(Date.now() - 14400000) },
        { symbol: 'SOLUSDT', side: 'sell', price: 102.80, profit: 5.60, timestamp: new Date(Date.now() - 18000000) }
    ];
    
    displayTrades(sampleTrades);
}

// Update statistics
function updateStats() {
    // Update bot count
    const botCount = isBotRunning ? 1 : 0;
    document.getElementById('activeBots').textContent = botCount;
    
    // Update profit (fake data for demo)
    const dailyProfit = isBotRunning ? (Math.random() * 100).toFixed(2) : '0.00';
    document.getElementById('dailyProfit').textContent = `+$${dailyProfit}`;
    
    // Update trade count
    const tradeCount = isBotRunning ? Math.floor(Math.random() * 20) + 5 : 0;
    document.getElementById('totalTrades').textContent = tradeCount;
    
    // Update performance stats
    document.getElementById('winRate').textContent = isBotRunning ? '68%' : '0%';
    document.getElementById('avgProfit').textContent = isBotRunning ? '+$15.20' : '+$0.00';
    document.getElementById('totalProfit').textContent = isBotRunning ? '+$152.30' : '+$0.00';
    document.getElementById('activeDays').textContent = isBotRunning ? '7' : '0';
}

// Start trading bot
async function startBot() {
    if (isBotRunning) {
        alert('⚠️ Bot is already running!');
        return;
    }
    
    const strategy = document.getElementById('strategySelect').value;
    const amount = document.getElementById('investmentAmount').value;
    const risk = document.getElementById('riskSlider').value;
    
    // Validate inputs
    if (!amount || amount < 10) {
        alert('Please enter a valid investment amount (minimum $10)');
        return;
    }
    
    try {
        // Show loading state
        const startBtn = document.querySelector('.btn-success');
        const originalText = startBtn.innerHTML;
        startBtn.innerHTML = '<span class="btn-icon">⏳</span> Starting...';
        startBtn.disabled = true;
        
        // Call API
        const response = await fetch(`${API_BASE}/api/tradingo/bot/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('tradingo_token')}`
            },
            body: JSON.stringify({
                userId: currentUserId || 'demo-user',
                strategy,
                symbol: 'BTCUSDT',
                amount: parseFloat(amount)
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            isBotRunning = true;
            alert(`✅ ${data.message}\n\nBot ID: ${data.botId}`);
            
            // Update UI
            updateStats();
            
            // Simulate trades
            simulateTradingActivity();
            
        } else {
            alert(`❌ Failed to start bot: ${data.error}`);
        }
        
    } catch (error) {
        console.error('Error starting bot:', error);
        alert('❌ Failed to connect to server. Using demo mode.');
        
        // Fallback to demo mode
        isBotRunning = true;
        updateStats();
        simulateTradingActivity();
        
    } finally {
        // Reset button
        const startBtn = document.querySelector('.btn-success');
        startBtn.innerHTML = '<span class="btn-icon">🚀</span> Launch Trading Bot';
        startBtn.disabled = false;
    }
}

// Simulate trading activity
function simulateTradingActivity() {
    if (!isBotRunning) return;
    
    // Update market prices every 5 seconds
    setInterval(() => {
        if (!isBotRunning) return;
        
        const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT'];
        symbols.forEach(symbol => {
            generateFakeMarketData(symbol);
        });
        
        // Add random trade occasionally
        if (Math.random() > 0.7) {
            addRandomTrade();
        }
        
        updateStats();
        
    }, 5000);
}

// Add random trade to table
function addRandomTrade() {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
    const sides = ['buy', 'sell'];
    
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const side = sides[Math.floor(Math.random() * sides.length)];
    const profit = (Math.random() - 0.3) * 50;
    
    const trade = {
        symbol,
        side,
        price: (Math.random() * 10000 + 100).toFixed(2),
        profit: profit.toFixed(2),
        timestamp: new Date()
    };
    
    // Add to top of table
    const tradesContainer = document.getElementById('tradesTable');
    const existingRows = tradesContainer.querySelectorAll('.trade-row:not(.header)');
    
    if (existingRows.length >= 10) {
        existingRows[existingRows.length - 1].remove();
    }
    
    const tradeRow = document.createElement('div');
    tradeRow.className = 'trade-row';
    
    const profitClass = profit >= 0 ? 'positive' : 'negative';
    const profitSign = profit >= 0 ? '+' : '';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    tradeRow.innerHTML = `
        <div class="trade-symbol">${trade.symbol}</div>
        <div class="trade-side ${trade.side}">${trade.side.toUpperCase()}</div>
        <div>$${trade.price}</div>
        <div class="trade-profit ${profitClass}">${profitSign}$${Math.abs(profit).toFixed(2)}</div>
        <div>${time}</div>
    `;
    
    tradesContainer.insertBefore(tradeRow, tradesContainer.children[1]);
}

// Connect to WebSocket
function connectWebSocket() {
    try {
        socket = new WebSocket(WS_URL);
        
        socket.onopen = () => {
            console.log('🔗 WebSocket connected');
            showNotification('Connected to real-time trading data', 'success');
        };
        
        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        };
        
        socket.onclose = () => {
            console.log('🔒 WebSocket disconnected');
            showNotification('Real-time connection lost. Reconnecting...', 'warning');
            
            // Attempt to reconnect after 5 seconds
            setTimeout(connectWebSocket, 5000);
        };
        
        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
    } catch (error) {
        console.error('Failed to connect WebSocket:', error);
    }
}

// Handle WebSocket messages
function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'market_update':
            updateMarketItem(data.symbol, data);
            break;
            
        case 'trade_executed':
            // Add trade to table
            addTradeToTable(data.trade);
            break;
            
        case 'welcome':
            console.log('WebSocket:', data.message);
            break;
    }
}

// Add trade from WebSocket
function addTradeToTable(trade) {
    const tradesContainer = document.getElementById('tradesTable');
    
    const tradeRow = document.createElement('div');
    tradeRow.className = 'trade-row';
    
    const profit = parseFloat(trade.profit || 0);
    const profitClass = profit >= 0 ? 'positive' : 'negative';
    const profitSign = profit >= 0 ? '+' : '';
    const time = new Date(trade.timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    tradeRow.innerHTML = `
        <div class="trade-symbol">${trade.symbol}</div>
        <div class="trade-side ${trade.side}">${trade.side.toUpperCase()}</div>
        <div>$${parseFloat(trade.price).toFixed(2)}</div>
        <div class="trade-profit ${profitClass}">${profitSign}$${Math.abs(profit).toFixed(2)}</div>
        <div>${time}</div>
    `;
    
    // Add to top and limit to 10 rows
    const existingRows = tradesContainer.querySelectorAll('.trade-row:not(.header)');
    if (existingRows.length >= 10) {
        existingRows[existingRows.length - 1].remove();
    }
    
    tradesContainer.insertBefore(tradeRow, tradesContainer.children[1]);
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span class="notification-icon">${getNotificationIcon(type)}</span>
        <span class="notification-message">${message}</span>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Get notification icon
function getNotificationIcon(type) {
    const icons = {
        success: '✅',
        warning: '⚠️',
        error: '❌',
        info: 'ℹ️'
    };
    return icons[type] || 'ℹ️';
}

// Setup event listeners
function setupEventListeners() {
    // Start trading button
    const startBtn = document.querySelector('.btn-success');
    if (startBtn) {
        startBtn.addEventListener('click', startBot);
    }
    
    // Strategy select change
    const strategySelect = document.getElementById('strategySelect');
    if (strategySelect) {
        strategySelect.addEventListener('change', updateStrategyInfo);
    }
    
    // Risk slider change
    const riskSlider = document.getElementById('riskSlider');
    if (riskSlider) {
        riskSlider.addEventListener('input', updateRiskLevel);
    }
}

// Update strategy info
function updateStrategyInfo() {
    const strategy = document.getElementById('strategySelect').value;
    const strategies = {
        scalping: 'Fast trades (seconds/minutes), small profits',
        swing: 'Medium-term trades (hours/days)',
        grid: 'Automated buy/sell orders at grid levels',
        martingale: 'Double investment after loss (high risk)'
    };
    
    // You could show this info in a tooltip or info box
    console.log(`Selected strategy: ${strategy} - ${strategies[strategy]}`);
}

// Update risk level display
function updateRiskLevel() {
    const risk = document.getElementById('riskSlider').value;
    const riskLabels = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
    const index = Math.min(Math.floor((risk - 1) / 2), 4);
    
    console.log(`Risk level: ${riskLabels[index]} (${risk}/10)`);
}

// Start trading (from hero button)
function startTrading() {
    const amount = prompt('Enter investment amount ($):', '100');
    if (amount && !isNaN(amount) && amount >= 10) {
        document.getElementById('investmentAmount').value = amount;
        startBot();
    } else if (amount !== null) {
        alert('Please enter a valid amount (minimum $10)');
    }
}

// Show demo
function showDemo() {
    const demoHTML = `
        <div style="text-align: center; padding: 20px;">
            <h3>🚀 Tradingo Demo</h3>
            <p>Watch how Tradingo AI trades automatically:</p>
            <ol style="text-align: left; margin: 20px auto; max-width: 400px;">
                <li>AI analyzes market 24/7</li>
                <li>Identifies trading opportunities</li>
                <li>Executes trades automatically</li>
                <li>Manages risk in real-time</li>
                <li>Tracks performance</li>
            </ol>
            <p><strong>Start your free trial today!</strong></p>
        </div>
    `;
    
    alert(demoHTML.replace(/<[^>]*>/g, '')); // Fallback for plain text
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initApp,
        startBot,
        loadMarketData,
        connectWebSocket
    };
}
