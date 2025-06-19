// Modal Control
function showModal(modalId) {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    document.getElementById(modalId).style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Close modal when clicking outside
window.addEventListener('click', function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

let currentUser = null;

function handleAccountClick() {
    if (currentUser) {
        showModal('logoutModal');
    } else {
        showModal('loginModal');
    }
}

async function handleLogin() {
    const email = document.querySelector('#loginEmail').value;
    const password = document.querySelector('#loginPassword').value;

    try {
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `HTTP error: ${response.status}`);

        currentUser = {
            token: data.token,
            userId: data.userId,
            username: data.username 
        };
        localStorage.setItem('user', JSON.stringify(currentUser));
        closeModal('loginModal');
        updateCartDisplay();
    } catch (err) {
        document.getElementById('loginError').textContent = err.message || 'Network error. Check server connection.';
        console.error('Login error:', err);
    }
}

async function handleRegistration(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        const response = await fetch('http://localhost:3000/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              username: username,
              email: email,
              password: password
            })
          });
          
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Registration failed');

        // Auto-login after registration
        currentUser = {
            token: data.token,
            userId: data.userId,
            username: data.username // Add this
        };
        localStorage.setItem('user', JSON.stringify(currentUser));

        alert('Registration successful!');
        closeModal('registrationModal');
        updateCartDisplay();
    } catch (err) {
        document.getElementById('registrationError').textContent =
            `Error: ${err.message}`;
        console.error('Registration error:', err);
    }
}

// Store cart items in localStorage until checkout
let cartItems = JSON.parse(localStorage.getItem('cart')) || [];

// Product data for display purposes (would normally come from API)
let products = []; // Will be populated from the server

// Fetch products from the server when the page loads
async function fetchProducts() {
    try {
        const response = await fetch('http://localhost:3000/products');
        if (!response.ok) throw new Error('Failed to fetch products');
        
        products = await response.json();
        
        // Update product boxes with the fetched data
        updateProductBoxes();
        
        return products;
    } catch (err) {
        console.error('Error fetching products:', err);
        return [];
    }
}

// Update product boxes with data from the server
function updateProductBoxes() {
    products.forEach(product => {
        // Update all boxes with this product ID
        document.querySelectorAll(`.shop-box[data-product-id="${product.product_id}"]`).forEach(box => {
            box.setAttribute('data-product-name', product.name);
            box.setAttribute('data-product-price', product.price);
            
            // Update product title in box
            const titleElement = box.querySelector('h2');
            if (titleElement) {
                titleElement.textContent = product.name;
            }
        });
    });
}
// FIX #1: Add to cart - Fixed function to prevent double quantity
function addToCart(productId) {
    if (!currentUser) {
        showModal('loginModal');
        alert('Please login to add items to cart');
        return;
    }
    // Get quantity from the specific box that was clicked
    const productBox = document.querySelector(`.shop-box[data-product-id="${productId}"]`);
    if (!productBox) return;
    
    const quantityInput = productBox.querySelector('.quantity-input');
    const quantity = parseInt(quantityInput.value) || 1;
    
    // Find the product from our server-fetched products array
    const product = products.find(p => p.product_id === productId);
    if (!product) {
        console.error(`Product with ID ${productId} not found`);
        return;
    }
    
    // Check if product already in cart
    const existingItemIndex = cartItems.findIndex(item => item.productId === productId);
    
    if (existingItemIndex !== -1) {
        // Update quantity if already in cart
        cartItems[existingItemIndex].quantity = quantity;
    } else {
        // Add new item to cart
        cartItems.push({ 
            productId, 
            quantity,
            name: product.name,
            price: parseFloat(product.price)
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cartItems));
    updateCartDisplay();
    
    // Show the cart modal after adding
    showModal('cartModal');
}

// Remove from cart
function removeFromCart(index) {
    cartItems.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cartItems));
    updateCartDisplay();
}

// Calculate total price of items in cart
function calculateTotal() {
    return cartItems.reduce((total, item) => {
        const product = products.find(p => p.product_id === item.productId);
        return total + (product ? product.price * item.quantity : 0);
    }, 0).toFixed(2);
}

// Updated updateCartDisplay function
function updateCartDisplay() {
    const cartItemsContainer = document.getElementById('cartItems');
    const cartTotalElement = document.getElementById('cartTotal');
    
    if (!cartItemsContainer) return;
    
    // Clear current display
    cartItemsContainer.innerHTML = '';
    
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<p>Your cart is empty</p>';
        cartTotalElement.textContent = '0.00';
        return;
    }
    
    // Add each item to the display
    cartItems.forEach((item, index) => {
        const product = products.find(p => p.product_id === item.productId);
        if (!product) return;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <div class="item-details">
                <h4>${product.name}</h4>
                <p>Price: $${product.price}</p>
                <p>Quantity: ${item.quantity}</p>
                <p>Subtotal: $${(product.price * item.quantity).toFixed(2)}</p>
            </div>
            <button class="remove-btn" onclick="removeFromCart(${index})">Remove</button>
        `;
        cartItemsContainer.appendChild(itemElement);
    });
    
    cartTotalElement.textContent = calculateTotal();
}

function updateAuthDisplay() {
    const navSignin = document.querySelector('.nav-signin');
    if (currentUser) {
        navSignin.innerHTML = `
            <p><span class="nav-one">Welcome,</span></p>
            <p class="nav-second">${currentUser.username}</p>
        `;
    } else {
        navSignin.innerHTML = `
            <p><span class="nav-one">Hello, sign in</span></p>
            <select class="nav-second">
                <option>Account & List</option>
            </select>
        `;
    }
}

async function saveAddressAndContinue() {
    if (!currentUser || !currentUser.token) {
        alert('Please log in first');
        closeModal('addressModal');
        showModal('loginModal');
        return;
    }
    
    const addressData = {
        fullName: document.getElementById('fullName').value,
        streetAddress: document.getElementById('street').value,
        city: document.getElementById('city').value,
        zipCode: document.getElementById('zip').value,
        country: document.getElementById('country').value
    };
    
    try {
        // Check for empty fields
        if (!addressData.fullName || !addressData.streetAddress || !addressData.city || 
            !addressData.zipCode || !addressData.country) {
            throw new Error('Please fill in all address fields');
        }
        
        // Send the address to the server
        const response = await fetch('http://localhost:3000/addresses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify(addressData)
        });
        
        // Check if response is ok (regardless of whether it's 200 or 201)
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save address');
        }
        
        // Process the successful response
        const data = await response.json();
        
        // Store address ID for order creation (works for both new and existing addresses)
        localStorage.setItem('shippingAddressId', data.address_id);
        
        // Continue to payment
        closeModal('addressModal');
        showModal('paymentModal');
    } catch (err) {
        document.getElementById('addressError').textContent = err.message;
        console.error('Address error:', err);
    }
}

function proceedToCheckout() {
    if (!currentUser || !currentUser.token) {
        alert('Please log in to proceed to checkout');
        showModal('loginModal');
    } else {
        showModal('addressModal');
    }
}


async function completeCheckout() {
    if (!currentUser || !currentUser.token) {
        alert('Please log in first');
        return;
    }
    
    try {
        // Clear any previous error messages
        document.getElementById('paymentError').textContent = '';
        
        // 1. Get shipping address ID (should be saved from previous step)
        const shippingAddressId = localStorage.getItem('shippingAddressId');
        if (!shippingAddressId) {
            throw new Error('Missing shipping address');
        }
        
        // Validate payment form
        const paymentMethod = document.getElementById('paymentMethod').value;
        const cardNumber = document.getElementById('cardNumber').value;
        const expiryDate = document.getElementById('expiryDate').value;
        const cvv = document.getElementById('cvv').value;
        
        if (!paymentMethod || !cardNumber || !expiryDate || !cvv) {
            throw new Error('Please complete all payment fields');
        }
        
        // 2. Create Payment - use server calculated total
        const paymentData = {
            amount: calculateTotal(), // Relies on server-fetched product prices
            paymentMethod: paymentMethod
        };
        
        const paymentRes = await fetch('http://localhost:3000/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify(paymentData)
        });
        
        if (!paymentRes.ok) {
            const errorData = await paymentRes.json();
            throw new Error(errorData.error || 'Payment failed');
        }
        
        const paymentResult = await paymentRes.json();
        
        // 3. Create Order with Cart Items
        const orderData = {
            shippingAddressId: parseInt(shippingAddressId),
            paymentId: paymentResult.payment_id,
            items: cartItems.map(item => ({
                productId: item.productId,
                quantity: item.quantity
            }))
        };
        
        const orderRes = await fetch('http://localhost:3000/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify(orderData)
        });
        
        if (!orderRes.ok) {
            const errorData = await orderRes.json();
            throw new Error(errorData.error || 'Order creation failed');
        }
        
        const orderResult = await orderRes.json();

        // 4. Clear temporary cart and form data
        cartItems = [];
        localStorage.removeItem('cart');
        localStorage.removeItem('shippingAddressId');
        updateCartDisplay();
        
        // Clear all form fields
        document.getElementById('addressForm').reset();
        document.getElementById('paymentForm').reset();
        
        // 5. Close modal and show success message
        closeModal('paymentModal');
        alert(`Order placed successfully! Total: $${orderResult.total_amount}`);

    } catch (err) {
        document.getElementById('paymentError').textContent = err.message;
        console.error('Checkout error:', err);
    }
}

// Updated applyFilters function
async function applyFilters() {
    const minPrice = document.getElementById('minPrice').value;
    const maxPrice = document.getElementById('maxPrice').value;
    const category = document.getElementById('categoryFilter').value;
    
    try {
        // Build the query string
        let queryParams = new URLSearchParams();
        if (minPrice) queryParams.append('minPrice', minPrice);
        if (maxPrice) queryParams.append('maxPrice', maxPrice);
        if (category && category !== 'All Categories') queryParams.append('category', category);
        
        // Fetch filtered products from server
        const response = await fetch(`http://localhost:3000/products?${queryParams}`);
        if (!response.ok) throw new Error('Failed to fetch filtered products');
        
        // Update our products array with filtered results
        products = await response.json();
        
        // First hide all product boxes
        document.querySelectorAll('.shop-box').forEach(box => {
            box.style.display = 'none';
        });
        
        // Show only products that match the filter
        products.forEach(product => {
            document.querySelectorAll(`.shop-box[data-product-id="${product.product_id}"]`).forEach(box => {
                box.style.display = 'block';
                
                // Update product data in the box
                box.setAttribute('data-product-name', product.name);
                box.setAttribute('data-product-price', product.price);
                
                // Update product title in box
                const titleElement = box.querySelector('h2');
                if (titleElement) {
                    titleElement.textContent = product.name;
                }
            });
        });
        
        closeModal('filterModal');
    } catch (err) {
        console.error('Error applying filters:', err);
        alert('Failed to apply filters. Please try again.');
    }
}

// Populate category filter dropdown
async function populateCategoryFilter() {
    try {
        const response = await fetch('http://localhost:3000/categories');
        if (!response.ok) throw new Error('Failed to fetch categories');
        
        const categories = await response.json();
        const categorySelect = document.getElementById('categoryFilter');
        
        // Clear existing options except the first one
        while (categorySelect.options.length > 1) {
            categorySelect.remove(1);
        }
        
        // Add categories from the server
        categories.forEach(category => {
            const option = document.createElement('option');
            option.text = category;
            option.value = category;
            categorySelect.add(option);
        });
    } catch (err) {
        console.error('Error fetching categories:', err);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    updateAuthDisplay();
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });

    // Restore session
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
    
    // Restore cart
    cartItems = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Fetch products from server
    fetchProducts().then(() => {
        // After products are loaded, update cart display
        updateCartDisplay();
    });
    
    // Populate category filter
    populateCategoryFilter();
    
});

// Auth form toggling
function toggleAuthForms() {
    closeModal('loginModal');
    showModal('registrationModal');
}

// Logout functionality
function logout() {
    currentUser = null;
    localStorage.removeItem('user');
    alert('You have been logged out.');
}

// Reset all forms when closing modals
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            const form = modal.querySelector('form');
            if (form) form.reset();
            const errorMsg = modal.querySelector('.error-message');
            if (errorMsg) errorMsg.textContent = '';
        });
    });
});

// Add these new functions
async function showOrderHistory() {
    if (!currentUser) {
        alert('Please login to view order history');
        showModal('loginModal');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3000/orders', {
            headers: {
                'Authorization': `Bearer ${currentUser.token}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch orders');
        }
        
        const orders = await response.json();
        const content = document.getElementById('orderHistoryContent');
        
        if (orders.length === 0) {
            content.innerHTML = '<p>No orders found</p>';
        } else {
            content.innerHTML = `
                <div class="table-container">
                    ${generateTableHTML(orders)}
                </div>
            `;
        }
        showModal('orderHistoryModal');
    } catch (err) {
        alert(err.message);
        if (err.message.includes('Unauthorized')) {
            localStorage.removeItem('user');
            currentUser = null;
            updateAuthDisplay();
            showModal('loginModal');
        }
    }
}


async function showTablesModal() {
    showModal('tablesModal');
}

async function loadTableData() {
    const tableName = document.getElementById('tableSelector').value;
    
    try {
        const response = await fetch(`http://localhost:3000/tables/${tableName}`);
        const data = await response.json();
        
        const content = document.getElementById('tableContent');
        content.innerHTML = `
            <h3>${tableName} (${data.length} entries)</h3>
            <div class="table-container">
                ${generateTableHTML(data)}
            </div>
        `;
    } catch (err) {
        alert('Failed to load table data');
    }
}

// New helper function to generate table HTML
function generateTableHTML(data) {
    if (data.length === 0) return '<p>No data found</p>';
    
    const headers = Object.keys(data[0]);
    return `
        <table class="sql-table">
            <thead>
                <tr>
                    ${headers.map(h => `<th>${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${data.map(row => `
                    <tr>
                        ${headers.map(h => `<td>${row[h]}</td>`).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}