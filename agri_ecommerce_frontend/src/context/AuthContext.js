// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import API from '../api';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const parseJwt = (token) => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const decoded = JSON.parse(jsonPayload);
            return {
                userId: decoded.userId,
                name: decoded.name,
                email: decoded.email,
                role: decoded.role || 'user',
                phone_number: decoded.phone_number || null,
                exp: decoded.exp
            };
        } catch (e) {
            console.error("Error parsing JWT:", e);
            return null;
        }
    };

    // Initialize user and token state
    const [user, setUser] = useState(null); // Will be set after initial load
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    // TEMP DEBUGGING: Watch for changes in the user object within AuthContext
    useEffect(() => {
        console.log("AuthContext Debug: User state updated to:", user);
        if (user) {
            console.log("AuthContext Debug: user.requiresPasswordSetup is:", user.requiresPasswordSetup);
            console.log("AuthContext Debug: user.role is:", user.role);
            console.log("AuthContext Debug: user.phone_number is:", user.phone_number);
        } else {
            console.log("AuthContext Debug: User is null.");
        }
    }, [user]);

    const logout = useCallback(() => {
        console.log("AuthContext: Performing logout...");
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user'); // Always remove 'user' from localStorage
        API.defaults.headers.common['Authorization'] = '';
        navigate('/login');
    }, [navigate]);

    const login = useCallback((userData, jwtToken) => {
        console.log("AuthContext: Manual/Google login initiated.");
        const userToStore = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            phone_number: userData.phone_number || null,
            role: userData.role || 'user',
            // requiresPasswordSetup is a transient property; only set it if explicitly provided
            // for the immediate session after Google login
            requiresPasswordSetup: userData.requiresPasswordSetup || false
        };

        setUser(userToStore);
        setToken(jwtToken);
        localStorage.setItem('token', jwtToken);
        localStorage.setItem('user', JSON.stringify(userToStore));
        API.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
    }, []);

    useEffect(() => {
        const initializeAuth = async () => {
            console.log("AuthContext: Initializing authentication...");
            const params = new URLSearchParams(location.search);
            const googleToken = params.get('token');
            const googleId = params.get('id');
            const googleName = params.get('name');
            const googleEmail = params.get('email');
            // This is the critical flag from the Google callback
            const googleRequiresPasswordSetup = params.get('requiresPasswordSetup') === 'true';
            const googleRole = params.get('role') || 'user';
            const googlePhoneNumber = params.get('phoneNumber') || null;

            // Priority 1: Handle Google OAuth Callback
            if (googleToken && googleId && googleName && googleEmail) {
                console.log("AuthContext: Google OAuth params detected.");
                const userDataFromGoogle = {
                    id: googleId,
                    name: googleName,
                    email: googleEmail,
                    googleId: googleId,
                    requiresPasswordSetup: googleRequiresPasswordSetup, // Capture this flag for the session
                    role: googleRole,
                    phone_number: googlePhoneNumber
                };

                login(userDataFromGoogle, googleToken); // This will set `requiresPasswordSetup` in state for this session

                // Clear the URL parameters after processing them
                window.history.replaceState({}, document.title, location.pathname);

                if (googleRequiresPasswordSetup) {
                    console.log("AuthContext: Google login requires password setup, navigating to /complete-profile");
                    navigate('/complete-profile');
                } else {
                    console.log("AuthContext: Google login does not require password setup, navigating to /home");
                    navigate('/home');
                }
            } else {
                // Priority 2: Check for existing session in localStorage
                console.log("AuthContext: No Google OAuth params. Checking localStorage for existing session.");
                const storedToken = localStorage.getItem('token');
                const storedUser = localStorage.getItem('user'); // Get stored user object

                if (storedToken && storedUser) {
                    const decodedToken = parseJwt(storedToken);
                    const currentTime = Date.now() / 1000;

                    if (decodedToken && decodedToken.exp > currentTime) {
                        console.log("AuthContext: Found valid stored token. Decoding user data.");
                        try {
                            const parsedStoredUser = JSON.parse(storedUser);
                            // Reconstruct user object from decoded token (source of truth for core data)
                            // and include `requiresPasswordSetup` only if it was persisted for some reason,
                            // or assume false if just from token.
                            // The key is that after initial Google callback, this flag is transient.
                            const userFromTokenAndStorage = {
                                id: decodedToken.userId,
                                name: decodedToken.name,
                                email: decodedToken.email,
                                role: decodedToken.role,
                                phone_number: decodedToken.phone_number,
                                // IMPORTANT: Do NOT blindly set requiresPasswordSetup to false here.
                                // If the user was *previously* a Google-only user, the backend
                                // needs to tell you if they have a password.
                                // For now, if the user object from storage has it, use it, otherwise default to false.
                                requiresPasswordSetup: parsedStoredUser.requiresPasswordSetup === true // Check if true in stored user
                            };

                            setUser(userFromTokenAndStorage);
                            setToken(storedToken);
                            API.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;

                            // If user is on login/root page and already authenticated, redirect to home
                            // unless requiresPasswordSetup is true.
                            if (userFromTokenAndStorage.requiresPasswordSetup) {
                                if (location.pathname !== '/complete-profile') {
                                    console.log("AuthContext: Stored user requires password setup, redirecting to /complete-profile.");
                                    navigate('/complete-profile');
                                }
                            } else if (location.pathname === '/login' || location.pathname === '/') {
                                console.log("AuthContext: Stored user does NOT require password setup, navigating to /home.");
                                navigate('/home');
                            }

                        } catch (error) {
                            console.error("AuthContext: Error parsing stored user data, logging out.", error);
                            logout();
                        }
                    } else {
                        console.log("AuthContext: Stored token expired or invalid, logging out.");
                        logout();
                    }
                } else {
                    console.log("AuthContext: No stored token found.");
                    if (!['/login', '/register', '/forgot-password', '/auth/google/callback'].includes(location.pathname)) {
                        console.log("AuthContext: No auth session, redirecting to login.");
                        navigate('/login');
                    }
                }
            }
            setLoading(false);
            console.log("AuthContext: Authentication initialization complete. Loading is now false.");
        };

        initializeAuth();
    }, [location.search, location.pathname, navigate, logout, login]);

    useEffect(() => {
        if (token) {
            console.log("AuthContext: Setting Authorization header for API.");
            API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            console.log("AuthContext: Clearing Authorization header for API.");
            delete API.defaults.headers.common['Authorization'];
        }
    }, [token]);

    const authContextValue = {
        user,
        token,
        isAuthenticated: !!user && !!token,
        loading,
        login,
        logout,
        setUser,
        isAdmin: user && user.role === 'admin'
    };

    return (
        <AuthContext.Provider value={authContextValue}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};