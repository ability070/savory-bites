require('dotenv').config();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON (increased limit for Base64 images)
app.use(express.json({ limit: '10mb' }));

// --- SIMPLE JSON DATABASE ---
const DB_FILE = path.join(__dirname, 'db.json');

function getDB() {
    if (!fs.existsSync(DB_FILE)) {
        const defaultData = {
            meals: [],
            categories: ['Starters','Mains','Desserts','Drinks'],
            orders: []
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function saveDB(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Failed to write to db.json:', error.message);
        return false;
    }
}

// ================= HTML ROUTES =================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// ================= SECURE LOGIN ROUTE =================
app.post('/api/login', (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Incorrect password' });
    }
});

// ================= MEALS API =================
app.get('/api/meals', (req, res) => res.json(getDB().meals));

app.post('/api/meals', (req, res) => {
    const db = getDB();
    const newMeal = { ...req.body, id: Date.now() };
    db.meals.push(newMeal);
    if (saveDB(db)) {
        console.log(`✅ Added meal: ${newMeal.name}`);
        res.status(201).json(newMeal);
    } else {
        res.status(500).json({ error: 'Failed to save meal' });
    }
});

app.put('/api/meals/:id', (req, res) => {
    const db = getDB();
    const id = req.params.id;
    const index = db.meals.findIndex(m => String(m.id) === String(id));
    if (index !== -1) {
        db.meals[index] = { ...db.meals[index], ...req.body };
        if (saveDB(db)) {
            console.log(`✅ Updated meal: ${db.meals[index].name}`);
            res.json(db.meals[index]);
        } else {
            res.status(500).json({ error: 'Failed to update meal' });
        }
    } else { 
        res.status(404).json({ error: 'Not found' }); 
    }
});

app.delete('/api/meals/:id', (req, res) => {
    const db = getDB();
    const id = req.params.id;
    db.meals = db.meals.filter(m => String(m.id) !== String(id));
    if (saveDB(db)) {
        console.log(`✅ Deleted meal ID: ${id}`);
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to delete meal' });
    }
});

// ================= CATEGORIES API =================
app.get('/api/categories', (req, res) => {
    console.log('📋 GET /api/categories called');
    res.json(getDB().categories);
});

app.post('/api/categories', (req, res) => {
    console.log('➕ POST /api/categories called with:', req.body);
    
    const db = getDB();
    const newName = req.body.name;
    
    if (!newName) {
        console.log('❌ No category name provided');
        return res.status(400).json({ error: 'Category name is required' });
    }
    
    if (db.categories.includes(newName)) {
        console.log(`⚠️ Category "${newName}" already exists`);
        return res.status(400).json({ error: 'Category already exists' });
    }
    
    db.categories.push(newName);
    
    if (saveDB(db)) {
        console.log(`✅ Successfully added category: "${newName}"`);
        res.json(db.categories);
    } else {
        console.log('❌ Failed to save category to db.json');
        res.status(500).json({ error: 'Failed to save category' });
    }
});

app.delete('/api/categories/:name', (req, res) => {
    const db = getDB();
    const name = req.params.name;
    db.categories = db.categories.filter(c => c !== name);
    if (saveDB(db)) {
        console.log(`✅ Deleted category: "${name}"`);
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

// ================= ORDERS API =================
app.get('/api/orders', (req, res) => res.json(getDB().orders));

app.get('/api/orders/:id', (req, res) => {
    const db = getDB();
    const order = db.orders.find(o => String(o.id) === String(req.params.id));
    if (order) res.json({ order });
    else res.status(404).json({ error: 'Not found' });
});

app.post('/api/orders', (req, res) => {
    const db = getDB();
    const newOrder = { 
        ...req.body, 
        id: 'SB' + Date.now(), 
        status: 'Order Received', 
        time: new Date().toISOString() 
    };
    db.orders.push(newOrder);
    if (saveDB(db)) {
        console.log(`✅ New order placed: ${newOrder.id}`);
        res.status(201).json({ success: true, orderId: newOrder.id });
    } else {
        res.status(500).json({ error: 'Failed to save order' });
    }
});

app.put('/api/orders/:id', (req, res) => {
    const db = getDB();
    const index = db.orders.findIndex(o => String(o.id) === String(req.params.id));
    if (index !== -1) {
        db.orders[index] = { ...db.orders[index], ...req.body };
        if (saveDB(db)) {
            console.log(`✅ Updated order ${req.params.id} to: ${req.body.status}`);
            res.json(db.orders[index]);
        } else {
            res.status(500).json({ error: 'Failed to update order' });
        }
    } else { 
        res.status(404).json({ error: 'Not found' }); 
    }
});

app.delete('/api/orders/:id', (req, res) => {
    const db = getDB();
    db.orders = db.orders.filter(o => String(o.id) !== String(req.params.id));
    if (saveDB(db)) {
        console.log(`✅ Deleted order: ${req.params.id}`);
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to delete order' });
    }
});

// ================= START SERVER =================
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));