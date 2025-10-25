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
  const [searchQuery, setSearchQuery] = useState('');

  const API_URL = 'http://localhost:5001';

  const categories = [
    { id: 'all', label: 'All', icon: '🍽️', color: 'from-purple-500 to-pink-500' },
    { id: 'appetizer', label: 'Starters', icon: '🥗', color: 'from-green-500 to-teal-500' },
    { id: 'main', label: 'Main Course', icon: '🍕', color: 'from-orange-500 to-red-500' },
    { id: 'dessert', label: 'Desserts', icon: '🍰', color: 'from-pink-500 to-rose-500' },
    { id: 'beverage', label: 'Drinks', icon: '🥤', color: 'from-blue-500 to-cyan-500' }
  ];

  useEffect(() => {
    fetchMenu();
  }, [selectedCategory]);

  // Helper function to get item ID (works with both MongoDB _id and PostgreSQL id)
  const getItemId = (item) => item._id || item.id;

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const url = selectedCategory === 'all'
        ? `${API_URL}/api/menu`
        : `${API_URL}/api/menu?category=${selectedCategory}`;

      const response = await axios.get(url);
      // Normalize data to use _id for consistency
      const normalizedData = response.data.data.map(item => ({
        ...item,
        _id: item._id || item.id,
        prepTime: item.prep_time || item.prepTime,
        isVeg: item.is_veg !== undefined ? item.is_veg : item.isVeg,
        spiceLevel: item.spice_level !== undefined ? item.spice_level : item.spiceLevel,
        chefSpecial: item.chef_special !== undefined ? item.chef_special : item.chefSpecial
      }));
      setMenuItems(normalizedData);
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
    }
  };

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

    // Show brief animation
    const button = document.getElementById(`add-btn-${item._id}`);
    if (button) {
      button.classList.add('scale-110');
      setTimeout(() => button.classList.remove('scale-110'), 200);
    }
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item._id !== itemId));
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
    } else {
      setCart(cart.map(item =>
        item._id === itemId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.05;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

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
          category: item.category,
          image: item.image,
          prepTime: item.prepTime
        })),
        total: calculateTotal()
      };

      const response = await axios.post(`${API_URL}/api/order`, orderData);

      if (response.data.success) {
        // Navigate to chatbot with order data
        const orderId = response.data.data.id || response.data.data._id;
        navigate(`/chat?table=${tableNo}&orderId=${orderId}`, {
          state: {
            orderData: response.data.data,
            showBill: true // Flag to show bill popup
          }
        });
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    }
  };

  const filteredItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50">
      {/* Header */}
      <div className="bg-white shadow-lg sticky top-0 z-40 border-b-2 border-orange-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Our Delicious Menu
              </h1>
              <p className="text-sm text-gray-600 mt-1">Table {tableNo} • {menuItems.length} items available</p>
            </div>

            {/* Cart Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCart(true)}
              className="relative bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <span className="flex items-center gap-2">
                <span className="text-xl">🛒</span>
                <span>Cart</span>
                {cart.length > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shadow-md"
                  >
                    {cart.length}
                  </motion.span>
                )}
              </span>
            </motion.button>
          </div>

          {/* Search Bar */}
          <div className="mt-4">
            <input
              type="text"
              placeholder="Search for dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 rounded-full border-2 border-orange-200 focus:border-orange-500 focus:outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="sticky top-28 z-30 bg-white/80 backdrop-blur-md shadow-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {categories.map(category => (
              <motion.button
                key={category.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(category.id)}
                className={`
                  flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap transition-all font-semibold
                  ${selectedCategory === category.id
                    ? `bg-gradient-to-r ${category.color} text-white shadow-lg`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                <span className="text-lg">{category.icon}</span>
                <span>{category.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading delicious items...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item, index) => (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-3xl shadow-lg overflow-hidden hover:shadow-2xl transition-all group"
              >
                {/* Item Image */}
                <div className="relative h-52 overflow-hidden bg-gradient-to-br from-orange-100 to-pink-100">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      e.target.src = `https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=${item.name}`;
                    }}
                  />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {item.isVeg !== undefined && (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.isVeg ? 'bg-green-500' : 'bg-red-500'} text-white shadow-md`}>
                        {item.isVeg ? '🌱 Veg' : '🍖 Non-Veg'}
                      </span>
                    )}
                    {item.popular && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-400 text-gray-800 shadow-md">
                        ⭐ Popular
                      </span>
                    )}
                    {item.chefSpecial && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500 text-white shadow-md">
                        👨‍🍳 Chef's Special
                      </span>
                    )}
                  </div>

                  {/* Rating */}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md">
                    <span className="text-yellow-500 text-sm">⭐</span>
                    <span className="text-sm font-bold text-gray-800">{item.rating}</span>
                  </div>
                </div>

                {/* Item Details */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-1 line-clamp-1">{item.name}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2 h-10">{item.description}</p>

                  {/* Spice Level */}
                  {item.spiceLevel > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(item.spiceLevel)].map((_, i) => (
                        <span key={i} className="text-red-500 text-sm">🌶️</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <p className="text-2xl font-bold text-orange-600">₹{item.price}</p>
                      {item.prepTime && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <span>⏱️</span>
                          <span>{item.prepTime} min</span>
                        </p>
                      )}
                    </div>

                    <motion.button
                      id={`add-btn-${item._id}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => addToCart(item)}
                      className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2.5 rounded-full font-bold hover:shadow-lg transition-all"
                    >
                      Add +
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {filteredItems.length === 0 && !loading && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-2xl text-gray-400 font-semibold">No items found</p>
            <p className="text-gray-500 mt-2">Try a different search or category</p>
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
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            {/* Cart Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            >
              {/* Cart Header */}
              <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <span>🛒</span>
                    <span>Your Cart</span>
                  </h2>
                  <button
                    onClick={() => setShowCart(false)}
                    className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-all backdrop-blur-sm"
                  >
                    <span className="text-2xl">×</span>
                  </button>
                </div>
                <p className="text-white/90 text-sm">
                  Table {tableNo} • {cart.length} items
                </p>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-4">
                {cart.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-7xl mb-4">🛒</p>
                    <p className="text-xl text-gray-400 font-semibold">Your cart is empty</p>
                    <p className="text-sm text-gray-500 mt-2">Add some delicious items!</p>
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
                        className="bg-gradient-to-r from-orange-50 to-pink-50 rounded-2xl p-4 border-2 border-orange-100"
                      >
                        <div className="flex gap-3">
                          {/* Item Image */}
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-xl"
                            onError={(e) => {
                              e.target.src = `https://via.placeholder.com/80/FF6B6B/FFFFFF?text=${item.name.charAt(0)}`;
                            }}
                          />

                          {/* Item Details */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-bold text-gray-800">{item.name}</h3>
                                <p className="text-sm text-gray-600">₹{item.price} each</p>
                              </div>
                              <button
                                onClick={() => removeFromCart(item._id)}
                                className="text-red-500 hover:text-red-700 font-bold text-xl"
                              >
                                ×
                              </button>
                            </div>

                            <div className="flex items-center justify-between">
                              {/* Quantity Controls */}
                              <div className="flex items-center gap-2 bg-white rounded-full px-2 py-1 shadow-sm border border-orange-200">
                                <button
                                  onClick={() => updateQuantity(item._id, item.quantity - 1)}
                                  className="w-7 h-7 bg-orange-100 rounded-full text-orange-600 font-bold hover:bg-orange-200 transition-all"
                                >
                                  -
                                </button>
                                <span className="font-bold w-8 text-center">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item._id, item.quantity + 1)}
                                  className="w-7 h-7 bg-orange-500 rounded-full text-white font-bold hover:bg-orange-600 transition-all"
                                >
                                  +
                                </button>
                              </div>

                              {/* Item Total */}
                              <p className="font-bold text-orange-600 text-lg">
                                ₹{(item.price * item.quantity).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Footer */}
              {cart.length > 0 && (
                <div className="border-t-2 border-orange-200 p-4 bg-white">
                  {/* Bill Details */}
                  <div className="bg-gradient-to-r from-orange-50 to-pink-50 rounded-2xl p-4 mb-4 border-2 border-orange-100">
                    <div className="space-y-2">
                      <div className="flex justify-between text-gray-700">
                        <span>Subtotal</span>
                        <span className="font-semibold">₹{calculateSubtotal().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-700 text-sm">
                        <span>GST (5%)</span>
                        <span>₹{calculateTax().toFixed(2)}</span>
                      </div>
                      <div className="border-t-2 border-orange-200 pt-2 flex justify-between">
                        <span className="text-lg font-bold text-gray-800">Total</span>
                        <span className="text-2xl font-bold text-orange-600">
                          ₹{calculateTotal().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Place Order Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={placeOrder}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
                  >
                    Place Order 🎉
                  </motion.button>
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
