import React, { useEffect, useState } from 'react';
import API from '../../api';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    TablePagination, Button, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress
} from '@mui/material';

const statusOptions = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

const OrderManagement = () => {
    const [orders, setOrders] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [loading, setLoading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderDetails, setOrderDetails] = useState(null);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [statusError, setStatusError] = useState('');
    const [testResult, setTestResult] = useState(null);

    const fetchOrders = async (page = 0, limit = 10) => {
        setLoading(true);
        try {
            console.log('Fetching orders...', { page: page + 1, limit });
            const { data } = await API.adminAPI.getOrders({ page: page + 1, limit });
            console.log('Orders fetched:', data);
            setOrders(data.orders);
            setTotal(data.total);
        } catch (err) {
            console.error('Error fetching orders:', err);
            // handle error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders(page, rowsPerPage);
        // eslint-disable-next-line
    }, [page, rowsPerPage]);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleViewOrder = async (order) => {
        console.log('Viewing order:', order);
        setSelectedOrder(order);
        setOrderDetails(null);
        try {
            console.log('Fetching order details for ID:', order.id);
            const { data } = await API.adminAPI.getOrderDetails(order.id);
            console.log('Order details fetched:', data);
            setOrderDetails(data);
        } catch (err) {
            console.error('Error fetching order details:', err);
            setOrderDetails({ error: 'Failed to fetch order details: ' + (err.response?.data?.message || err.message) });
        }
    };

    const handleCloseDialog = () => {
        setSelectedOrder(null);
        setOrderDetails(null);
        setStatusError('');
    };

    const handleStatusChange = async (orderId, newStatus) => {
        setStatusUpdating(true);
        setStatusError('');
        try {
            await API.adminAPI.updateOrderStatus(orderId, newStatus);
            fetchOrders(page, rowsPerPage);
            if (selectedOrder && selectedOrder.id === orderId) {
                handleViewOrder(selectedOrder);
            }
        } catch (err) {
            setStatusError('Failed to update status');
        } finally {
            setStatusUpdating(false);
        }
    };

    const testOrdersTable = async () => {
        try {
            const { data } = await API.adminAPI.testOrdersTable();
            setTestResult(data);
            console.log('Test result:', data);
        } catch (err) {
            console.error('Test failed:', err);
            setTestResult({ error: err.message });
        }
    };

    return (
        <Box p={3}>
            <Typography variant="h4" gutterBottom>Order Management</Typography>
            
            {/* Test button */}
            <Box mb={2}>
                <Button 
                    variant="outlined" 
                    onClick={testOrdersTable}
                    sx={{ mr: 2 }}
                >
                    Test Orders Table
                </Button>
                {testResult && (
                    <Typography variant="body2" color={testResult.error ? 'error' : 'success'}>
                        {testResult.error || `${testResult.message} - Orders: ${testResult.orderCount}`}
                    </Typography>
                )}
            </Box>
            
            {/* Debug info */}
            <Box mb={2}>
                <Typography variant="body2" color="textSecondary">
                    Total orders: {total} | Current page: {page + 1} | Orders loaded: {orders.length}
                </Typography>
            </Box>
            
            <Paper>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>User</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Total</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">
                                        <CircularProgress size={32} />
                                    </TableCell>
                                </TableRow>
                            ) : orders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">
                                        <Box py={3}>
                                            <Typography variant="h6" color="textSecondary" gutterBottom>
                                                No orders found
                                            </Typography>
                                            <Typography variant="body2" color="textSecondary">
                                                {total === 0 ? 'There are no orders in the system yet.' : 'No orders match the current filters.'}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : orders.map(order => (
                                <TableRow key={order.id}>
                                    <TableCell>{order.id}</TableCell>
                                    <TableCell>{order.user_name}</TableCell>
                                    <TableCell>{order.user_email}</TableCell>
                                    <TableCell>
                                        <Select
                                            value={order.status}
                                            onChange={e => handleStatusChange(order.id, e.target.value)}
                                            disabled={statusUpdating}
                                            size="small"
                                        >
                                            {statusOptions.map(opt => (
                                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                            ))}
                                        </Select>
                                    </TableCell>
                                    <TableCell>₹{order.total_amount}</TableCell>
                                    <TableCell>{new Date(order.created_at).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Button size="small" onClick={() => handleViewOrder(order)}>
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[5, 10, 20, 50]}
                />
            </Paper>

            {/* Order Details Dialog */}
            <Dialog open={!!selectedOrder} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>Order Details</DialogTitle>
                <DialogContent>
                    {!orderDetails ? (
                        <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
                            <CircularProgress />
                        </Box>
                    ) : orderDetails.error ? (
                        <Typography color="error">{orderDetails.error}</Typography>
                    ) : (
                        <>
                            <Typography variant="subtitle1" gutterBottom>
                                Order #{orderDetails.order.id} | User: {orderDetails.order.user_name} ({orderDetails.order.user_email})
                            </Typography>
                            <Typography>Status: {orderDetails.order.status}</Typography>
                            <Typography>Total: ₹{orderDetails.order.total_amount}</Typography>
                            <Typography>Date: {new Date(orderDetails.order.created_at).toLocaleString()}</Typography>
                            <Typography>Shipping Address: {orderDetails.order.address_line1 || 'N/A'} {orderDetails.order.city || ''} {orderDetails.order.state || ''} {orderDetails.order.zip_code || ''}</Typography>
                            <Box mt={2}>
                                <Typography variant="h6">Items</Typography>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Product</TableCell>
                                            <TableCell>Quantity</TableCell>
                                            <TableCell>Price</TableCell>
                                            <TableCell>Subtotal</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {orderDetails.items.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.product_name}</TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell>₹{item.price_at_time}</TableCell>
                                                <TableCell>₹{(item.price_at_time * item.quantity).toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        </>
                    )}
                    {statusError && <Typography color="error">{statusError}</Typography>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default OrderManagement; 