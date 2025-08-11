// src/App.js (UPDATED - Admin Routes)

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './index.css'; // Make sure your global CSS is imported here
import { AuthProvider, useAuth } from './context/AuthContext'; // Import AuthProvider and useAuth
import { CartProvider } from './context/CartContext';
import Register from './components/Register';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import Home from './components/Home'; // Your home page component
import CompleteProfile from './components/CompleteProfile';
import UserProfile from './components/UserProfile';
import Navbar from './components/NavBar';
import AdminOverview from './components/AdminOverview'; // Import AdminOverview
import UserManagement from './components/admin/UserManagement'; // Updated import path
import AdminLayout from './components/AdminLayout'; // IMPORT THE NEW ADMIN LAYOUT
import ProductManagement from './components/admin/ProductManagement'; // Import ProductManagement
import CategoryManagement from './components/admin/CategoryManagement'; // Import CategoryManagement
import UserDetails from './components/admin/UserDetails';
import FavoritesWishlist from './components/FavoritesWishlist';
import ProductDetail from './components/ProductDetail'; // Import ProductDetail component
import Checkout from './components/Checkout';
import OrderManagement from './components/admin/OrderManagement';

// A simple PrivateRoute component to protect routes
const PrivateRoute = ({ children, requiredRole }) => {
    const { isAuthenticated, loading, user } = useAuth();

    if (loading) {
        return <p>Loading authentication...</p>; // Or a proper loading spinner
    }

    // If not authenticated, redirect to login page
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // If authenticated but needs password setup, redirect to complete-profile
    if (user && user.requiresPasswordSetup) {
        if (window.location.pathname !== '/complete-profile') {
            return <Navigate to="/complete-profile" replace />;
        }
    }

    // Check for required role
    if (requiredRole && (!user || user.role !== requiredRole)) {
        // If user is logged in but doesn't have the required role,
        // redirect them to their default authenticated home (which might be /home or /admin)
        // For now, redirect to /home. You could create a /forbidden page if preferred.
        return <Navigate to="/home" replace />;
    }

    // If authenticated and no password setup needed, render the children
    return children;
};

// Component to handle initial redirection based on auth status and password setup requirement
const InitialRedirect = () => {
    const { isAuthenticated, loading, user } = useAuth();

    if (loading) {
        return <p>Loading application...</p>;
    }

    if (isAuthenticated) {
        // If authenticated and password setup is required, go to complete-profile
        if (user && user.requiresPasswordSetup) {
            return <Navigate to="/complete-profile" replace />;
        }
        // NEW: If authenticated and is an admin, go to admin dashboard (which is /admin)
        if (user && user.role === 'admin') {
            return <Navigate to="/admin" replace />;
        }
        // Otherwise (authenticated user, not admin, no password setup), go to regular home
        return <Navigate to="/home" replace />;
    }

    // If not authenticated, go to login
    return <Navigate to="/login" replace />;
};


// New component to wrap Routes, allowing useAuth hook
const AppRoutes = () => {
    const { isAuthenticated, loading, user } = useAuth();

    if (loading) {
        return <p>Loading application...</p>; // Or a full-screen loading spinner
    }

    return (
        <>
            {/* Render Navbar only if authenticated AND not in the admin section
                This assumes your main Navbar is for general users.
                If you want a Navbar for admins too, integrate it into AdminLayout.
            */}
            {isAuthenticated && !window.location.pathname.startsWith('/admin') && <Navbar />}

            <div style={isAuthenticated && !window.location.pathname.startsWith('/admin') ? { paddingTop: '70px' } : {}}>
                <Routes>
                    {/* Public routes */}
                    <Route path="/register" element={<Register />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />

                    {/* Google OAuth callback route - the AuthContext handles the redirection */}
                    <Route path="/auth/google/callback" element={<Login />} />

                    {/* Route for setting password after Google login */}
                    <Route
                        path="/complete-profile"
                        element={
                            <PrivateRoute>
                                {user && user.requiresPasswordSetup ? <CompleteProfile /> : <Navigate to="/home" replace />}
                            </PrivateRoute>
                        }
                    />

                    {/* Protected User Routes */}
                    <Route
                        path="/home"
                        element={
                            <PrivateRoute>
                                <Home />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/profile"
                        element={
                            <PrivateRoute>
                                <UserProfile />
                            </PrivateRoute>
                        }
                    />

                    {/* Product Detail Route */}
                    <Route
                        path="/product/:id"
                        element={
                            <PrivateRoute>
                                <ProductDetail />
                            </PrivateRoute>
                        }
                    />

                    {/* Admin Routes - now nested under AdminLayout */}
                    <Route
                        path="/admin"
                        element={
                            <PrivateRoute requiredRole="admin">
                                <AdminLayout /> {/* This is the parent layout component */}
                            </PrivateRoute>
                        }
                    >
                        {/* Child routes for the admin section */}
                        <Route index element={<AdminOverview />} /> {/* Renders AdminOverview at /admin */}
                        <Route path="users" element={<UserManagement />} /> {/* Renders UserManagement at /admin/users */}
                        <Route path="users/:userId" element={<UserDetails />} />
                        <Route path="products" element={<ProductManagement />} /> {/* Renders ProductManagement at /admin/products */}
                        <Route path="categories" element={<CategoryManagement />} /> {/* Renders CategoryManagement at /admin/categories */}
                        <Route path="orders" element={<OrderManagement />} /> {/* Renders OrderManagement at /admin/orders */}
                    </Route>

                    {/* New route for FavoritesWishlist */}
                    <Route
                        path="/favorites"
                        element={
                            <PrivateRoute>
                                <FavoritesWishlist />
                            </PrivateRoute>
                        }
                    />

                    {/* Checkout Page */}
                    <Route
                        path="/checkout"
                        element={
                            <PrivateRoute>
                                <Checkout />
                            </PrivateRoute>
                        }
                    />

                    {/* Default route: if user is logged in, go to home, otherwise go to login */}
                    <Route path="/" element={<InitialRedirect />} />
                </Routes>
            </div>
        </>
    );
};

function App() {
    return (
        <Router>
            <AuthProvider>
                <CartProvider>
                    <div className="agriculture-theme-background"> {/* Apply global background */}
                        <AppRoutes /> {/* Use the new AppRoutes component here */}
                    </div>
                </CartProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;