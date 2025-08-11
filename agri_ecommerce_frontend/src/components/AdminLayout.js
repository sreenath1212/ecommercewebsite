// src/components/AdminLayout.js

import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom'; // Import Link and useNavigate
import { useAuth } from '../context/AuthContext'; // To get user info for sidebar links

const AdminLayout = () => {
    const { user, logout } = useAuth(); // Assuming useAuth gives you the current user and logout function
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login'); // Redirect to login after logout
    };

    return (
        <div style={adminLayoutStyles.container}>
            <div style={adminLayoutStyles.header}>
                <h1 style={adminLayoutStyles.headerTitle}>Agri-Ecommerce Admin Panel</h1>
                <div style={adminLayoutStyles.headerActions}>
                    {user && <span style={adminLayoutStyles.welcomeText}>Welcome, {user.name} ({user.role})</span>}
                    <button onClick={handleLogout} style={adminLayoutStyles.logoutButton}>Logout</button>
                </div>
            </div>

            <div style={adminLayoutStyles.mainContentArea}>
                {/* Admin Sidebar */}
                <nav style={adminLayoutStyles.sidebar}>
                    <h3 style={adminLayoutStyles.sidebarHeading}>Admin Navigation</h3>
                    <ul style={adminLayoutStyles.navList}>
                        <li style={adminLayoutStyles.navItem}>
                            <Link to="/admin" style={adminLayoutStyles.navLink}>
                                Dashboard Overview
                            </Link>
                        </li>
                        <li style={adminLayoutStyles.navItem}>
                            <Link to="/admin/users" style={adminLayoutStyles.navLink}>
                                User Management
                            </Link>
                        </li>
                        <li style={adminLayoutStyles.navItem}>
                            <Link to="/admin/products" style={adminLayoutStyles.navLink}>
                                Product Management
                            </Link>
                        </li>
                        <li style={adminLayoutStyles.navItem}>
                            <Link to="/admin/categories" style={adminLayoutStyles.navLink}>
                                Categories
                            </Link>
                        </li>
                        <li style={adminLayoutStyles.navItem}>
                            <Link to="/admin/orders" style={adminLayoutStyles.navLink}>
                                Order Management
                            </Link>
                        </li>
                        {/* Add more admin links here as you expand features */}
                    </ul>
                </nav>

                {/* Main Content Area where child routes will render */}
                <div style={adminLayoutStyles.content}>
                    <Outlet /> {/* This is CRUCIAL: it renders the child routes */}
                </div>
            </div>
        </div>
    );
};

const adminLayoutStyles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#f4f7f6',
    },
    header: {
        backgroundColor: '#28a745', // Green header
        color: 'white',
        padding: '15px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        zIndex: 1000,
    },
    headerTitle: {
        margin: 0,
        fontSize: '1.8em',
        fontWeight: 'bold',
    },
    headerActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
    },
    welcomeText: {
        fontSize: '1em',
        fontWeight: 'normal',
        color: 'rgba(255, 255, 255, 0.9)',
    },
    logoutButton: {
        backgroundColor: '#dc3545', // Red for logout
        color: 'white',
        border: 'none',
        padding: '8px 15px',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '0.9em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease',
    },
    mainContentArea: {
        display: 'flex',
        flex: 1, // Allows content area to grow and take remaining space
    },
    sidebar: {
        width: '250px',
        backgroundColor: '#34495e', // Dark blue-gray for sidebar
        color: 'white',
        padding: '20px',
        boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
    },
    sidebarHeading: {
        color: '#ecf0f1',
        fontSize: '1.4em',
        marginBottom: '15px',
        borderBottom: '1px solid rgba(255,255,255,0.2)',
        paddingBottom: '10px',
    },
    navList: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
    },
    navItem: {
        marginBottom: '10px',
    },
    navLink: {
        color: 'white',
        textDecoration: 'none',
        padding: '10px 15px',
        display: 'block',
        borderRadius: '5px',
        transition: 'background-color 0.2s ease, transform 0.1s ease',
        '&:hover': {
            backgroundColor: '#4a627d',
            transform: 'translateX(5px)',
        },
        '&.active': { // You might need to add a class to apply active state with NavLink
            backgroundColor: '#1abc9c', // Teal for active link
            fontWeight: 'bold',
        }
    },
    content: {
        flex: 1, // Takes up remaining space
        padding: '20px',
        overflowY: 'auto', // Enable scrolling for content if it overflows
    },
};

export default AdminLayout;