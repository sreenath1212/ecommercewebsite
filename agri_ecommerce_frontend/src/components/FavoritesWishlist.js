import React, { useState, useEffect } from 'react';
import {
    Container,
    Grid,
    Card,
    CardContent,
    CardMedia,
    Typography,
    IconButton,
    Tabs,
    Tab,
    Box,
    Button,
    Snackbar,
    Alert
} from '@mui/material';
import {
    Favorite,
    FavoriteBorder,
    ShoppingCart,
    Delete
} from '@mui/icons-material';
import axios from 'axios';

function FavoritesWishlist() {
    const [activeTab, setActiveTab] = useState(0);
    const [favorites, setFavorites] = useState([]);
    const [wishlist, setWishlist] = useState([]);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchFavorites();
        fetchWishlist();
    }, []);

    const fetchFavorites = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/favorites', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFavorites(response.data);
        } catch (error) {
            console.error('Error fetching favorites:', error);
            showSnackbar('Failed to fetch favorites', 'error');
        }
    };

    const fetchWishlist = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/wishlist', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setWishlist(response.data);
        } catch (error) {
            console.error('Error fetching wishlist:', error);
            showSnackbar('Failed to fetch wishlist', 'error');
        }
    };

    const removeFromFavorites = async (productId) => {
        try {
            await axios.delete(`http://localhost:5000/api/favorites/${productId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchFavorites();
            showSnackbar('Removed from favorites', 'success');
        } catch (error) {
            console.error('Error removing from favorites:', error);
            showSnackbar('Failed to remove from favorites', 'error');
        }
    };

    const removeFromWishlist = async (productId) => {
        try {
            await axios.delete(`http://localhost:5000/api/wishlist/${productId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchWishlist();
            showSnackbar('Removed from wishlist', 'success');
        } catch (error) {
            console.error('Error removing from wishlist:', error);
            showSnackbar('Failed to remove from wishlist', 'error');
        }
    };

    const addToCart = async (product) => {
        // Implement add to cart functionality
        showSnackbar('Added to cart', 'success');
    };

    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const renderProductCard = (product, isFavorite = true) => (
        <Grid item xs={12} sm={6} md={4} key={product.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                    component="img"
                    height="200"
                    image={product.image_url || 'https://via.placeholder.com/200'}
                    alt={product.name}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                    <Typography gutterBottom variant="h6" component="div">
                        {product.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {product.description}
                    </Typography>
                    <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
                        ₹{product.price}
                    </Typography>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Button
                            variant="contained"
                            startIcon={<ShoppingCart />}
                            onClick={() => addToCart(product)}
                        >
                            Add to Cart
                        </Button>
                        <IconButton
                            onClick={() => isFavorite ? removeFromFavorites(product.id) : removeFromWishlist(product.id)}
                            color="error"
                        >
                            <Delete />
                        </IconButton>
                    </Box>
                </CardContent>
            </Card>
        </Grid>
    );

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={activeTab} onChange={handleTabChange} centered>
                    <Tab label="Favorites" />
                    <Tab label="Wishlist" />
                </Tabs>
            </Box>

            {activeTab === 0 && (
                <Grid container spacing={3}>
                    {favorites.length === 0 ? (
                        <Grid item xs={12}>
                            <Typography variant="h6" align="center">
                                No favorites yet
                            </Typography>
                        </Grid>
                    ) : (
                        favorites.map(product => renderProductCard(product, true))
                    )}
                </Grid>
            )}

            {activeTab === 1 && (
                <Grid container spacing={3}>
                    {wishlist.length === 0 ? (
                        <Grid item xs={12}>
                            <Typography variant="h6" align="center">
                                No items in wishlist
                            </Typography>
                        </Grid>
                    ) : (
                        wishlist.map(product => renderProductCard(product, false))
                    )}
                </Grid>
            )}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}

export default FavoritesWishlist; 