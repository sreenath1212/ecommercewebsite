import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Typography, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Cart = ({ onClose }) => {
    const { cartItems, removeFromCart, updateQuantity, getCartTotal } = useCart();
    const navigate = useNavigate();

    // Helper function to format price
    const formatPrice = (price) => {
        const numPrice = typeof price === 'string' ? parseFloat(price) : price;
        return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
    };

    // Calculate subtotal for an item
    const getItemSubtotal = (item) => {
        if (item.stock <= 0) return 0;
        return item.quantity * parseFloat(item.price);
    };

    // Get available items count
    const getAvailableItemsCount = () => {
        return cartItems.filter(item => item.stock > 0).length;
    };

    // Get out of stock items count
    const getOutOfStockItemsCount = () => {
        return cartItems.filter(item => item.stock <= 0).length;
    };

    // Add the same image handling function as in Home component
    const getProductImage = (imageUrl) => {
        // Default placeholder image
        const defaultImage = '/images/placeholder.png';
        
        if (!imageUrl) return defaultImage;
        
        // If the image URL is relative (starts with /), prepend the backend URL
        if (imageUrl.startsWith('/')) {
            return `http://localhost:5000${imageUrl}`;
        }
        
        return imageUrl;
    };

    // Navigate to checkout page
    const handleGoToCheckout = () => {
        onClose && onClose();
        navigate('/checkout');
    };

    return (
        <div style={styles.cartContainer}>
            <div style={styles.cartHeader}>
                <h2>Shopping Cart</h2>
                <button onClick={onClose} style={styles.closeButton}>×</button>
            </div>
            
            {cartItems.length === 0 ? (
                <div style={styles.emptyCart}>
                    Your cart is empty
                </div>
            ) : (
                <>
                    <div style={styles.cartItems}>
                        {cartItems.map(item => (
                            <div key={item.cart_item_id} style={styles.cartItem}>
                                <div style={styles.imageContainer}>
                                    <img 
                                        src={getProductImage(item.image_url)} 
                                        alt={item.name} 
                                        style={{
                                            ...styles.itemImage,
                                            ...(item.stock <= 0 && styles.outOfStockImage)
                                        }}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = '/images/placeholder.png';
                                        }}
                                    />
                                    {item.stock <= 0 && (
                                        <div style={styles.outOfStockBadge}>
                                            Out of Stock
                                        </div>
                                    )}
                                </div>
                                <div style={styles.itemDetails}>
                                    <h3 style={styles.itemName}>{item.name}</h3>
                                    <p style={styles.itemPrice}>₹{formatPrice(item.price)}</p>
                                    <div style={styles.quantityControls}>
                                        <button 
                                            onClick={() => updateQuantity(item.cart_item_id, item.quantity - 1)}
                                            style={{
                                                ...styles.quantityButton,
                                                ...(item.stock <= 0 && styles.disabledButton)
                                            }}
                                            disabled={item.quantity <= 1 || item.stock <= 0}
                                        >
                                            -
                                        </button>
                                        <span style={styles.quantity}>{item.quantity}</span>
                                        <button 
                                            onClick={() => updateQuantity(item.cart_item_id, item.quantity + 1)}
                                            style={{
                                                ...styles.quantityButton,
                                                ...(item.stock <= 0 && styles.disabledButton)
                                            }}
                                            disabled={item.quantity >= (item.stock || 99) || item.stock <= 0}
                                        >
                                            +
                                        </button>
                                    </div>
                                    {item.stock <= 0 ? (
                                        <p style={styles.outOfStockText}>
                                            This item is out of stock
                                        </p>
                                    ) : (
                                        <p style={styles.subtotalText}>
                                            Subtotal: ₹{formatPrice(getItemSubtotal(item))}
                                        </p>
                                    )}
                                </div>
                                <button 
                                    onClick={() => removeFromCart(item.cart_item_id)}
                                    style={styles.removeButton}
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                    <div style={styles.cartFooter}>
                        {getOutOfStockItemsCount() > 0 && (
                            <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                                {getOutOfStockItemsCount()} item(s) are out of stock and excluded from total
                            </Typography>
                        )}
                        <Divider sx={{ my: 1 }} />
                        <div style={styles.total}>
                            <span>Total ({getAvailableItemsCount()} items):</span>
                            <span>₹{formatPrice(getCartTotal())}</span>
                        </div>
                        <button 
                            style={styles.checkoutButton}
                            disabled={getAvailableItemsCount() === 0}
                            onClick={handleGoToCheckout}
                        >
                            {getAvailableItemsCount() === 0 
                                ? 'No Items Available for Checkout' 
                                : 'Proceed to Checkout'
                            }
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

const styles = {
    cartContainer: {
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: '400px',
        backgroundColor: 'white',
        boxShadow: '-2px 0 5px rgba(0,0,0,0.1)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
    },
    cartHeader: {
        padding: '20px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    closeButton: {
        background: 'none',
        border: 'none',
        fontSize: '24px',
        cursor: 'pointer',
        color: '#666',
    },
    cartItems: {
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
    },
    cartItem: {
        display: 'flex',
        alignItems: 'flex-start',
        padding: '15px',
        borderBottom: '1px solid #eee',
        gap: '15px',
    },
    imageContainer: {
        position: 'relative',
        width: '80px',
        height: '80px',
    },
    itemImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        borderRadius: '4px',
    },
    outOfStockImage: {
        opacity: 0.5,
    },
    outOfStockBadge: {
        position: 'absolute',
        top: '5px',
        right: '5px',
        backgroundColor: '#dc3545',
        color: 'white',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '10px',
        zIndex: 1,
    },
    itemDetails: {
        flex: 1,
    },
    itemName: {
        margin: '0 0 5px 0',
        fontSize: '16px',
    },
    itemPrice: {
        margin: '0 0 10px 0',
        color: '#28a745',
        fontWeight: 'bold',
    },
    quantityControls: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '5px',
    },
    quantityButton: {
        padding: '5px 10px',
        border: '1px solid #ddd',
        background: 'white',
        cursor: 'pointer',
        borderRadius: '4px',
        '&:disabled': {
            opacity: 0.5,
            cursor: 'not-allowed',
        },
    },
    disabledButton: {
        opacity: 0.5,
        cursor: 'not-allowed',
        backgroundColor: '#f5f5f5',
    },
    quantity: {
        padding: '0 10px',
    },
    removeButton: {
        padding: '5px 10px',
        background: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        alignSelf: 'flex-start',
    },
    cartFooter: {
        padding: '20px',
        borderTop: '1px solid #eee',
        backgroundColor: '#f8f9fa',
    },
    total: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '18px',
        fontWeight: 'bold',
        marginBottom: '15px',
    },
    checkoutButton: {
        width: '100%',
        padding: '15px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px',
        '&:disabled': {
            backgroundColor: '#cccccc',
            cursor: 'not-allowed',
        },
    },
    emptyCart: {
        padding: '20px',
        textAlign: 'center',
        color: '#666',
    },
    subtotalText: {
        color: '#28a745',
        fontSize: '14px',
        margin: '5px 0 0 0',
    },
    outOfStockText: {
        color: '#dc3545',
        fontSize: '12px',
        margin: '5px 0 0 0',
    },
};

export default Cart; 