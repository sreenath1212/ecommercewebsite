// src/components/UserProfile.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import AddressManagement from './AddressManagement'; // Import the new AddressManagement component

const UserProfile = () => {
    const { user, token, isAuthenticated, logout, setUser: setAuthUser } = useAuth();
    const [profile, setProfile] = useState({ name: '', email: '', phone_number: '' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // State for editing individual fields
    const [editNameMode, setEditNameMode] = useState(false);
    const [newName, setNewName] = useState('');

    // Removed: State for email update (editEmailMode, newEmail, emailOtpSent, emailOtp, emailMessage)

    const [editPhoneMode, setEditPhoneMode] = useState(false);
    const [newPhoneNumber, setNewPhoneNumber] = useState('');
    const [phoneMessage, setPhoneMessage] = useState(''); // Specific message for phone updates

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (!isAuthenticated || !token) {
                setLoading(false);
                return;
            }

            try {
                const response = await API.get('user/profile');
                setProfile(response.data);
                setNewName(response.data.name);
                // No need to set newEmail if we're not allowing editing
                setNewPhoneNumber(response.data.phone_number || '');
            } catch (err) {
                console.error("Error fetching user profile:", err);
                setError(err.response?.data?.message || "Failed to fetch user profile.");
                if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                    logout();
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [isAuthenticated, token, logout, setAuthUser]);

    // --- General Profile Update (Name, Phone Number) ---
    const handleProfileUpdate = async (fieldToUpdate) => {
        setError('');
        setSuccessMessage('');
        setPhoneMessage(''); // Clear specific messages for phone before general update
        // No emailMessage to clear here

        let payload = {};
        if (fieldToUpdate === 'name') {
            if (newName.trim() === '') {
                setError('Name cannot be empty.');
                return;
            }
            payload.name = newName.trim();
        } else if (fieldToUpdate === 'phoneNumber') {
             // Allow null to clear phone number
            if (newPhoneNumber !== null && !/^\d{10,15}$/.test(newPhoneNumber)) {
                setError('Invalid phone number format. Must be 10-15 digits or empty.');
                return;
            }
            payload.phone_number = newPhoneNumber === '' ? null : newPhoneNumber; // Send null if empty string
        } else {
            setError('Invalid field to update.');
            return;
        }

        try {
            const response = await API.put('user/profile', payload);
            setProfile(prevProfile => ({
                ...prevProfile,
                ...response.data.user // Update all returned user fields
            }));
            setAuthUser(prevUser => ({
                ...prevUser,
                name: response.data.user.name,
                phone_number: response.data.user.phone_number
            }));
            setSuccessMessage(response.data.message);
            if (fieldToUpdate === 'name') setEditNameMode(false);
            if (fieldToUpdate === 'phoneNumber') setEditPhoneMode(false);
        } catch (err) {
            console.error("Error updating profile:", err);
            setError(err.response?.data?.message || "Failed to update profile.");
        }
    };

    // Removed: handleSendEmailOtp, handleVerifyEmailOtp, cancelEmailEdit functions

    if (loading) {
        return <div style={styles.loading}>Loading profile...</div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.heading}>Your Profile</h2>

                {successMessage && <p style={styles.successMessage}>{successMessage}</p>}
                {error && <p style={styles.errorMessage}>{error}</p>}

                <div style={styles.profileInfo}>
                    {/* Name */}
                    <p>
                        <strong>Name:</strong>{' '}
                        {editNameMode ? (
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                style={styles.inputField}
                            />
                        ) : (
                            profile.name
                        )}
                        {' '}
                        {editNameMode ? (
                            <>
                                <button onClick={() => handleProfileUpdate('name')} style={styles.saveButton}>Save</button>
                                <button onClick={() => { setEditNameMode(false); setNewName(profile.name); setError(''); setSuccessMessage(''); }} style={styles.cancelButton}>Cancel</button>
                            </>
                        ) : (
                            <button onClick={() => setEditNameMode(true)} style={styles.editButton}>Edit</button>
                        )}
                    </p>

                    {/* Email - Display only, no edit functionality */}
                    <p>
                        <strong>Email:</strong>{' '}
                        {profile.email}
                    </p>
                    {/* Removed: emailMessage display as there's no email edit flow */}


                    {/* Phone Number */}
                    <p>
                        <strong>Phone Number:</strong>{' '}
                        {editPhoneMode ? (
                            <input
                                type="text"
                                value={newPhoneNumber}
                                onChange={(e) => setNewPhoneNumber(e.target.value)}
                                style={styles.inputField}
                            />
                        ) : (
                            profile.phone_number || 'N/A'
                        )}
                        {' '}
                        {editPhoneMode ? (
                            <>
                                <button onClick={() => handleProfileUpdate('phoneNumber')} style={styles.saveButton}>Save</button>
                                <button onClick={() => { setEditPhoneMode(false); setNewPhoneNumber(profile.phone_number || ''); setError(''); setSuccessMessage(''); }} style={styles.cancelButton}>Cancel</button>
                            </>
                        ) : (
                            <button onClick={() => setEditPhoneMode(true)} style={styles.editButton}>
                                {profile.phone_number ? 'Edit' : 'Add'}
                            </button>
                        )}
                    </p>
                    {phoneMessage && <p style={phoneMessage.includes('Failed') || phoneMessage.includes('Invalid') ? styles.errorMessage : styles.infoMessage}>{phoneMessage}</p>}
                </div>

                <hr style={styles.separator} />

                <AddressManagement />
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '20px',
        minHeight: 'calc(100vh - 70px)',
        boxSizing: 'border-box',
    },
    card: {
        backgroundColor: '#fff',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
        maxWidth: '800px',
        width: '100%',
        margin: '20px 0',
    },
    heading: {
        color: '#28a745',
        marginBottom: '25px',
        textAlign: 'center',
        fontSize: '2em',
    },
    profileInfo: {
        marginBottom: '30px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
    },
    inputField: { // Generic style for all input fields
        padding: '8px',
        borderRadius: '5px',
        border: '1px solid #ccc',
        width: 'auto', // Adjust width as needed, or set to 180px if preferred
        minWidth: '150px',
        marginRight: '10px',
    },
    editButton: {
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '0.9em',
        marginLeft: '10px',
        transition: 'background-color 0.3s ease',
    },
    saveButton: {
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '0.9em',
        marginLeft: '10px',
        transition: 'background-color 0.3s ease',
    },
    cancelButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '0.9em',
        marginLeft: '10px',
        transition: 'background-color 0.3s ease',
    },
    sendOtpButton: { // Keep the style, though the button is removed
        backgroundColor: '#ffc107',
        color: '#343a40',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '0.9em',
        marginLeft: '10px',
        transition: 'background-color 0.3s ease',
    },
    successMessage: {
        color: '#28a745',
        marginTop: '10px',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    errorMessage: {
        color: '#dc3545',
        marginTop: '10px',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    infoMessage: { // For messages like "OTP sent"
        color: '#007bff',
        marginTop: '10px',
        textAlign: 'center',
    },
    separator: {
        border: 'none',
        borderTop: '1px solid #eee',
        margin: '30px 0',
    },
    loading: {
        textAlign: 'center',
        fontSize: '1.2em',
        color: '#666',
        marginTop: '100px',
    },
    errorContainer: { // General error container for profile fetch errors
        textAlign: 'center',
        fontSize: '1.2em',
        color: '#dc3545',
        marginTop: '100px',
        padding: '20px',
        backgroundColor: '#ffe3e6',
        borderRadius: '8px',
        border: '1px solid #dc3545',
    },
};

export default UserProfile;