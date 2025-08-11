// src/components/Register.js
import React, { useState, useEffect, useRef } from 'react'; // Import useEffect and useRef
import { Link } from 'react-router-dom';
import API from '../api'; // Import your configured Axios instance
import { useAuth } from '../context/AuthContext'; // Import useAuth hook

const Register = () => {
    // State variables for form inputs and UI messages
    const [step, setStep] = useState(1); // 1: Send OTP, 2: Verify OTP & set password
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState(''); // For success/error messages
    const [error, setError] = useState('');     // For specific error details

    // New states for OTP timer and loading animation
    const [otpSentLoading, setOtpSentLoading] = useState(false); // For "Send OTP" button loading
    const [resendTimer, setResendTimer] = useState(0); // Countdown for resend OTP
    const timerRef = useRef(null); // Ref to hold the timer interval

    const { login } = useAuth(); // Get the login function from AuthContext

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

    // Handle sending OTP for registration
    const handleSendOtp = async (e) => {
        e.preventDefault(); // Prevent default form submission
        setMessage('');     // Clear previous messages
        setError('');       // Clear previous errors
        setOtpSentLoading(true); // Start loading animation

        try {
            const response = await API.post('/register/send-otp', { name, email });
            setMessage(response.data.message); // Display success message
            setStep(2); // Move to OTP verification step
            setResendTimer(60); // Start 60-second timer for resend
        } catch (err) {
            console.error('Error sending OTP:', err.response?.data || err.message);
            setError(err.response?.data?.message || 'Failed to send OTP. Please try again.'); // Display error message
        } finally {
            setOtpSentLoading(false); // Stop loading animation
        }
    };

    // Handle resending OTP
    const handleResendOtp = async () => {
        setMessage('');
        setError('');
        if (resendTimer > 0) return; // Prevent resending if timer is active

        setOtpSentLoading(true); // Indicate loading for resend
        try {
            const response = await API.post('/register/send-otp', { name, email }); // Re-use send-otp endpoint
            setMessage(response.data.message || 'OTP resent successfully!');
            setResendTimer(60); // Reset timer
        } catch (err) {
            console.error('Error resending OTP:', err.response?.data || err.message);
            setError(err.response?.data?.message || 'Failed to resend OTP. Please try again.');
        } finally {
            setOtpSentLoading(false); // Stop loading for resend
        }
    };

    // Handle verifying OTP and completing registration
    const handleVerifyOtpAndRegister = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (password !== confirmPassword) {
            return setError('Passwords do not match.');
        }
        if (password.length < 6) {
            return setError('Password must be at least 6 characters long.');
        }

        try {
            const response = await API.post('/register/verify-otp', { email, otp, password, confirmPassword });
            setMessage(response.data.message); // Display success message
            // Call login function from AuthContext to set user and token globally
            login(response.data.user, response.data.token);
            // Redirection to home is handled by login function in AuthContext
        } catch (err) {
            console.error('Error verifying OTP or registering:', err.response?.data || err.message);
            setError(err.response?.data?.message || 'Registration failed. Please check OTP and try again.');
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.heading}>User Registration</h2>

                {/* Display messages */}
                {message && <p style={styles.message}>{message}</p>}
                {error && <p style={styles.error}>{error}</p>}

                {/* Step 1: Enter Name & Email and Send OTP */}
                {step === 1 && (
                    <form onSubmit={handleSendOtp} style={styles.form}>
                        <div style={styles.formGroup}>
                            <label htmlFor="name" style={styles.label}>Name:</label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                style={styles.input}
                            />
                        </div>
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
                        <button type="submit" style={styles.button} disabled={otpSentLoading}>
                            {otpSentLoading ? (
                                <span style={styles.spinner}></span> // OTP sending animation
                            ) : (
                                'Send OTP'
                            )}
                        </button>
                    </form>
                )}

                {/* Step 2: Verify OTP and Set Password */}
                {step === 2 && (
                    <form onSubmit={handleVerifyOtpAndRegister} style={styles.form}>
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
                                onClick={handleResendOtp}
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
                        <div style={styles.formGroup}>
                            <label htmlFor="confirmPassword" style={styles.label}>Confirm Password:</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                style={styles.input}
                            />
                        </div>
                        <button type="submit" style={styles.button}>Register & Login</button>
                    </form>
                )}

                <p style={styles.linkText}>
                    Already have an account? <Link to="/login" style={styles.link}>Login here</Link>
                </p>
            </div>
        </div>
    );
};

// Updated and new styles
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
        width: 'calc(100% - 20px)', // Adjust for padding
        padding: '10px',
        borderRadius: '4px',
        border: '1px solid #ddd',
        fontSize: '16px',
        boxSizing: 'border-box', // Include padding in width
    },
    button: {
        backgroundColor: '#28a745', // Green color
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
        color: '#28a745', // Success green
        marginBottom: '15px',
        fontWeight: 'bold',
    },
    error: {
        color: '#dc3545', // Error red
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
    // New styles for OTP animation and resend button
    spinner: {
        border: '4px solid rgba(255, 255, 255, 0.3)',
        borderTop: '4px solid #fff',
        borderRadius: '50%',
        width: '20px',
        height: '20px',
        animation: 'spin 1s linear infinite', // CSS animation for spinning
        display: 'inline-block', // Ensure it's inline
    },
    '@keyframes spin': { // Define the keyframe animation
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' },
    },
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
    }
};

// Inject keyframes directly into a style tag or a global CSS file.
// For inline styles like this, you typically need to manage CSS animations
// by either using a CSS-in-JS library that supports keyframes,
// or by appending a style tag to the document head.
// For simplicity in this direct component update, we'll assume you have
// a global CSS file or equivalent where you can add the @keyframes spin.
// If you must keep it fully inline, it gets more complex (e.g., using styled-components
// or similar), but for a direct React component, the @keyframes in a separate CSS
// file is the most straightforward approach if you're not using a CSS-in-JS solution.
// For pure inline style, we can't directly define @keyframes within the style object.
// So, you'll need to add this to your `index.css` or `App.css` file:
/*
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
*/
// I've kept `@keyframes spin` in the styles object comment for clarity.
// Please add the `@keyframes spin` definition to your main CSS file (e.g., `src/index.css` or `src/App.css`).

export default Register;