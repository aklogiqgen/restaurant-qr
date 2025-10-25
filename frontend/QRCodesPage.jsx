import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

const QRCodesPage = () => {
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const API_BASE_URL = 'http://localhost:5001';

  useEffect(() => {
    fetchQRCodes();
  }, []);

  const fetchQRCodes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/qr-codes-list`);
      if (response.data.success) {
        setQrCodes(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching QR codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCodes = async () => {
    try {
      setGenerating(true);
      const response = await axios.post(`${API_BASE_URL}/api/generate-qr-codes`);
      if (response.data.success) {
        alert(`✅ ${response.data.message}`);
        fetchQRCodes();
      }
    } catch (error) {
      console.error('Error generating QR codes:', error);
      alert('❌ Failed to generate QR codes');
    } finally {
      setGenerating(false);
    }
  };

  const downloadQRCode = (tableNo) => {
    const link = document.createElement('a');
    link.href = `${API_BASE_URL}/api/qr-codes/table-${tableNo}.png`;
    link.download = `table-${tableNo}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllQRCodes = () => {
    qrCodes.forEach((qr, index) => {
      setTimeout(() => {
        downloadQRCode(qr.tableNo);
      }, index * 200); // Stagger downloads
    });
  };

  const printQRCode = (tableNo) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Table ${tableNo} QR Code</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            .container {
              text-align: center;
              padding: 40px;
              border: 3px solid #333;
              border-radius: 20px;
            }
            h1 {
              margin: 0 0 20px 0;
              font-size: 48px;
              color: #333;
            }
            img {
              width: 400px;
              height: 400px;
              margin: 20px 0;
            }
            p {
              margin: 10px 0;
              font-size: 24px;
              color: #666;
            }
            .instructions {
              margin-top: 30px;
              font-size: 20px;
              color: #999;
            }
            @media print {
              body {
                margin: 0;
              }
              .container {
                border: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🍽️ Table ${tableNo}</h1>
            <img src="${API_BASE_URL}/api/qr-codes/table-${tableNo}.png" alt="Table ${tableNo} QR Code" />
            <p><strong>Scan to Order</strong></p>
            <p class="instructions">Scan this QR code with your phone to view our menu and place your order</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading QR Codes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            📱 Table QR Codes
          </h1>
          <p className="text-gray-600">
            QR codes for all {qrCodes.length} tables
          </p>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center mb-8">
          <button
            onClick={generateQRCodes}
            disabled={generating}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {generating ? (
              <>
                <span className="inline-block animate-spin mr-2">⚙️</span>
                Generating...
              </>
            ) : (
              <>🔄 Regenerate All QR Codes</>
            )}
          </button>

          {qrCodes.length > 0 && (
            <button
              onClick={downloadAllQRCodes}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              📥 Download All
            </button>
          )}
        </div>

        {/* QR Codes Grid */}
        {qrCodes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-lg p-12 text-center"
          >
            <div className="text-6xl mb-4">📱</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              No QR Codes Yet
            </h2>
            <p className="text-gray-600 mb-6">
              Click the button above to generate QR codes for all tables
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {qrCodes.map((qr, index) => (
              <motion.div
                key={qr.tableNo}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 text-center">
                  <h3 className="text-2xl font-bold text-white">
                    Table {qr.tableNo}
                  </h3>
                </div>

                {/* QR Code Image */}
                <div className="p-6 bg-gray-50">
                  <img
                    src={`${API_BASE_URL}${qr.url}`}
                    alt={`Table ${qr.tableNo} QR Code`}
                    className="w-full h-auto rounded-lg border-4 border-white shadow-md"
                  />
                </div>

                {/* Action Buttons */}
                <div className="p-4 space-y-2">
                  <button
                    onClick={() => downloadQRCode(qr.tableNo)}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold transition-colors duration-200"
                  >
                    📥 Download
                  </button>
                  <button
                    onClick={() => printQRCode(qr.tableNo)}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-semibold transition-colors duration-200"
                  >
                    🖨️ Print
                  </button>
                </div>

                {/* Menu URL Info */}
                <div className="px-4 pb-4 text-center">
                  <p className="text-xs text-gray-500 break-all">
                    {qr.menuUrl}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Instructions */}
        {qrCodes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-12 bg-white rounded-xl shadow-lg p-8"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              📋 How to Use
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl mb-3">🖨️</div>
                <h3 className="font-semibold text-gray-800 mb-2">1. Print</h3>
                <p className="text-gray-600 text-sm">
                  Click the "Print" button on each QR code to print it with table number
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">📍</div>
                <h3 className="font-semibold text-gray-800 mb-2">2. Place</h3>
                <p className="text-gray-600 text-sm">
                  Place the printed QR code at the corresponding table in your restaurant
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">📱</div>
                <h3 className="font-semibold text-gray-800 mb-2">3. Scan</h3>
                <p className="text-gray-600 text-sm">
                  Customers scan the QR code to automatically load the menu with table number pre-filled
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Technical Info */}
        {qrCodes.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded"
          >
            <div className="flex items-start">
              <div className="text-2xl mr-3">ℹ️</div>
              <div>
                <h3 className="font-semibold text-blue-800 mb-1">
                  QR Code Information
                </h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Each QR code links to: <code className="bg-blue-100 px-2 py-1 rounded">http://localhost:5173/menu?table=[1-20]</code></li>
                  <li>• When customers scan, the table number is automatically filled</li>
                  <li>• Orders placed will be associated with the correct table</li>
                  <li>• Change the URL in <code className="bg-blue-100 px-2 py-1 rounded">backend/server.js</code> line 453 for production</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default QRCodesPage;
