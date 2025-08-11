// src/components/Login.js
import React, { useState, useEffect, useRef } from 'react'; // Import useEffect and useRef
import { Link, useNavigate } from 'react-router-dom'; // Add useNavigate
import API from '../api';
import { useAuth } from '../context/AuthContext';
import GoogleAuthButton from './GoogleAuthButton'; // Import Google login button

const Login = () => {
    const navigate = useNavigate(); // Add useNavigate hook
    // State for login method selection
    const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'otp'

    // State variables for form inputs
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');

    // State variables for UI messages
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // New states for OTP timer and loading animation
    const [otpSentLoading, setOtpSentLoading] = useState(false); // For "Send OTP" button loading
    const [resendTimer, setResendTimer] = useState(0); // Countdown for resend OTP
    const timerRef = useRef(null); // Ref to hold the timer interval

    const { login, isAuthenticated } = useAuth(); // Also get isAuthenticated

    // Add effect to handle redirection when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/home');
        }
    }, [isAuthenticated, navigate]);

    // Effect for the resend OTP timer
    useEffect(() => {
        if (resendTimer > 0) {
            timerRef.current = setInterval(() => {
                setResendTimer((prevTime) => prevTime - 1);
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        // Cleanup function to clear interval if component unmounts
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [resendTimer]);

    // Handle login with Email and Password
    const handlePasswordLogin = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        try {
            const response = await API.post('/login/password', { email, password });
            await login(response.data.user, response.data.token); // Use await here
            setMessage(response.data.message);
        } catch (err) {
            console.error('Error with password login:', err.response?.data || err.message);
            setError(err.response?.data?.message || 'Login failed. Invalid credentials.');
        }
    };

    // Handle sending OTP for login
    const handleSendOtpForLogin = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setOtpSentLoading(true); // Start loading animation

        try {
            const response = await API.post('/login/send-otp', { email });
            setMessage(response.data.message);
            setResendTimer(60); // Start 60-second timer for resend
            // No explicit state change to step 2 here, as the OTP form is always visible
            // after selecting OTP login method. Just inform user OTP sent.
        } catch (err) {
            console.error('Error sending OTP for login:', err.response?.data || err.message);
            setError(err.response?.data?.message || 'Failed to send OTP. Please check email or register.');
        } finally {
            setOtpSentLoading(false); // Stop loading animation
        }
    };

    // Handle resending OTP for login
    const handleResendOtpForLogin = async () => {
        setMessage('');
        setError('');
        if (resendTimer > 0) return; // Prevent resending if timer is active

        setOtpSentLoading(true); // Indicate loading for resend
        try {
            const response = await API.post('/login/send-otp', { email }); // Re-use send-otp endpoint
            setMessage(response.data.message || 'OTP resent successfully!');
            setResendTimer(60); // Reset timer
        } catch (err) {
            console.error('Error resending OTP:', err.response?.data || err.message);
            setError(err.response?.data?.message || 'Failed to resend OTP. Please try again.');
        } finally {
            setOtpSentLoading(false); // Stop loading for resend
        }
    };


    // Handle verifying OTP for login
    const handleOtpLogin = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        try {
            const response = await API.post('/login/verify-otp', { email, otp });
            await login(response.data.user, response.data.token); // Use await here
            setMessage(response.data.message);
        } catch (err) {
            console.error('Error with OTP login:', err.response?.data || err.message);
            setError(err.response?.data?.message || 'OTP login failed. Invalid or expired OTP.');
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.heading}>User Login</h2>

                {message && <p style={styles.message}>{message}</p>}
                {error && <p style={styles.error}>{error}</p>}

                <div style={styles.methodToggle}>
                    <button
                        style={{ ...styles.toggleButton, ...(loginMethod === 'password' ? styles.toggleButtonActive : {}) }}
                        onClick={() => { setLoginMethod('password'); setMessage(''); setError(''); setOtp(''); setPassword(''); setResendTimer(0); }} // Reset timer
                    >
                        Login with Password
                    </button>
                    <button
                        style={{ ...styles.toggleButton, ...(loginMethod === 'otp' ? styles.toggleButtonActive : {}) }}
                        onClick={() => { setLoginMethod('otp'); setMessage(''); setError(''); setOtp(''); setPassword(''); setResendTimer(0); }} // Reset timer
                    >
                        Login with OTP
                    </button>
                </div>

                {/* Password Login Form */}
                {loginMethod === 'password' && (
                    <form onSubmit={handlePasswordLogin} style={styles.form}>
                        <div style={styles.formGroup}>
                            <label htmlFor="email" style={styles.label}>Email:</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={styles.input}
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label htmlFor="password" style={styles.label}>Password:</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={styles.input}
                            />
                        </div>
                        <button type="submit" style={styles.button}>Login</button>
                        <p style={styles.linkText}>
                            <Link to="/forgot-password" style={styles.link}>Forgot Password?</Link>
                        </p>
                    </form>
                )}

                {/* OTP Login Form */}
                {loginMethod === 'otp' && (
                    <form onSubmit={handleOtpLogin} style={styles.form}>
                        <div style={styles.formGroup}>
                            <label htmlFor="emailOtp" style={styles.label}>Email:</label>
                            <input
                                type="email"
                                id="emailOtp"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={styles.input}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleSendOtpForLogin}
                            style={{
                                ...styles.button,
                                marginBottom: '10px',
                                backgroundColor: '#007bff',
                                opacity: otpSentLoading ? 0.6 : 1, // Dim when loading
                                cursor: otpSentLoading ? 'not-allowed' : 'pointer',
                            }}
                            disabled={otpSentLoading}
                        >
                            {otpSentLoading ? (
                                <span style={styles.spinner}></span> // OTP sending animation
                            ) : (
                                'Send OTP'
                            )}
                        </button>

                        {/* Display OTP field only if OTP has been sent and message confirms */}
                        {(message.includes('OTP sent') || resendTimer > 0) && ( // Heuristic check if OTP was sent successfully
                            <>
                                <p style={styles.infoText}>An OTP has been sent to your email. Please check your inbox and spam folder.</p>
                                <div style={styles.formGroup}>
                                    <label htmlFor="otp" style={styles.label}>OTP:</label>
                                    <input
                                        type="text"
                                        id="otp"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        required
                                        maxLength="6"
                                        style={styles.input}
                                    />
                                    {/* Resend OTP button with timer */}
                                    <button
                                        type="button"
                                        onClick={handleResendOtpForLogin}
                                        disabled={resendTimer > 0 || otpSentLoading}
                                        style={{
                                            ...styles.resendButton,
                                            opacity: resendTimer > 0 || otpSentLoading ? 0.6 : 1,
                                            cursor: resendTimer > 0 || otpSentLoading ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {otpSentLoading ? (
                                            <span style={styles.spinner}></span> // Loading for resend
                                        ) : resendTimer > 0 ? (
                                            `Resend OTP in ${resendTimer}s`
                                        ) : (
                                            'Resend OTP'
                                        )}
                                    </button>
                                </div>
                                <button type="submit" style={styles.button}>Verify OTP & Login</button>
                            </>
                        )}
                    </form>
                )}

                <div style={styles.divider}>OR</div>

                {/* Google Login Button */}
                <GoogleAuthButton />

                <p style={styles.linkText}>
                    Don't have an account? <Link to="/register" style={styles.link}>Register here</Link>
                </p>
            </div>
        </div>
    );
};

// Simple inline styles (similar to Register.js)
const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f0f2f5',
        padding: '20px',
    },
    card: {
        backgroundColor: '#fff',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center',
    },
    heading: {
        marginBottom: '25px',
        color: '#333',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        marginTop: '20px',
    },
    formGroup: {
        textAlign: 'left',
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        fontWeight: 'bold',
        color: '#555',
    },
    input: {
        width: 'calc(100% - 20px)',
        padding: '10px',
        borderRadius: '4px',
        border: '1px solid #ddd',
        fontSize: '16px',
        boxSizing: 'border-box',
    },
    button: {
        backgroundColor: '#28a745',
        color: '#fff',
        padding: '12px 20px',
        borderRadius: '4px',
        border: 'none',
        fontSize: '18px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease, opacity 0.3s ease', // Added opacity for disabled state
        display: 'flex', // For centering spinner
        justifyContent: 'center',
        alignItems: 'center',
    },
    // No specific buttonHover needed with inline styles as opacity handles disabled
    message: {
        color: '#28a745',
        marginBottom: '15px',
        fontWeight: 'bold',
    },
    error: {
        color: '#dc3545',
        marginBottom: '15px',
        fontWeight: 'bold',
    },
    linkText: {
        marginTop: '20px',
        color: '#666',
    },
    link: {
        color: '#007bff',
        textDecoration: 'none',
        fontWeight: 'bold',
    },
    methodToggle: {
        display: 'flex',
        justifyContent: 'space-around',
        marginBottom: '20px',
        borderBottom: '1px solid #eee',
    },
    toggleButton: {
        flex: 1,
        padding: '10px 15px',
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        fontSize: '16px',
        color: '#555',
        position: 'relative',
        paddingBottom: '12px',
        transition: 'color 0.3s ease',
    },
    toggleButtonActive: {
        fontWeight: 'bold',
        color: '#28a745',
        borderBottom: '3px solid #28a745',
    },
    divider: {
        margin: '20px 0',
        color: '#aaa',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Using explicit styles for ::before and ::after as inline styles don't support pseudo-elements directly.
    // If you need actual lines, you'd apply this to a parent div and use children.
    // For simplicity, the `divider` div will just contain the "OR" text.
    // For real lines, you'd ideally use a CSS class or styled-components.
    // E.g., <div className="divider"><span>OR</span></div> and then
    // .divider { display: flex; align-items: center; }
    // .divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid #eee; }
    // .divider::before { margin-right: 10px; }
    // .divider::after { margin-left: 10px; }


    // New styles for OTP animation and resend button (copied from Register.js)
    spinner: {
        border: '4px solid rgba(255, 255, 255, 0.3)',
        borderTop: '4px solid #fff',
        borderRadius: '50%',
        width: '20px',
        height: '20px',
        animation: 'spin 1s linear infinite', // CSS animation for spinning
        display: 'inline-block', // Ensure it's inline
    },
    // Note: @keyframes spin needs to be in a global CSS file (e.g., src/index.css or src/App.css)
    resendButton: {
        backgroundColor: '#007bff', // Blue for resend
        color: '#fff',
        padding: '8px 12px',
        borderRadius: '4px',
        border: 'none',
        fontSize: '14px',
        cursor: 'pointer',
        marginTop: '10px',
        transition: 'background-color 0.3s ease, opacity 0.3s ease',
        width: '100%', // Make it full width like other inputs/buttons
        boxSizing: 'border-box',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoText: {
        fontSize: '14px',
        color: '#666',
        marginBottom: '15px',
        textAlign: 'center', // Center text for better readability
    }
};

export default Login;