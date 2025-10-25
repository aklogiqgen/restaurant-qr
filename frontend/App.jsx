import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MenuOrderPage from './MenuOrderPage';
import OrderStatusTracker from './OrderStatusTracker';
import ChefPortal from './ChefPortal';
import ChatbotPage from './ChatbotPage';
import QRCodesPage from './QRCodesPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Customer Routes */}
        <Route path="/menu" element={<MenuOrderPage />} />
        <Route path="/order-status" element={<OrderStatusTrackerWrapper />} />
        <Route path="/chat" element={<ChatbotPage />} />

        {/* Chef Portal */}
        <Route path="/chef" element={<ChefPortal />} />

        {/* QR Codes Management */}
        <Route path="/qr-codes" element={<QRCodesPage />} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/menu?table=1" replace />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

// Wrapper to extract order data from navigation state
const OrderStatusTrackerWrapper = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const tableNo = urlParams.get('table') || 1;
  const orderId = urlParams.get('orderId');
  const orderData = window.history.state?.usr?.orderData;

  return (
    <OrderStatusTracker
      tableNo={tableNo}
      orderId={orderId}
      orderData={orderData}
    />
  );
};

// 404 Page
const NotFound = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-purple-600 mb-4">404</h1>
        <p className="text-2xl text-gray-700 mb-8">Page Not Found</p>
        <a
          href="/menu?table=1"
          className="bg-purple-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-purple-700 transition-all inline-block"
        >
          Go to Menu
        </a>
      </div>
    </div>
  );
};

export default App;
