import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';

const MenuOrderPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tableNo = searchParams.get('table') || 1;

  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);

  const API_URL = 'http://localhost:5001';

  const categories = [
    { id: 'all', label: 'All Items', icon: '🍽️' },
    { id: 'appetizer', label: 'Appetizers', icon: '🥗' },
    { id: 'main', label: 'Main Course', icon: '🍕' },
    { id: 'dessert', label: 'Desserts', icon: '🍰' },
    { id: 'beverage', label: 'Beverages', icon: '🥤' }
  ];

  // Fetch menu items
  useEffect(() => {
    fetchMenu();
  }, [selectedCategory]);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const url = selectedCategory === 'all'
        ? `${API_URL}/api/menu`
        : `${API_URL}/api/menu?category=${selectedCategory}`;

      const response = await axios.get(url);
      setMenuItems(response.data.data);
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add item to cart
  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem._id === item._id);

    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem._id === item._id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  // Remove from cart
  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item._id !== itemId));
  };

  // Update quantity
  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
    } else {
      setCart(cart.map(item =>
        item._id === itemId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  // Calculate total
  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Place order
  const placeOrder = async () => {
    try {
      if (cart.length === 0) {
        alert('Please add items to cart');
        return;
      }

      const orderData = {
        tableNo: parseInt(tableNo),
        items: cart.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category: item.category
        })),
        total: calculateTotal()
      };

      const response = await axios.post(`${API_URL}/api/order`, orderData);

      if (response.data.success) {
        // Navigate to order status page
        navigate(`/order-status?table=${tableNo}&orderId=${response.data.data._id}`, {
          state: { orderData: response.data.data }
        });
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Our Menu</h1>
              <p className="text-sm text-gray-500">Table {tableNo}</p>
            </div>

            {/* Cart Button */}
            <button
              onClick={() => setShowCart(true)}
              className="relative bg-orange-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:bg-orange-600 transition-all"
            >
              <span className="flex items-center gap-2">
                🛒 Cart
                {cart.length > 0 && (
                  <span className="bg-white text-orange-500 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                    {cart.length}
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="sticky top-20 z-30 bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all
                  ${selectedCategory === category.id
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                <span>{category.icon}</span>
                <span className="font-medium">{category.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading delicious items...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item, index) => (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all"
              >
                {/* Item Image */}
                <div className="relative h-48 bg-gradient-to-br from-orange-100 to-red-100">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">
                      {categories.find(c => c.id === item.category)?.icon || '🍽️'}
                    </div>
                  )}
                  {/* Rating Badge */}
                  <div className="absolute top-3 right-3 bg-white bg-opacity-90 px-2 py-1 rounded-full flex items-center gap-1">
                    <span className="text-yellow-500">⭐</span>
                    <span className="text-sm font-semibold">{item.rating}</span>
                  </div>
                </div>

                {/* Item Details */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-1">{item.name}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-orange-600">₹{item.price}</p>
                      {item.prepTime && (
                        <p className="text-xs text-gray-500">⏱️ {item.prepTime} min</p>
                      )}
                    </div>

                    <button
                      onClick={() => addToCart(item)}
                      className="bg-orange-500 text-white px-6 py-2 rounded-full font-semibold hover:bg-orange-600 transition-all shadow-md hover:shadow-lg"
                    >
                      Add +
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {menuItems.length === 0 && !loading && (
          <div className="text-center py-20">
            <p className="text-2xl text-gray-400">No items found in this category</p>
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {showCart && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCart(false)}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
            />

            {/* Cart Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            >
              {/* Cart Header */}
              <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Your Cart</h2>
                  <button
                    onClick={() => setShowCart(false)}
                    className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all"
                  >
                    <span className="text-2xl">×</span>
                  </button>
                </div>
                <p className="text-sm text-white text-opacity-90 mt-1">
                  Table {tableNo} • {cart.length} items
                </p>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-4">
                {cart.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-6xl mb-4">🛒</p>
                    <p className="text-xl text-gray-400">Your cart is empty</p>
                    <p className="text-sm text-gray-500 mt-2">Add items to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map(item => (
                      <motion.div
                        key={item._id}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-gray-50 rounded-xl p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">{item.name}</h3>
                            <p className="text-sm text-gray-600">₹{item.price} each</p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item._id)}
                            className="text-red-500 hover:text-red-700 font-bold"
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-3 bg-white rounded-full px-3 py-1 shadow-sm">
                            <button
                              onClick={() => updateQuantity(item._id, item.quantity - 1)}
                              className="w-6 h-6 bg-orange-100 rounded-full text-orange-600 font-bold hover:bg-orange-200"
                            >
                              -
                            </button>
                            <span className="font-semibold w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item._id, item.quantity + 1)}
                              className="w-6 h-6 bg-orange-500 rounded-full text-white font-bold hover:bg-orange-600"
                            >
                              +
                            </button>
                          </div>

                          {/* Item Total */}
                          <p className="font-bold text-orange-600">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Footer */}
              {cart.length > 0 && (
                <div className="border-t border-gray-200 p-4 bg-white">
                  {/* Total */}
                  <div className="mb-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-semibold">₹{calculateTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-2 text-sm">
                      <span className="text-gray-600">Tax (5%)</span>
                      <span>₹{(calculateTotal() * 0.05).toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="text-lg font-bold">Total</span>
                      <span className="text-2xl font-bold text-orange-600">
                        ₹{(calculateTotal() * 1.05).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Place Order Button */}
                  <button
                    onClick={placeOrder}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
                  >
                    Place Order 🎉
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MenuOrderPage;
