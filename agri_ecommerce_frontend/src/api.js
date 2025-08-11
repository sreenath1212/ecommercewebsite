// src/api.js
import axios from 'axios';

// Create the Axios instance
const API_CLIENT = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api', // Use environment variable for production
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to attach the token to every outgoing request
API_CLIENT.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        } else {
            delete config.headers['Authorization'];
        }
        
        // Special handling for multipart/form-data (file uploads)
        if (config.data instanceof FormData) {
            config.headers['Content-Type'] = 'multipart/form-data';
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle authentication errors
API_CLIENT.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 403) {
            // Clear token if it's invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            delete API_CLIENT.defaults.headers.common['Authorization'];
            
            // Redirect to login if not already there
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Define cart-related API calls
const cartAPI = {
    // Get user's cart
    getCart: () => API_CLIENT.get('/cart'),
    
    // Add item to cart
    addToCart: (productId, quantity = 1) => 
        API_CLIENT.post('/cart', { productId, quantity }),
    
    // Update cart item quantity
    updateCartItem: (itemId, quantity) => 
        API_CLIENT.put(`/cart/${itemId}`, { quantity }),
    
    // Remove item from cart
    removeFromCart: (itemId) => 
        API_CLIENT.delete(`/cart/${itemId}`),
    
    // Clear entire cart
    clearCart: () => API_CLIENT.delete('/cart'),
    
    // Checkout
    checkout: (shippingAddressId) => 
        API_CLIENT.post('/checkout', { shippingAddressId }),
};

// Define admin-specific API calls using the API_CLIENT instance
const adminAPI = {
    // User Management
    getUsers: ({ page = 1, limit = 10, search = '' }) => {
        return API_CLIENT.get(`/admin/users?page=${page}&limit=${limit}&search=${search}`);
    },
    getUserById: (userId) => {
        return API_CLIENT.get(`/admin/users/${userId}`);
    },
    updateUser: (userId, userData) => {
        return API_CLIENT.put(`/admin/users/${userId}`, userData);
    },
    deleteUser: (id) => {
        return API_CLIENT.delete(`/admin/users/${id}`);
    },
    
    // User Cart, Favorites, and Wishlist
    getUserCart: (userId) => {
        return API_CLIENT.get(`/admin/users/${userId}/cart`);
    },
    getUserFavorites: (userId) => {
        return API_CLIENT.get(`/admin/users/${userId}/favorites`);
    },
    getUserWishlist: (userId) => {
        return API_CLIENT.get(`/admin/users/${userId}/wishlist`);
    },
    
    // Product Management
    getProducts: () => API_CLIENT.get('/admin/products'),
    createProduct: (productData) => API_CLIENT.post('/admin/products', productData),
    updateProduct: (id, productData) => API_CLIENT.put(`/admin/products/${id}`, productData),
    deleteProduct: (id) => API_CLIENT.delete(`/admin/products/${id}`),
    
    // Stock Management
    updateStock: (productId, { stock, reason }) => API_CLIENT.put(`/admin/products/${productId}/stock`, { stock, reason }),
    getStockLevel: (productId) => API_CLIENT.get(`/products/${productId}/stock`),
    batchUpdateStock: (updates) => API_CLIENT.post('/admin/products/stock/batch', { updates }),
    getStockHistory: (productId) => API_CLIENT.get(`/admin/products/${productId}/stock-history`),
    
    // Category Management
    getCategories: () => API_CLIENT.get('/admin/categories'),
    createCategory: (categoryData) => API_CLIENT.post('/admin/categories', categoryData),
    updateCategory: (id, categoryData) => API_CLIENT.put(`/admin/categories/${id}`, categoryData),
    deleteCategory: (id) => API_CLIENT.delete(`/admin/categories/${id}`),
    
    // Image Upload
    uploadImage: (formData) => API_CLIENT.post('/upload-image', formData),
    
    // Order Management
    getOrders: ({ page = 1, limit = 20, status = '' }) =>
        API_CLIENT.get(`/admin/orders?page=${page}&limit=${limit}&status=${status}`),
    getOrderDetails: (orderId) =>
        API_CLIENT.get(`/admin/orders/${orderId}`),
    updateOrderStatus: (orderId, status) =>
        API_CLIENT.put(`/admin/orders/${orderId}/status`, { status }),
    testOrdersTable: () =>
        API_CLIENT.get('/admin/orders/test'),
};

// Attach APIs to the client instance
API_CLIENT.adminAPI = adminAPI;
API_CLIENT.cartAPI = cartAPI;

// Export the configured Axios instance as the default export
export default API_CLIENT;