import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api';

const UserDetails = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [cartItems, setCartItems] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [wishlist, setWishlist] = useState([]);
    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        phone_number: '',
        role: '',
        is_verified: false,
        addresses: []
    });

    // Helper function to construct full image URL
    const getImageUrl = (imagePath) => {
        if (!imagePath) {
            return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik04MCA2MEgxMjBWNzBIMTQwVjkwSDEyMFYxMDBINzBWNzBINjBWNjBINzBaIiBmaWxsPSIjQ0NDIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiPkltYWdlPC90ZXh0Pgo8L3N2Zz4K';
        }
        
        // If it's already a full URL, return as is
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            return imagePath;
        }
        
        // If it's a data URL, return as is
        if (imagePath.startsWith('data:')) {
            return imagePath;
        }
        
        // Construct full URL for backend images
        const baseUrl = 'http://localhost:5000';
        return `${baseUrl}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`;
    };

    useEffect(() => {
        fetchUserDetails();
        fetchUserCart();
        fetchUserFavorites();
        fetchUserWishlist();
    }, [userId]);

    const fetchUserDetails = async () => {
        try {
            const response = await API.adminAPI.getUserById(userId);
            setUser(response.data);
            setEditForm({
                name: response.data.name,
                email: response.data.email,
                phone_number: response.data.phone_number || '',
                role: response.data.role,
                is_verified: response.data.is_verified,
                addresses: response.data.addresses || []
            });
            setLoading(false);
        } catch (err) {
            console.error('Error fetching user details:', err);
            setError('Failed to load user details');
            setLoading(false);
        }
    };

    const fetchUserCart = async () => {
        try {
            console.log('Fetching cart for user:', userId);
            const response = await API.adminAPI.getUserCart(userId);
            console.log('Raw cart response:', response);
            
            if (response.data && Array.isArray(response.data.items)) {
                setCartItems(response.data.items);
                console.log('Set cart items:', response.data.items);
            } else {
                console.error('Invalid cart data structure:', response.data);
                setCartItems([]);
            }
        } catch (err) {
            console.error('Error fetching user cart:', err);
            setCartItems([]);
        }
    };

    const fetchUserFavorites = async () => {
        try {
            const response = await API.adminAPI.getUserFavorites(userId);
            setFavorites(response.data || []);
        } catch (err) {
            console.error('Error fetching user favorites:', err);
        }
    };

    const fetchUserWishlist = async () => {
        try {
            const response = await API.adminAPI.getUserWishlist(userId);
            setWishlist(response.data || []);
        } catch (err) {
            console.error('Error fetching user wishlist:', err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleAddressChange = (index, field, value) => {
        setEditForm(prev => {
            const updatedAddresses = [...prev.addresses];
            updatedAddresses[index] = {
                ...updatedAddresses[index],
                [field]: value
            };
            return {
                ...prev,
                addresses: updatedAddresses
            };
        });
    };

    const handleAddAddress = () => {
        setEditForm(prev => ({
            ...prev,
            addresses: [...prev.addresses, {
                house_name: '',
                area_street_sector_village: '',
                landmark: '',
                town_city: '',
                state: '',
                pincode: '',
                is_default: prev.addresses.length === 0 // Make first address default if no addresses exist
            }]
        }));
    };

    const handleRemoveAddress = (index) => {
        setEditForm(prev => {
            const updatedAddresses = prev.addresses.filter((_, i) => i !== index);
            // If we removed the default address and there are other addresses, make the first one default
            if (prev.addresses[index].is_default && updatedAddresses.length > 0) {
                updatedAddresses[0].is_default = true;
            }
            return {
                ...prev,
                addresses: updatedAddresses
            };
        });
    };

    const handleSetDefaultAddress = (index) => {
        setEditForm(prev => {
            const updatedAddresses = prev.addresses.map((addr, i) => ({
                ...addr,
                is_default: i === index
            }));
            return {
                ...prev,
                addresses: updatedAddresses
            };
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        try {
            await API.adminAPI.updateUser(userId, editForm);
            setSuccessMessage('User updated successfully');
            setIsEditing(false);
            fetchUserDetails(); // Refresh user data
        } catch (err) {
            console.error('Error updating user:', err);
            setError(err.response?.data?.message || 'Failed to update user');
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            try {
                await API.adminAPI.deleteUser(userId);
                navigate('/admin/users', { state: { message: 'User deleted successfully' } });
            } catch (err) {
                console.error('Error deleting user:', err);
                setError(err.response?.data?.message || 'Failed to delete user');
            }
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'details':
                return (
                    <div style={styles.section}>
                        {isEditing ? (
                            <form onSubmit={handleUpdate} style={styles.form}>
                                <h3 style={styles.sectionHeading}>Edit User Information</h3>
                                <div style={styles.formGrid}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Name:</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={editForm.name}
                                            onChange={handleInputChange}
                                            style={styles.input}
                                            required
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Email:</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={editForm.email}
                                            onChange={handleInputChange}
                                            style={styles.input}
                                            required
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Phone Number:</label>
                                        <input
                                            type="tel"
                                            name="phone_number"
                                            value={editForm.phone_number}
                                            onChange={handleInputChange}
                                            style={styles.input}
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Role:</label>
                                        <select
                                            name="role"
                                            value={editForm.role}
                                            onChange={handleInputChange}
                                            style={styles.input}
                                            required
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>
                                            <input
                                                type="checkbox"
                                                name="is_verified"
                                                checked={editForm.is_verified}
                                                onChange={handleInputChange}
                                            />
                                            {' '}Verified User
                                        </label>
                                    </div>
                                </div>

                                <h3 style={styles.sectionHeading}>Addresses</h3>
                                <button 
                                    type="button" 
                                    onClick={handleAddAddress}
                                    style={styles.addButton}
                                >
                                    Add New Address
                                </button>
                                
                                <div style={styles.addressesList}>
                                    {editForm.addresses.map((address, index) => (
                                        <div key={index} style={styles.addressCard}>
                                            <div style={styles.addressField}>
                                                <label style={styles.fieldLabel}>House/Building Name:</label>
                                                <input
                                                    type="text"
                                                    value={address.house_name}
                                                    onChange={(e) => handleAddressChange(index, 'house_name', e.target.value)}
                                                    style={styles.input}
                                                    required
                                                />
                                            </div>
                                            <div style={styles.addressField}>
                                                <label style={styles.fieldLabel}>Area/Street/Sector/Village:</label>
                                                <input
                                                    type="text"
                                                    value={address.area_street_sector_village}
                                                    onChange={(e) => handleAddressChange(index, 'area_street_sector_village', e.target.value)}
                                                    style={styles.input}
                                                    required
                                                />
                                            </div>
                                            <div style={styles.addressField}>
                                                <label style={styles.fieldLabel}>Landmark:</label>
                                                <input
                                                    type="text"
                                                    value={address.landmark || ''}
                                                    onChange={(e) => handleAddressChange(index, 'landmark', e.target.value)}
                                                    style={styles.input}
                                                />
                                            </div>
                                            <div style={styles.addressField}>
                                                <label style={styles.fieldLabel}>Town/City:</label>
                                                <input
                                                    type="text"
                                                    value={address.town_city}
                                                    onChange={(e) => handleAddressChange(index, 'town_city', e.target.value)}
                                                    style={styles.input}
                                                    required
                                                />
                                            </div>
                                            <div style={styles.addressField}>
                                                <label style={styles.fieldLabel}>State:</label>
                                                <input
                                                    type="text"
                                                    value={address.state}
                                                    onChange={(e) => handleAddressChange(index, 'state', e.target.value)}
                                                    style={styles.input}
                                                    required
                                                />
                                            </div>
                                            <div style={styles.addressField}>
                                                <label style={styles.fieldLabel}>Pincode:</label>
                                                <input
                                                    type="text"
                                                    value={address.pincode}
                                                    onChange={(e) => handleAddressChange(index, 'pincode', e.target.value)}
                                                    style={styles.input}
                                                    required
                                                />
                                            </div>
                                            <div style={styles.addressActions}>
                                                <label style={styles.defaultAddressLabel}>
                                                    <input
                                                        type="radio"
                                                        name="default_address"
                                                        checked={address.is_default}
                                                        onChange={() => handleSetDefaultAddress(index)}
                                                    />
                                                    {' '}Make Default
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveAddress(index)}
                                                    style={styles.removeButton}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={styles.formActions}>
                                    <button type="submit" style={styles.saveButton}>
                                        Save Changes
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditing(false);
                                            setEditForm({
                                                name: user.name,
                                                email: user.email,
                                                phone_number: user.phone_number || '',
                                                role: user.role,
                                                is_verified: user.is_verified,
                                                addresses: user.addresses || []
                                            });
                                        }}
                                        style={styles.cancelButton}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <div style={styles.section}>
                                    <h3 style={styles.sectionHeading}>Basic Information</h3>
                                    <div style={styles.detailsGrid}>
                                        <div style={styles.detailItem}>
                                            <span style={styles.label}>ID:</span>
                                            <span style={styles.value}>{user.id}</span>
                                        </div>
                                        <div style={styles.detailItem}>
                                            <span style={styles.label}>Name:</span>
                                            <span style={styles.value}>{user.name}</span>
                                        </div>
                                        <div style={styles.detailItem}>
                                            <span style={styles.label}>Email:</span>
                                            <span style={styles.value}>{user.email}</span>
                                        </div>
                                        <div style={styles.detailItem}>
                                            <span style={styles.label}>Phone:</span>
                                            <span style={styles.value}>{user.phone_number || 'Not provided'}</span>
                                        </div>
                                        <div style={styles.detailItem}>
                                            <span style={styles.label}>Role:</span>
                                            <span style={styles.value}>{user.role}</span>
                                        </div>
                                        <div style={styles.detailItem}>
                                            <span style={styles.label}>Verified:</span>
                                            <span style={styles.value}>{user.is_verified ? 'Yes' : 'No'}</span>
                                        </div>
                                        <div style={styles.detailItem}>
                                            <span style={styles.label}>Google Auth:</span>
                                            <span style={styles.value}>{user.has_google_auth ? 'Yes' : 'No'}</span>
                                        </div>
                                        <div style={styles.detailItem}>
                                            <span style={styles.label}>Password Set:</span>
                                            <span style={styles.value}>{user.has_password ? 'Yes' : 'No'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={styles.section}>
                                    <h3 style={styles.sectionHeading}>Addresses</h3>
                                    {user.addresses && user.addresses.length > 0 ? (
                                        <div style={styles.addressesList}>
                                            {user.addresses.map((address, index) => (
                                                <div key={index} style={styles.addressCard}>
                                                    {address.is_default && (
                                                        <span style={styles.defaultBadge}>Default</span>
                                                    )}
                                                    <div style={styles.addressField}>
                                                        <span style={styles.fieldLabel}>House/Building Name:</span>
                                                        <span style={styles.fieldValue}>{address.house_name}</span>
                                                    </div>
                                                    <div style={styles.addressField}>
                                                        <span style={styles.fieldLabel}>Area/Street/Sector/Village:</span>
                                                        <span style={styles.fieldValue}>{address.area_street_sector_village}</span>
                                                    </div>
                                                    {address.landmark && (
                                                        <div style={styles.addressField}>
                                                            <span style={styles.fieldLabel}>Landmark:</span>
                                                            <span style={styles.fieldValue}>{address.landmark}</span>
                                                        </div>
                                                    )}
                                                    <div style={styles.addressField}>
                                                        <span style={styles.fieldLabel}>Town/City:</span>
                                                        <span style={styles.fieldValue}>{address.town_city}</span>
                                                    </div>
                                                    <div style={styles.addressField}>
                                                        <span style={styles.fieldLabel}>State:</span>
                                                        <span style={styles.fieldValue}>{address.state}</span>
                                                    </div>
                                                    <div style={styles.addressField}>
                                                        <span style={styles.fieldLabel}>Pincode:</span>
                                                        <span style={styles.fieldValue}>{address.pincode}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={styles.emptyMessage}>No addresses added</p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                );
            case 'cart':
                return (
                    <div style={styles.section}>
                        <h3 style={styles.sectionHeading}>Shopping Cart ({cartItems.length} items)</h3>
                        {!cartItems || cartItems.length === 0 ? (
                            <p style={styles.emptyMessage}>Cart is empty</p>
                        ) : (
                            <div style={styles.itemsGrid}>
                                {cartItems.map(item => {
                                    console.log('Rendering cart item:', item);
                                    return (
                                        <div key={item.cart_item_id} style={styles.itemCard}>
                                            <div style={styles.imageContainer}>
                                                <img 
                                                    src={getImageUrl(item.image_url)} 
                                                    alt={item.name || 'Product'} 
                                                    style={styles.itemImage}
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik04MCA2MEgxMjBWNzBIMTQwVjkwSDEyMFYxMDBINzBWNzBINjBWNjBINzBaIiBmaWxsPSIjQ0NDIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiPkltYWdlPC90ZXh0Pgo8L3N2Zz4K';
                                                    }}
                                                    onLoad={(e) => {
                                                        e.target.style.opacity = '1';
                                                    }}
                                                />
                                            </div>
                                            <div style={styles.itemDetails}>
                                                <h4 style={styles.itemName}>{item.name || 'Unnamed Product'}</h4>
                                                <p style={styles.itemPrice}>₹{item.price || '0'}</p>
                                                <p style={styles.itemQuantity}>Quantity: {item.quantity || 0}</p>
                                                <p style={styles.itemCategory}>{item.category_name || 'Uncategorized'}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            case 'favorites':
                return (
                    <div style={styles.section}>
                        <h3 style={styles.sectionHeading}>Favorites</h3>
                        {favorites.length === 0 ? (
                            <p style={styles.emptyMessage}>No favorites added</p>
                        ) : (
                            <div style={styles.itemsGrid}>
                                {favorites.map(item => (
                                    <div key={item.favorite_id} style={styles.itemCard}>
                                        <div style={styles.imageContainer}>
                                            <img 
                                                src={getImageUrl(item.image_url)} 
                                                alt={item.name || 'Product'} 
                                                style={styles.itemImage}
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik04MCA2MEgxMjBWNzBIMTQwVjkwSDEyMFYxMDBINzBWNzBINjBWNjBINzBaIiBmaWxsPSIjQ0NDIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiPkltYWdlPC90ZXh0Pgo8L3N2Zz4K';
                                                }}
                                                onLoad={(e) => {
                                                    e.target.style.opacity = '1';
                                                }}
                                            />
                                        </div>
                                        <div style={styles.itemDetails}>
                                            <h4 style={styles.itemName}>{item.name || 'Unnamed Product'}</h4>
                                            <p style={styles.itemPrice}>₹{item.price || '0'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'wishlist':
                return (
                    <div style={styles.section}>
                        <h3 style={styles.sectionHeading}>Wishlist</h3>
                        {wishlist.length === 0 ? (
                            <p style={styles.emptyMessage}>No items in wishlist</p>
                        ) : (
                            <div style={styles.itemsGrid}>
                                {wishlist.map(item => (
                                    <div key={item.wishlist_id} style={styles.itemCard}>
                                        <div style={styles.imageContainer}>
                                            <img 
                                                src={getImageUrl(item.image_url)} 
                                                alt={item.name || 'Product'} 
                                                style={styles.itemImage}
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik04MCA2MEgxMjBWNzBIMTQwVjkwSDEyMFYxMDBINzBWNzBINjBWNjBINzBaIiBmaWxsPSIjQ0NDIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiPkltYWdlPC90ZXh0Pgo8L3N2Zz4K';
                                                }}
                                                onLoad={(e) => {
                                                    e.target.style.opacity = '1';
                                                }}
                                            />
                                        </div>
                                        <div style={styles.itemDetails}>
                                            <h4 style={styles.itemName}>{item.name || 'Unnamed Product'}</h4>
                                            <p style={styles.itemPrice}>₹{item.price || '0'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    if (loading) return <div style={styles.loading}>Loading...</div>;
    if (error) return <div style={styles.error}>{error}</div>;
    if (!user) return <div style={styles.error}>User not found</div>;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button 
                    onClick={() => navigate('/admin/users')}
                    style={styles.backButton}
                >
                    ← Back to Users List
                </button>
                <h2 style={styles.heading}>User Details</h2>
                <div style={styles.actionButtons}>
                    {!isEditing && (
                        <>
                            <button
                                onClick={() => setIsEditing(true)}
                                style={styles.editButton}
                            >
                                Edit User
                            </button>
                            <button
                                onClick={handleDelete}
                                style={styles.deleteButton}
                            >
                                Delete User
                            </button>
                        </>
                    )}
                </div>
            </div>

            {successMessage && (
                <div style={styles.successMessage}>
                    {successMessage}
                </div>
            )}
            {error && (
                <div style={styles.errorMessage}>
                    {error}
                </div>
            )}

            <div style={styles.tabs}>
                <button
                    style={{
                        ...styles.tabButton,
                        ...(activeTab === 'details' ? styles.activeTab : {})
                    }}
                    onClick={() => setActiveTab('details')}
                >
                    Details
                </button>
                <button
                    style={{
                        ...styles.tabButton,
                        ...(activeTab === 'cart' ? styles.activeTab : {})
                    }}
                    onClick={() => setActiveTab('cart')}
                >
                    Cart ({cartItems.length})
                </button>
                <button
                    style={{
                        ...styles.tabButton,
                        ...(activeTab === 'favorites' ? styles.activeTab : {})
                    }}
                    onClick={() => setActiveTab('favorites')}
                >
                    Favorites ({favorites.length})
                </button>
                <button
                    style={{
                        ...styles.tabButton,
                        ...(activeTab === 'wishlist' ? styles.activeTab : {})
                    }}
                    onClick={() => setActiveTab('wishlist')}
                >
                    Wishlist ({wishlist.length})
                </button>
            </div>

            <div style={styles.detailsContainer}>
                {renderTabContent()}
            </div>
        </div>
    );
};

const styles = {
    container: {
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '30px',
        gap: '20px',
    },
    backButton: {
        padding: '10px 20px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1em',
    },
    heading: {
        color: '#28a745',
        margin: 0,
    },
    detailsContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '30px',
    },
    section: {
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    sectionHeading: {
        color: '#333',
        marginBottom: '20px',
        paddingBottom: '10px',
        borderBottom: '1px solid #eee',
    },
    detailsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '20px',
    },
    detailItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
    },
    label: {
        color: '#666',
        fontSize: '0.9em',
    },
    value: {
        fontSize: '1.1em',
        color: '#333',
    },
    addressesList: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
        marginTop: '30px',
    },
    addressCard: {
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '1px solid #e0e0e0',
        position: 'relative',
    },
    addressField: {
        marginBottom: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    fieldLabel: {
        color: '#666',
        fontSize: '0.9em',
        fontWeight: 'bold',
    },
    fieldValue: {
        color: '#333',
        fontSize: '1em',
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
    noAddresses: {
        textAlign: 'center',
        color: '#666',
        marginTop: '20px',
        fontSize: '1.1em',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px dashed #ccc',
    },
    timeline: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    timelineItem: {
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
    },
    loading: {
        textAlign: 'center',
        padding: '50px',
        fontSize: '1.2em',
        color: '#666',
    },
    error: {
        textAlign: 'center',
        padding: '50px',
        color: '#dc3545',
        fontSize: '1.2em',
    },
    actionButtons: {
        display: 'flex',
        gap: '10px',
    },
    editButton: {
        backgroundColor: '#ffc107',
        color: '#000',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9em',
    },
    deleteButton: {
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9em',
    },
    editForm: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        maxWidth: '600px',
        margin: '0 auto',
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
    },
    input: {
        padding: '8px 12px',
        borderRadius: '4px',
        border: '1px solid #ddd',
        fontSize: '1em',
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
    },
    checkbox: {
        cursor: 'pointer',
    },
    buttonGroup: {
        display: 'flex',
        gap: '10px',
        justifyContent: 'flex-end',
        marginTop: '20px',
    },
    saveButton: {
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1em',
    },
    cancelButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1em',
    },
    successMessage: {
        backgroundColor: '#d4edda',
        color: '#155724',
        padding: '12px',
        borderRadius: '4px',
        marginBottom: '20px',
        textAlign: 'center',
    },
    errorMessage: {
        backgroundColor: '#f8d7da',
        color: '#721c24',
        padding: '12px',
        borderRadius: '4px',
        marginBottom: '20px',
        textAlign: 'center',
    },
    addressesSection: {
        marginTop: '30px',
    },
    subsectionHeading: {
        color: '#333',
        fontSize: '1.1em',
        marginBottom: '15px',
    },
    addAddressButton: {
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        marginBottom: '20px',
    },
    addressHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
    },
    addressTitle: {
        margin: 0,
        color: '#333',
        fontSize: '1em',
    },
    addressActions: {
        display: 'flex',
        gap: '10px',
    },
    setDefaultButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        padding: '4px 8px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9em',
    },
    removeAddressButton: {
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        padding: '4px 8px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9em',
    },
    tabs: {
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        borderBottom: '1px solid #dee2e6',
        padding: '0 20px',
    },
    tabButton: {
        padding: '10px 20px',
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        fontSize: '16px',
        color: '#666',
        position: 'relative',
        transition: 'all 0.3s ease',
    },
    activeTab: {
        color: '#28a745',
        borderBottom: '3px solid #28a745',
        fontWeight: 'bold',
    },
    itemsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '20px',
        padding: '20px',
    },
    itemCard: {
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: 'white',
        transition: 'transform 0.2s ease',
        '&:hover': {
            transform: 'translateY(-5px)',
        },
    },
    itemImage: {
        width: '100%',
        height: '150px',
        objectFit: 'cover',
        opacity: '0',
        transition: 'opacity 0.3s ease',
        display: 'block',
    },
    itemDetails: {
        padding: '15px',
    },
    itemName: {
        margin: '0 0 10px 0',
        fontSize: '16px',
        fontWeight: 'bold',
    },
    itemPrice: {
        color: '#28a745',
        fontWeight: 'bold',
        margin: '5px 0',
    },
    itemQuantity: {
        color: '#666',
        fontSize: '14px',
    },
    itemCategory: {
        color: '#666',
        fontSize: '14px',
    },
    emptyMessage: {
        textAlign: 'center',
        color: '#666',
        padding: '20px',
        fontSize: '16px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    formGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '30px',
    },
    formActions: {
        display: 'flex',
        gap: '10px',
        marginTop: '20px',
    },
    addButton: {
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        marginBottom: '20px',
    },
    removeButton: {
        padding: '5px 10px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    addressActions: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '15px',
        paddingTop: '15px',
        borderTop: '1px solid #eee',
    },
    defaultAddressLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        cursor: 'pointer',
    },
    imageContainer: {
        width: '100%',
        height: '150px',
        overflow: 'hidden',
        borderRadius: '8px 8px 0 0',
        position: 'relative',
        backgroundColor: '#f8f9fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
};

export default UserDetails; 