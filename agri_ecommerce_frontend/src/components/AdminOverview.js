// src/components/AdminOverview.js (UPDATED - Link for user management)
import React from 'react';
import { Link } from 'react-router-dom'; // Import Link

const AdminOverview = () => {
    // In a real application, you'd fetch data here
    // e.g., total users, new registrations today, pending orders, product counts etc.
    const stats = {
        totalUsers: 1500,
        newUsersToday: 25,
        pendingOrders: 12,
        activeProducts: 500,
        adminUsers: 3
    };

    return (
        <div style={styles.container}>
            <h3 style={styles.heading}>Admin Dashboard Overview</h3>
            <p style={styles.introText}>
                Welcome to your admin panel. Here's a quick look at your platform's activity.
            </p>

            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <h4 style={styles.statHeading}>Total Users</h4>
                    <p style={styles.statNumber}>{stats.totalUsers}</p>
                </div>
                <div style={styles.statCard}>
                    <h4 style={styles.statHeading}>New Users Today</h4>
                    <p style={styles.statNumber}>{stats.newUsersToday}</p>
                </div>
                <div style={styles.statCard}>
                    <h4 style={styles.statHeading}>Pending Orders</h4>
                    <p style={styles.statNumber}>{stats.pendingOrders}</p>
                </div>
                <div style={styles.statCard}>
                    <h4 style={styles.statHeading}>Active Products</h4>
                    <p style={styles.statNumber}>{stats.activeProducts}</p>
                </div>
                <div style={styles.statCard}>
                    <h4 style={styles.statHeading}>Admin Accounts</h4>
                    <p style={styles.statNumber}>{stats.adminUsers}</p>
                </div>
            </div>

            <div style={styles.quickLinks}>
                <h4>Quick Actions</h4>
                <ul style={styles.linkList}>
                    {/* Changed button to Link */}
                    <li>
                        <Link to="/admin/users" style={styles.linkButton}>
                            View All Users
                        </Link>
                    </li>
                    <li><button style={styles.linkButton} onClick={() => alert('Add New Product')}>Add New Product</button></li>
                    <li><button style={styles.linkButton} onClick={() => alert('Review Latest Orders')}>Review Latest Orders</button></li>
                </ul>
            </div>
        </div>
    );
};

const styles = {
    container: {
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
    },
    heading: {
        color: '#333',
        marginBottom: '15px',
        textAlign: 'center',
        fontSize: '2em',
    },
    introText: {
        textAlign: 'center',
        color: '#666',
        marginBottom: '30px',
        fontSize: '1.1em',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '40px',
    },
    statCard: {
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        textAlign: 'center',
        border: '1px solid #eee',
    },
    statHeading: {
        color: '#28a745',
        fontSize: '1.2em',
        marginBottom: '10px',
    },
    statNumber: {
        fontSize: '2.5em',
        fontWeight: 'bold',
        color: '#007bff',
    },
    quickLinks: {
        marginTop: '30px',
        borderTop: '1px solid #eee',
        paddingTop: '20px',
        textAlign: 'center',
    },
    linkList: {
        listStyle: 'none',
        padding: 0,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '15px',
    },
    linkButton: {
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        padding: '12px 25px',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1em',
        fontWeight: 'bold',
        textDecoration: 'none', // Add this for Link component
        display: 'inline-block', // Make Link behave like a button
        transition: 'background-color 0.3s ease',
    },
    linkButtonHover: {
        backgroundColor: '#0056b3',
    },
};

export default AdminOverview;