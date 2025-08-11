import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../../api';

const UserManagement = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [usersPerPage] = useState(10);

    useEffect(() => {
        // Check for success message in location state
        if (location.state?.message) {
            setSuccessMessage(location.state.message);
            // Clear the message from location state
            navigate(location.pathname, { replace: true, state: {} });
        }
        fetchUsers();
    }, [currentPage, searchTerm, location]);

    const fetchUsers = async () => {
        try {
            const response = await API.adminAPI.getUsers({
                page: currentPage,
                limit: usersPerPage,
                search: searchTerm
            });
            setUsers(response.data.users);
            setTotalPages(response.data.pagination.total_pages);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('Failed to load users');
            setLoading(false);
        }
    };

    const handleViewDetails = (userId) => {
        navigate(`/admin/users/${userId}`);
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Reset to first page when searching
    };

    if (loading) return <div style={styles.loading}>Loading...</div>;
    if (error) return <div style={styles.error}>{error}</div>;

    return (
        <div style={styles.container}>
            <h2 style={styles.heading}>User Management</h2>
            
            {successMessage && (
                <div style={styles.successMessage}>
                    {successMessage}
                </div>
            )}
            
            <div style={styles.searchContainer}>
                <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={handleSearch}
                    style={styles.searchInput}
                />
            </div>

            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>ID</th>
                            <th style={styles.th}>Name</th>
                            <th style={styles.th}>Email</th>
                            <th style={styles.th}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} style={styles.tr}>
                                <td style={styles.td}>{user.id}</td>
                                <td style={styles.td}>{user.name}</td>
                                <td style={styles.td}>{user.email}</td>
                                <td style={styles.td}>
                                    <button
                                        onClick={() => handleViewDetails(user.id)}
                                        style={styles.viewButton}
                                    >
                                        View Details
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div style={styles.pagination}>
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        style={{
                            ...styles.paginationButton,
                            opacity: currentPage === 1 ? 0.5 : 1
                        }}
                    >
                        Previous
                    </button>
                    <span style={styles.pageInfo}>
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        style={{
                            ...styles.paginationButton,
                            opacity: currentPage === totalPages ? 0.5 : 1
                        }}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
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
    searchContainer: {
        marginBottom: '20px',
    },
    searchInput: {
        width: '100%',
        padding: '10px',
        fontSize: '1em',
        border: '1px solid #ddd',
        borderRadius: '5px',
        boxSizing: 'border-box',
    },
    tableContainer: {
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    th: {
        backgroundColor: '#f8f9fa',
        padding: '12px 15px',
        textAlign: 'left',
        borderBottom: '2px solid #dee2e6',
        color: '#333',
    },
    tr: {
        borderBottom: '1px solid #dee2e6',
        '&:last-child': {
            borderBottom: 'none',
        },
    },
    td: {
        padding: '12px 15px',
        color: '#333',
    },
    viewButton: {
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        padding: '8px 15px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9em',
        '&:hover': {
            backgroundColor: '#218838',
        },
    },
    pagination: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '20px',
        marginTop: '20px',
        padding: '20px 0',
    },
    paginationButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        padding: '8px 15px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9em',
        '&:hover': {
            backgroundColor: '#5a6268',
        },
    },
    pageInfo: {
        color: '#333',
        fontSize: '0.9em',
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
    successMessage: {
        backgroundColor: '#d4edda',
        color: '#155724',
        padding: '12px',
        borderRadius: '4px',
        marginBottom: '20px',
        textAlign: 'center',
    },
};

export default UserManagement; 