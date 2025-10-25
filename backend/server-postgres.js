const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { pool } = require('./config/database');
const { testConnection, initializeDatabase } = require('./database/init');
const MenuItem = require('./models/MenuItem');
const Order = require('./models/Order');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Database on Startup
(async () => {
  try {
    await testConnection();
    // Uncomment below line if you want to auto-initialize schema on startup
    // await initializeDatabase();
  } catch (error) {
    console.error('[ERROR] Failed to connect to database:', error.message);
  }
})();

// ==================== SOCKET.IO EVENTS ====================

io.on('connection', (socket) => {
  console.log('[OK] Client connected:', socket.id);

  socket.on('joinTable', (tableNo) => {
    socket.join(`table_${tableNo}`);
    console.log(`[OK] Socket ${socket.id} joined table_${tableNo}`);
  });

  socket.on('joinChef', () => {
    socket.join('chef_portal');
    console.log(`[OK] Chef portal connected: ${socket.id}`);
  });

  socket.on('disconnect', () => {
    console.log('[OK] Client disconnected:', socket.id);
  });
});

// ==================== API ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Restaurant Backend API (PostgreSQL)',
    timestamp: new Date().toISOString(),
    database: 'PostgreSQL'
  });
});

// Get all menu items
app.get('/api/menu', async (req, res) => {
  try {
    const { category } = req.query;

    const filters = {};
    if (category) {
      filters.category = category;
    }
    filters.available = true;

    const menuItems = await MenuItem.findAll(filters);

    res.json({
      success: true,
      count: menuItems.length,
      data: menuItems
    });
  } catch (error) {
    console.error('[ERROR] Get menu error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get menu item by ID
app.get('/api/menu/:id', async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    res.json({
      success: true,
      data: menuItem
    });
  } catch (error) {
    console.error('[ERROR] Get menu item error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create new order
app.post('/api/order', async (req, res) => {
  try {
    const { tableNo, items, total } = req.body;

    if (!tableNo || !items || !items.length || !total) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tableNo, items, total'
      });
    }

    const estimatedTime = Math.max(...items.map(item => item.prepTime || item.prep_time || 15)) + 5;

    const order = await Order.create({
      tableNo,
      items,
      total,
      estimatedTime,
      status: 'pending'
    });

    // Emit to chef portal
    io.to('chef_portal').emit('newOrder', {
      orderId: order.id,
      tableNo: order.table_no,
      items: order.items,
      total: order.total,
      status: order.status,
      createdAt: order.created_at,
      estimatedTime: order.estimated_time
    });

    // Emit to customer's table
    io.to(`table_${tableNo}`).emit('orderConfirmed', {
      orderId: order.id,
      status: order.status,
      estimatedTime: order.estimated_time
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        id: order.id,
        tableNo: order.table_no,
        items: order.items,
        total: order.total,
        status: order.status,
        estimatedTime: order.estimated_time,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      }
    });
  } catch (error) {
    console.error('[ERROR] Create order error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get order by ID
app.get('/api/order/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: order.id,
        tableNo: order.table_no,
        items: order.items,
        total: order.total,
        status: order.status,
        estimatedTime: order.estimated_time,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      }
    });
  } catch (error) {
    console.error('[ERROR] Get order error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all orders
app.get('/api/orders', async (req, res) => {
  try {
    const { status, tableNo } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (tableNo) filters.tableNo = parseInt(tableNo);

    const orders = await Order.findAll(filters);

    // Transform to match frontend expectations
    const transformedOrders = orders.map(order => ({
      orderId: order.id,
      tableNo: order.table_no,
      items: order.items,
      total: order.total,
      status: order.status,
      estimatedTime: order.estimated_time,
      createdAt: order.created_at,
      updatedAt: order.updated_at
    }));

    res.json({
      success: true,
      count: transformedOrders.length,
      data: transformedOrders
    });
  } catch (error) {
    console.error('[ERROR] Get all orders error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update order status
app.put('/api/order/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    // Validate order ID
    if (!orderId || orderId === 'undefined' || isNaN(parseInt(orderId))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID'
      });
    }

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    const updatedOrder = await Order.updateStatus(parseInt(orderId), status);

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Get full order with items for socket emission
    const fullOrder = await Order.findById(parseInt(orderId));

    // Emit to customer
    io.to(`table_${fullOrder.table_no}`).emit('orderStatusUpdate', {
      orderId: fullOrder.id,
      status: fullOrder.status,
      updatedAt: fullOrder.updated_at
    });

    // Emit to chef portal
    io.to('chef_portal').emit('orderStatusUpdated', {
      orderId: fullOrder.id,
      status: fullOrder.status
    });

    res.json({
      success: true,
      message: 'Order status updated',
      data: {
        id: fullOrder.id,
        tableNo: fullOrder.table_no,
        items: fullOrder.items,
        total: fullOrder.total,
        status: fullOrder.status,
        estimatedTime: fullOrder.estimated_time,
        createdAt: fullOrder.created_at,
        updatedAt: fullOrder.updated_at
      }
    });
  } catch (error) {
    console.error('[ERROR] Update order status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Seed menu endpoint
app.post('/api/seed-menu', async (req, res) => {
  try {
    const { seedMenuItems } = require('./database/init');
    await seedMenuItems();

    const count = await MenuItem.count();

    res.json({
      success: true,
      message: 'Menu seeded successfully',
      count: count
    });
  } catch (error) {
    console.error('[ERROR] Seed menu error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Initialize database endpoint (admin only - should be protected in production)
app.post('/api/init-db', async (req, res) => {
  try {
    const { initializeDatabase, seedMenuItems } = require('./database/init');

    await initializeDatabase();
    await seedMenuItems();

    res.json({
      success: true,
      message: 'Database initialized successfully'
    });
  } catch (error) {
    console.error('[ERROR] Database initialization error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== QR CODE ENDPOINTS ====================

// Generate QR codes for all tables
app.post('/api/generate-qr-codes', async (req, res) => {
  try {
    const totalTables = 20;
    const qrCodesDir = path.join(__dirname, 'qr-codes');
    const frontendURL = 'http://localhost:5173'; // Change this to your production URL

    // Create directory if it doesn't exist
    if (!fs.existsSync(qrCodesDir)) {
      fs.mkdirSync(qrCodesDir, { recursive: true });
    }

    const generatedQRCodes = [];

    // Generate QR code for each table
    for (let tableNo = 1; tableNo <= totalTables; tableNo++) {
      const url = `${frontendURL}/menu?table=${tableNo}`;
      const fileName = `table-${tableNo}.png`;
      const filePath = path.join(qrCodesDir, fileName);

      // Generate QR code and save to file
      await QRCode.toFile(filePath, url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      generatedQRCodes.push({
        tableNo,
        url,
        fileName,
        filePath: `/api/qr-codes/table-${tableNo}.png`
      });
    }

    console.log(`[OK] Generated ${totalTables} QR codes successfully`);

    res.json({
      success: true,
      message: `Generated ${totalTables} QR codes successfully`,
      data: generatedQRCodes
    });
  } catch (error) {
    console.error('[ERROR] Generate QR codes error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Serve QR code images
app.use('/api/qr-codes', express.static(path.join(__dirname, 'qr-codes')));

// Get all QR codes info
app.get('/api/qr-codes-list', (req, res) => {
  try {
    const qrCodesDir = path.join(__dirname, 'qr-codes');

    if (!fs.existsSync(qrCodesDir)) {
      return res.json({
        success: true,
        message: 'No QR codes generated yet',
        data: []
      });
    }

    const files = fs.readdirSync(qrCodesDir);
    const qrCodesList = files
      .filter(file => file.endsWith('.png'))
      .map(file => {
        const tableNo = parseInt(file.match(/table-(\d+)\.png/)[1]);
        return {
          tableNo,
          fileName: file,
          url: `/api/qr-codes/${file}`,
          menuUrl: `http://localhost:5173/menu?table=${tableNo}`
        };
      })
      .sort((a, b) => a.tableNo - b.tableNo);

    res.json({
      success: true,
      count: qrCodesList.length,
      data: qrCodesList
    });
  } catch (error) {
    console.error('[ERROR] Get QR codes list error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log('\n============================================================');
  console.log('[APP] Restaurant Backend Server (PostgreSQL)');
  console.log('============================================================');
  console.log(`[OK] Server running on http://localhost:${PORT}`);
  console.log(`[OK] Socket.io enabled for real-time updates`);
  console.log(`[OK] Database: PostgreSQL`);
  console.log(`[OK] Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);
  console.log(`[OK] Database Name: ${process.env.DB_NAME || 'hotel_restaurant_db'}`);
  console.log('============================================================\n');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[INFO] SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('[OK] HTTP server closed');
  });
  await pool.end();
  console.log('[OK] Database pool closed');
});

module.exports = { app, io, server };
