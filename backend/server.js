const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant';
mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('[OK] MongoDB connected');
  // Auto-seed menu on startup if empty
  autoSeedMenu();
})
.catch(err => console.error('[ERROR] MongoDB connection error:', err));

// Order Schema
const orderSchema = new mongoose.Schema({
  tableNo: {
    type: Number,
    required: true
  },
  items: [{
    name: String,
    price: Number,
    quantity: Number,
    category: String,
    image: String
  }],
  total: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  estimatedTime: {
    type: Number, // in minutes
    default: 20
  }
});

const Order = mongoose.model('Order', orderSchema);

// Menu Schema
const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  price: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    enum: ['appetizer', 'main', 'dessert', 'beverage'],
    required: true
  },
  image: String,
  available: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    default: 4.5
  },
  prepTime: Number,
  isVeg: Boolean,
  spiceLevel: Number,
  popular: Boolean,
  chefSpecial: Boolean
});

const MenuItem = mongoose.model('MenuItem', menuItemSchema);

// In-memory storage for when MongoDB is not available
let inMemoryOrders = [];

// Auto-seed function
const autoSeedMenu = async () => {
  try {
    const count = await MenuItem.countDocuments();
    if (count === 0) {
      const menuData = require('./seedData');
      await MenuItem.insertMany(menuData);
      console.log(`[OK] Auto-seeded ${menuData.length} menu items`);
    } else {
      console.log(`[OK] Found ${count} existing menu items`);
    }
  } catch (error) {
    console.log('[WARN] Auto-seed failed:', error.message);
  }
};

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
    message: 'Restaurant Backend API',
    timestamp: new Date().toISOString()
  });
});

// Get all menu items
app.get('/api/menu', async (req, res) => {
  try {
    const { category } = req.query;

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // Fallback: Serve data directly from seedData file
      console.log('[WARN] MongoDB not connected, serving data from seedData.js');
      const menuData = require('./seedData');
      let filteredData = menuData;

      if (category) {
        filteredData = menuData.filter(item => item.category === category);
      }

      return res.json({
        success: true,
        count: filteredData.length,
        data: filteredData
      });
    }

    // Normal MongoDB query
    const filter = category ? { category, available: true } : { available: true };
    const menuItems = await MenuItem.find(filter).sort({ popular: -1, rating: -1, name: 1 });

    res.json({
      success: true,
      count: menuItems.length,
      data: menuItems
    });
  } catch (error) {
    console.error('[ERROR] Get menu error:', error);
    // Fallback on error
    try {
      const menuData = require('./seedData');
      res.json({
        success: true,
        count: menuData.length,
        data: menuData
      });
    } catch (fallbackError) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
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

    const estimatedTime = Math.max(...items.map(item => item.prepTime || 15)) + 5;

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // Fallback: Store in memory
      console.log('[WARN] MongoDB not connected, storing order in memory');
      const order = {
        _id: Date.now().toString(),
        tableNo,
        items,
        total,
        estimatedTime,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      inMemoryOrders.push(order);

      // Emit to chef portal
      io.to('chef_portal').emit('newOrder', {
        orderId: order._id,
        tableNo: order.tableNo,
        items: order.items,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt,
        estimatedTime: order.estimatedTime
      });

      // Emit to customer's table
      io.to(`table_${tableNo}`).emit('orderConfirmed', {
        orderId: order._id,
        status: order.status,
        estimatedTime: order.estimatedTime
      });

      return res.status(201).json({
        success: true,
        message: 'Order placed successfully (in-memory)',
        data: order
      });
    }

    // Normal MongoDB save
    const order = new Order({
      tableNo,
      items,
      total,
      estimatedTime,
      status: 'pending'
    });

    await order.save();

    // Emit to chef portal
    io.to('chef_portal').emit('newOrder', {
      orderId: order._id,
      tableNo: order.tableNo,
      items: order.items,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
      estimatedTime: order.estimatedTime
    });

    // Emit to customer's table
    io.to(`table_${tableNo}`).emit('orderConfirmed', {
      orderId: order._id,
      status: order.status,
      estimatedTime: order.estimatedTime
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: order
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
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // Fallback: Get from memory
      const order = inMemoryOrders.find(o => o._id === req.params.id);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }

      return res.json({
        success: true,
        data: order
      });
    }

    // Normal MongoDB query
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
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
    const { status } = req.query;
    const filter = status ? { status } : {};

    const orders = await Order.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      data: orders
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

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: Date.now() },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Emit to customer
    io.to(`table_${order.tableNo}`).emit('orderStatusUpdate', {
      orderId: order._id,
      status: order.status,
      updatedAt: order.updatedAt
    });

    // Emit to chef portal
    io.to('chef_portal').emit('orderStatusUpdated', {
      orderId: order._id,
      status: order.status
    });

    res.json({
      success: true,
      message: 'Order status updated',
      data: order
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
    await MenuItem.deleteMany({});
    const menuData = require('./seedData');
    await MenuItem.insertMany(menuData);

    res.json({
      success: true,
      message: 'Menu seeded successfully',
      count: menuData.length
    });
  } catch (error) {
    console.error('[ERROR] Seed menu error:', error);
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
  console.log('[APP] Restaurant Backend Server');
  console.log('============================================================');
  console.log(`[OK] Server running on http://localhost:${PORT}`);
  console.log(`[OK] Socket.io enabled for real-time updates`);
  console.log(`[OK] MongoDB: ${MONGODB_URI}`);
  console.log('============================================================\n');
});

module.exports = { app, io };
