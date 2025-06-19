require('dotenv').config();
const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express();
const port = 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// CORS configuration
const cors = require('cors');
app.use(cors()); // Allow all origins temporarily

// Serve main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'test3.html'));
});

// Log database configuration
console.log('Database Config (sanitized):');
console.log(`DB_USER: ${process.env.DB_USER ? '✓ Set' : '✗ Missing'}`);
console.log(`DB_HOST: ${process.env.DB_HOST ? '✓ Set' : '✗ Missing'}`);
console.log(`DB_NAME: ${process.env.DB_NAME ? '✓ Set' : '✗ Missing'}`);
console.log(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '✓ Set (hidden)' : '✗ Missing'}`);
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '✓ Set (hidden)' : '✗ Missing'}`);

// Database connection
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: 5432,
    ssl: false
});

// Test database connection
pool.connect()
    .then(client => {
        console.log('Successfully connected to PostgreSQL database!');
        client.query('SELECT NOW() as current_time')
            .then(res => {
                console.log(`PostgreSQL server time: ${res.rows[0].current_time}`);
                client.release();
            })
            .catch(err => {
                client.release();
                console.error('Error executing query:', err.stack);
            });
    })
    .catch(err => {
        console.error('Failed to connect to PostgreSQL database:', err);
        console.error('Connection details (sanitized):');
        console.error(`Host: ${process.env.DB_HOST || 'not set'}`);
        console.error(`Database: ${process.env.DB_NAME || 'not set'}`);
        console.error(`User: ${process.env.DB_USER || 'not set'}`);
        console.error(`Port: ${process.env.DB_PORT || 5432}`);
    });

const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret_key';

// Middleware for authentication
const authenticate = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: "Unauthorized" });

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = { userId: decoded.userId };
        next();
    } catch (err) {
        res.status(401).json({ error: "Invalid token" });
    }
};

// ================== REGISTRATION ENDPOINT ==================
app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: "All fields required" });
        }

        const existing = await pool.query(
            `SELECT * FROM users WHERE username = $1 OR email = $2`,
            [username, email]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ error: "Username/email exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash)
            VALUES ($1, $2, $3) RETURNING user_id`,
            [username, email, hashedPassword]
        );

        const userId = result.rows[0].user_id;
        const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({
            message: "Registration successful",
            token,
            userId,
            username: username
        });

    } catch (err) {
        console.error('SERVER ERROR:', err);
        res.status(500).json({ error: "Database operation failed" });
    }
});


app.get('/users/:userId', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT user_id, username, email FROM users WHERE user_id = $1',
            [req.params.userId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================== LOGIN ENDPOINT ==================
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (user.rows.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const validPassword = await bcrypt.compare(
            password,
            user.rows[0].password_hash
        );

        if (!validPassword) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const userId = user.rows[0].user_id;
        const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });

        res.json({
            message: "Login successful",
            token,
            userId: user.rows[0].user_id,
            username: user.rows[0].username // Add this line
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: "Server error" });
    }
});

// ADDRESSES ENDPOINT - FIXED: Remove duplicate check to allow multiple addresses
app.post('/addresses', authenticate, async (req, res) => {
    try {
        const { fullName, streetAddress, city, zipCode, country } = req.body;
        
        // Validate inputs
        if (!fullName || !streetAddress || !city || !zipCode || !country) {
            return res.status(400).json({ error: "All address fields are required" });
        }
        
        // Insert new address without checking for duplicates
        // This allows users to add multiple addresses, even if they are similar
        const result = await pool.query(
            `INSERT INTO addresses 
            (user_id, full_name, street_address, city, zip_code, country)
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING address_id`,
            [req.user.userId, fullName, streetAddress, city, zipCode, country]
        );
        
        res.status(201).json({
            message: "Address saved successfully",
            address_id: result.rows[0].address_id
        });
    } catch (err) {
        console.error('Address error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get user addresses
app.get('/addresses', authenticate, async (req, res) => {
    try {
        const addresses = await pool.query(
            `SELECT * FROM addresses WHERE user_id = $1 ORDER BY created_at DESC`,
            [req.user.userId]
        );
        
        res.json(addresses.rows);
    } catch (err) {
        console.error('Get addresses error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/payments', authenticate, async (req, res) => {
    try { 
        const { amount, paymentMethod } = req.body;
        
        // Validate inputs
        if (!amount || !paymentMethod) {
            return res.status(400).json({ error: "Payment amount and method are required" });
        }
        
        // Create a payment record without an order_id first
        const result = await pool.query(
            `INSERT INTO payments 
            (amount, payment_method)
            VALUES ($1, $2) 
            RETURNING payment_id`,
            [amount, paymentMethod]
        );
        
        res.status(201).json({
            message: "Payment processed successfully",
            payment_id: result.rows[0].payment_id
        });
    } catch (err) {
        console.error('Payment error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Orders endpoint - Client stores cart in localStorage, not in database
app.post('/orders', authenticate, async (req, res) => {
    try {
        const { shippingAddressId, paymentId, items } = req.body;
        
        // Validate inputs
        if (!shippingAddressId || !paymentId || !items || items.length === 0) {
            return res.status(400).json({ error: "Missing order information" });
        }
        
        // Calculate total from items
        let totalAmount = 0;
        
        for (const item of items) {
            const product = await pool.query(
                'SELECT price FROM products WHERE product_id = $1',
                [item.productId]
            );
            
            if (product.rows.length === 0) {
                return res.status(404).json({ error: `Product ${item.productId} not found` });
            }
            
            totalAmount += product.rows[0].price * item.quantity;
        }
        
        // 1. Create Order
        const orderRes = await pool.query(
            `INSERT INTO orders 
            (user_id, shipping_address_id, total_amount)
            VALUES ($1, $2, $3)
            RETURNING order_id`,
            [req.user.userId, shippingAddressId, totalAmount]
        );
        
        const orderId = orderRes.rows[0].order_id;
        
        // 2. Insert Order Items
        for (const item of items) {
            const product = await pool.query(
                'SELECT price FROM products WHERE product_id = $1',
                [item.productId]
            );
            
            await pool.query(
                `INSERT INTO order_items 
                (order_id, product_id, quantity, price)
                VALUES ($1, $2, $3, $4)`,
                [orderId, item.productId, item.quantity, product.rows[0].price]
            );
        }
        
        // 3. Update payment with order_id
        await pool.query(
            `UPDATE payments SET order_id = $1 WHERE payment_id = $2`,
            [orderId, paymentId]
        );
        
        res.status(201).json({
            message: "Order placed successfully",
            order_id: orderId,
            total_amount: totalAmount
        });

    } catch (err) {
        console.error('Order error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ADDED: Filter products endpoint
app.get('/products', async (req, res) => {
    try {
        // Extract filter parameters
        const { minPrice, maxPrice, category } = req.query;
        
        // Build query with conditions
        let query = 'SELECT * FROM products WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        
        // Add price range filter if provided
        if (minPrice !== undefined && minPrice !== '') {
            query += ` AND price >= $${paramIndex}`;
            params.push(parseFloat(minPrice));
            paramIndex++;
        }
        
        if (maxPrice !== undefined && maxPrice !== '') {
            query += ` AND price <= $${paramIndex}`;
            params.push(parseFloat(maxPrice));
            paramIndex++;
        }
        
        // Add category filter if provided and not 'All Categories'
        if (category && category !== 'All Categories') {
            query += ` AND category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }
        
        // Execute query
        const result = await pool.query(query, params);
        
        res.json(result.rows);
    } catch (err) {
        console.error('Product filtering error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get a specific product
app.get('/products/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        const result = await pool.query(
            'SELECT * FROM products WHERE product_id = $1',
            [productId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Get product error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get all categories (for filter dropdown)
app.get('/categories', async (req, res) => {
    try {    
        const result = await pool.query(
            'SELECT DISTINCT category FROM products ORDER BY category'
        );
        
        const categories = result.rows.map(row => row.category);
        res.json(categories);
    } catch (err) {
        console.error('Get categories error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ================== SERVER INIT ==================
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

// Final database check
pool.query('SELECT NOW()', (err) => {
    if (err) console.error("Database connection failed:", err);
    else console.log("Database connected successfully");
});

// Add new route for tables
app.get('/tables/:tableName', async (req, res) => {
    try {
        const validTables = ['users', 'products', 'addresses', 'orders', 'order_items', 'payments'];
        const tableName = req.params.tableName;
        
        if (!validTables.includes(tableName)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }
        
        const result = await pool.query(`SELECT * FROM ${tableName}`);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/orders', authenticate, async (req, res) => {
    try {
        const orders = await pool.query(`
            SELECT 
                o.order_id, o.total_amount, o.created_at,
                a.street_address, a.city, a.country,
                p.payment_method, p.amount AS payment_amount
            FROM orders o
            JOIN addresses a ON o.shipping_address_id = a.address_id
            JOIN payments p ON o.order_id = p.order_id  
            WHERE o.user_id = $1
            ORDER BY o.created_at DESC
        `, [req.user.userId]);
        
        res.json(orders.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});