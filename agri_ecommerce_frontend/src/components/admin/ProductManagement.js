import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Typography,
    Alert,
    Tooltip,
    Chip,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    List,
    ListItem,
    ListItemText,
    Divider,
    Tabs,
    Tab,
    Card,
    CardContent,
    CardMedia,
    CardActions,
    Stack,
    Container,
    OutlinedInput,
    InputAdornment,
    Checkbox
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Inventory as InventoryIcon,
    History as HistoryIcon,
    Warning as WarningIcon,
    Search as SearchIcon,
    FilterList as FilterIcon,
    RemoveShoppingCart as RemoveShoppingCartIcon
} from '@mui/icons-material';
import API from '../../api';

// Custom TabPanel component
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const ProductManagement = () => {
    const [tabValue, setTabValue] = useState(0);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingProduct, setEditingProduct] = useState(null);
    const [showStockModal, setShowStockModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [stockValue, setStockValue] = useState('');
    const [batchMode, setBatchMode] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [newProduct, setNewProduct] = useState({
        name: '',
        description: '',
        price: '',
        category: '',
        imageUrl: '',
        stock: ''
    });
    const [openStockDialog, setOpenStockDialog] = useState(false);
    const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
    const [stockHistory, setStockHistory] = useState([]);
    const [stockUpdate, setStockUpdate] = useState({
        stock: '',
        reason: ''
    });
    const [success, setSuccess] = useState('');
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [selectedStocks, setSelectedStocks] = useState([]);
    const [batchUpdateOpen, setBatchUpdateOpen] = useState(false);
    const [batchUpdateData, setBatchUpdateData] = useState({
        stock: '',
        reason: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        filterAndSortProducts();
    }, [products, searchQuery, categoryFilter, sortBy]);

    const fetchData = async () => {
        try {
            const [productsRes, categoriesRes] = await Promise.all([
                API.adminAPI.getProducts(),
                API.adminAPI.getCategories()
            ]);
            const productsWithNumberPrices = productsRes.data.map(product => {
                const category = categoriesRes.data.find(cat => cat.id === product.category_id);
                return {
                    ...product,
                    price: parseFloat(product.price) || 0,
                    selected: false, // Add selected property for batch operations
                    category_name: category ? category.name : 'N/A' // Add category name
                };
            });
            setProducts(productsWithNumberPrices);
            setCategories(categoriesRes.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching data:", err);
            setError("Failed to load data. Please try again later.");
            setLoading(false);
        }
    };

    const handleInputChange = (e, isEditing = false) => {
        const { name, value } = e.target;
        // Convert price to number when it's being changed
        const processedValue = name === 'price' ? parseFloat(value) || 0 : value;
        
        if (isEditing) {
            setEditingProduct(prev => ({ ...prev, [name]: processedValue }));
        } else {
            setNewProduct(prev => ({ ...prev, [name]: processedValue }));
        }
    };

    const handleImageUpload = async (e, isEditing = false) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!validImageTypes.includes(file.type)) {
            setError('Please upload a valid image file (JPEG, PNG, or GIF)');
            return;
        }

        // Validate file size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
            setError('Image size should be less than 5MB');
            return;
        }

        const formData = new FormData();
        formData.append('image', file);

        try {
            setLoading(true);
            setError(''); // Clear any previous errors
            
            const response = await API.adminAPI.uploadImage(formData);
            const imageUrl = response.data.url; // This will be the relative URL (/uploads/filename)
            
            if (isEditing) {
                setEditingProduct(prev => ({
                    ...prev,
                    imageUrl: imageUrl,
                    image_url: imageUrl // Keep both for consistency
                }));
            } else {
                setNewProduct(prev => ({
                    ...prev,
                    imageUrl: imageUrl,
                    image_url: imageUrl // Keep both for consistency
                }));
            }
            setSuccess('Image uploaded successfully');
        } catch (err) {
            console.error("Error uploading image:", err);
            setError(err.response?.data?.message || "Failed to upload image. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!newProduct.name || !newProduct.price || !newProduct.category) {
                setError('Name, price and category are required');
                return;
            }

            // Ensure price is a number before sending
            const productData = {
                name: newProduct.name,
                description: newProduct.description,
                price: parseFloat(newProduct.price) || 0,
                category_id: parseInt(newProduct.category), // Ensure category_id is a number
                stock: parseInt(newProduct.stock) || 0,
                image_url: newProduct.imageUrl // Match the backend field name
            };

            await API.adminAPI.createProduct(productData);
            setSuccess('Product created successfully');
            setNewProduct({
                name: '',
                description: '',
                price: '',
                category: '',
                imageUrl: '',
                stock: ''
            });
            fetchData();
        } catch (err) {
            console.error("Error creating product:", err);
            setError(err.response?.data?.message || "Failed to create product. Please try again.");
        }
    };

    const handleUpdate = async () => {
        try {
            if (!editingProduct.name || !editingProduct.price || !editingProduct.category) {
                setError('Name, price and category are required');
                return;
            }

            const productData = {
                name: editingProduct.name,
                description: editingProduct.description,
                price: parseFloat(editingProduct.price),
                category_id: parseInt(editingProduct.category),
                stock: parseInt(editingProduct.stock),
                image_url: editingProduct.imageUrl
            };

            await API.adminAPI.updateProduct(editingProduct.id, productData);
            setSuccess('Product updated successfully');
            setOpenEditDialog(false);
            setEditingProduct(null);
            fetchData();
        } catch (err) {
            console.error("Error updating product:", err);
            setError(err.response?.data?.message || "Failed to update product. Please try again.");
        }
    };

    const handleDelete = async (productId) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await API.adminAPI.deleteProduct(productId);
                setSuccess('Product deleted successfully');
                fetchData();
            } catch (err) {
                console.error("Error deleting product:", err);
                setError(err.response?.data?.message || "Failed to delete product. Please try again.");
            }
        }
    };

    const handleStockUpdate = async () => {
        try {
            if (!stockUpdate.stock || stockUpdate.stock < 0) {
                setError('Please enter a valid stock quantity');
                return;
            }

            const stockData = {
                stock: parseInt(stockUpdate.stock),
                reason: stockUpdate.reason || 'Manual stock update'
            };

            await API.adminAPI.updateStock(selectedProduct.id, stockData);
            setSuccess('Stock updated successfully');
            fetchData();
            setOpenStockDialog(false);
            setStockUpdate({ stock: '', reason: '' });
        } catch (error) {
            console.error('Error updating stock:', error);
            setError(error.response?.data?.message || 'Failed to update stock');
        }
    };

    const fetchStockHistory = async (productId) => {
        try {
            const response = await API.adminAPI.getStockHistory(productId);
            setStockHistory(response.data);
        } catch (error) {
            console.error('Error fetching stock history:', error);
            setError('Failed to fetch stock history');
        }
    };

    const handleOpenStockDialog = (product) => {
        setSelectedProduct(product);
        setStockUpdate({ stock: product.stock.toString(), reason: '' });
        setOpenStockDialog(true);
    };

    const handleOpenHistoryDialog = async (product) => {
        setSelectedProduct(product);
        await fetchStockHistory(product.id);
        setOpenHistoryDialog(true);
    };

    const getStockStatusColor = (stock) => {
        if (stock <= 0) return 'error';
        if (stock < 10) return 'warning';
        return 'success';
    };

    const getStockStatusText = (stock) => {
        if (stock <= 0) return 'Out of Stock';
        if (stock < 10) return `Low Stock (${stock})`;
        return `In Stock (${stock})`;
    };

    const toggleProductSelection = (productId) => {
        setProducts(products.map(product => 
            product.id === productId 
                ? { ...product, selected: !product.selected }
                : product
        ));
        setSelectedProducts(products.filter(p => p.id === productId ? !p.selected : p.selected));
    };

    const openStockModal = (product = null) => {
        if (product) {
            setSelectedProduct(product);
            setStockValue(product.stock.toString());
            setBatchMode(false);
        } else {
            setBatchMode(true);
            setStockValue('');
        }
        setShowStockModal(true);
    };

    const getStockStatusStyle = (stock) => {
        if (stock <= 0) return { color: 'red', fontWeight: 'bold' };
        if (stock < 10) return { color: 'orange', fontWeight: 'bold' };
        return { color: 'green' };
    };

    const handleBatchStockUpdate = async () => {
        try {
            if (!batchUpdateData.stock || parseInt(batchUpdateData.stock) < 0) {
                setError('Please enter a valid stock quantity');
                return;
            }

            const updates = selectedStocks.map(productId => ({
                id: productId,
                stock: parseInt(batchUpdateData.stock),
                reason: batchUpdateData.reason || 'Batch stock update'
            }));

            await API.adminAPI.batchUpdateStock(updates);
            setSuccess('Stock updated successfully for selected products');
            fetchData();
            setBatchUpdateOpen(false);
            setSelectedStocks([]);
            setBatchUpdateData({ stock: '', reason: '' });
        } catch (error) {
            console.error('Error updating stock in batch:', error);
            setError(error.response?.data?.message || 'Failed to update stock for selected products');
        }
    };

    const handleSetOutOfStock = async (productIds) => {
        try {
            const updates = (Array.isArray(productIds) ? productIds : [productIds]).map(productId => ({
                id: productId,
                stock: 0,
                reason: 'Marked as out of stock'
            }));

            await API.adminAPI.batchUpdateStock(updates);
            setSuccess('Products marked as out of stock successfully');
            fetchData();
            setSelectedStocks([]);
        } catch (error) {
            console.error('Error marking products as out of stock:', error);
            setError(error.response?.data?.message || 'Failed to mark products as out of stock');
        }
    };

    const handleModalUpdate = () => {
        if (batchMode) {
            handleBatchStockUpdate();
        } else {
            handleStockUpdate();
        }
    };

    const handleEdit = (product) => {
        setEditingProduct({
            ...product,
            category: (product.category_id || product.category?.id || '').toString(),
            price: parseFloat(product.price) || 0,
            imageUrl: product.image_url
        });
        setOpenEditDialog(true);
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const filterAndSortProducts = () => {
        let filtered = [...products];

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(product =>
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.description.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply category filter
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(product => product.category_id === parseInt(categoryFilter));
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'price-low':
                    return parseFloat(a.price) - parseFloat(b.price);
                case 'price-high':
                    return parseFloat(b.price) - parseFloat(a.price);
                case 'stock-low':
                    return a.stock - b.stock;
                case 'stock-high':
                    return b.stock - a.stock;
                default: // 'name'
                    return a.name.localeCompare(b.name);
            }
        });

        setFilteredProducts(filtered);
    };

    const handleStockSelection = (productId) => {
        setSelectedStocks(prev => {
            if (prev.includes(productId)) {
                return prev.filter(id => id !== productId);
            }
            return [...prev, productId];
        });
    };

    const getProductImage = (imageUrl) => {
        if (!imageUrl) return '/images/placeholder.png';
        
        // If the URL is already absolute, return it as is
        if (imageUrl.startsWith('http')) {
            return imageUrl;
        }
        
        // Otherwise, prepend the backend URL
        return `http://localhost:5000${imageUrl}`;
    };

    if (loading) return <div style={styles.loading}>Loading...</div>;
    if (error) return <div style={styles.error}>{error}</div>;

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Product Management
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, minHeight: '48px' }}>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="product management tabs">
                    <Tab label="View Products" />
                    <Tab label="Stock Management" />
                    <Tab label="Add Product" />
                    <Tab label="Edit Products" />
                </Tabs>
            </Box>

            {/* View Products Tab */}
            <TabPanel value={tabValue} index={0}>
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={4}>
                                <OutlinedInput
                                    fullWidth
                                    placeholder="Search products..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    startAdornment={
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    }
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <FormControl fullWidth>
                                    <InputLabel>Category</InputLabel>
                                    <Select
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        label="Category"
                                    >
                                        <MenuItem value="all">All Categories</MenuItem>
                                        {categories.map(category => (
                                            <MenuItem key={category.id} value={category.id}>
                                                {category.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <FormControl fullWidth>
                                    <InputLabel>Sort By</InputLabel>
                                    <Select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        label="Sort By"
                                    >
                                        <MenuItem value="name">Name</MenuItem>
                                        <MenuItem value="price-low">Price: Low to High</MenuItem>
                                        <MenuItem value="price-high">Price: High to Low</MenuItem>
                                        <MenuItem value="stock-low">Stock: Low to High</MenuItem>
                                        <MenuItem value="stock-high">Stock: High to Low</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>

                <Container maxWidth="xl" sx={{ minHeight: '60vh' }}>
                    <Grid container spacing={3}>
                        {filteredProducts.map((product) => (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                                <Card sx={{ 
                                    height: '100%', 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    minHeight: '450px' // Fixed minimum height for cards
                                }}>
                                    <Box sx={{ 
                                        position: 'relative',
                                        paddingTop: '75%', // 4:3 Aspect ratio
                                        width: '100%',
                                        backgroundColor: 'grey.100'
                                    }}>
                                        <CardMedia
                                            component="img"
                                            image={getProductImage(product.image_url)}
                                            alt={product.name}
                                            sx={{ 
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'contain',
                                                backgroundColor: '#f0f0f0'
                                            }}
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = '/images/placeholder.png';
                                            }}
                                        />
                                    </Box>
                                    <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                        <Typography gutterBottom variant="h6" component="h2" sx={{ mb: 1 }}>
                                            {product.name}
                                        </Typography>
                                        <Typography 
                                            variant="body2" 
                                            color="text.secondary" 
                                            sx={{ 
                                                mb: 2,
                                                overflow: 'hidden',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: 'vertical',
                                                minHeight: '60px' // Fixed height for description
                                            }}
                                        >
                                            {product.description}
                                        </Typography>
                                        <Box sx={{ mt: 'auto' }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Typography variant="h6" color="primary">
                                                    ${parseFloat(product.price).toFixed(2)}
                                                </Typography>
                                                <Chip
                                                    label={getStockStatusText(product.stock)}
                                                    color={getStockStatusColor(product.stock)}
                                                    size="small"
                                                    icon={product.stock < 10 ? <WarningIcon /> : undefined}
                                                />
                                            </Stack>
                                        </Box>
                                    </CardContent>
                                    <CardActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Category: {product.category_name}
                                        </Typography>
                                    </CardActions>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </TabPanel>

            {/* Stock Management Tab */}
            <TabPanel value={tabValue} index={1}>
                <Card>
                    <CardContent>
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Stock Management
                            </Typography>
                            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    disabled={selectedStocks.length === 0}
                                    onClick={() => setBatchUpdateOpen(true)}
                                >
                                    Update Selected Stocks ({selectedStocks.length})
                                </Button>
                                <Button
                                    variant="contained"
                                    color="error"
                                    disabled={selectedStocks.length === 0}
                                    onClick={() => handleSetOutOfStock(selectedStocks)}
                                >
                                    Mark Selected as Out of Stock
                                </Button>
                            </Stack>
                        </Box>
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                indeterminate={selectedStocks.length > 0 && selectedStocks.length < products.length}
                                                checked={selectedStocks.length === products.length}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedStocks(products.map(p => p.id));
                                                    } else {
                                                        setSelectedStocks([]);
                                                    }
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>Product Name</TableCell>
                                        <TableCell>Current Stock</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {products.map((product) => (
                                        <TableRow 
                                            key={product.id}
                                            selected={selectedStocks.includes(product.id)}
                                        >
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    checked={selectedStocks.includes(product.id)}
                                                    onChange={() => handleStockSelection(product.id)}
                                                />
                                            </TableCell>
                                            <TableCell>{product.name}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={getStockStatusText(product.stock)}
                                                    color={getStockStatusColor(product.stock)}
                                                    size="small"
                                                    icon={product.stock < 10 ? <WarningIcon /> : undefined}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip title="Update Stock">
                                                    <IconButton onClick={() => handleOpenStockDialog(product)}>
                                                        <InventoryIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Stock History">
                                                    <IconButton onClick={() => handleOpenHistoryDialog(product)}>
                                                        <HistoryIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Mark as Out of Stock">
                                                    <IconButton 
                                                        onClick={() => handleSetOutOfStock(product.id)}
                                                        color="error"
                                                    >
                                                        <RemoveShoppingCartIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>

                {/* Batch Update Dialog */}
                <Dialog open={batchUpdateOpen} onClose={() => setBatchUpdateOpen(false)}>
                    <DialogTitle>Batch Update Stock</DialogTitle>
                    <DialogContent>
                        <Box sx={{ mt: 2 }}>
                            <TextField
                                fullWidth
                                label="New Stock Quantity"
                                type="number"
                                value={batchUpdateData.stock}
                                onChange={(e) => setBatchUpdateData(prev => ({ ...prev, stock: e.target.value }))}
                                sx={{ mb: 2 }}
                            />
                            <TextField
                                fullWidth
                                label="Reason for Update"
                                multiline
                                rows={3}
                                value={batchUpdateData.reason}
                                onChange={(e) => setBatchUpdateData(prev => ({ ...prev, reason: e.target.value }))}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setBatchUpdateOpen(false)}>Cancel</Button>
                        <Button onClick={handleBatchStockUpdate} variant="contained" color="primary">
                            Update Stock
                        </Button>
                    </DialogActions>
                </Dialog>
            </TabPanel>

            {/* Add Product Tab */}
            <TabPanel value={tabValue} index={2}>
                <Card sx={{ maxWidth: 800, mx: 'auto' }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Add New Product
                        </Typography>
                        <Box 
                            component="form" 
                            onSubmit={handleSubmit} 
                            sx={{ 
                                mt: 2,
                                '& .MuiTextField-root, & .MuiFormControl-root': {
                                    mb: 2 // Add consistent spacing between form elements
                                }
                            }}
                        >
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Product Name"
                                        name="name"
                                        value={newProduct.name}
                                        onChange={(e) => handleInputChange(e)}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Description"
                                        name="description"
                                        multiline
                                        rows={3}
                                        value={newProduct.description}
                                        onChange={(e) => handleInputChange(e)}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        label="Price"
                                        name="price"
                                        type="number"
                                        value={newProduct.price}
                                        onChange={(e) => handleInputChange(e)}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        label="Initial Stock"
                                        name="stock"
                                        type="number"
                                        value={newProduct.stock}
                                        onChange={(e) => handleInputChange(e)}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <FormControl fullWidth>
                                        <InputLabel>Category</InputLabel>
                                        <Select
                                            name="category"
                                            value={newProduct.category}
                                            onChange={(e) => handleInputChange(e)}
                                            required
                                        >
                                            {categories.map(category => (
                                                <MenuItem key={category.id} value={category.id}>
                                                    {category.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e)}
                                    />
                                </Grid>
                                {newProduct.imageUrl && (
                                    <Grid item xs={12}>
                                        <Box sx={{ mt: 2 }}>
                                            <Typography variant="subtitle1">Image Preview:</Typography>
                                            <img
                                                src={getProductImage(newProduct.imageUrl)}
                                                alt="Product Preview"
                                                style={{ 
                                                    width: '100px', 
                                                    height: '100px', 
                                                    objectFit: 'contain', 
                                                    marginTop: '8px',
                                                    backgroundColor: '#f0f0f0' 
                                                }}
                                            />
                                        </Box>
                                    </Grid>
                                )}
                                <Grid item xs={12}>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        color="primary"
                                        fullWidth
                                    >
                                        Add Product
                                    </Button>
                                </Grid>
                            </Grid>
                        </Box>
                    </CardContent>
                </Card>
            </TabPanel>

            {/* Edit Products Tab */}
            <TabPanel value={tabValue} index={3}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Edit Products
                        </Typography>
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Name</TableCell>
                                        <TableCell>Category</TableCell>
                                        <TableCell>Price</TableCell>
                                        <TableCell>Stock</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {products.map((product) => (
                                        <TableRow key={product.id}>
                                            <TableCell>{product.name}</TableCell>
                                            <TableCell>{product.category_name}</TableCell>
                                            <TableCell>${product.price}</TableCell>
                                            <TableCell>{product.stock}</TableCell>
                                            <TableCell>
                                                <Tooltip title="Edit">
                                                    <IconButton onClick={() => handleEdit(product)}>
                                                        <EditIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete">
                                                    <IconButton onClick={() => handleDelete(product.id)}>
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            </TabPanel>

            {/* Stock Management Modal */}
            {showStockModal && (
                <div style={styles.modal}>
                    <div style={styles.modalContent}>
                        <h3>{batchMode ? 'Batch Update Stock' : 'Update Stock'}</h3>
                        <p>{batchMode 
                            ? `Updating stock for ${selectedProducts.length} products`
                            : `Updating stock for ${selectedProduct.name}`}
                        </p>
                        <input
                            type="number"
                            value={stockValue}
                            onChange={(e) => setStockValue(e.target.value)}
                            min="0"
                        style={styles.input}
                            placeholder="Enter new stock value"
                        />
                        <div style={styles.modalButtons}>
                            <button 
                                onClick={() => {
                                    setShowStockModal(false);
                                    setSelectedProduct(null);
                                    setBatchMode(false);
                                    setStockValue('');
                                }}
                                style={styles.buttonSecondary}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleModalUpdate}
                                style={styles.button}
                                disabled={!stockValue || parseInt(stockValue) < 0}
                            >
                                Update Stock
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stock Update Dialog */}
            <Dialog open={openStockDialog} onClose={() => setOpenStockDialog(false)}>
                <DialogTitle>Update Stock</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <TextField
                            fullWidth
                            label="New Stock Quantity"
                            type="number"
                            value={stockUpdate.stock}
                            onChange={(e) => setStockUpdate(prev => ({ ...prev, stock: e.target.value }))}
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            fullWidth
                            label="Reason for Update"
                            multiline
                            rows={3}
                            value={stockUpdate.reason}
                            onChange={(e) => setStockUpdate(prev => ({ ...prev, reason: e.target.value }))}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenStockDialog(false)}>Cancel</Button>
                    <Button onClick={handleModalUpdate} variant="contained" color="primary">
                        Update Stock
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Stock History Dialog */}
            <Dialog 
                open={openHistoryDialog} 
                onClose={() => setOpenHistoryDialog(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Stock History</DialogTitle>
                <DialogContent>
                    <List>
                        {stockHistory.map((log) => (
                            <React.Fragment key={log.id}>
                                <ListItem>
                                    <ListItemText
                                        primary={
                                            <Typography>
                                                {log.change_type === 'increase' ? '+' : '-'}
                                                {log.change_amount} units
                                                <Chip
                                                    size="small"
                                                    label={`${log.previous_stock} → ${log.new_stock}`}
                                                    color={log.change_type === 'increase' ? 'success' : 'error'}
                                                    sx={{ ml: 1 }}
                                                />
                                            </Typography>
                                        }
                                        secondary={
                                            <>
                                                <Typography variant="body2">
                                                    Reason: {log.reason || 'No reason provided'}
                                                </Typography>
                                                <Typography variant="caption">
                                                    Updated by: {log.updated_by_name} on {new Date(log.created_at).toLocaleString()}
                                                </Typography>
                                            </>
                                        }
                                    />
                                </ListItem>
                                <Divider />
                            </React.Fragment>
                        ))}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenHistoryDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Edit Product</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Product Name"
                                    name="name"
                                    value={editingProduct?.name || ''}
                                    onChange={(e) => handleInputChange(e, true)}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Description"
                                    name="description"
                                    multiline
                                    rows={3}
                                    value={editingProduct?.description || ''}
                                    onChange={(e) => handleInputChange(e, true)}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Price"
                                    name="price"
                                    type="number"
                                    value={editingProduct?.price || ''}
                                    onChange={(e) => handleInputChange(e, true)}
                                    required
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Stock"
                                    name="stock"
                                    type="number"
                                    value={editingProduct?.stock || ''}
                                    onChange={(e) => handleInputChange(e, true)}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel>Category</InputLabel>
                                    <Select
                                        name="category"
                                        value={editingProduct?.category || ''}
                                        onChange={(e) => handleInputChange(e, true)}
                                        required
                                    >
                                        {categories.map(category => (
                                            <MenuItem key={category.id} value={category.id}>
                                                {category.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, true)}
                                    style={{ marginTop: '10px' }}
                                />
                                {editingProduct?.imageUrl && (
                                    <Box sx={{ mt: 2 }}>
                                        <img 
                                            src={getProductImage(editingProduct.imageUrl)} 
                                            alt="Product preview" 
                                            style={{ 
                                                width: '100px', 
                                                height: '100px', 
                                                objectFit: 'contain',
                                                backgroundColor: '#f0f0f0'
                                            }}
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = '/images/placeholder.png';
                                            }}
                                        />
                                    </Box>
                                )}
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
                    <Button onClick={handleUpdate} variant="contained" color="primary">
                        Update Product
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

const styles = {
    container: {
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto',
    },
    heading: {
        color: '#28a745',
        marginBottom: '30px',
        textAlign: 'center',
    },
    formContainer: {
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
    },
    input: {
        padding: '10px',
        borderRadius: '4px',
        border: '1px solid #ddd',
        fontSize: '1em',
    },
    textarea: {
        padding: '10px',
        borderRadius: '4px',
        border: '1px solid #ddd',
        fontSize: '1em',
        minHeight: '100px',
        resize: 'vertical',
    },
    button: {
        backgroundColor: '#28a745',
        color: 'white',
        padding: '10px 20px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1em',
        '&:hover': {
            backgroundColor: '#218838',
        },
    },
    buttonSecondary: {
        backgroundColor: '#6c757d',
        color: 'white',
        padding: '10px 20px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1em',
        '&:hover': {
            backgroundColor: '#5a6268',
        },
    },
    buttonDanger: {
        backgroundColor: '#dc3545',
        color: 'white',
        padding: '10px 20px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1em',
        '&:hover': {
            backgroundColor: '#c82333',
        },
    },
    buttonGroup: {
        display: 'flex',
        gap: '10px',
        justifyContent: 'center',
        marginTop: '10px',
    },
    productsList: {
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    productsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '20px',
        marginTop: '20px',
    },
    productCard: {
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
    },
    productImage: {
        width: '100%',
        height: '200px',
        objectFit: 'cover',
        borderRadius: '4px',
        marginBottom: '10px',
    },
    productName: {
        fontSize: '1.2em',
        margin: '10px 0',
        color: '#333',
    },
    productDescription: {
        color: '#666',
        marginBottom: '10px',
    },
    productPrice: {
        fontSize: '1.1em',
        color: '#28a745',
        fontWeight: 'bold',
    },
    productStock: {
        color: '#666',
        marginBottom: '10px',
    },
    productCategory: {
        color: '#666',
        marginBottom: '10px',
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
    saveButton: {
        backgroundColor: '#28a745',
        color: 'white',
        padding: '10px 20px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1em',
        '&:hover': {
            backgroundColor: '#218838',
        },
    },
    cancelButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        padding: '10px 20px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1em',
        '&:hover': {
            backgroundColor: '#5a6268',
        },
    },
    editButton: {
        backgroundColor: '#28a745',
        color: 'white',
        padding: '10px 20px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1em',
        '&:hover': {
            backgroundColor: '#218838',
        },
    },
    deleteButton: {
        backgroundColor: '#dc3545',
        color: 'white',
        padding: '10px 20px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1em',
        '&:hover': {
            backgroundColor: '#c82333',
        },
    },
    tableContainer: {
        overflowX: 'auto',
        marginTop: '20px',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '20px',
    },
    th: {
        backgroundColor: '#f4f4f4',
        padding: '12px',
        textAlign: 'left',
        borderBottom: '2px solid #ddd',
    },
    td: {
        padding: '12px',
        borderBottom: '1px solid #ddd',
    },
    actionButton: {
        marginRight: '8px',
        padding: '6px 12px',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    actionButtonDanger: {
        padding: '6px 12px',
        backgroundColor: '#f44336',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    modal: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        width: '400px',
    },
    modalButtons: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
    },
    batchOperations: {
        marginTop: '20px',
        marginBottom: '20px',
    },
    lowStockWarning: {
        color: 'inherit',
        fontSize: '0.9em',
        fontStyle: 'italic',
    },
    productGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '20px',
        padding: '20px',
    },
    searchBar: {
        marginBottom: '20px',
    },
    filterSection: {
        marginBottom: '20px',
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
    },
};

export default ProductManagement; 