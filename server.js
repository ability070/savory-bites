const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware to parse JSON data sent from the frontend
app.use(express.json());

// Serve the frontend HTML file when you visit the homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API: Get all meals
app.get('/api/meals', (req, res) => {
  const mealsData = fs.readFileSync(path.join(__dirname, 'meals.json'), 'utf8');
  res.json(JSON.parse(mealsData));
});

// API: Create a new order
app.post('/api/orders', (req, res) => {
  const orderData = req.body;
  
  // Generate a unique Order ID (e.g., SB12345678)
  const orderId = 'SB' + Date.now().toString().slice(-8);
  const newOrder = {
    id: orderId,
    ...orderData,
    time: new Date().toISOString(),
    status: 'Order Received'
  };

  // Read existing orders from the file
  const ordersPath = path.join(__dirname, 'orders.json');
  let orders = [];
  if (fs.existsSync(ordersPath)) {
    orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
  }

  // Add the new order and save it back to the file
  orders.push(newOrder);
  fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));

  // Send success response back to frontend
  res.status(201).json({ success: true, orderId: orderId });
});

// API: Track an order by ID
app.get('/api/orders/:id', (req, res) => {
  const orderId = req.params.id.toUpperCase();
  const ordersPath = path.join(__dirname, 'orders.json');
  
  if (!fs.existsSync(ordersPath)) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
  const order = orders.find(o => o.id === orderId);

  if (order) {
    res.json({ order });
  } else {
    res.status(404).json({ message: 'Order not found' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server is running! Open your browser to: http://localhost:${PORT}`);
});