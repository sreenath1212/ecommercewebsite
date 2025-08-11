import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import {
    Container,
    Grid,
    Paper,
    Typography,
    Button,
    Box,
    ButtonGroup,
    Snackbar,
    Alert,
    CircularProgress,
    ImageList,
    ImageListItem,
    Dialog,
    DialogContent,
    IconButton,
    Card,
    CardContent,
    CardMedia,
    Chip,
    Divider,
    Tooltip
} from '@mui/material';
import {
    ShoppingCart,
    Add as AddIcon,
    Remove as RemoveIcon,
    Close as CloseIcon,
    ZoomIn as ZoomInIcon,
    LocalShipping,
    Warning,
    Error
} from '@mui/icons-material';

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart, cartItems } = useCart();
    const { isAuthenticated } = useAuth();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [selectedImage, setSelectedImage] = useState(null);
    const [zoomDialogOpen, setZoomDialogOpen] = useState(false);
    const [recommendations, setRecommendations] = useState([]);
    const [cartSummary, setCartSummary] = useState(null);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await API.get(`/products/${id}`);
                const productData = {
                    ...response.data,
                    price: parseFloat(response.data.price) || 0,
                    stock: parseInt(response.data.stock) || 0
                };
                setProduct(productData);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching product:', err);
                setError('Failed to load product details');
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id]);

    const handleQuantityChange = (delta) => {
        if (!product) return;
        setQuantity(prev => Math.max(1, Math.min(prev + delta, product.stock || 99)));
    };

    const handleAddToCart = async () => {
        if (!isAuthenticated) {
            showSnackbar('Please login to add items to cart', 'warning');
            return;
        }

        if (!product || product.stock <= 0) {
            showSnackbar('This product is out of stock', 'error');
            return;
        }

        try {
            const result = await addToCart(product, quantity);
            if (result.success) {
                setCartSummary(result.cart_summary);
                setRecommendations(result.recommendations || []);
                showSnackbar(`Added ${quantity} ${quantity === 1 ? 'item' : 'items'} to cart`, 'success');
                setQuantity(1);
            } else {
                showSnackbar(result.message || 'Failed to add item to cart', 'error');
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            showSnackbar('Failed to add item to cart', 'error');
        }
    };

    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const getProductImage = (imageUrl) => {
        if (!imageUrl) return '/images/placeholder.png';
        
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            return imageUrl;
        }
        
        if (imageUrl.startsWith('/')) {
            return `http://localhost:5000${imageUrl}`;
        }
        
        return imageUrl;
    };

    const getProductImages = () => {
        if (!product) return ['/images/placeholder.png'];
        
        const images = [];
        
        if (product.image_url) {
            images.push(getProductImage(product.image_url));
        }
        
        if (product.additional_images && Array.isArray(product.additional_images)) {
            product.additional_images.forEach(img => {
                if (img) images.push(getProductImage(img));
            });
        }
        
        return images.length > 0 ? images : ['/images/placeholder.png'];
    };

    const handleImageClick = (image) => {
        if (!image) return;
        setSelectedImage(image);
        setZoomDialogOpen(true);
    };

    const getStockStatusChip = (stock) => {
        if (stock <= 0) {
            return (
                <Chip
                    icon={<Error />}
                    label="Out of Stock"
                    color="error"
                    size="small"
                    sx={{ ml: 1 }}
                />
            );
        }
        if (stock < 5) {
            return (
                <Chip
                    icon={<Warning />}
                    label={`Only ${stock} left`}
                    color="warning"
                    size="small"
                    sx={{ ml: 1 }}
                />
            );
        }
        return (
            <Chip
                icon={<LocalShipping />}
                label="In Stock"
                color="success"
                size="small"
                sx={{ ml: 1 }}
            />
        );
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <CircularProgress />
            </Box>
        );
    }

    if (error || !product) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="h6" color="error">
                        {error || 'Product not found'}
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => navigate('/home')}
                        sx={{ mt: 2 }}
                    >
                        Back to Home
                    </Button>
                </Paper>
            </Container>
        );
    }

    const images = getProductImages();

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Grid container spacing={4}>
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3 }}>
                        <Grid container spacing={4}>
                            <Grid item xs={12} md={6}>
                                <Box sx={{ mb: 2 }}>
                                    <Box
                                        sx={{
                                            position: 'relative',
                                            width: '100%',
                                            paddingTop: '100%',
                                            backgroundColor: 'grey.100',
                                            borderRadius: 1,
                                            overflow: 'hidden',
                                            cursor: 'zoom-in'
                                        }}
                                        onClick={() => handleImageClick(images[0])}
                                    >
                                        <img
                                            src={images[0]}
                                            alt={product.name}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover'
                                            }}
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = '/images/placeholder.png';
                                            }}
                                        />
                                    </Box>
                                </Box>
                                {images.length > 1 && (
                                    <ImageList sx={{ width: '100%', height: 100 }} cols={4} rowHeight={100}>
                                        {images.map((image, index) => (
                                            <ImageListItem 
                                                key={index}
                                                sx={{ 
                                                    cursor: 'pointer',
                                                    border: selectedImage === image ? '2px solid primary.main' : 'none',
                                                    borderRadius: 1,
                                                    overflow: 'hidden'
                                                }}
                                                onClick={() => handleImageClick(image)}
                                            >
                                                <img
                                                    src={image}
                                                    alt={`${product.name} - ${index + 1}`}
                                                    loading="lazy"
                                                    style={{ objectFit: 'cover' }}
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = '/images/placeholder.png';
                                                    }}
                                                />
                                            </ImageListItem>
                                        ))}
                                    </ImageList>
                                )}
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Typography variant="h4" gutterBottom>
                                    {product.name}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h5" color="primary">
                                        ₹{product.price.toFixed(2)}
                                    </Typography>
                                    {getStockStatusChip(product.stock)}
                                </Box>
                                <Typography variant="body1" color="text.secondary" paragraph>
                                    {product.description}
                                </Typography>
                                
                                <Box sx={{ mt: 4 }}>
                                    <Box sx={{ mb: 2 }}>
                                        <ButtonGroup size="large" disabled={product.stock <= 0}>
                                            <Button
                                                onClick={() => handleQuantityChange(-1)}
                                                disabled={quantity <= 1}
                                            >
                                                <RemoveIcon />
                                            </Button>
                                            <Button
                                                sx={{ minWidth: '60px' }}
                                                disableRipple
                                            >
                                                {quantity}
                                            </Button>
                                            <Button
                                                onClick={() => handleQuantityChange(1)}
                                                disabled={quantity >= product.stock}
                                            >
                                                <AddIcon />
                                            </Button>
                                        </ButtonGroup>
                                    </Box>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                        startIcon={<ShoppingCart />}
                                        onClick={handleAddToCart}
                                        disabled={product.stock <= 0}
                                        fullWidth
                                        sx={{ height: '50px' }}
                                    >
                                        {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                                    </Button>
                                </Box>

                                {cartSummary && (
                                    <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                        <Typography variant="subtitle1" gutterBottom>
                                            Cart Summary
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Total Items: {cartSummary.total_items}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Total Amount: ₹{cartSummary.total_amount?.toFixed(2)}
                                        </Typography>
                                        {cartSummary.delivery_estimate && (
                                            <Typography variant="body2" color="text.secondary">
                                                Estimated Delivery: {formatDate(cartSummary.delivery_estimate)}
                                            </Typography>
                                        )}
                                    </Box>
                                )}
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>

                {recommendations.length > 0 && (
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                Similar Products
                            </Typography>
                            <Grid container spacing={2}>
                                {recommendations.map((item) => (
                                    <Grid item xs={12} key={item.id}>
                                        <Card 
                                            sx={{ 
                                                cursor: 'pointer',
                                                '&:hover': { boxShadow: 3 }
                                            }}
                                            onClick={() => navigate(`/product/${item.id}`)}
                                        >
                                            <CardMedia
                                                component="img"
                                                height="140"
                                                image={getProductImage(item.image_url)}
                                                alt={item.name}
                                            />
                                            <CardContent>
                                                <Typography variant="subtitle1" noWrap>
                                                    {item.name}
                                                </Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                                    <Typography variant="h6" color="primary">
                                                        ₹{item.price.toFixed(2)}
                                                    </Typography>
                                                    {getStockStatusChip(item.stock)}
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Paper>
                    </Grid>
                )}
            </Grid>

            <Dialog
                open={zoomDialogOpen}
                onClose={() => setZoomDialogOpen(false)}
                maxWidth="lg"
                fullWidth
            >
                <DialogContent sx={{ position: 'relative', p: 0 }}>
                    <IconButton
                        onClick={() => setZoomDialogOpen(false)}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: 'white',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            },
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                    <img
                        src={selectedImage}
                        alt={product?.name}
                        style={{
                            width: '100%',
                            height: 'auto',
                            maxHeight: '90vh',
                            objectFit: 'contain',
                        }}
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/images/placeholder.png';
                        }}
                    />
                </DialogContent>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default ProductDetail; 