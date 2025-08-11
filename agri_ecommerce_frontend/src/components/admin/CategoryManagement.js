import React, { useState, useEffect } from 'react';
import API from '../../api';

const CategoryManagement = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingCategory, setEditingCategory] = useState(null);
    const [newCategory, setNewCategory] = useState({
        name: '',
        description: '',
        imageUrl: ''
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await API.get('/categories');
            setCategories(response.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching categories:", err);
            setError("Failed to load categories. Please try again later.");
            setLoading(false);
        }
    };

    const handleInputChange = (e, isEditing = false) => {
        const { name, value } = e.target;
        if (isEditing) {
            setEditingCategory(prev => ({ ...prev, [name]: value }));
        } else {
            setNewCategory(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleImageUpload = async (e, isEditing = false) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await API.post('/upload-image', formData);
            const imageUrl = response.data.url;
            
            if (isEditing) {
                setEditingCategory(prev => ({ ...prev, imageUrl }));
            } else {
                setNewCategory(prev => ({ ...prev, imageUrl }));
            }
        } catch (err) {
            console.error("Error uploading image:", err);
            setError("Failed to upload image. Please try again.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await API.post('/categories', newCategory);
            setNewCategory({
                name: '',
                description: '',
                imageUrl: ''
            });
            fetchCategories();
        } catch (err) {
            console.error("Error creating category:", err);
            setError("Failed to create category. Please try again.");
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await API.put(`/categories/${editingCategory.id}`, editingCategory);
            setEditingCategory(null);
            fetchCategories();
        } catch (err) {
            console.error("Error updating category:", err);
            setError("Failed to update category. Please try again.");
        }
    };

    const handleDelete = async (categoryId) => {
        if (window.confirm('Are you sure you want to delete this category? This will affect all products in this category.')) {
            try {
                await API.delete(`/categories/${categoryId}`);
                fetchCategories();
            } catch (err) {
                console.error("Error deleting category:", err);
                setError("Failed to delete category. Please try again.");
            }
        }
    };

    if (loading) return <div style={styles.loading}>Loading...</div>;
    if (error) return <div style={styles.error}>{error}</div>;

    return (
        <div style={styles.container}>
            <h2 style={styles.heading}>Category Management</h2>
            
            {/* Add New Category Form */}
            <div style={styles.formContainer}>
                <h3>Add New Category</h3>
                <form onSubmit={handleSubmit} style={styles.form}>
                    <input
                        type="text"
                        name="name"
                        placeholder="Category Name"
                        value={newCategory.name}
                        onChange={(e) => handleInputChange(e)}
                        style={styles.input}
                        required
                    />
                    <textarea
                        name="description"
                        placeholder="Category Description"
                        value={newCategory.description}
                        onChange={(e) => handleInputChange(e)}
                        style={styles.textarea}
                        required
                    />
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e)}
                        style={styles.input}
                    />
                    <button type="submit" style={styles.button}>Add Category</button>
                </form>
            </div>

            {/* Categories List */}
            <div style={styles.categoriesList}>
                <h3>Current Categories</h3>
                <div style={styles.categoriesGrid}>
                    {categories.map(category => (
                        <div key={category.id} style={styles.categoryCard}>
                            {editingCategory?.id === category.id ? (
                                <form onSubmit={handleUpdate} style={styles.form}>
                                    <input
                                        type="text"
                                        name="name"
                                        value={editingCategory.name}
                                        onChange={(e) => handleInputChange(e, true)}
                                        style={styles.input}
                                        required
                                    />
                                    <textarea
                                        name="description"
                                        value={editingCategory.description}
                                        onChange={(e) => handleInputChange(e, true)}
                                        style={styles.textarea}
                                        required
                                    />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e, true)}
                                        style={styles.input}
                                    />
                                    <div style={styles.buttonGroup}>
                                        <button type="submit" style={styles.button}>Save</button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingCategory(null)}
                                            style={styles.buttonSecondary}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    {category.imageUrl && (
                                        <img
                                            src={category.imageUrl}
                                            alt={category.name}
                                            style={styles.categoryImage}
                                        />
                                    )}
                                    <h4 style={styles.categoryName}>{category.name}</h4>
                                    <p style={styles.categoryDescription}>{category.description}</p>
                                    <div style={styles.buttonGroup}>
                                        <button
                                            onClick={() => setEditingCategory(category)}
                                            style={styles.button}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(category.id)}
                                            style={styles.buttonDanger}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
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
    categoriesList: {
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    categoriesGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '20px',
        marginTop: '20px',
    },
    categoryCard: {
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
    },
    categoryImage: {
        width: '100%',
        height: '150px',
        objectFit: 'cover',
        borderRadius: '4px',
        marginBottom: '10px',
    },
    categoryName: {
        fontSize: '1.2em',
        margin: '10px 0',
        color: '#333',
    },
    categoryDescription: {
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
};

export default CategoryManagement; 