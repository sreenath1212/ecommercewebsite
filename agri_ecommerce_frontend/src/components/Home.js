// src/components/Home.js
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import API from '../api'; // Assuming you might fetch some protected data here later
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import {
    Container,
    Grid,
    Card,
    CardContent,
    CardMedia,
    Typography,
    Button,
    IconButton,
    Box,
    Snackbar,
    Alert,
    CircularProgress,
    TextField,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    ButtonGroup,
    Popover,
    Paper
} from '@mui/material';
import {
    ShoppingCart,
    Favorite,
    FavoriteBorder,
    BookmarkBorder,
    Bookmark,
    Add as AddIcon,
    Remove as RemoveIcon,
    ChevronLeft,
    ChevronRight,
    PlayArrow,
    Pause
} from '@mui/icons-material';
import axios from 'axios';
import YouTube from 'react-youtube';

// --- SafeYouTube Component ---
const SafeYouTube = ({ videoId, opts, onReady, onError, onEnd, style }) => {
        const [iframeError, setIframeError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const maxRetries = 2;
    const playerRef = React.useRef(null);
        const isPlayerReady = React.useRef(false);
        const lastLoadedVideoId = React.useRef(videoId);
    const [initialVideoId] = useState(videoId); // Only set once

    // When videoId changes, use loadVideoById if player is ready
        useEffect(() => {
        if (
            isPlayerReady.current &&
            playerRef.current &&
            videoId !== lastLoadedVideoId.current
        ) {
            try {
                // Reset error state when loading a new video
                setIframeError(false);
                setRetryCount(0);
                playerRef.current.loadVideoById(videoId);
                    lastLoadedVideoId.current = videoId;
            } catch (e) {
                // This might fail if the player is in a bad state
                handleError(e);
            }
            }
        }, [videoId]);

        const handleError = (error) => {
        console.warn('YouTube player error:', error);
        if (retryCount < maxRetries) {
            setRetryCount(prev => prev + 1);
            // Re-render to trigger a retry
            setIframeError(true);
            setTimeout(() => {
                setIframeError(false);
            }, 1000);
        } else {
            setIframeError(true);
            onError?.(error);
        }
        };

        const handleReady = (event) => {
            playerRef.current = event.target;
            setIframeError(false);
        setRetryCount(0);
            isPlayerReady.current = true;
            lastLoadedVideoId.current = videoId;
            onReady?.(event);
        };

    if (iframeError && retryCount >= maxRetries) {
            return (
                <Box
                    sx={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'black', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: 'white', zIndex: 1
                    }}
                >
                    <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6">Video Unavailable</Typography>
                    <Typography variant="body2">This video could not be loaded.</Typography>
                    </Box>
                </Box>
            );
        }

    // Use a key to force remount on failed retries
        return (
            <YouTube
            key={`${initialVideoId}-${retryCount}`}
            videoId={initialVideoId}
                opts={opts}
                style={style}
                onError={handleError}
                onReady={handleReady}
            onEnd={onEnd}
            />
        );
    };

const Home = () => {
    const { user, isAuthenticated } = useAuth();
    const { addToCart, cartItems, updateQuantity } = useCart();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [favorites, setFavorites] = useState([]);
    const [wishlist, setWishlist] = useState([]);
    const token = localStorage.getItem('token');
    const [selectedQuantities, setSelectedQuantities] = useState({});
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);

    // YouTube Video State
    const [playlistVideos, setPlaylistVideos] = useState([]);
    const [playlistLoading, setPlaylistLoading] = useState(true);
    const [playlistError, setPlaylistError] = useState('');
    const [selectedVideoId, setSelectedVideoId] = useState(null);
    const playerRef = useRef(null);

    // YouTube playlist ID
    const playlistId = 'PL_bN8ePGYN5qhe0lvx2hkeg8T0mL8GaNZ';
    const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;

    // Fetch playlist videos from our backend
    useEffect(() => {
        const fetchPlaylistVideos = async () => {
            try {
                setPlaylistLoading(true);
                setPlaylistError('');
                
                const response = await fetch(`http://localhost:5000/api/youtube/playlist/${playlistId}`);
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.message || 'Failed to fetch playlist videos');
                }
                
                if (!data.videos || data.videos.length === 0) {
                    throw new Error('No videos found in the playlist');
                }
                
                setPlaylistVideos(data.videos);
                // Set the first video as the selected one initially
                if (data.videos.length > 0) {
                    setSelectedVideoId(data.videos[0].id);
                }
                
            } catch (error) {
                console.error('Error fetching playlist videos:', error);
                setPlaylistError(error.message || 'Failed to load videos. Check backend API key setup.');
                setPlaylistVideos([]);
            } finally {
                setPlaylistLoading(false);
            }
        };

        fetchPlaylistVideos();
    }, [playlistId]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [productsRes, categoriesRes] = await Promise.all([
                    API.get('/products'),
                    API.get('/categories')
                ]);
                
                // Convert price strings to numbers and ensure all required fields exist
                const processedProducts = productsRes.data.map(product => ({
                    ...product,
                    price: parseFloat(product.price) || 0,
                    name: product.name || 'Unnamed Product',
                    description: product.description || 'No description available',
                    image_url: product.image_url || null // Just store the raw image_url, getProductImage will handle the URL formatting
                }));
                
                console.log('Processed products:', processedProducts);
                setProducts(processedProducts);
                setCategories(categoriesRes.data || []);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching data:", err);
                setError("Failed to load products. Please try again later.");
                setLoading(false);
            }
        };
        fetchData();
        if (token) {
            fetchFavorites();
            fetchWishlist();
        }
    }, [token]);

    const fetchFavorites = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/favorites', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFavorites(response.data.map(item => item.id));
        } catch (error) {
            console.error('Error fetching favorites:', error);
        }
    };

    const fetchWishlist = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/wishlist', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setWishlist(response.data.map(item => item.id));
        } catch (error) {
            console.error('Error fetching wishlist:', error);
        }
    };

    const toggleFavorite = async (productId) => {
        if (!token) {
            showSnackbar('Please login to add to favorites', 'warning');
            return;
        }

        try {
            if (favorites.includes(productId)) {
                await axios.delete(`http://localhost:5000/api/favorites/${productId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setFavorites(favorites.filter(id => id !== productId));
                showSnackbar('Removed from favorites', 'success');
            } else {
                await axios.post('http://localhost:5000/api/favorites', 
                    { productId },
                    { headers: { Authorization: `Bearer ${token}` }}
                );
                setFavorites([...favorites, productId]);
                showSnackbar('Added to favorites', 'success');
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            showSnackbar('Failed to update favorites', 'error');
        }
    };

    const toggleWishlist = async (productId) => {
        if (!token) {
            showSnackbar('Please login to add to wishlist', 'warning');
            return;
        }

        try {
            if (wishlist.includes(productId)) {
                await axios.delete(`http://localhost:5000/api/wishlist/${productId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setWishlist(wishlist.filter(id => id !== productId));
                showSnackbar('Removed from wishlist', 'success');
            } else {
                await axios.post('http://localhost:5000/api/wishlist',
                    { productId },
                    { headers: { Authorization: `Bearer ${token}` }}
                );
                setWishlist([...wishlist, productId]);
                showSnackbar('Added to wishlist', 'success');
            }
        } catch (error) {
            console.error('Error toggling wishlist:', error);
            showSnackbar('Failed to update wishlist', 'error');
        }
    };

    const filteredProducts = products.filter(product => {
        const matchesSearch = (product.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                            (product.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || product.category_id === parseInt(selectedCategory);
        return matchesSearch && matchesCategory;
    });

    const handleQuantityChange = (productId, delta) => {
        setSelectedQuantities(prev => ({
            ...prev,
            [productId]: Math.max(1, (prev[productId] || 1) + delta)
        }));
    };

    const getCartItemQuantity = (productId) => {
        const cartItem = cartItems.find(item => item.product_id === productId);
        return cartItem ? cartItem.quantity : 0;
    };

    const handleAddToCart = async (e, product) => {
        e.stopPropagation(); // Prevent navigation when clicking the Add to Cart button
        
        if (!isAuthenticated) {
            showSnackbar('Please login to add items to cart', 'warning');
            return;
        }

        if (product.stock <= 0) {
            showSnackbar('This product is out of stock', 'error');
            return;
        }

        const quantity = selectedQuantities[product.id] || 1;
        
        try {
            const result = await addToCart(product, quantity);
            if (result.success) {
                showSnackbar(`Added ${quantity} ${quantity === 1 ? 'item' : 'items'} to cart`, 'success');
                // Reset quantity after adding to cart
                setSelectedQuantities(prev => ({
                    ...prev,
                    [product.id]: 1
                }));
            } else {
                showSnackbar(result.message || 'Failed to add item to cart', 'error');
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            showSnackbar('Failed to add item to cart', 'error');
        }
    };

    const handleCartPreview = (event, product) => {
        event.stopPropagation();
        setSelectedProduct(product);
        setAnchorEl(event.currentTarget);
    };

    const handleCloseCartPreview = () => {
        setAnchorEl(null);
        setSelectedProduct(null);
    };

    const handleProductClick = (productId) => {
        navigate(`/product/${productId}`);
    };

    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const getStockStatusText = (stock) => {
        if (stock <= 0) return 'Out of Stock';
        if (stock < 10) return `Low Stock (${stock} left)`;
        return `In Stock (${stock} available)`;
    };

    const getStockStatusColor = (stock) => {
        if (stock <= 0) return 'error.main';
        if (stock < 10) return 'warning.main';
        return 'success.main';
    };

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

    const truncateText = (text, maxLength) => {
        if (!text || text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + '...';
    };

    // New Hero Carousel for YouTube Videos
    const HeroCarousel = () => {
        const [currentIndex, setCurrentIndex] = useState(0);
        const [videoLoading, setVideoLoading] = useState(false);
        const [isPlaying, setIsPlaying] = useState(false);

        const goToPrevious = () => {
            const isFirstSlide = currentIndex === 0;
            const newIndex = isFirstSlide ? playlistVideos.length - 1 : currentIndex - 1;
            setCurrentIndex(newIndex);
            setIsPlaying(false);
    };

        const goToNext = () => {
            const isLastSlide = currentIndex === playlistVideos.length - 1;
            const newIndex = isLastSlide ? 0 : currentIndex + 1;
            setCurrentIndex(newIndex);
            setIsPlaying(false);
        };
        
    useEffect(() => {
            // Only auto-advance thumbnails if the user is not actively playing a video
            if (playlistVideos.length > 0 && !isPlaying) {
                const timer = setTimeout(() => {
                    goToNext();
                }, 8000); // Auto-advance every 8 seconds
                return () => clearTimeout(timer);
            }
        }, [currentIndex, playlistVideos.length, isPlaying]);


        if (playlistLoading) {
            return (
                <Box sx={{ height: { xs: 200, sm: 300, md: 400 }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CircularProgress />
                </Box>
            );
        }

        if (playlistError || playlistVideos.length === 0) {
            // Don't render a broken component, you could show a fallback banner here
            return null; 
        }

        const currentVideo = playlistVideos[currentIndex];
        
        const playerOpts = {
            height: '100%',
            width: '100%',
            playerVars: {
                autoplay: 1, // Autoplay when the component mounts
                controls: 1,
                rel: 0,
                modestbranding: 1,
                mute: 1,
                loop: 1,
                playlist: currentVideo.id
            },
        };

        return (
            <Box sx={{ 
                position: 'relative', 
                height: { xs: '25vh', sm: '31vh', md: '38vh', lg: '44vh' }, 
                maxHeight: '450px',
                width: '100vw', 
                overflow: 'hidden', 
                backgroundColor: 'black',
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundImage: `url(${currentVideo.thumbnail})`
            }}>
                {isPlaying ? (
                        <SafeYouTube
                            videoId={currentVideo.id}
                            opts={playerOpts}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                        onReady={() => setVideoLoading(false)}
                        onError={() => {
                            setIsPlaying(false); // Fallback to thumbnail on error
                            setVideoLoading(false);
                        }}
                        onEnd={() => setIsPlaying(false)} // Revert to thumbnail when video ends
                    />
                ) : (
                    // Play button overlay
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <IconButton
                            onClick={() => setIsPlaying(true)}
                                sx={{
                                width: { xs: 60, md: 80 },
                                height: { xs: 60, md: 80 },
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' }
                                }}
                            >
                            <PlayArrow sx={{ fontSize: { xs: 40, md: 60 }, color: 'white' }} />
                        </IconButton>
                                </Box>
                )}
                
                {videoLoading && isPlaying && (
                    <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1 }}>
                        <CircularProgress color="inherit" />
                    </Box>
                )}

                {!isPlaying && (
                    <>
                        <Box sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0) 100%)',
                            zIndex: 2,
                            pointerEvents: 'none'
                        }} />

                        <Box sx={{ position: 'absolute', top: '15%', left: '5%', color: 'white', zIndex: 3, maxWidth: '50%', pointerEvents: 'none' }}>
                            <Typography variant="h2" component="h2" sx={{ fontWeight: 700, fontSize: { xs: '1.2rem', sm: '1.8rem', md: '2.2rem' } }}>
                                {currentVideo.title}
                            </Typography>
                            <Typography variant="body1" sx={{ display: { xs: 'none', md: 'block' } }}>
                                {truncateText(currentVideo.description, 150)}
                            </Typography>
                        </Box>
                    </>
                )}
                
                {/* Navigation Arrows */}
                <IconButton onClick={goToPrevious} sx={{ position: 'absolute', top: '50%', left: 16, transform: 'translateY(-50%)', zIndex: 3, color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', '&:hover': {backgroundColor: 'rgba(0,0,0,0.8)'} }}>
                    <ChevronLeft fontSize="large" />
                            </IconButton>
                <IconButton onClick={goToNext} sx={{ position: 'absolute', top: '50%', right: 16, transform: 'translateY(-50%)', zIndex: 3, color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', '&:hover': {backgroundColor: 'rgba(0,0,0,0.8)'} }}>
                    <ChevronRight fontSize="large" />
                            </IconButton>
            </Box>
        );
    };

    if (loading) return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
            <CircularProgress />
        </Box>
    );
    if (error) return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="error">{error}</Typography>
        </Container>
    );

    return (
        <>
            <HeroCarousel />
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {/* Product Section Header */}
                <Box sx={{ mb: 2, mt: 4, borderTop: '1px solid #ddd', pt: 4 }}>
                <Typography variant="h4" component="h2" sx={{ mb: 2, textAlign: 'center', color: 'primary.main', fontWeight: 700 }}>
                    Explore Our Products
                </Typography>
            </Box>

            {/* Filters */}
            <Box sx={{ mb: 3 }}>
                <Grid container spacing={2} justifyContent="center">
                        <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Search products"
                            variant="outlined"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </Grid>
                        <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Category</InputLabel>
                            <Select
                                value={selectedCategory}
                                label="Category"
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <MenuItem value="all">All Categories</MenuItem>
                                {categories.map((category) => (
                                    <MenuItem key={category.id} value={category.id}>
                                        {category.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Box>

            {/* Product Grid */}
            <Box sx={{ minHeight: '60vh' }}>
                <Grid container spacing={3}>
                    {filteredProducts.map((product) => (
                            <Grid item key={product.id} xs={12} sm={6} md={4} lg={3}>
                            <Card 
                                sx={{ 
                                    height: '100%', 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                        position: 'relative',
                                        cursor: 'pointer'
                                }}
                                onClick={() => handleProductClick(product.id)}
                            >
                                {product.stock <= 0 && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: '10px',
                                            right: '10px',
                                            backgroundColor: 'error.main',
                                            color: 'white',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            zIndex: 1,
                                        }}
                                    >
                                        Out of Stock
                                    </Box>
                                )}
                                <CardMedia
                                    component="img"
                                    height="200"
                                    image={getProductImage(product.image_url)}
                                    alt={product.name}
                                    sx={{
                                        objectFit: 'cover',
                                        ...(product.stock <= 0 && {
                                            opacity: 0.5,
                                        })
                                    }}
                                />
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Typography gutterBottom variant="h6" component="h2">
                                        {product.name}
                                    </Typography>
                                    <Typography color="text.secondary" paragraph>
                                        {product.description}
                                    </Typography>
                                    <Typography variant="h6" color="primary">
                                        ₹{product.price.toFixed(2)}
                                    </Typography>
                                    <Typography 
                                        variant="body2" 
                                        color={getStockStatusColor(product.stock)}
                                        sx={{ mt: 1 }}
                                    >
                                        {getStockStatusText(product.stock)}
                                    </Typography>
                                </CardContent>
                                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <ButtonGroup size="small" aria-label="quantity controls">
                                            <Button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleQuantityChange(product.id, -1);
                                                }}
                                                disabled={product.stock <= 0 || (selectedQuantities[product.id] || 1) <= 1}
                                            >
                                                <RemoveIcon fontSize="small" />
                                            </Button>
                                            <Button
                                                sx={{ minWidth: '40px' }}
                                                disableRipple
                                            >
                                                {selectedQuantities[product.id] || 1}
                                            </Button>
                                            <Button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleQuantityChange(product.id, 1);
                                                }}
                                                disabled={product.stock <= 0 || (selectedQuantities[product.id] || 1) >= product.stock}
                                            >
                                                <AddIcon fontSize="small" />
                                            </Button>
                                        </ButtonGroup>
                                        {getCartItemQuantity(product.id) > 0 && (
                                            <Button
                                                size="small"
                                                onClick={(e) => handleCartPreview(e, product)}
                                                sx={{ ml: 'auto' }}
                                            >
                                                In Cart: {getCartItemQuantity(product.id)}
                                            </Button>
                                        )}
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            startIcon={<ShoppingCart />}
                                            onClick={(e) => handleAddToCart(e, product)}
                                            disabled={product.stock <= 0}
                                            sx={{
                                                flex: 1,
                                                mr: 1,
                                                ...(product.stock <= 0 && {
                                                    backgroundColor: 'grey.300',
                                                    '&:hover': {
                                                        backgroundColor: 'grey.400',
                                                    }
                                                })
                                            }}
                                        >
                                            {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                                        </Button>
                                        <Box>
                                            <IconButton
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleFavorite(product.id);
                                                }}
                                                color="primary"
                                            >
                                                {favorites.includes(product.id) ? <Favorite /> : <FavoriteBorder />}
                                            </IconButton>
                                            <IconButton
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleWishlist(product.id);
                                                }}
                                                color="primary"
                                            >
                                                {wishlist.includes(product.id) ? <Bookmark /> : <BookmarkBorder />}
                                            </IconButton>
                                        </Box>
                                    </Box>
                                </Box>
                            </Card>
                        </Grid>
                    ))}
                    {filteredProducts.length === 0 && (
                            <Grid item xs={12}>
                            <Box 
                                sx={{ 
                                    textAlign: 'center', 
                                    py: 4,
                                    bgcolor: 'background.paper',
                                    borderRadius: 1
                                }}
                            >
                                <Typography variant="h6" color="text.secondary">
                                    No products found
                                </Typography>
                            </Box>
                        </Grid>
                    )}
                </Grid>
            </Box>

            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handleCloseCartPreview}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                }}
            >
                {selectedProduct && (
                    <Box sx={{ p: 2, maxWidth: 300 }}>
                        <Typography variant="h6" gutterBottom>
                            Cart Preview
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <img
                                src={getProductImage(selectedProduct.image_url)}
                                alt={selectedProduct.name}
                                style={{ width: 50, height: 50, objectFit: 'cover' }}
                            />
                            <Box>
                                <Typography variant="subtitle1">
                                    {selectedProduct.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Quantity in cart: {getCartItemQuantity(selectedProduct.id)}
                                </Typography>
                            </Box>
                        </Box>
                        <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            onClick={() => {
                                navigate('/cart');
                                handleCloseCartPreview();
                            }}
                        >
                            View Cart
                        </Button>
                    </Box>
                )}
            </Popover>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
        </>
    );
};

export default Home;