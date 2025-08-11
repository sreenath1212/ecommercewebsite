import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../api';

const CartContext = createContext();

export const useCart = () => {
    return useContext(CartContext);
};

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch cart from backend when component mounts
    useEffect(() => {
        fetchCart();
    }, []);

    const fetchCart = async () => {
        try {
            const response = await API.cartAPI.getCart();
            setCartItems(response.data.items || []);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching cart:', err);
            setError('Failed to fetch cart');
            setLoading(false);
        }
    };

    const addToCart = async (product, quantity = 1) => {
        try {
            // Call the backend API to add or update the item
            const { data } = await API.cartAPI.addToCart(product.id, quantity);

            if (data.item) {
                // Update the local cart state with the item returned from the backend
                setCartItems(prevItems => {
                    const itemExists = prevItems.some(item => item.product_id === data.item.product_id);

                    if (itemExists) {
                        // If the item already exists in the cart, update it
                        return prevItems.map(item =>
                            item.product_id === data.item.product_id ? data.item : item
                        );
                    } else {
                        // If it's a new item, add it to the cart
                        return [...prevItems, data.item];
                    }
                });
            }

            return { success: true, message: data.message };
        } catch (err) {
            console.error('Error adding to cart:', err);
            return {
                success: false,
                message: err.response?.data?.message || 'Failed to add item to cart'
            };
        }
    };

    const removeFromCart = async (itemId) => {
        try {
            await API.cartAPI.removeFromCart(itemId);
            setCartItems(prevItems => prevItems.filter(item => item.cart_item_id !== itemId));
            return { success: true, message: 'Item removed from cart' };
        } catch (err) {
            console.error('Error removing from cart:', err);
            return { 
                success: false, 
                message: err.response?.data?.message || 'Failed to remove item from cart' 
            };
        }
    };

    const updateQuantity = async (itemId, quantity) => {
        if (quantity < 1) return { success: false, message: 'Quantity must be at least 1' };
        
        try {
            const response = await API.cartAPI.updateCartItem(itemId, quantity);
            if (response.data.item) {
                setCartItems(prevItems =>
                    prevItems.map(item =>
                        item.cart_item_id === itemId ? response.data.item : item
                    )
                );
            }
            return { success: true, message: response.data.message };
        } catch (err) {
            console.error('Error updating cart quantity:', err);
            return { 
                success: false, 
                message: err.response?.data?.message || 'Failed to update quantity' 
            };
        }
    };

    const clearCart = async () => {
        try {
            await API.cartAPI.clearCart();
            setCartItems([]);
            return { success: true, message: 'Cart cleared' };
        } catch (err) {
            console.error('Error clearing cart:', err);
            return { 
                success: false, 
                message: err.response?.data?.message || 'Failed to clear cart' 
            };
        }
    };

    const checkout = async (shippingAddressId = null) => {
        try {
            const { data } = await API.cartAPI.checkout(shippingAddressId);
            
            // Clear cart items after successful checkout
            setCartItems([]);
            
            return { 
                success: true, 
                message: data.message,
                orderId: data.orderId,
                totalAmount: data.totalAmount,
                orderItems: data.orderItems
            };
        } catch (err) {
            console.error('Error during checkout:', err);
            
            // Handle stock insufficiency
            if (err.response?.data?.type === 'stock_insufficient') {
                return {
                    success: false,
                    message: err.response.data.message,
                    stockIssues: err.response.data.stockIssues,
                    type: 'stock_insufficient'
                };
            }
            
            return {
                success: false,
                message: err.response?.data?.message || 'Failed to process checkout'
            };
        }
    };

    const getCartTotal = () => {
        return cartItems.reduce((total, item) => {
            if (item.stock <= 0) return total; // Skip out-of-stock items
            const price = parseFloat(item.price) || 0;
            return total + (price * item.quantity);
        }, 0);
    };

    const getCartItemsCount = () => {
        return cartItems.reduce((total, item) => {
            if (item.stock <= 0) return total; // Skip out-of-stock items
            return total + item.quantity;
        }, 0);
    };

    const value = {
        cartItems,
        loading,
        error,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        checkout,
        getCartTotal,
        getCartItemsCount,
        refreshCart: fetchCart,
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
}; 