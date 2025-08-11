// src/components/AddressManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import { statesOfIndia } from '../data/statesOfIndia'; // Import states

const AddressManagement = () => {
    const { token, isAuthenticated, logout } = useAuth();
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newAddress, setNewAddress] = useState({
        house_name: '',
        area_street_sector_village: '',
        landmark: '',
        pincode: '',
        town_city: '',
        state: ''
    });
    const [editingAddressId, setEditingAddressId] = useState(null); // State to track which address is being edited

    const fetchAddresses = useCallback(async () => {
        if (!isAuthenticated || !token) {
            setLoading(false);
            return;
        }
        try {
            const response = await API.get('addresses');
            setAddresses(response.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching addresses:", err);
            setError(err.response?.data?.message || "Failed to fetch addresses.");
            setLoading(false);
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                logout();
            }
        }
    }, [isAuthenticated, token, logout]);

    useEffect(() => {
        fetchAddresses();
    }, [fetchAddresses]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewAddress(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleAddOrUpdateAddress = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Basic validation
        if (!newAddress.house_name || !newAddress.area_street_sector_village || !newAddress.pincode || !newAddress.town_city || !newAddress.state) {
            setError('Please fill all required address fields.');
            return;
        }

        try {
            let response;
            if (editingAddressId) {
                // Update existing address
                response = await API.put(`addresses/${editingAddressId}`, newAddress);
                setSuccess('Address updated successfully!');
            } else {
                // Add new address
                response = await API.post('addresses', newAddress);
                setSuccess('Address added successfully!');
            }
            fetchAddresses(); // Re-fetch addresses to update the list
            setNewAddress({ // Clear form
                house_name: '',
                area_street_sector_village: '',
                landmark: '',
                pincode: '',
                town_city: '',
                state: ''
            });
            setShowAddForm(false); // Hide form
            setEditingAddressId(null); // Reset editing state
        } catch (err) {
            console.error("Error saving address:", err);
            setError(err.response?.data?.message || "Failed to save address.");
        }
    };

    const handleSetDefault = async (addressId) => {
        setError('');
        setSuccess('');
        try {
            await API.patch(`addresses/${addressId}/set-default`);
            setSuccess('Default address updated!');
            fetchAddresses(); // Re-fetch to show new default
        } catch (err) {
            console.error("Error setting default address:", err);
            setError(err.response?.data?.message || "Failed to set default address.");
        }
    };

    const handleDeleteAddress = async (addressId) => {
        if (!window.confirm("Are you sure you want to delete this address?")) {
            return;
        }
        setError('');
        setSuccess('');
        try {
            await API.delete(`addresses/${addressId}`);
            setSuccess('Address deleted successfully!');
            fetchAddresses(); // Re-fetch addresses
        } catch (err) {
            console.error("Error deleting address:", err);
            setError(err.response?.data?.message || "Failed to delete address.");
        }
    };

    const handleEditAddress = (address) => {
        setNewAddress(address); // Pre-fill the form with existing address data
        setEditingAddressId(address.id); // Set the ID of the address being edited
        setShowAddForm(true); // Show the form
    };

    const cancelEdit = () => {
        setNewAddress({ // Clear form
            house_name: '',
            area_street_sector_village: '',
            landmark: '',
            pincode: '',
            town_city: '',
            state: ''
        });
        setEditingAddressId(null);
        setShowAddForm(false);
    }


    if (loading) {
        return <p style={styles.loading}>Loading addresses...</p>;
    }

    return (
        <div style={styles.addressSection}>
            <h3 style={styles.sectionHeading}>Your Addresses</h3>

            {error && <p style={styles.errorMessage}>{error}</p>}
            {success && <p style={styles.successMessage}>{success}</p>}

            <button onClick={() => setShowAddForm(!showAddForm)} style={styles.addButton}>
                {showAddForm ? 'Hide Add Address Form' : 'Add New Address'}
            </button>

            {showAddForm && (
                <div style={styles.formContainer}>
                    <h4 style={styles.subHeading}>{editingAddressId ? 'Edit Address' : 'Add New Address'}</h4>
                    <form onSubmit={handleAddOrUpdateAddress} style={styles.form}>
                        <div style={styles.formGroup}>
                            <label htmlFor="house_name" style={styles.label}>House Name/Building/Company/Apartment:</label>
                            <input
                                type="text"
                                id="house_name"
                                name="house_name"
                                value={newAddress.house_name}
                                onChange={handleInputChange}
                                style={styles.input}
                                required
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label htmlFor="area_street_sector_village" style={styles.label}>Area/Street/Sector/Village:</label>
                            <input
                                type="text"
                                id="area_street_sector_village"
                                name="area_street_sector_village"
                                value={newAddress.area_street_sector_village}
                                onChange={handleInputChange}
                                style={styles.input}
                                required
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label htmlFor="landmark" style={styles.label}>Landmark (Optional):</label>
                            <input
                                type="text"
                                id="landmark"
                                name="landmark"
                                value={newAddress.landmark}
                                onChange={handleInputChange}
                                style={styles.input}
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label htmlFor="pincode" style={styles.label}>Pincode:</label>
                            <input
                                type="text"
                                id="pincode"
                                name="pincode"
                                value={newAddress.pincode}
                                onChange={handleInputChange}
                                style={styles.input}
                                required
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label htmlFor="town_city" style={styles.label}>Town/City:</label>
                            <input
                                type="text"
                                id="town_city"
                                name="town_city"
                                value={newAddress.town_city}
                                onChange={handleInputChange}
                                style={styles.input}
                                required
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label htmlFor="state" style={styles.label}>State:</label>
                            <select
                                id="state"
                                name="state"
                                value={newAddress.state}
                                onChange={handleInputChange}
                                style={styles.select}
                                required
                            >
                                <option value="">Select State</option>
                                {statesOfIndia.map(state => (
                                    <option key={state} value={state}>{state}</option>
                                ))}
                            </select>
                        </div>
                        <div style={styles.formActions}>
                            <button type="submit" style={styles.submitButton}>
                                {editingAddressId ? 'Update Address' : 'Add Address'}
                            </button>
                            {editingAddressId && (
                                <button type="button" onClick={cancelEdit} style={styles.cancelButton}>
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            )}

            {addresses.length === 0 ? (
                <p style={styles.noAddresses}>No addresses added yet. Click "Add New Address" to get started!</p>
            ) : (
                <div style={styles.addressesList}>
                    {addresses.map(address => (
                        <div key={address.id} style={styles.addressCard}>
                            <p style={styles.addressText}><strong>{address.house_name}</strong></p>
                            <p style={styles.addressText}>{address.area_street_sector_village}</p>
                            {address.landmark && <p style={styles.addressText}>Landmark: {address.landmark}</p>}
                            <p style={styles.addressText}>{address.town_city}, {address.state} - {address.pincode}</p>
                            {address.is_default && <span style={styles.defaultBadge}>Default Address</span>}
                            <div style={styles.addressActions}>
                                {!address.is_default && (
                                    <button onClick={() => handleSetDefault(address.id)} style={styles.actionButton}>
                                        Set as Default
                                    </button>
                                )}
                                <button onClick={() => handleEditAddress(address)} style={{ ...styles.actionButton, ...styles.editButton }}>
                                    Edit
                                </button>
                                <button onClick={() => handleDeleteAddress(address.id)} style={{ ...styles.actionButton, ...styles.deleteButton }}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const styles = {
    addressSection: {
        marginTop: '40px',
        paddingTop: '20px',
        borderTop: '1px solid #eee',
    },
    sectionHeading: {
        color: '#28a745',
        marginBottom: '20px',
        textAlign: 'center',
        fontSize: '1.8em',
    },
    subHeading: {
        color: '#333',
        marginBottom: '20px',
        textAlign: 'center',
        fontSize: '1.4em',
    },
    addButton: {
        backgroundColor: '#007bff',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: '5px',
        border: 'none',
        fontSize: '1em',
        cursor: 'pointer',
        display: 'block',
        margin: '0 auto 20px auto',
        transition: 'background-color 0.3s ease',
        '&:hover': {
            backgroundColor: '#0056b3',
        },
    },
    formContainer: {
        backgroundColor: '#f9f9f9',
        padding: '25px',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        marginBottom: '30px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
    },
    formGroup: {
        marginBottom: '10px',
    },
    label: {
        display: 'block',
        marginBottom: '5px',
        fontWeight: 'bold',
        color: '#555',
    },
    input: {
        width: '100%',
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '5px',
        fontSize: '1em',
        boxSizing: 'border-box',
    },
    select: {
        width: '100%',
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '5px',
        fontSize: '1em',
        backgroundColor: '#fff',
        cursor: 'pointer',
        boxSizing: 'border-box',
    },
    formActions: {
        display: 'flex',
        justifyContent: 'center',
        gap: '15px',
        marginTop: '20px',
    },
    submitButton: {
        backgroundColor: '#28a745',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: '5px',
        border: 'none',
        fontSize: '1em',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        '&:hover': {
            backgroundColor: '#218838',
        },
    },
    cancelButton: {
        backgroundColor: '#6c757d',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: '5px',
        border: 'none',
        fontSize: '1em',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        '&:hover': {
            backgroundColor: '#5a6268',
        },
    },
    addressesList: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', // Responsive grid
        gap: '20px',
        marginTop: '30px',
    },
    addressCard: {
        backgroundColor: '#e9f7ef',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid #d4edda',
        position: 'relative',
    },
    addressText: {
        margin: '5px 0',
        color: '#333',
    },
    defaultBadge: {
        backgroundColor: '#28a745',
        color: '#fff',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.8em',
        fontWeight: 'bold',
        position: 'absolute',
        top: '15px',
        right: '15px',
    },
    addressActions: {
        marginTop: '15px',
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
    },
    actionButton: {
        padding: '8px 12px',
        borderRadius: '5px',
        border: 'none',
        fontSize: '0.9em',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        backgroundColor: '#6c757d', // Default action button color
        color: '#fff',
        '&:hover': {
            backgroundColor: '#5a6268',
        },
    },
    editButton: {
        backgroundColor: '#ffc107',
        color: '#333',
        '&:hover': {
            backgroundColor: '#e0a800',
        },
    },
    deleteButton: {
        backgroundColor: '#dc3545',
        color: '#fff',
        '&:hover': {
            backgroundColor: '#c82333',
        },
    },
    errorMessage: {
        color: '#dc3545',
        backgroundColor: '#ffe3e6',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '15px',
        textAlign: 'center',
    },
    successMessage: {
        color: '#28a745',
        backgroundColor: '#d4edda',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '15px',
        textAlign: 'center',
    },
    noAddresses: {
        textAlign: 'center',
        color: '#666',
        marginTop: '20px',
        fontSize: '1.1em',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px dashed #ccc',
    }
};

export default AddressManagement;