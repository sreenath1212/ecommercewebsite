import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import {
    Container,
    Paper,
    Typography,
    Box,
    Grid,
    Card,
    CardContent,
    Divider,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    CircularProgress,
    Stepper,
    Step,
    StepLabel,
    Checkbox,
    FormControlLabel
} from '@mui/material';
import { ArrowBack, ShoppingCart, Payment, LocalShipping } from '@mui/icons-material';

const steps = ['Cart Review', 'Shipping Details', 'Payment'];

const Checkout = () => {
    const { cartItems, removeFromCart, updateQuantity, getCartTotal, checkout } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [activeStep, setActiveStep] = useState(0);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [checkoutError, setCheckoutError] = useState(null);
    const [stockIssues, setStockIssues] = useState([]);
    const [showStockDialog, setShowStockDialog] = useState(false);
    const [saveAddress, setSaveAddress] = useState(false);
    const [userAddresses, setUserAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    
    // Edit mode states for user details
    const [editNameMode, setEditNameMode] = useState(false);
    const [editPhoneMode, setEditPhoneMode] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhoneNumber, setNewPhoneNumber] = useState('');
    
    // Form states
    const [shippingDetails, setShippingDetails] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: user?.phone || '',
        house_name: '',
        area_street_sector_village: '',
        landmark: '',
        town_city: '',
        state: '',
        pincode: ''
    });

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

    // Add the same image handling function as in other components
    const getProductImage = (imageUrl) => {
        const defaultImage = '/images/placeholder.png';
        
        if (!imageUrl) return defaultImage;
        
        if (imageUrl.startsWith('/')) {
            return `http://localhost:5000${imageUrl}`;
        }
        
        return imageUrl;
    };

    // Handle form input changes
    const handleInputChange = (field, value) => {
        setShippingDetails(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Handle next step
    const handleNext = () => {
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
    };

    // Handle back step
    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    // Handle checkout process
    const handleCheckout = async () => {
        setIsCheckingOut(true);
        setCheckoutError(null);
        setStockIssues([]);

        try {
            // Save address if checkbox is checked
            if (saveAddress) {
                await saveShippingAddress();
            }

            const result = await checkout();
            
            if (result.success) {
                // Show success message and redirect
                alert(`Order placed successfully! Order ID: ${result.orderId}`);
                navigate('/');
            } else if (result.type === 'stock_insufficient') {
                // Show stock issues dialog
                setStockIssues(result.stockIssues);
                setShowStockDialog(true);
            } else {
                setCheckoutError(result.message);
            }
        } catch (error) {
            setCheckoutError('An unexpected error occurred during checkout');
        } finally {
            setIsCheckingOut(false);
        }
    };

    // Save shipping address to user's profile
    const saveShippingAddress = async () => {
        try {
            const addressData = {
                house_name: shippingDetails.house_name,
                area_street_sector_village: shippingDetails.area_street_sector_village,
                landmark: shippingDetails.landmark,
                pincode: shippingDetails.pincode,
                town_city: shippingDetails.town_city,
                state: shippingDetails.state
            };

            await API.post('/addresses', addressData);
        } catch (error) {
            console.error('Failed to save address:', error);
            // Don't block checkout if address saving fails
        }
    };

    // Redirect if cart is empty
    useEffect(() => {
        if (cartItems.length === 0) {
            navigate('/');
        }
    }, [cartItems.length, navigate]);

    // Pre-fill shipping details with user information
    useEffect(() => {
        if (user) {
            // Load user profile data from API
            loadUserProfile();
            // Load user's saved addresses
            loadUserAddresses();
        }
    }, [user]);

    // Load user's saved addresses
    const loadUserAddresses = async () => {
        try {
            const response = await API.get('/addresses');
            const addresses = response.data || [];
            setUserAddresses(addresses);
            
            // Find and set the default address
            const defaultAddress = addresses.find(addr => addr.is_default === true);
            if (defaultAddress) {
                setSelectedAddressId(defaultAddress.id);
                setShippingDetails(prev => ({
                    ...prev,
                    house_name: defaultAddress.house_name || '',
                    area_street_sector_village: defaultAddress.area_street_sector_village || '',
                    landmark: defaultAddress.landmark || '',
                    town_city: defaultAddress.town_city || '',
                    state: defaultAddress.state || '',
                    pincode: defaultAddress.pincode || ''
                }));
            }
        } catch (error) {
            console.error('Failed to load addresses:', error);
        }
    };

    // Load user profile data
    const loadUserProfile = async () => {
        try {
            const response = await API.get('user/profile');
            const userProfile = response.data;
            
            // Split user's full name into first and last name
            const nameParts = userProfile.name ? userProfile.name.split(' ') : ['', ''];
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            setShippingDetails(prev => ({
                ...prev,
                firstName: firstName,
                lastName: lastName,
                email: userProfile.email || '',
                phone: userProfile.phone_number || ''
            }));
        } catch (error) {
            console.error('Failed to load user profile:', error);
        }
    };

    // Handle address selection from dropdown
    const handleAddressSelect = (addressId) => {
        setSelectedAddressId(addressId);
        if (addressId) {
            const selectedAddress = userAddresses.find(addr => addr.id === addressId);
            if (selectedAddress) {
                setShippingDetails(prev => ({
                    ...prev,
                    house_name: selectedAddress.house_name || '',
                    area_street_sector_village: selectedAddress.area_street_sector_village || '',
                    landmark: selectedAddress.landmark || '',
                    town_city: selectedAddress.town_city || '',
                    state: selectedAddress.state || '',
                    pincode: selectedAddress.pincode || ''
                }));
            }
            // Reset save address checkbox when a saved address is selected
            setSaveAddress(false);
        } else {
            // Clear address fields when "Enter new address" is selected
            setShippingDetails(prev => ({
                ...prev,
                house_name: '',
                area_street_sector_village: '',
                landmark: '',
                town_city: '',
                state: '',
                pincode: ''
            }));
            // Reset save address checkbox when entering new address
            setSaveAddress(false);
        }
    };

    // Handle profile updates
    const handleProfileUpdate = async (fieldToUpdate) => {
        let payload = {};
        if (fieldToUpdate === 'name') {
            if (newName.trim() === '') {
                alert('Name cannot be empty.');
                return;
            }
            payload.name = newName.trim();
        } else if (fieldToUpdate === 'phoneNumber') {
            if (newPhoneNumber !== '' && !/^\d{10,15}$/.test(newPhoneNumber)) {
                alert('Invalid phone number format. Must be 10-15 digits or empty.');
                return;
            }
            payload.phone_number = newPhoneNumber === '' ? null : newPhoneNumber;
        }

        try {
            const response = await API.put('user/profile', payload);
            const updatedUser = response.data.user;
            
            // Update shipping details with new data
            const nameParts = updatedUser.name ? updatedUser.name.split(' ') : ['', ''];
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            setShippingDetails(prev => ({
                ...prev,
                firstName: firstName,
                lastName: lastName,
                phone: updatedUser.phone_number || ''
            }));

            // Exit edit mode
            if (fieldToUpdate === 'name') {
                setEditNameMode(false);
            } else if (fieldToUpdate === 'phoneNumber') {
                setEditPhoneMode(false);
            }
        } catch (err) {
            console.error("Error updating profile:", err);
            alert(err.response?.data?.message || "Failed to update profile.");
        }
    };

    if (cartItems.length === 0) {
        return null;
    }

    const renderCartReview = () => (
        <Box>
            <Typography variant="h6" gutterBottom>
                Review Your Cart ({getAvailableItemsCount()} items)
            </Typography>
            
            {getOutOfStockItemsCount() > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    {getOutOfStockItemsCount()} item(s) are out of stock and excluded from total
                </Alert>
            )}

            {cartItems.map(item => (
                <Card key={item.cart_item_id} sx={{ mb: 2 }}>
                    <CardContent>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={2}>
                                <img 
                                    src={getProductImage(item.image_url)} 
                                    alt={item.name} 
                                    style={{
                                        width: '100%',
                                        height: '80px',
                                        objectFit: 'cover',
                                        borderRadius: '4px',
                                        opacity: item.stock <= 0 ? 0.5 : 1
                                    }}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = '/images/placeholder.png';
                                    }}
                                />
                            </Grid>
                            <Grid item xs={4}>
                                <Typography variant="h6">{item.name}</Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {item.category_name}
                                </Typography>
                                {item.stock <= 0 && (
                                    <Typography variant="body2" color="error">
                                        Out of Stock
                                    </Typography>
                                )}
                            </Grid>
                            <Grid item xs={2}>
                                <Typography variant="h6">₹{formatPrice(item.price)}</Typography>
                            </Grid>
                            <Grid item xs={2}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Button
                                        size="small"
                                        onClick={() => updateQuantity(item.cart_item_id, item.quantity - 1)}
                                        disabled={item.quantity <= 1 || item.stock <= 0}
                                    >
                                        -
                                    </Button>
                                    <Typography>{item.quantity}</Typography>
                                    <Button
                                        size="small"
                                        onClick={() => updateQuantity(item.cart_item_id, item.quantity + 1)}
                                        disabled={item.quantity >= (item.stock || 99) || item.stock <= 0}
                                    >
                                        +
                                    </Button>
                                </Box>
                            </Grid>
                            <Grid item xs={1}>
                                <Typography variant="h6">₹{formatPrice(getItemSubtotal(item))}</Typography>
                            </Grid>
                            <Grid item xs={1}>
                                <Button
                                    color="error"
                                    size="small"
                                    onClick={() => removeFromCart(item.cart_item_id)}
                                >
                                    Remove
                                </Button>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            ))}

            <Divider sx={{ my: 2 }} />
            
            <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h5">
                    Total: ₹{formatPrice(getCartTotal())}
                </Typography>
            </Box>
        </Box>
    );

    const renderShippingDetails = () => (
        <Box>
            <Typography variant="h6" gutterBottom>
                Shipping Information
            </Typography>
            
            {/* User Details Section - Similar to Profile Page */}
            <Box sx={{ mb: 3, p: 2, backgroundColor: '#f8f9fa', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                <Typography variant="h6" sx={{ color: '#28a745', mb: 2 }}>
                    User Details
                </Typography>
                
                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">
                            <strong>Name:</strong>
                        </Typography>
                        {editNameMode ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                <TextField
                                    size="small"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Enter full name"
                                    sx={{ flexGrow: 1 }}
                                />
                                <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => handleProfileUpdate('name')}
                                    sx={{ minWidth: 'auto', px: 1 }}
                                >
                                    Save
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                        setEditNameMode(false);
                                        setNewName(`${shippingDetails.firstName} ${shippingDetails.lastName}`.trim());
                                    }}
                                    sx={{ minWidth: 'auto', px: 1 }}
                                >
                                    Cancel
                                </Button>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body1">
                                    {shippingDetails.firstName} {shippingDetails.lastName}
                                </Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                        setEditNameMode(true);
                                        setNewName(`${shippingDetails.firstName} ${shippingDetails.lastName}`.trim());
                                    }}
                                    sx={{ minWidth: 'auto', px: 1 }}
                                >
                                    Edit
                                </Button>
                            </Box>
                        )}
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">
                            <strong>Email:</strong>
                        </Typography>
                        <Typography variant="body1">
                            {shippingDetails.email}
                        </Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">
                            <strong>Phone Number:</strong>
                        </Typography>
                        {editPhoneMode ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                <TextField
                                    size="small"
                                    value={newPhoneNumber}
                                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                                    placeholder="Enter phone number"
                                    sx={{ flexGrow: 1 }}
                                />
                                <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => handleProfileUpdate('phoneNumber')}
                                    sx={{ minWidth: 'auto', px: 1 }}
                                >
                                    Save
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                        setEditPhoneMode(false);
                                        setNewPhoneNumber(shippingDetails.phone || '');
                                    }}
                                    sx={{ minWidth: 'auto', px: 1 }}
                                >
                                    Cancel
                                </Button>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body1">
                                    {shippingDetails.phone || 'N/A'}
                                </Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                        setEditPhoneMode(true);
                                        setNewPhoneNumber(shippingDetails.phone || '');
                                    }}
                                    sx={{ minWidth: 'auto', px: 1 }}
                                >
                                    {shippingDetails.phone ? 'Edit' : 'Add'}
                                </Button>
                            </Box>
                        )}
                    </Grid>
                </Grid>
            </Box>
            
            {/* Saved Addresses Dropdown */}
            {userAddresses.length > 0 && (
                <Box mb={3}>
                    <Typography variant="h6" sx={{ color: '#28a745', mb: 2 }}>
                        Saved Addresses
                    </Typography>
                    <FormControl fullWidth>
                        <InputLabel>Select Saved Address</InputLabel>
                        <Select
                            value={selectedAddressId || ''}
                            label="Select Saved Address"
                            onChange={(e) => handleAddressSelect(e.target.value)}
                        >
                            <MenuItem value="">
                                <em>Enter new address</em>
                            </MenuItem>
                            {userAddresses.map((address) => (
                                <MenuItem key={address.id} value={address.id}>
                                    {address.house_name || address.area_street_sector_village} - {address.town_city}, {address.state}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            )}
            
            {/* Address Information Section */}
            <Box sx={{ mb: 3, p: 2, backgroundColor: '#f8f9fa', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                <Typography variant="h6" sx={{ color: '#28a745', mb: 2 }}>
                    Shipping Address
                </Typography>
                
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="House Name/Building/Company/Apartment"
                            value={shippingDetails.house_name}
                            onChange={(e) => handleInputChange('house_name', e.target.value)}
                            required
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Area/Street/Sector/Village"
                            value={shippingDetails.area_street_sector_village}
                            onChange={(e) => handleInputChange('area_street_sector_village', e.target.value)}
                            required
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Landmark (Optional)"
                            value={shippingDetails.landmark}
                            onChange={(e) => handleInputChange('landmark', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={4}>
                        <TextField
                            fullWidth
                            label="Town/City"
                            value={shippingDetails.town_city}
                            onChange={(e) => handleInputChange('town_city', e.target.value)}
                            required
                        />
                    </Grid>
                    <Grid item xs={4}>
                        <TextField
                            fullWidth
                            label="State"
                            value={shippingDetails.state}
                            onChange={(e) => handleInputChange('state', e.target.value)}
                            required
                        />
                    </Grid>
                    <Grid item xs={4}>
                        <TextField
                            fullWidth
                            label="Pincode"
                            value={shippingDetails.pincode}
                            onChange={(e) => handleInputChange('pincode', e.target.value)}
                            required
                        />
                    </Grid>
                </Grid>
            </Box>
            
            {/* Save Address Checkbox - Only show when entering new address */}
            {!selectedAddressId && (
                <Box sx={{ mb: 2 }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={saveAddress}
                                onChange={(e) => setSaveAddress(e.target.checked)}
                                color="primary"
                            />
                        }
                        label="Save this address for future orders"
                    />
                </Box>
            )}
        </Box>
    );

    const renderPayment = () => (
        <Box>
            <Typography variant="h6" gutterBottom>
                Payment Information
            </Typography>
            
            <Alert severity="info" sx={{ mb: 2 }}>
                This is a demo checkout. In a real application, you would integrate with a payment gateway like Stripe, PayPal, or Razorpay.
            </Alert>

            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label="Card Number"
                        placeholder="1234 5678 9012 3456"
                        required
                    />
                </Grid>
                <Grid item xs={6}>
                    <TextField
                        fullWidth
                        label="Expiry Date"
                        placeholder="MM/YY"
                        required
                    />
                </Grid>
                <Grid item xs={6}>
                    <TextField
                        fullWidth
                        label="CVV"
                        placeholder="123"
                        required
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label="Cardholder Name"
                        required
                    />
                </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Order Summary
                </Typography>
                <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>Subtotal:</Typography>
                    <Typography>₹{formatPrice(getCartTotal())}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>Shipping:</Typography>
                    <Typography>₹0.00</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>Tax:</Typography>
                    <Typography>₹0.00</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box display="flex" justifyContent="space-between">
                    <Typography variant="h6">Total:</Typography>
                    <Typography variant="h6">₹{formatPrice(getCartTotal())}</Typography>
                </Box>
            </Box>
        </Box>
    );

    const getStepContent = (step) => {
        switch (step) {
            case 0:
                return renderCartReview();
            case 1:
                return renderShippingDetails();
            case 2:
                return renderPayment();
            default:
                return 'Unknown step';
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box display="flex" alignItems="center" mb={3}>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/')}
                    sx={{ mr: 2 }}
                >
                    Back to Shop
                </Button>
                <Typography variant="h4">Checkout</Typography>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3 }}>
                        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                            {steps.map((label) => (
                                <Step key={label}>
                                    <StepLabel>{label}</StepLabel>
                                </Step>
                            ))}
                        </Stepper>

                        {checkoutError && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {checkoutError}
                            </Alert>
                        )}

                        {getStepContent(activeStep)}

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                            <Button
                                disabled={activeStep === 0}
                                onClick={handleBack}
                            >
                                Back
                            </Button>
                            <Box>
                                {activeStep === steps.length - 1 ? (
                                    <Button
                                        variant="contained"
                                        onClick={handleCheckout}
                                        disabled={isCheckingOut || getAvailableItemsCount() === 0}
                                        startIcon={isCheckingOut ? <CircularProgress size={20} /> : <Payment />}
                                    >
                                        {isCheckingOut ? 'Processing...' : 'Place Order'}
                                    </Button>
                                ) : (
                                    <Button
                                        variant="contained"
                                        onClick={handleNext}
                                    >
                                        Next
                                    </Button>
                                )}
                            </Box>
                        </Box>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
                        <Typography variant="h6" gutterBottom>
                            Order Summary
                        </Typography>
                        
                        {cartItems.filter(item => item.stock > 0).map(item => (
                            <Box key={item.cart_item_id} display="flex" justifyContent="space-between" mb={1}>
                                <Typography variant="body2">
                                    {item.name} x {item.quantity}
                                </Typography>
                                <Typography variant="body2">
                                    ₹{formatPrice(getItemSubtotal(item))}
                                </Typography>
                            </Box>
                        ))}
                        
                        <Divider sx={{ my: 2 }} />
                        
                        <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography>Subtotal:</Typography>
                            <Typography>₹{formatPrice(getCartTotal())}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography>Shipping:</Typography>
                            <Typography>₹0.00</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography>Tax:</Typography>
                            <Typography>₹0.00</Typography>
                        </Box>
                        <Divider sx={{ my: 1 }} />
                        <Box display="flex" justifyContent="space-between">
                            <Typography variant="h6">Total:</Typography>
                            <Typography variant="h6">₹{formatPrice(getCartTotal())}</Typography>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Stock Issues Dialog */}
            <Dialog open={showStockDialog} onClose={() => setShowStockDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Stock Issues</DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        Some items in your cart have insufficient stock. Please update your cart and try again.
                    </Typography>
                    <List>
                        {stockIssues.map((issue, index) => (
                            <ListItem key={index}>
                                <ListItemText
                                    primary={issue.productName}
                                    secondary={`Requested: ${issue.requestedQuantity}, Available: ${issue.availableStock}`}
                                />
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowStockDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default Checkout; 