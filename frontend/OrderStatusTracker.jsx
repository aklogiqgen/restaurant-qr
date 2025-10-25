import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';

// Order Status Component with Real-time Updates
const OrderStatusTracker = ({ tableNo, orderId, orderData }) => {
  const [status, setStatus] = useState('pending'); // pending, preparing, ready, served
  const [socket, setSocket] = useState(null);
  const [showBill, setShowBill] = useState(false);
  const [orderDetails, setOrderDetails] = useState(orderData);

  // Order status configuration
  const statusConfig = {
    pending: {
      label: 'Order Placed',
      icon: '📝',
      color: 'bg-blue-500',
      description: 'Your order has been received'
    },
    confirmed: {
      label: 'Confirmed',
      icon: '✅',
      color: 'bg-green-500',
      description: 'Chef has confirmed your order'
    },
    preparing: {
      label: 'Being Prepared',
      icon: '👨‍🍳',
      color: 'bg-orange-500',
      description: 'Your delicious meal is being prepared'
    },
    ready: {
      label: 'Ready to Serve',
      icon: '🍽️',
      color: 'bg-purple-500',
      description: 'Your order is ready!'
    },
    served: {
      label: 'Served',
      icon: '✨',
      color: 'bg-emerald-500',
      description: 'Enjoy your meal!'
    }
  };

  // Initialize Socket.io connection
  useEffect(() => {
    const newSocket = io('http://localhost:5001', {
      transports: ['websocket'],
      reconnection: true
    });

    setSocket(newSocket);

    // Listen for order status updates
    newSocket.on('orderStatusUpdate', (data) => {
      if (data.orderId === orderId) {
        setStatus(data.status);

        // Show bill popup when order is ready
        if (data.status === 'ready') {
          setShowBill(true);
        }
      }
    });

    // Cleanup
    return () => newSocket.close();
  }, [orderId]);

  // Show bill immediately after order is placed
  useEffect(() => {
    if (orderData) {
      setShowBill(true);
      // Auto-hide bill after 10 seconds
      const timer = setTimeout(() => setShowBill(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [orderData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      {/* Header */}
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Table {tableNo}
              </h1>
              <p className="text-sm text-gray-500">Order #{orderId?.slice(-6)}</p>
            </div>
            <div className="text-4xl">{statusConfig[status]?.icon}</div>
          </div>
        </motion.div>

        {/* Order Status Progress */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
        >
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Order Status</h2>

          {/* Progress Bar */}
          <div className="relative">
            {Object.keys(statusConfig).map((statusKey, index) => {
              const isActive = Object.keys(statusConfig).indexOf(status) >= index;
              const isCurrent = status === statusKey;

              return (
                <div key={statusKey} className="flex items-center mb-8 last:mb-0">
                  {/* Timeline Line */}
                  {index < Object.keys(statusConfig).length - 1 && (
                    <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: isActive ? '100%' : 0 }}
                        transition={{ duration: 0.5 }}
                        className={statusConfig[statusKey].color.replace('bg-', 'bg-opacity-50 bg-')}
                      />
                    </div>
                  )}

                  {/* Status Icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`
                      relative z-10 w-12 h-12 rounded-full flex items-center justify-center
                      ${isActive ? statusConfig[statusKey].color : 'bg-gray-200'}
                      ${isCurrent ? 'ring-4 ring-offset-2 ring-opacity-50 ' + statusConfig[statusKey].color : ''}
                      transition-all duration-300
                    `}
                  >
                    <span className="text-2xl">
                      {isActive ? statusConfig[statusKey].icon : '⏳'}
                    </span>
                  </motion.div>

                  {/* Status Text */}
                  <div className="ml-4 flex-1">
                    <h3 className={`font-semibold ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                      {statusConfig[statusKey].label}
                    </h3>
                    <p className={`text-sm ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                      {statusConfig[statusKey].description}
                    </p>
                  </div>

                  {/* Current Status Pulse */}
                  {isCurrent && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="w-3 h-3 rounded-full bg-green-500"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Order Items */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Order</h2>
          <div className="space-y-3">
            {orderDetails?.items?.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{item.name}</p>
                  <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold text-gray-800">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-800">Total</span>
              <span className="text-2xl font-bold text-green-600">
                ₹{orderDetails?.total?.toFixed(2)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Bill Popup - Dynamic Island Style */}
        <AnimatePresence>
          {showBill && (
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4"
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl shadow-2xl overflow-hidden"
              >
                {/* Close Button */}
                <button
                  onClick={() => setShowBill(false)}
                  className="absolute top-4 right-4 w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all"
                >
                  <span className="text-white text-xl">×</span>
                </button>

                <div className="p-6">
                  {/* Header */}
                  <div className="text-center mb-6">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.5 }}
                      className="text-6xl mb-2"
                    >
                      🎉
                    </motion.div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      Order Confirmed!
                    </h2>
                    <p className="text-white text-opacity-90 text-sm">
                      Table {tableNo} • Order #{orderId?.slice(-6)}
                    </p>
                  </div>

                  {/* Bill Details */}
                  <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-4 mb-4">
                    <div className="space-y-2">
                      {orderDetails?.items?.map((item, index) => (
                        <div key={index} className="flex justify-between text-white">
                          <span className="text-sm">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-semibold">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-white border-opacity-30 mt-3 pt-3">
                      <div className="flex justify-between text-white">
                        <span className="font-semibold">Subtotal</span>
                        <span>₹{orderDetails?.total?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white text-sm mt-1">
                        <span>Tax (5%)</span>
                        <span>₹{(orderDetails?.total * 0.05).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white font-bold text-xl mt-2">
                        <span>Total</span>
                        <span>₹{(orderDetails?.total * 1.05).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Estimated Time */}
                  <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-3 text-center">
                    <p className="text-white text-opacity-80 text-sm">Estimated Time</p>
                    <p className="text-white font-bold text-2xl">15-20 min</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                      onClick={() => setShowBill(false)}
                      className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-semibold py-3 rounded-xl transition-all"
                    >
                      Track Order
                    </button>
                    <button
                      onClick={() => window.location.href = `/chat?table=${tableNo}`}
                      className="bg-white text-purple-600 font-semibold py-3 rounded-xl hover:shadow-lg transition-all"
                    >
                      Chat with Us
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OrderStatusTracker;
