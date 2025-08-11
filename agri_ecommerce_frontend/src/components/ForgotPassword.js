// src/components/ForgotPassword.js
import React, { useState, useEffect, useRef } from 'react'; // Import useEffect and useRef
import { Link } from 'react-router-dom';
import API from '../api';

const ForgotPassword = () => {
    // State variables for form inputs
    const [step, setStep] = useState(1); // 1: Send OTP, 2: Verify OTP, 3: Reset Password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    // State variables for UI messages
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // New states for OTP timer and loading animation
    const [otpSentLoading, setOtpSentLoading] = useState(false); // For "Send OTP" button loading
    const [resendTimer, setResendTimer] = useState(0); // Countdown for resend OTP
    const timerRef = useRef(null); // Ref to hold the timer interval

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

    // Handle sending OTP for password reset
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setOtpSentLoading(true); // Start loading animation

        try {
            const response = await API.post('/forgot-password/send-otp', { email });
            setMessage(response.data.message);
            setStep(2); // Move to verify OTP step
            setResendTimer(60); // Start 60-second timer for resend
        } catch (err) {
            console.error('Error sending OTP for password reset:', err.response?.data || err.message);
            setError(err.response?.data?.message || 'Failed to send OTP. Please check email or register.');
        } finally {
            setOtpSentLoading(false); // Stop loading animation
        }
    };

    // Handle resending OTP for password reset
    const handleResendOtp = async () => {
        setMessage('');
        setError('');
        if (resendTimer > 0) return; // Prevent resending if timer is active

        setOtpSentLoading(true); // Indicate loading for resend
        try {
            const response = await API.post('/forgot-password/send-otp', { email }); // Re-use send-otp endpoint
            setMessage(response.data.message || 'OTP resent successfully!');
            setResendTimer(60); // Reset timer
        } catch (err) {
            console.error('Error resending OTP:', err.response?.data || err.message);
            setError(err.response?.data?.message || 'Failed to resend OTP. Please try again.');
        } finally {
            setOtpSentLoading(false); // Stop loading for resend
        }
    };

    // Handle verifying OTP for password reset
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        try {
            const response = await API.post('/forgot-password/verify-otp', { email, otp });
            setMessage(response.data.message);
            setStep(3); // Move to reset password step
            setResendTimer(0); // Clear timer as OTP is verified
        } catch (err) {
            console.error('Error verifying OTP for password reset:', err.response?.data || err.message);
            setError(err.response?.data?.message || 'Invalid or expired OTP. Please try again.');
        }
    };

    // Handle resetting password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (newPassword !== confirmNewPassword) {
            return setError('Passwords do not match.');
        }
        if (newPassword.length < 6) {
            return setError('New password must be at least 6 characters long.');
        }

        try {
            const response = await API.post('/forgot-password/reset', { email, newPassword, confirmNewPassword });
            setMessage(response.data.message);
            // Optionally, redirect to login page after successful reset
            setTimeout(() => {
                // If you want to automatically redirect to login after a delay
                // navigate('/login');
            }, 3000);
            setStep(1); // Reset form for new attempts or guide user to login
            setEmail(''); // Clear email for a fresh start if needed
            setOtp(''); // Clear OTP
            setNewPassword(''); // Clear password fields
            setConfirmNewPassword('');
        } catch (err) {
            console.error('Error resetting password:', err.response?.data || err.message);
            setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.heading}>Forgot Password</h2>

                {message && <p style={styles.message}>{message}</p>}
                {error && <p style={styles.error}>{error}</p>}

                {/* Step 1: Enter Email to Send OTP */}
                {step === 1 && (
                    <form onSubmit={handleSendOtp} style={styles.form}>
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
                        <button
                            type="submit"
                            style={styles.button}
                            disabled={otpSentLoading}
                        >
                            {otpSentLoading ? (
                                <span style={styles.spinner}></span> // OTP sending animation
                            ) : (
                                'Send OTP'
                            )}
                        </button>
                    </form>
                )}

                {/* Step 2: Verify OTP */}
                {step === 2 && (
                    <form onSubmit={handleVerifyOtp} style={styles.form}>
                        <p style={styles.infoText}>An OTP has been sent to your email ({email}). Please check your inbox and spam folder.</p>
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
                        <button type="submit" style={styles.button}>Verify OTP</button>
                    </form>
                )}

                {/* Step 3: Reset Password */}
                {step === 3 && (
                    <form onSubmit={handleResetPassword} style={styles.form}>
                        <p style={styles.infoText}>Please set your new password.</p>
                        <div style={styles.formGroup}>
                            <label htmlFor="newPassword" style={styles.label}>New Password:</label>
                            <input
                                type="password"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                style={styles.input}
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label htmlFor="confirmNewPassword" style={styles.label}>Confirm New Password:</label>
                            <input
                                type="password"
                                id="confirmNewPassword"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                required
                                style={styles.input}
                            />
                        </div>
                        <button type="submit" style={styles.button}>Reset Password</button>
                    </form>
                )}

                <p style={styles.linkText}>
                    Remembered your password? <Link to="/login" style={styles.link}>Login here</Link>
                </p>
            </div>
        </div>
    );
};

// Simple inline styles (similar to others)
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
        transition: 'background-color 0.3s ease, opacity 0.3s ease',
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
    // New styles for OTP animation and resend button (copied from Register.js and Login.js)
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

export default ForgotPassword;