// src/components/PrivateRoute.js
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = ({ allowedRoles }) => {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) {
        return <div>Loading...</div>; // Or a spinner
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user?.role)) {
        return <Navigate to="/unauthorized" replace />; // Redirect to an unauthorized page
    }

    return <Outlet />;
};

export default PrivateRoute;