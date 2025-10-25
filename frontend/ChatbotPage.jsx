import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import { API_BASE_URL } from './config';

const ChatbotPage = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const tableNo = searchParams.get('table') || 1;
  const orderId = searchParams.get('orderId');

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showBill, setShowBill] = useState(false);
  const [showOrderStatus, setShowOrderStatus] = useState(true);
  const [orderData, setOrderData] = useState(null);
  const [orderStatus, setOrderStatus] = useState('pending');
  const [socket, setSocket] = useState(null);
  const messageIdCounter = React.useRef(0);

  const API_URL = API_BASE_URL;

  // Status configuration
  const statusConfig = {
    pending: { label: 'Order Received', icon: '📝', color: 'bg-blue-500', emoji: '✅' },
    confirmed: { label: 'Confirmed', icon: '✅', color: 'bg-green-500', emoji: '👍' },
    preparing: { label: 'Cooking', icon: '👨‍🍳', color: 'bg-orange-500', emoji: '🍳' },
    ready: { label: 'Ready!', icon: '🍽️', color: 'bg-purple-500', emoji: '✨' },
    served: { label: 'Served', icon: '😊', color: 'bg-emerald-500', emoji: '🎉' }
  };

  // Initialize
  useEffect(() => {
    // Get order data from navigation state
    if (location.state?.orderData) {
      setOrderData(location.state.orderData);
      setOrderStatus(location.state.orderData.status);

      // Auto-show bill popup initially
      if (location.state.showBill) {
        setShowBill(true);
        // Auto-hide after 10 seconds
        setTimeout(() => setShowBill(false), 10000);
      }
    }

    // Fetch order data if not in state
    if (orderId && !location.state?.orderData) {
      fetchOrderData();
    }

    // Initialize Socket.io
    const newSocket = io(API_URL, {
      transports: ['websocket']
    });
    setSocket(newSocket);
    newSocket.emit('joinTable', tableNo);

    // Listen for status updates
    newSocket.on('orderStatusUpdate', (data) => {
      if (data.orderId === orderId) {
        setOrderStatus(data.status);
        // Add chatbot message about status change
        addBotMessage(`Great news! Your order is now ${statusConfig[data.status]?.label} ${statusConfig[data.status]?.emoji}`);
      }
    });

    // Welcome message
    setTimeout(() => {
      addBotMessage(`Hey Table ${tableNo}! 👋 Your order has been placed successfully! I'm here to assist you while your delicious food is being prepared. 🍽️`);
    }, 1000);

    setTimeout(() => {
      addBotMessage(`Feel free to ask me anything about our restaurant, menu, or your order status! 😊`);
    }, 3000);

    return () => newSocket?.close();
  }, []);

  const fetchOrderData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/order/${orderId}`);
      const data = await response.json();
      if (data.success) {
        setOrderData(data.data);
        setOrderStatus(data.data.status);
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    }
  };

  const addBotMessage = (text) => {
    messageIdCounter.current += 1;
    setMessages(prev => [...prev, {
      id: `msg-${messageIdCounter.current}`,
      text,
      isBot: true,
      timestamp: new Date()
    }]);
  };

  const sendMessage = () => {
    if (!inputMessage.trim()) return;

    // Add user message
    messageIdCounter.current += 1;
    const userMsg = {
      id: `msg-${messageIdCounter.current}`,
      text: inputMessage,
      isBot: false,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    // Simple bot responses
    setTimeout(() => {
      let botResponse = '';

      const lowerInput = inputMessage.toLowerCase();

      if (lowerInput.includes('bill') || lowerInput.includes('payment') || lowerInput.includes('total')) {
        setShowBill(true);
        botResponse = "Sure! Here's your bill. You can view it anytime by clicking the 'View Bill' button above! 💳";
      } else if (lowerInput.includes('status') || lowerInput.includes('order')) {
        botResponse = `Your order is currently ${statusConfig[orderStatus]?.label}! ${statusConfig[orderStatus]?.emoji} ${
          orderStatus === 'preparing' ? "Our chef is working on it right now!" :
          orderStatus === 'ready' ? "It's ready to be served!" :
          "We're on it!"
        }`;
      } else if (lowerInput.includes('time') || lowerInput.includes('long')) {
        botResponse = `Your order will be ready in approximately ${orderData?.estimatedTime || 15} minutes! ⏱️`;
      } else if (lowerInput.includes('special') || lowerInput.includes('recommend')) {
        botResponse = "Our chef's specials today include Chicken Tikka Masala and Grilled Salmon! Would you like to know more? 👨‍🍳";
      } else {
        const responses = [
          "I'm here to help! You can ask me about your order status, bill, or anything about our restaurant! 😊",
          "That's a great question! Let me help you with that! 💡",
          "Interesting! I'll make sure to pass that feedback to our team! 📝",
          "Thank you for that! Is there anything else I can help you with? 🤗"
        ];
        botResponse = responses[Math.floor(Math.random() * responses.length)];
      }

      addBotMessage(botResponse);
    }, 1000);

    setInputMessage('');
  };

  const calculateSubtotal = () => {
    if (!orderData?.items) return 0;
    return orderData.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.05;
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Restaurant Assistant 🤖</h1>
            <p className="text-sm text-white/90">Table {tableNo} • Order #{orderId?.slice(-6)}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBill(true)}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full font-semibold transition-all backdrop-blur-sm"
            >
              💳 View Bill
            </button>
            <button
              onClick={() => setShowOrderStatus(!showOrderStatus)}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full font-semibold transition-all backdrop-blur-sm"
            >
              📊 {showOrderStatus ? 'Hide' : 'Show'} Status
            </button>
          </div>
        </div>
      </div>

      {/* Order Status Bar */}
      <AnimatePresence>
        {showOrderStatus && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border-b-2 border-purple-200 overflow-hidden"
          >
            <div className="max-w-4xl mx-auto p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{statusConfig[orderStatus]?.icon}</span>
                  <div>
                    <p className="font-bold text-gray-800">{statusConfig[orderStatus]?.label}</p>
                    <p className="text-sm text-gray-600">
                      {orderStatus === 'preparing' && 'Your food is being cooked with love! 👨‍🍳'}
                      {orderStatus === 'confirmed' && 'Chef has started working on your order!'}
                      {orderStatus === 'ready' && 'Your order is ready to be served! 🎉'}
                      {orderStatus === 'pending' && 'We\'ve received your order!'}
                    </p>
                  </div>
                </div>

                {/* Progress Steps */}
                <div className="hidden md:flex items-center gap-2">
                  {Object.keys(statusConfig).map((status, idx) => {
                    const isActive = Object.keys(statusConfig).indexOf(orderStatus) >= idx;
                    return (
                      <React.Fragment key={status}>
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all
                          ${isActive ? statusConfig[status].color + ' text-white' : 'bg-gray-200 text-gray-400'}
                        `}>
                          {statusConfig[status].icon}
                        </div>
                        {idx < Object.keys(statusConfig).length - 1 && (
                          <div className={`w-8 h-1 ${isActive ? 'bg-green-500' : 'bg-gray-200'} transition-all`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`
                max-w-[80%] md:max-w-[60%] rounded-2xl p-4 shadow-md
                ${message.isBot
                  ? 'bg-white text-gray-800 rounded-tl-none'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-tr-none'
                }
              `}>
                {message.isBot && (
                  <p className="text-xs text-purple-600 font-semibold mb-1">🤖 Assistant</p>
                )}
                <p className="text-sm md:text-base">{message.text}</p>
                <p className={`text-xs mt-2 ${message.isBot ? 'text-gray-400' : 'text-white/70'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t-2 border-purple-200 p-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask me anything..."
            className="flex-1 px-4 py-3 rounded-full border-2 border-purple-200 focus:border-purple-500 focus:outline-none"
          />
          <button
            onClick={sendMessage}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-full font-bold hover:shadow-lg transition-all"
          >
            Send 📤
          </button>
        </div>
      </div>

      {/* Bill Popup - Only shows when user clicks or asks */}
      <AnimatePresence>
        {showBill && orderData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowBill(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              {/* Bill Header */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold">Your Bill 💳</h2>
                  <button
                    onClick={() => setShowBill(false)}
                    className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-all"
                  >
                    <span className="text-2xl">×</span>
                  </button>
                </div>
                <p className="text-white/90">Table {tableNo} • Order #{orderId?.slice(-6)}</p>
              </div>

              {/* Bill Items */}
              <div className="p-6">
                <div className="space-y-3 mb-4">
                  {orderData.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg"
                        onError={(e) => e.target.src = `https://via.placeholder.com/64/9333EA/FFFFFF?text=${item.name.charAt(0)}`}
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{item.name}</p>
                        <p className="text-sm text-gray-600">{item.quantity}x ₹{item.price}</p>
                      </div>
                      <p className="font-bold text-purple-600">₹{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                {/* Bill Summary */}
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal</span>
                    <span className="font-semibold">₹{calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700 text-sm">
                    <span>GST (5%)</span>
                    <span>₹{calculateTax().toFixed(2)}</span>
                  </div>
                  <div className="border-t-2 border-purple-300 pt-2 flex justify-between">
                    <span className="text-lg font-bold text-gray-800">Total Amount</span>
                    <span className="text-2xl font-bold text-purple-600">
                      ₹{parseFloat(orderData.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Estimated Time */}
                <div className="mt-4 p-4 bg-orange-100 rounded-xl text-center">
                  <p className="text-orange-800 font-semibold">⏱️ Estimated Time</p>
                  <p className="text-3xl font-bold text-orange-600 mt-1">{orderData.estimatedTime || 15} min</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatbotPage;
