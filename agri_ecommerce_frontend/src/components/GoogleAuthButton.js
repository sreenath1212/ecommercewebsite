// src/components/GoogleAuthButton.js
import React from 'react';

const GoogleAuthButton = () => {
    // This function will redirect the user to your backend's Google OAuth initiation route.
    const handleGoogleLogin = () => {
        // Ensure this URL matches your backend's Google auth initiation endpoint
        window.location.href = 'http://localhost:5000/auth/google';
    };

    return (
        <button onClick={handleGoogleLogin} style={styles.googleButton}>
            <img src="https://img.icons8.com/color/16/000000/google-logo.png" alt="Google logo" style={styles.googleIcon} />
            Login with Google
        </button>
    );
};

const styles = {
    googleButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4285F4', // Google blue
        color: '#fff',
        padding: '12px 20px',
        borderRadius: '4px',
        border: 'none',
        fontSize: '16px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        width: '100%',
        boxSizing: 'border-box',
        marginTop: '15px',
    },
    googleIcon: {
        marginRight: '10px',
        width: '20px',
        height: '20px',
    },
    googleButtonHover: {
        backgroundColor: '#357ae8',
    },
};

export default GoogleAuthButton;