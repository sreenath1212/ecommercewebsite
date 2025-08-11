// src/components/Navbar.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Cart from './Cart';
import { Favorite, Bookmark } from '@mui/icons-material';
import { Button } from '@mui/material';

const Navbar = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const { getCartItemsCount } = useCart();
    const navigate = useNavigate();
    const [isCartOpen, setIsCartOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login'); // Redirect to login after logout
    };

    return (
        <>
            <nav style={styles.navbar}>
                <div style={styles.brand}>
                    <Link to="/home" style={styles.brandLink}>APAS AGRI-HORTY</Link>
                </div>
                <div style={styles.navLinks}>
                    {isAuthenticated ? (
                        <>
                            <Link to="/home" style={styles.navLink}>Home</Link>
                            <Link to="/profile" style={styles.navLink}>Profile</Link> {/* New Profile Link */}
                            <Link to="/favorites" style={styles.navLink}>Favorites & Wishlist</Link>
                            <span style={styles.welcomeText}>Hello, {user?.name || user?.email}!</span>
                            <div style={styles.cartIcon} onClick={() => setIsCartOpen(true)}>
                                🛒
                                {getCartItemsCount() > 0 && (
                                    <span style={styles.cartBadge}>
                                        {getCartItemsCount()}
                                    </span>
                                )}
                            </div>
                            <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" style={styles.navLink}>Login</Link>
                            <Link to="/register" style={styles.navLink}>Register</Link>
                        </>
                    )}
                </div>
            </nav>
            {isCartOpen && <Cart onClose={() => setIsCartOpen(false)} />}
        </>
    );
};

const styles = {
    navbar: {
        backgroundColor: '#28a745', // Agriculture green
        padding: '15px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        width: '100%',
        position: 'fixed', // Keep it at the top
        top: 0,
        left: 0,
        zIndex: 1000,
        boxSizing: 'border-box', // Include padding in width
    },
    brand: {
        fontSize: '1.8em',
        fontWeight: 'bold',
    },
    brandLink: {
        color: '#fff',
        textDecoration: 'none',
    },
    navLinks: {
        display: 'flex',
        alignItems: 'center',
    },
    navLink: {
        color: '#fff',
        textDecoration: 'none',
        marginLeft: '25px',
        fontSize: '1.1em',
        transition: 'color 0.3s ease',
        '&:hover': {
            color: '#e0ffe0',
        },
    },
    welcomeText: {
        color: '#fff',
        marginLeft: '25px',
        fontSize: '1.1em',
    },
    logoutButton: {
        backgroundColor: '#dc3545', // Red for logout
        color: '#fff',
        padding: '8px 15px',
        borderRadius: '5px',
        border: 'none',
        fontSize: '1em',
        cursor: 'pointer',
        marginLeft: '25px',
        transition: 'background-color 0.3s ease',
        '&:hover': {
            backgroundColor: '#c82333',
        },
    },
    cartIcon: {
        position: 'relative',
        fontSize: '24px',
        marginLeft: '25px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
    },
    cartBadge: {
        position: 'absolute',
        top: '-8px',
        right: '-8px',
        backgroundColor: '#dc3545',
        color: 'white',
        borderRadius: '50%',
        padding: '2px 6px',
        fontSize: '12px',
        minWidth: '20px',
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
};

export default Navbar;