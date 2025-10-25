import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';
import axios from 'axios';
import { API_BASE_URL } from './config';

const ChefPortal = () => {
  const [orders, setOrders] = useState([]);
  const [socket, setSocket] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, preparing, ready
  const [stats, setStats] = useState({
    pending: 0,
    preparing: 0,
    ready: 0,
    served: 0
  });

  const API_URL = API_BASE_URL;

  const statusColors = {
    pending: 'bg-yellow-500',
    confirmed: 'bg-blue-500',
    preparing: 'bg-orange-500',
    ready: 'bg-green-500',
    served: 'bg-gray-500',
    cancelled: 'bg-red-500'
  };

  // Initialize Socket.io
  useEffect(() => {
    const newSocket = io(API_URL, {
      transports: ['websocket']
    });

    setSocket(newSocket);

    // Join chef room
    newSocket.emit('joinChef');

    // Listen for new orders
    newSocket.on('newOrder', (orderData) => {
      setOrders(prev => [orderData, ...prev]);
      // Play notification sound
      playNotificationSound();
    });

    // Listen for status updates
    newSocket.on('orderStatusUpdated', (data) => {
      setOrders(prev =>
        prev.map(order =>
          order.orderId === data.orderId
            ? { ...order, status: data.status }
            : order
        )
      );
    });

    // Cleanup
    return () => newSocket.close();
  }, []);

  // Fetch initial orders
  useEffect(() => {
    fetchOrders();
  }, []);

  // Update stats whenever orders change
  useEffect(() => {
    const newStats = {
      pending: orders.filter(o => o.status === 'pending').length,
      preparing: orders.filter(o => o.status === 'preparing').length,
      ready: orders.filter(o => o.status === 'ready').length,
      served: orders.filter(o => o.status === 'served').length
    };
    setStats(newStats);
  }, [orders]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/orders`);
      if (response.data.success) {
        setOrders(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await axios.put(
        `${API_URL}/api/order/${orderId}/status`,
        { status: newStatus }
      );

      if (response.data.success) {
        setOrders(prev =>
          prev.map(order =>
            order.orderId === orderId || order._id === orderId
              ? { ...order, status: newStatus }
              : order
          )
        );
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update order status');
    }
  };

  const playNotificationSound = () => {
    // Create notification sound
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTcIGWi77eefTRAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQUrgc7y2Yk3CBlou+3nn00QDFCn4/C2YxwGOJLX8sx5LAUkd8fw3ZBAC');
    audio.play().catch(() => {});
  };

  const getFilteredOrders = () => {
    if (filter === 'all') return orders;
    return orders.filter(order => order.status === filter);
  };

  const getStatusActions = (currentStatus) => {
    const statusFlow = {
      pending: [{ label: 'Confirm', status: 'confirmed' }],
      confirmed: [{ label: 'Start Preparing', status: 'preparing' }],
      preparing: [{ label: 'Mark Ready', status: 'ready' }],
      ready: [{ label: 'Mark Served', status: 'served' }]
    };
    return statusFlow[currentStatus] || [];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">👨‍🍳 Chef Portal</h1>
              <p className="text-purple-100">Real-time Order Management</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchOrders}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-6 py-3 rounded-xl font-semibold transition-all"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Pending', count: stats.pending, color: 'from-yellow-500 to-orange-500', icon: '⏳' },
            { label: 'Preparing', count: stats.preparing, color: 'from-orange-500 to-red-500', icon: '👨‍🍳' },
            { label: 'Ready', count: stats.ready, color: 'from-green-500 to-emerald-500', icon: '✅' },
            { label: 'Served', count: stats.served, color: 'from-blue-500 to-purple-500', icon: '✨' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-gradient-to-r ${stat.color} rounded-2xl p-6 text-white shadow-xl`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl">{stat.icon}</span>
                <span className="text-4xl font-bold">{stat.count}</span>
              </div>
              <p className="text-sm font-semibold text-white text-opacity-90">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-2 mb-6">
          <div className="flex gap-2">
            {['all', 'pending', 'preparing', 'ready'].map(filterOption => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`
                  flex-1 py-3 rounded-xl font-semibold transition-all
                  ${filter === filterOption
                    ? 'bg-white text-purple-600 shadow-lg'
                    : 'text-white hover:bg-white hover:bg-opacity-10'
                  }
                `}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {getFilteredOrders().map((order, index) => (
              <motion.div
                key={order.orderId || order._id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-2xl overflow-hidden"
              >
                {/* Order Header */}
                <div className={`${statusColors[order.status]} p-4 text-white`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-bold">Table {order.tableNo}</h3>
                      <p className="text-sm text-white text-opacity-90">
                        Order #{String(order.orderId)?.slice(-6) || String(order._id)?.slice(-6)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">₹{order.total}</p>
                      {order.estimatedTime && (
                        <p className="text-xs text-white text-opacity-90">
                          ⏱️ {order.estimatedTime} min
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1 inline-block">
                    <span className="text-sm font-semibold uppercase">{order.status}</span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-4">
                  <h4 className="font-semibold text-gray-700 mb-3">Items:</h4>
                  <div className="space-y-2 mb-4">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-800">{item.name}</p>
                          <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-semibold text-gray-700">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Time */}
                  <div className="text-xs text-gray-500 mb-4">
                    Ordered: {new Date(order.createdAt).toLocaleTimeString()}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {getStatusActions(order.status).map(action => (
                      <button
                        key={action.status}
                        onClick={() => updateOrderStatus(order.orderId || order._id, action.status)}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                      >
                        {action.label}
                      </button>
                    ))}

                    {order.status !== 'served' && order.status !== 'cancelled' && (
                      <button
                        onClick={() => updateOrderStatus(order.orderId || order._id, 'cancelled')}
                        className="w-full bg-red-500 text-white py-2 rounded-xl font-semibold hover:bg-red-600 transition-all"
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {getFilteredOrders().length === 0 && (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">📭</p>
            <p className="text-2xl text-white mb-2">No {filter !== 'all' ? filter : ''} orders</p>
            <p className="text-purple-200">Orders will appear here in real-time</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChefPortal;
