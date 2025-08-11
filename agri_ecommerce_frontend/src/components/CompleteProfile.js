import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import { useNavigate } from 'react-router-dom';

const CompleteProfile = () => {
    // Ensure setUser is destructured here
    const { user, token, setUser } = useAuth();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        console.log("CompleteProfile: useEffect triggered. User:", user, "Token:", token);
        if (!user || !token) {
            console.log("CompleteProfile: User or token missing, navigating to /login.");
            navigate('/login');
        } else if (user && !user.requiresPasswordSetup) {
            console.log("CompleteProfile: User does NOT require password setup, navigating to /home.");
            navigate('/home'); // Redirect if already set up
        } else {
            console.log("CompleteProfile: User requires password setup. Rendering form.");
        }
    }, [user, token, navigate]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!password || !confirmPassword) {
            setError('Please enter both password and confirm password.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        console.log("CompleteProfile: Submitting password setup request for user:", user?.email);
        try {
            const response = await API.post('/user/set-password', {
                email: user.email,
                password: password
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            console.log("CompleteProfile: Password set API response:", response.data);
            setMessage(response.data.message || 'Password set successfully!');

            // THIS IS THE CRITICAL UPDATE
            const updatedUser = { ...user, requiresPasswordSetup: false };
            console.log("CompleteProfile: Updating user in context and localStorage to:", updatedUser);
            setUser(updatedUser); // Update the state in AuthContext
            localStorage.setItem('user', JSON.stringify(updatedUser)); // Update localStorage

            console.log("CompleteProfile: Attempting to navigate to /home.");
            navigate('/home'); // Navigate to home after setting password
            console.log("CompleteProfile: Navigation call made.");

        } catch (err) {
            console.error('CompleteProfile: Error setting password:', err.response?.data || err.message || err);
            setError(err.response?.data?.message || 'Failed to set password. Please try again.');
        }
    };

    // Render logic to show a loading message or the form based on user state
    if (!user || !token || (user && user.requiresPasswordSetup === undefined)) {
        // This initial check handles cases where user might not be fully loaded or flag is missing
        return <p>Loading user profile...</p>;
    }

    if (!user.requiresPasswordSetup) {
        // If the user *doesn't* require password setup (meaning it was just set or already was false),
        // we should not show the form, but let the useEffect handle the redirect.
        // This prevents a flicker where the form briefly shows if the redirect is fast.
        return <p>Redirecting to home...</p>;
    }

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '2px 2px 10px rgba(0,0,0,0.1)' }}>
            <h2>Complete Your Profile - Set Password</h2>
            {user?.name && <p>Welcome, {user.name}! Please set a password for your account for future email/password logins.</p>}
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="password">New Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', margin: '5px 0' }}
                    />
                </div>
                <div>
                    <label htmlFor="confirmPassword">Confirm New Password:</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', margin: '5px 0' }}
                    />
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                {message && <p style={{ color: 'green' }}>{message}</p>}
                <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' }}>
                    Set Password
                </button>
            </form>
        </div>
    );
};

export default CompleteProfile;