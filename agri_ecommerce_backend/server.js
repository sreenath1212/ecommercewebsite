// server.js

// Load environment variables from .env file
require('dotenv').config();

// Import necessary modules
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch'); // Add this at the top if not already present

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse JSON bodies from incoming requests
app.use(express.json());

// Configure CORS to allow requests from your React frontend and Render domains
app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://your-frontend-app-name.onrender.com', // Replace with your actual frontend Render URL
        process.env.FRONTEND_URL // Environment variable for frontend URL
    ].filter(Boolean),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
}));

// Add this global request logger middleware (keep for debugging)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] Incoming request: ${req.method} ${req.originalUrl}`);
    console.log('Request Headers:', req.headers);
    console.log('Request Body:', req.body);
    next();
});

// Initialize Passport for Google OAuth
app.use(passport.initialize());


// Configure PostgreSQL connection pool
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Test database connection
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    console.log('Successfully connected to PostgreSQL database!');
    client.release();
});

// Configure Nodemailer transporter for sending emails
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    logger: true,
    debug: true,
});


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
},
async (accessToken, refreshToken, profile, done) => {
    try {
        const client = await pool.connect();
        let user = null;
        let requiresPasswordSetup = false; // Flag to indicate if user needs to set a password

        // Extract email (handle potential missing email or multiple emails)
        const userEmail = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;

        if (!userEmail) {
            console.error('Google profile did not provide an email address.');
            client.release();
            return done(new Error('Google account must have an email address.'), false);
        }

        // 1. Check if user already exists with Google ID
        const googleUserRes = await client.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
        if (googleUserRes.rows.length > 0) {
            user = googleUserRes.rows[0];
            // User found via Google ID, they are effectively logged in
            // No password setup needed
            console.log(`[GoogleAuth] User found by Google ID: ${user.email}`);

        } else {
            // 2. Check if user exists with the same email, but without Google ID
            const emailUserRes = await client.query('SELECT * FROM users WHERE email = $1', [userEmail]);
            if (emailUserRes.rows.length > 0) {
                // Link existing user account with Google ID
                user = emailUserRes.rows[0];
                if (!user.google_id) { // Only update if not already linked
                    await client.query('UPDATE users SET google_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [profile.id, user.id]);
                    console.log(`[GoogleAuth] Linked existing email user to Google ID: ${user.email}`);
                }

                // *** CRITICAL CHANGE HERE: Check if the existing user has a password_hash ***
                if (!user.password_hash) {
                    requiresPasswordSetup = true;
                    console.log(`[GoogleAuth] Linked user ${user.email} has no password, requires setup.`);
                } else {
                    console.log(`[GoogleAuth] Linked user ${user.email} already has a password.`);
                }

            } else {
                // 3. Create new user for Google login (if neither Google ID nor email found)
                // Include 'role' for new users (default 'user')
                const newUserRes = await client.query(
                    'INSERT INTO users (name, email, google_id, is_verified, role) VALUES ($1, $2, $3, TRUE, $4) RETURNING *',
                    [profile.displayName || profile.name.givenName || userEmail, userEmail, profile.id, 'user'] // Default role 'user'
                );
                user = newUserRes.rows[0];
                // New user created via Google, they *don't* have a password yet.
                // So, we'll ask them to set one for traditional login.
                requiresPasswordSetup = true; // <--- THIS IS KEY FOR NEW USERS
                console.log(`[GoogleAuth] Created NEW user via Google: ${user.email}. Requires password setup: ${requiresPasswordSetup}`);
            }
        }
        client.release();
        // Pass the user and the flag to the next middleware (the callback route)
        return done(null, user, { requiresPasswordSetup: requiresPasswordSetup });
    } catch (err) {
        console.error('Error during Google OAuth:', err);
        return done(err, false);
    }
}));

// Serialize and deserialize user for session (though we'll primarily use JWT, this is good practice for Passport)
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT * FROM users WHERE id = $1', [id]);
        client.release();
        done(null, res.rows[0]);
    } catch (err) {
        done(err, null);
    }
});


// Utility function to generate a 6-digit OTP
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Utility function to send email
const sendEmail = async (to, subject, text, html) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: to,
            subject: subject,
            text: text,
            html: html,
        });
        console.log(`Email sent to ${to} with subject: ${subject}`);
    } catch (error) {
        console.error(`Error sending email to ${to}:`, error);
        console.error('Nodemailer error details:', JSON.stringify(error, null, 2));
        throw new Error('Failed to send email');
    }
};


// Middleware to verify JWT token (for protected routes)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: 'Authentication token required.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT verification error:', err);
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }
        req.user = user; // user object from JWT payload
        next();
    });
};

// NEW MIDDLEWARE: Authenticate Admin
const authenticateAdmin = (req, res, next) => {
    // First, ensure the user is authenticated
    authenticateToken(req, res, () => {
        // Then, check if the authenticated user has the 'admin' role
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }
        next();
    });
};


// --- AUTHENTICATION ROUTES ---

// Route: Send OTP for Registration
app.post('/api/register/send-otp', async (req, res) => {
    console.log('--- Received request to /api/register/send-otp ---');
    console.log('Request body:', req.body);

    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({ message: 'Name and email are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: 'Invalid email format.' });
    }

    const client = await pool.connect();
    try {
        const userExists = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(409).json({ message: 'User with this email already exists. Please login or use forgot password.' });
        }

        const otp = generateOtp();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        // Include 'role' for new registrations (default 'user')
        await client.query(
            `INSERT INTO users (name, email, otp, otp_expiry, is_verified, role)
             VALUES ($1, $2, $3, $4, FALSE, $5)
             ON CONFLICT (email) DO UPDATE
             SET name = EXCLUDED.name, otp = EXCLUDED.otp, otp_expiry = EXCLUDED.otp_expiry, updated_at = CURRENT_TIMESTAMP
             WHERE users.is_verified = FALSE RETURNING *;`,
            [name, email, otp, otpExpiry, 'user'] // Default role 'user'
        );

        const emailSubject = 'Your Agri-Ecommerce Registration OTP';
        const emailText = `Your OTP for Agri-Ecommerce registration is: ${otp}. This OTP is valid for 10 minutes.`;
        const emailHtml = `<p>Your OTP for Agri-Ecommerce registration is: <strong>${otp}</strong></p>
                            <p>This OTP is valid for 10 minutes.</p>`;

        await sendEmail(email, emailSubject, emailText, emailHtml);

        res.status(200).json({ message: 'OTP sent to your email. Please verify to complete registration.' });

    } catch (error) {
        console.error('Error sending OTP for registration:', error);
        res.status(500).json({ message: 'Failed to send OTP. Please try again later.', error: error.message });
    } finally {
        client.release();
    }
});

// Route: Verify OTP and Complete Registration
app.post('/api/register/verify-otp', async (req, res) => {
    const { email, otp, password, confirmPassword } = req.body;

    if (!email || !otp || !password || !confirmPassword) {
        return res.status(400).json({ message: 'Email, OTP, password, and confirm password are required.' });
    }
    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT id, otp, otp_expiry, is_verified, role FROM users WHERE email = $1', // Select role here
            [email]
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'User not found or OTP not requested for this email.' });
        }
        if (user.is_verified) {
            return res.status(400).json({ message: 'This email is already verified. Please proceed to login.' });
        }

        if (user.otp !== otp || new Date() > new Date(user.otp_expiry)) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const updateRes = await client.query(
            `UPDATE users SET password_hash = $1, is_verified = TRUE, otp = NULL, otp_expiry = NULL, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 RETURNING id, name, email, role`, // Return role
            [hashedPassword, user.id]
        );

        const registeredUser = updateRes.rows[0];

        const token = jwt.sign(
            { userId: registeredUser.id, email: registeredUser.email, name: registeredUser.name, role: registeredUser.role }, // Include role in JWT
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(201).json({ message: 'Registration successful!', token: token, user: { id: registeredUser.id, name: registeredUser.name, email: registeredUser.email, role: registeredUser.role } });

    } catch (error) {
        console.error('Error verifying OTP and registering user:', error);
        res.status(500).json({ message: 'Registration failed. Please try again.', error: error.message });
    } finally {
        client.release();
    }
});

// Route: Login with Email and Password
app.post('/api/login/password', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || !user.password_hash) {
            return res.status(400).json({ message: 'Invalid credentials or user not registered with password. Try OTP login or Google.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        if (!user.is_verified) {
            return res.status(403).json({ message: 'Your email is not verified. Please complete verification or try OTP login.' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, name: user.name, role: user.role }, // Include role in JWT
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({ message: 'Login successful!', token: token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });

    } catch (error) {
        console.error('Error logging in with password:', error);
        res.status(500).json({ message: 'Login failed. Please try again.', error: error.message });
    } finally {
        client.release();
    }
});

// Route: Send OTP for Login
app.post('/api/login/send-otp', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }

    const client = await pool.connect();
    try {
        const result = await client.query('SELECT id, is_verified, role FROM users WHERE email = $1', [email]); // Select role
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'No user found with this email. Please register.' });
        }
        if (!user.is_verified) {
            return res.status(403).json({ message: 'Your email is not verified. Please complete registration verification first.' });
        }

        const otp = generateOtp();
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

        await client.query(
            'UPDATE users SET otp = $1, otp_expiry = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [otp, otpExpiry, user.id]
        );

        const emailSubject = 'Your APAS AGRI-HORTY Login OTP';
        const emailText = `Your OTP for Agri-Ecommerce login is: ${otp}. This OTP is valid for 5 minutes.`;
        const emailHtml = `<p>Your OTP for Agri-Ecommerce login is: <strong>${otp}</strong></p>
                            <p>This OTP is valid for 5 minutes.</p>`;

        await sendEmail(email, emailSubject, emailText, emailHtml);

        res.status(200).json({ message: 'OTP sent to your email for login.' });

    } catch (error) {
        console.error('Error sending OTP for login:', error);
        res.status(500).json({ message: 'Failed to send OTP. Please try again later.', error: error.message });
    } finally {
        client.release();
    }
});

// Route: Verify OTP for Login
app.post('/api/login/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT id, name, email, otp, otp_expiry, is_verified, role FROM users WHERE email = $1', // Select role
            [email]
        );
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'User not found or OTP not requested.' });
        }
        if (!user.is_verified) {
            return res.status(403).json({ message: 'Your email is not verified. Please complete registration verification first.' });
        }

        if (user.otp !== otp || new Date() > new Date(user.otp_expiry)) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        await client.query(
            'UPDATE users SET otp = NULL, otp_expiry = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        const token = jwt.sign(
            { userId: user.id, email: user.email, name: user.name, role: user.role }, // Include role in JWT
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({ message: 'Login successful!', token: token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });

    } catch (error) {
        console.error('Error verifying OTP for login:', error);
        res.status(500).json({ message: 'Login failed. Please try again.', error: error.message });
    } finally {
        client.release();
    }
});


// Route: Send OTP for Forgot Password
app.post('/api/forgot-password/send-otp', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }

    const client = await pool.connect();
    try {
        const result = await client.query('SELECT id, is_verified FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'No user found with this email.' });
        }
        if (!user.is_verified) {
            return res.status(403).json({ message: 'Your email is not verified. Please complete registration verification first.' });
        }

        const otp = generateOtp();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        await client.query(
            'UPDATE users SET otp = $1, otp_expiry = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [otp, otpExpiry, user.id]
        );

        const emailSubject = 'Agri-Ecommerce Password Reset OTP';
        const emailText = `Your OTP for resetting your Agri-Ecommerce password is: ${otp}. This OTP is valid for 10 minutes.`;
        const emailHtml = `<p>Your OTP for resetting your Agri-Ecommerce password is: <strong>${otp}</strong></p>
                            <p>This OTP is valid for 10 minutes.</p>`;

        await sendEmail(email, emailSubject, emailText, emailHtml);

        res.status(200).json({ message: 'OTP sent to your email for password reset.' });

    } catch (error) {
        console.error('Error sending OTP for forgot password:', error);
        res.status(500).json({ message: 'Failed to send OTP. Please try again later.', error: error.message });
    } finally {
        client.release();
    }
});

// Route: Verify OTP for Forgot Password (before allowing reset)
app.post('/api/forgot-password/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT id, otp, otp_expiry FROM users WHERE email = $1',
            [email]
        );
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'User not found or OTP not requested.' });
        }

        if (user.otp !== otp || new Date() > new Date(user.otp_expiry)) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        res.status(200).json({ message: 'OTP verified successfully. You can now reset your password.' });

    } catch (error) {
        console.error('Error verifying OTP for forgot password:', error);
        res.status(500).json({ message: 'OTP verification failed. Please try again.', error: error.message });
    } finally {
        client.release();
    }
});


// Route: Reset Password (after OTP verification)
app.post('/api/forgot-password/reset', async (req, res) => {
    const { email, newPassword, confirmNewPassword } = req.body;

    if (!email || !newPassword || !confirmNewPassword) {
        return res.status(400).json({ message: 'Email, new password, and confirm new password are required.' });
    }
    if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ message: 'New passwords do not match.' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT id, otp, otp_expiry FROM users WHERE email = $1',
            [email]
        );
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'User not found or OTP process not initiated.' });
        }

        if (!user.otp || new Date() > new Date(user.otp_expiry)) {
            return res.status(400).json({ message: 'OTP either expired or not verified. Please re-initiate forgot password process.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await client.query(
            `UPDATE users SET password_hash = $1, otp = NULL, otp_expiry = NULL, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [hashedPassword, user.id]
        );

        const emailSubject = 'Your Agri-Ecommerce Password Has Been Reset';
        const emailText = `Your password for Agri-Ecommerce account associated with ${email} has been successfully reset. If you did not authorize this, please contact support immediately.`;
        const emailHtml = `<p>Your password for Agri-Ecommerce account associated with <strong>${email}</strong> has been successfully reset.</p>
                            <p>If you did not authorize this, please contact support immediately.</p>`;
        await sendEmail(email, emailSubject, emailText, emailHtml);


        res.status(200).json({ message: 'Your password has been successfully reset. You can now login with your new password.' });

    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'Failed to reset password. Please try again.', error: error.message });
    } finally {
        client.release();
    }
});


// Google OAuth routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login', session: false }),
    (req, res) => {
        const requiresPasswordSetup = req.authInfo ? req.authInfo.requiresPasswordSetup : false;
        
        const token = jwt.sign(
    {
        userId: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role || 'user', // Ensure role is in token, default to 'user'
        phone_number: req.user.phone_number || null // <--- ADD THIS LINE
    },
        
  // Include role in JWT
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        const frontendRedirectUrl = new URL('http://localhost:3000');
        frontendRedirectUrl.searchParams.append('token', token);
        frontendRedirectUrl.searchParams.append('id', req.user.id);
        frontendRedirectUrl.searchParams.append('name', req.user.name);
        frontendRedirectUrl.searchParams.append('email', req.user.email);
        frontendRedirectUrl.searchParams.append('googleId', req.user.google_id);
        frontendRedirectUrl.searchParams.append('requiresPasswordSetup', requiresPasswordSetup.toString());
        frontendRedirectUrl.searchParams.append('role', req.user.role); // Include role in redirect

        if (req.user.phone_number) { // <--- ADD THIS CONDITIONAL CHECK
    frontendRedirectUrl.searchParams.append('phone_number', req.user.phone_number); // <--- ADD THIS LINE
}

        // *** THIS IS THE ONLY RESPONSE YOU SHOULD SEND ***
        res.redirect(frontendRedirectUrl.toString());

        // *** REMOVED: This redundant res.status().json() call that caused the error ***
        // res.status(200).json({
        //     message: requiresPasswordSetup ? 'Google login successful! Please set a password for future email/password logins.' : 'Google login successful!',
        //     token: token,
        //     user: {
        //         id: req.user.id,
        //         name: req.user.name,
        //         email: req.user.email,
        //         googleId: req.user.google_id
        //     },
        //     requiresPasswordSetup: requiresPasswordSetup
        // });
    }
);

// Route: Set Password for Google-authenticated users
// Endpoint: /api/user/set-password
// Method: POST
// Description: Allows a Google-authenticated user to set a password for email/password login.
app.post('/api/user/set-password', authenticateToken, async (req, res) => {
    const { password } = req.body; // Only need password, email is from req.user
    const userId = req.user.userId; // Get userId from authenticated JWT

    if (!password) {
        return res.status(400).json({ message: 'Password is required.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const client = await pool.connect();
    try {
        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user's password_hash
        await client.query(
            `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [hashedPassword, userId]
        );

        res.status(200).json({ message: 'Password set successfully!' });

    } catch (error) {
        console.error('Error setting password for user:', userId, error);
        res.status(500).json({ message: 'Failed to set password. Please try again.', error: error.message });
    } finally {
        client.release();
    }
});


// --- USER PROFILE & ADDRESS ROUTES ---

// Route: Get User Profile (Name, Email, Phone Number, Role)
// Endpoint: /api/user/profile
// Method: GET
// Description: Returns the authenticated user's name, email, phone_number, and role.
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        // req.user is populated by authenticateToken middleware
        const userId = req.user.userId;

        const result = await client.query(
            'SELECT name, email, phone_number, role FROM users WHERE id = $1', // Select role here
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({
            name: result.rows[0].name,
            email: result.rows[0].email,
            phone_number: result.rows[0].phone_number,
            role: result.rows[0].role // Include role in response
        });

    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Failed to fetch user profile.', error: error.message });
    } finally {
        client.release();
    }
});


// Route: Update User Profile (Name and Phone Number)
// Endpoint: /api/user/profile
// Method: PUT
// Description: Allows an authenticated user to update their name and/or phone number.
app.put('/api/user/profile', authenticateToken, async (req, res) => {
    const { name, phone_number } = req.body;
    const userId = req.user.userId; // From authenticateToken middleware

    if (name === undefined && phone_number === undefined) {
        return res.status(400).json({ message: 'At least one field (name or phone_number) is required for update.' });
    }

    const client = await pool.connect();
    try {
        let updateFields = [];
        let queryParams = [userId]; // $1 will always be userId in the WHERE clause
        let paramIndex = 1; // Counter for dynamic parameters

        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim() === '') {
                return res.status(400).json({ message: 'Name must be a non-empty string.' });
            }
            paramIndex++; // Increment for the new parameter
            updateFields.push(`name = $${paramIndex}`);
            queryParams.push(name.trim()); // Add the name value
        }

        if (phone_number !== undefined) {
            // Allow null to clear phone number, but validate if not null/empty string
            if (phone_number !== null && phone_number !== '' && !/^\d{10,15}$/.test(phone_number)) {
                return res.status(400).json({ message: 'Invalid phone number format. Must be 10-15 digits or null/empty.' });
            }
            paramIndex++; // Increment for the new parameter
            // Ensure null is stored for empty string
            queryParams.push(phone_number === '' ? null : phone_number);
            updateFields.push(`phone_number = $${paramIndex}`);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'No valid fields provided for update.' });
        }

        const query = `
            UPDATE users
            SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, name, email, phone_number, role;
        `;
        
        const result = await client.query(query, queryParams);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({
            message: 'Profile updated successfully!',
            user: {
                id: result.rows[0].id,
                name: result.rows[0].name,
                email: result.rows[0].email,
                phone_number: result.rows[0].phone_number,
                role: result.rows[0].role // Include role in response
            }
        });

    } catch (error) {
        console.error('Error updating user profile (name/phone):', error);
        res.status(500).json({ message: 'Failed to update profile. Please try again.', error: error.message });
    } finally {
        client.release();
    }
});

// --- ADMIN ROUTES ---
// All routes under /api/admin will be protected by authenticateAdmin middleware

// Route: Get All Users (Admin Only)
// Endpoint: /api/admin/users
// Method: GET
// Description: Returns a list of all users with pagination and search.
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const client = await pool.connect();
    try {
        let query = `
            SELECT 
                id, 
                name, 
                email, 
                phone_number, 
                is_verified, 
                role, 
                created_at, 
                updated_at,
                google_id IS NOT NULL as has_google_auth,
                password_hash IS NOT NULL as has_password
            FROM users
            WHERE ($1 = '' OR 
                  name ILIKE $2 OR 
                  email ILIKE $2)
        `;

        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) 
            FROM users 
            WHERE ($1 = '' OR 
                  name ILIKE $2 OR 
                  email ILIKE $2)
        `;

        const searchPattern = `%${search}%`;
        
        // Execute count query
        const totalCount = await client.query(countQuery, [search, searchPattern]);
        
        // Add pagination to main query
        query += ` ORDER BY created_at DESC LIMIT $3 OFFSET $4`;
        
        // Execute main query with pagination
        const result = await client.query(query, [search, searchPattern, limit, offset]);

        // Format the response
        const response = {
            users: result.rows,
            pagination: {
                total: parseInt(totalCount.rows[0].count),
                page: parseInt(page),
                limit: parseInt(limit),
                total_pages: Math.ceil(totalCount.rows[0].count / limit)
            }
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Error fetching all users (admin):', error);
        res.status(500).json({ 
            message: 'Failed to fetch users.', 
            error: error.message,
            details: 'An error occurred while retrieving the user list.'
        });
    } finally {
        client.release();
    }
});

// Route: Get Single User by ID (Admin Only)
// Endpoint: /api/admin/users/:id
// Method: GET
// Description: Returns details of a specific user with additional information.
app.get('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
    const userId = req.params.id;
    
    if (!userId || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID provided.' });
    }

    const client = await pool.connect();
    try {
        // Get user details
        const userQuery = `
            SELECT 
                u.id, 
                u.name, 
                u.email, 
                u.phone_number, 
                u.is_verified, 
                u.role, 
                u.created_at, 
                u.updated_at,
                u.google_id IS NOT NULL as has_google_auth,
                u.password_hash IS NOT NULL as has_password,
                COUNT(a.id) as address_count
            FROM users u
            LEFT JOIN addresses a ON u.id = a.user_id
            WHERE u.id = $1
            GROUP BY u.id
        `;
        
        const result = await client.query(userQuery, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                message: 'User not found.',
                details: `No user exists with ID: ${userId}`
            });
        }

        // Get user's addresses
        const addressesQuery = `
            SELECT * FROM addresses 
            WHERE user_id = $1 
            ORDER BY is_default DESC, created_at DESC
        `;
        const addressesResult = await client.query(addressesQuery, [userId]);

        // Combine user data with addresses
        const userData = {
            ...result.rows[0],
            addresses: addressesResult.rows
        };

        res.status(200).json(userData);
    } catch (error) {
        console.error('Error fetching single user (admin):', error);
        res.status(500).json({ 
            message: 'Failed to fetch user details.',
            error: error.message,
            details: `An error occurred while retrieving details for user ID: ${userId}`
        });
    } finally {
        client.release();
    }
});

// Route: Get user's cart
app.get('/api/admin/users/:id/cart', authenticateAdmin, async (req, res) => {
    const userId = req.params.id;
    
    const client = await pool.connect();
    try {
        const cartItems = await client.query(
            `SELECT 
                ci.id as cart_item_id,
                ci.quantity,
                p.id as product_id,
                p.name,
                p.price,
                p.image_url,
                p.stock,
                c.name as category_name
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE ci.user_id = $1
            ORDER BY ci.created_at DESC`,
            [userId]
        );

        // Calculate total
        const total = cartItems.rows.reduce((sum, item) => {
            return sum + (parseFloat(item.price) * item.quantity);
        }, 0);

        res.json({
            items: cartItems.rows,
            total: total
        });
    } catch (err) {
        console.error('Error fetching user cart:', err);
        res.status(500).json({ message: 'Failed to fetch user cart' });
    } finally {
        client.release();
    }
});

// Route: Get User's Favorites (Admin Only)
app.get('/api/admin/users/:id/favorites', authenticateAdmin, async (req, res) => {
    const userId = req.params.id;
    
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT f.id as favorite_id, f.created_at,
                    p.*, c.name as category_name
             FROM favorites f
             JOIN products p ON f.product_id = p.id
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE f.user_id = $1
             ORDER BY f.created_at DESC`,
            [userId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching user favorites:', err);
        res.status(500).json({ message: 'Failed to fetch user favorites' });
    } finally {
        client.release();
    }
});

// Route: Get User's Wishlist (Admin Only)
app.get('/api/admin/users/:id/wishlist', authenticateAdmin, async (req, res) => {
    const userId = req.params.id;
    
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT w.id as wishlist_id, w.created_at,
                    p.*, c.name as category_name
             FROM wishlist w
             JOIN products p ON w.product_id = p.id
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE w.user_id = $1
             ORDER BY w.created_at DESC`,
            [userId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching user wishlist:', err);
        res.status(500).json({ message: 'Failed to fetch user wishlist' });
    } finally {
        client.release();
    }
});

// Route: Update User Details (Admin Only)
// Endpoint: /api/admin/users/:id
// Method: PUT
// Description: Allows an admin to update a user's name, email, phone, role, verification status, and addresses.
app.put('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
    const targetUserId = req.params.id;
    const { name, email, phone_number, is_verified, role, addresses } = req.body;

    if (!name || !email || is_verified === undefined || !role) {
        return res.status(400).json({ message: 'Name, email, is_verified, and role are required fields for update.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: 'Invalid email format.' });
    }
    if (phone_number !== null && phone_number !== '' && !/^\d{10,15}$/.test(phone_number)) {
        return res.status(400).json({ message: 'Invalid phone number format. Must be 10-15 digits or null/empty.' });
    }
    if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role specified. Must be "user" or "admin".' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Start transaction

        // Check if the new email is already taken by another user
        const emailConflict = await client.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, targetUserId]);
        if (emailConflict.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: 'This email is already taken by another user.' });
        }

        // Update user details
        const userResult = await client.query(
            `UPDATE users
             SET name = $1, email = $2, phone_number = $3, is_verified = $4, role = $5, updated_at = CURRENT_TIMESTAMP
             WHERE id = $6
             RETURNING id, name, email, phone_number, is_verified, role`,
            [name, email, phone_number === '' ? null : phone_number, is_verified, role, targetUserId]
        );

        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'User not found.' });
        }

        // Handle addresses if provided
        if (addresses && Array.isArray(addresses)) {
            // Delete existing addresses
            await client.query('DELETE FROM addresses WHERE user_id = $1', [targetUserId]);

            // Insert new addresses
            for (const address of addresses) {
                const {
                    house_name,
                    area_street_sector_village,
                    landmark,
                    pincode,
                    town_city,
                    state,
                    is_default
                } = address;

                // Validate required address fields
                if (!house_name || !area_street_sector_village || !pincode || !town_city || !state) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ 
                        message: 'Invalid address data. All fields except landmark are required.',
                        invalidAddress: address
                    });
                }

                await client.query(
                    `INSERT INTO addresses (
                        user_id, house_name, area_street_sector_village, landmark,
                        pincode, town_city, state, is_default
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [
                        targetUserId, house_name, area_street_sector_village,
                        landmark || null, pincode, town_city, state, is_default || false
                    ]
                );
            }

            // Ensure at least one address is set as default
            const defaultAddressCheck = await client.query(
                'SELECT COUNT(*) FROM addresses WHERE user_id = $1 AND is_default = true',
                [targetUserId]
            );

            if (defaultAddressCheck.rows[0].count === '0' && addresses.length > 0) {
                // Set the first address as default if no default is set
                await client.query(
                    'UPDATE addresses SET is_default = true WHERE id = (SELECT id FROM addresses WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1)',
                    [targetUserId]
                );
            }
        }

        // Get updated user data with addresses
        const updatedUserQuery = `
            SELECT 
                u.id, u.name, u.email, u.phone_number, u.is_verified, u.role,
                u.created_at, u.updated_at,
                u.google_id IS NOT NULL as has_google_auth,
                u.password_hash IS NOT NULL as has_password
            FROM users u
            WHERE u.id = $1
        `;
        const updatedUser = await client.query(updatedUserQuery, [targetUserId]);

        // Get updated addresses
        const updatedAddresses = await client.query(
            'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
            [targetUserId]
        );

        await client.query('COMMIT');

        res.status(200).json({
            message: 'User updated successfully!',
            user: {
                ...updatedUser.rows[0],
                addresses: updatedAddresses.rows
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating user (admin):', error);
        res.status(500).json({ message: 'Failed to update user. Please try again.', error: error.message });
    } finally {
        client.release();
    }
});

// Route: Delete User (Admin Only)
// Endpoint: /api/admin/users/:id
// Method: DELETE
// Description: Allows an admin to delete a user.
app.delete('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
    const targetUserId = req.params.id;
    const adminUserId = req.user.userId; // The ID of the admin performing the deletion

    if (parseInt(targetUserId) === parseInt(adminUserId)) {
        return res.status(403).json({ message: 'Admins cannot delete their own account via this endpoint.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Start transaction

        // Optional: Delete related addresses first (if you have foreign key constraints with ON DELETE CASCADE, this might not be strictly needed, but good for explicit control)
        await client.query('DELETE FROM addresses WHERE user_id = $1', [targetUserId]);

        const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [targetUserId]);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'User not found.' });
        }

        await client.query('COMMIT'); // Commit transaction
        res.status(200).json({ message: 'User deleted successfully!' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting user (admin):', error);
        res.status(500).json({ message: 'Failed to delete user.', error: error.message });
    } finally {
        client.release();
    }
});


// Route: Add a New Address
// Endpoint: /api/addresses
// Method: POST
// Description: Allows an authenticated user to add a new address.
app.post('/api/addresses', authenticateToken, async (req, res) => {
    const {
        house_name,
        area_street_sector_village,
        landmark,
        pincode,
        town_city,
        state
    } = req.body;
    const userId = req.user.userId; // From authenticateToken middleware

    // Input validation
    if (!house_name || !area_street_sector_village || !pincode || !town_city || !state) {
        return res.status(400).json({ message: 'All address fields (except landmark) are required.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Start transaction

        // Check if this is the first address for the user
        const existingAddresses = await client.query('SELECT COUNT(*) FROM addresses WHERE user_id = $1', [userId]);
        const isFirstAddress = parseInt(existingAddresses.rows[0].count) === 0;

        let isDefault = false;
        if (isFirstAddress) {
            // If it's the first address, make it default automatically
            isDefault = true;
        } else {
            // For subsequent addresses, `is_default` will remain false by default.
            // A separate API call will be needed to set it as default.
        }

        const result = await client.query(
            `INSERT INTO addresses (user_id, house_name, area_street_sector_village, landmark, pincode, town_city, state, is_default)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`, // Return all columns of the new address
            [userId, house_name, area_street_sector_village, landmark, pincode, town_city, state, isDefault]
        );

        await client.query('COMMIT'); // Commit transaction
        res.status(201).json({
            message: 'Address added successfully!',
            address: result.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK'); // Rollback transaction on error
        console.error('Error adding address:', error);
        res.status(500).json({ message: 'Failed to add address.', error: error.message });
    } finally {
        client.release();
    }
});

// Route: Get All Addresses for a User
// Endpoint: /api/addresses
// Method: GET
// Description: Returns all addresses for the authenticated user.
app.get('/api/addresses', authenticateToken, async (req, res) => {
    const userId = req.user.userId; // From authenticateToken middleware
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
            [userId]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).json({ message: 'Failed to fetch addresses.', error: error.message });
    } finally {
        client.release();
    }
});

// Route: Set a Default Address
// Endpoint: /api/addresses/:id/set-default
// Method: PATCH (or PUT, PATCH is more semantically appropriate for partial update)
// Description: Sets a specific address as the default for the user.
app.patch('/api/addresses/:id/set-default', authenticateToken, async (req, res) => {
    const addressId = req.params.id;
    const userId = req.user.userId; // From authenticateToken middleware

    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Start transaction

        // 1. Unset the current default address for this user
        await client.query(
            'UPDATE addresses SET is_default = FALSE WHERE user_id = $1 AND is_default = TRUE',
            [userId]
        );

        // 2. Set the specified address as default
        const result = await client.query(
            'UPDATE addresses SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *',
            [addressId, userId]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Address not found or does not belong to user.' });
        }

        await client.query('COMMIT'); // Commit transaction
        res.status(200).json({ message: 'Default address set successfully!', address: result.rows[0] });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error setting default address:', error);
        res.status(500).json({ message: 'Failed to set default address.', error: error.message });
    } finally {
        client.release();
    }
});

// Route: Update an Existing Address
// Endpoint: /api/addresses/:id
// Method: PUT
// Description: Allows an authenticated user to update an existing address.
app.put('/api/addresses/:id', authenticateToken, async (req, res) => {
    const addressId = req.params.id;
    const userId = req.user.userId; // From authenticateToken middleware
    const {
        house_name,
        area_street_sector_village,
        landmark,
        pincode,
        town_city,
        state
    } = req.body;

    if (!house_name || !area_street_sector_village || !pincode || !town_city || !state) {
        return res.status(400).json({ message: 'All address fields (except landmark) are required for update.' });
    }

    const client = await pool.connect();
    try {
        const result = await client.query(
            `UPDATE addresses
             SET house_name = $1,
                 area_street_sector_village = $2,
                 landmark = $3,
                 pincode = $4,
                 town_city = $5,
                 state = $6,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $7 AND user_id = $8
             RETURNING *`,
            [house_name, area_street_sector_village, landmark, pincode, town_city, state, addressId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Address not found or does not belong to user.' });
        }

        res.status(200).json({
            message: 'Address updated successfully!',
            address: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({ message: 'Failed to update address.', error: error.message });
    } finally {
        client.release();
    }
});

// Route: Delete an Address
// Endpoint: /api/addresses/:id
// Method: DELETE
// Description: Allows an authenticated user to delete an address.
app.delete('/api/addresses/:id', authenticateToken, async (req, res) => {
    const addressId = req.params.id;
    const userId = req.user.userId; // From authenticateToken middleware

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if the address to be deleted is the default address
        const addressRes = await client.query('SELECT is_default FROM addresses WHERE id = $1 AND user_id = $2', [addressId, userId]);
        if (addressRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Address not found or does not belong to user.' });
        }

        const isDefaultToDelete = addressRes.rows[0].is_default;

        const deleteResult = await client.query(
            'DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id',
            [addressId, userId]
        );

        if (deleteResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Address not found or does not belong to user.' });
        }

        // If the deleted address was the default, try to set a new default
        if (isDefaultToDelete) {
            const remainingAddresses = await client.query('SELECT id FROM addresses WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1', [userId]);
            if (remainingAddresses.rows.length > 0) {
                const newDefaultAddressId = remainingAddresses.rows[0].id;
                await client.query('UPDATE addresses SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [newDefaultAddressId]);
                console.log(`User ${userId}: Set new default address to ${newDefaultAddressId}`);
            }
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Address deleted successfully!' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting address:', error);
        res.status(500).json({ message: 'Failed to delete address.', error: error.message });
    } finally {
        client.release();
    }
});


// Protected test route (example)
app.get('/api/protected', authenticateToken, (req, res) => {
    res.status(200).json({
        message: 'This is a protected route!',
        user: req.user,
        serverTime: new Date().toISOString()
    });
});


// --- PRODUCT ROUTES ---

// Get all products
app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY p.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ message: 'Failed to fetch products' });
    }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(500).json({ message: 'Failed to fetch product' });
    }
});

// Create product (Admin only)
app.post('/api/products', authenticateAdmin, async (req, res) => {
    try {
        const { name, description, price, category_id, stock, image_url } = req.body;
        
        const result = await pool.query(
            `INSERT INTO products (name, description, price, category_id, stock, image_url) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [name, description, price, category_id, stock, image_url]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating product:', err);
        res.status(500).json({ message: 'Failed to create product' });
    }
});

// Update product (Admin only)
app.put('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, description, price, category_id, stock, image_url } = req.body;
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        // Check if product exists
        const existingProduct = await client.query('SELECT image_url FROM products WHERE id = $1', [id]);
        if (existingProduct.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Product not found' });
        }

        // If a new image is being uploaded, delete the old image
        if (image_url && image_url !== existingProduct.rows[0].image_url) {
            const oldImagePath = existingProduct.rows[0].image_url;
            if (oldImagePath) {
                const fullPath = path.join(__dirname, oldImagePath.replace(/^\//, ''));
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            }
        }
        
        const result = await client.query(
            `UPDATE products 
             SET name = $1, description = $2, price = $3, category_id = $4, 
                 stock = $5, image_url = $6, updated_at = CURRENT_TIMESTAMP
             WHERE id = $7 
             RETURNING *`,
            [name, description, price, category_id, stock, image_url, id]
        );

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating product:', err);
        res.status(500).json({ 
            message: 'Failed to update product',
            error: err.message 
        });
    } finally {
        client.release();
    }
});

// Delete product (Admin only)
app.delete('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        // First, delete related records from stock_logs
        await client.query('DELETE FROM stock_logs WHERE product_id = $1', [id]);
        
        // Then, delete related records from cart_items
        await client.query('DELETE FROM cart_items WHERE product_id = $1', [id]);
        
        // Delete from favorites
        await client.query('DELETE FROM favorites WHERE product_id = $1', [id]);
        
        // Delete from wishlist
        await client.query('DELETE FROM wishlist WHERE product_id = $1', [id]);
        
        // Finally, delete the product
        const result = await client.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Product not found' });
        }
        
        await client.query('COMMIT');
        res.json({ message: 'Product and all related records deleted successfully' });
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error deleting product:', err);
        res.status(500).json({ 
            message: 'Failed to delete product', 
            error: err.message,
            details: 'An error occurred while deleting the product and its related records'
        });
    } finally {
        client.release();
    }
});

// --- CATEGORY ROUTES ---

// Get all categories
app.get('/api/categories', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM categories ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ message: 'Failed to fetch categories' });
    }
});

// Get single category with its products
app.get('/api/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const category = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
        
        if (category.rows.length === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }
        
        const products = await pool.query('SELECT * FROM products WHERE category_id = $1', [id]);
        
        res.json({
            ...category.rows[0],
            products: products.rows
        });
    } catch (err) {
        console.error('Error fetching category:', err);
        res.status(500).json({ message: 'Failed to fetch category' });
    }
});

// Create category (Admin only)
app.post('/api/categories', authenticateAdmin, async (req, res) => {
    try {
        const { name, description, image_url } = req.body;
        
        const result = await pool.query(
            `INSERT INTO categories (name, description, image_url) 
             VALUES ($1, $2, $3) 
             RETURNING *`,
            [name, description, image_url]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating category:', err);
        res.status(500).json({ message: 'Failed to create category' });
    }
});

// Update category (Admin only)
app.put('/api/categories/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, image_url } = req.body;
        
        const result = await pool.query(
            `UPDATE categories 
             SET name = $1, description = $2, image_url = $3 
             WHERE id = $4 
             RETURNING *`,
            [name, description, image_url, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating category:', err);
        res.status(500).json({ message: 'Failed to update category' });
    }
});

// Delete category (Admin only)
app.delete('/api/categories/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }
        
        res.json({ message: 'Category deleted successfully' });
    } catch (err) {
        console.error('Error deleting category:', err);
        res.status(500).json({ message: 'Failed to delete category' });
    }
});

// --- IMAGE UPLOAD ROUTE ---

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Ensure uploads directory exists
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp and original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    // Accept only image files
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG, PNG and GIF files are allowed!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

// Image upload endpoint
app.post('/api/upload-image', authenticateAdmin, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                message: 'No file uploaded',
                details: 'Please select an image file to upload.'
            });
        }
        
        // Return the full URL where the image can be accessed
        const imageUrl = `/uploads/${req.file.filename}`;
        
        // Log the upload details
        console.log('File uploaded successfully:', {
            originalName: req.file.originalname,
            filename: req.file.filename,
            path: req.file.path,
            url: imageUrl
        });
        
        res.json({ 
            message: 'File uploaded successfully',
            url: imageUrl,
            filename: req.file.filename
        });
    } catch (err) {
        console.error('Error uploading image:', err);
        res.status(500).json({ 
            message: 'Failed to upload image',
            error: err.message 
        });
    }
});

// Serve uploaded files with proper CORS headers
app.use('/uploads', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    next();
}, express.static(path.join(__dirname, 'uploads')));

// Error handling middleware for multer errors
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                message: 'File too large',
                details: 'Maximum file size is 5MB'
            });
        }
        return res.status(400).json({
            message: 'File upload error',
            details: err.message
        });
    }
    next(err);
});


// --- FAVORITES/WISHLIST ROUTES ---

// Add product to favorites
app.post('/api/favorites', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { productId } = req.body;

    if (!productId) {
        return res.status(400).json({ message: 'Product ID is required' });
    }

    const client = await pool.connect();
    try {
        // Check if product exists
        const productCheck = await client.query('SELECT id FROM products WHERE id = $1', [productId]);
        if (productCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if already in favorites
        const existingFavorite = await client.query(
            'SELECT * FROM favorites WHERE user_id = $1 AND product_id = $2',
            [userId, productId]
        );

        if (existingFavorite.rows.length > 0) {
            return res.status(409).json({ message: 'Product already in favorites' });
        }

        // Add to favorites
        const result = await client.query(
            `INSERT INTO favorites (user_id, product_id)
             VALUES ($1, $2)
             RETURNING id, created_at`,
            [userId, productId]
        );

        res.status(201).json({
            message: 'Product added to favorites',
            favorite: {
                id: result.rows[0].id,
                productId,
                userId,
                createdAt: result.rows[0].created_at
            }
        });
    } catch (err) {
        console.error('Error adding to favorites:', err);
        res.status(500).json({ message: 'Failed to add to favorites' });
    } finally {
        client.release();
    }
});

// Get user's favorites
app.get('/api/favorites', authenticateToken, async (req, res) => {
    const userId = req.user.userId;

    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT f.id as favorite_id, f.created_at, 
                    p.*, c.name as category_name
             FROM favorites f
             JOIN products p ON f.product_id = p.id
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE f.user_id = $1
             ORDER BY f.created_at DESC`,
            [userId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching favorites:', err);
        res.status(500).json({ message: 'Failed to fetch favorites' });
    } finally {
        client.release();
    }
});

// Remove from favorites
app.delete('/api/favorites/:productId', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { productId } = req.params;

    const client = await pool.connect();
    try {
        const result = await client.query(
            'DELETE FROM favorites WHERE user_id = $1 AND product_id = $2 RETURNING id',
            [userId, productId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found in favorites' });
        }

        res.json({ message: 'Product removed from favorites' });
    } catch (err) {
        console.error('Error removing from favorites:', err);
        res.status(500).json({ message: 'Failed to remove from favorites' });
    } finally {
        client.release();
    }
});

// Add product to wishlist
app.post('/api/wishlist', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { productId } = req.body;

    if (!productId) {
        return res.status(400).json({ message: 'Product ID is required' });
    }

    const client = await pool.connect();
    try {
        // Check if product exists
        const productCheck = await client.query('SELECT id FROM products WHERE id = $1', [productId]);
        if (productCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if already in wishlist
        const existingItem = await client.query(
            'SELECT * FROM wishlist WHERE user_id = $1 AND product_id = $2',
            [userId, productId]
        );

        if (existingItem.rows.length > 0) {
            return res.status(409).json({ message: 'Product already in wishlist' });
        }

        // Add to wishlist
        const result = await client.query(
            `INSERT INTO wishlist (user_id, product_id)
             VALUES ($1, $2)
             RETURNING id, created_at`,
            [userId, productId]
        );

        res.status(201).json({
            message: 'Product added to wishlist',
            wishlistItem: {
                id: result.rows[0].id,
                productId,
                userId,
                createdAt: result.rows[0].created_at
            }
        });
    } catch (err) {
        console.error('Error adding to wishlist:', err);
        res.status(500).json({ message: 'Failed to add to wishlist' });
    } finally {
        client.release();
    }
});

// Get user's wishlist
app.get('/api/wishlist', authenticateToken, async (req, res) => {
    const userId = req.user.userId;

    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT w.id as wishlist_id, w.created_at,
                    p.*, c.name as category_name
             FROM wishlist w
             JOIN products p ON w.product_id = p.id
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE w.user_id = $1
             ORDER BY w.created_at DESC`,
            [userId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching wishlist:', err);
        res.status(500).json({ message: 'Failed to fetch wishlist' });
    } finally {
        client.release();
    }
});

// Remove from wishlist
app.delete('/api/wishlist/:productId', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { productId } = req.params;

    const client = await pool.connect();
    try {
        const result = await client.query(
            'DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2 RETURNING id',
            [userId, productId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found in wishlist' });
        }

        res.json({ message: 'Product removed from wishlist' });
    } catch (err) {
        console.error('Error removing from wishlist:', err);
        res.status(500).json({ message: 'Failed to remove from wishlist' });
    } finally {
        client.release();
    }
});

// --- CART ROUTES ---

// Get user's cart
app.get('/api/cart', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    
    const client = await pool.connect();
    try {
        const cartItems = await client.query(
            `SELECT 
                ci.id as cart_item_id,
                ci.quantity,
                p.id as product_id,
                p.name,
                p.price,
                p.image_url,
                p.stock,
                c.name as category_name
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE ci.user_id = $1
            ORDER BY ci.created_at DESC`,
            [userId]
        );

        // Calculate total
        const total = cartItems.rows.reduce((sum, item) => {
            return sum + (parseFloat(item.price) * item.quantity);
        }, 0);

        res.json({
            items: cartItems.rows,
            total: total
        });
    } catch (err) {
        console.error('Error fetching cart:', err);
        res.status(500).json({ message: 'Failed to fetch cart' });
    } finally {
        client.release();
    }
});

// Add to cart
app.post('/api/cart', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { productId, quantity = 1 } = req.body;

    // Validate input
    if (!productId) {
        return res.status(400).json({ message: 'Product ID is required' });
    }
    
    if (quantity < 1) {
        return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    const client = await pool.connect();
    try {
        // Check if product exists first for a clear error message.
        const product = await client.query(
            'SELECT id FROM products WHERE id = $1',
            [productId]
        );

        if (product.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Use INSERT ON CONFLICT for a single, atomic upsert operation.
        const upsertResult = await client.query(
            `INSERT INTO cart_items (user_id, product_id, quantity)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, product_id)
            DO UPDATE SET quantity = cart_items.quantity + $3
            RETURNING id, (xmax = 0) AS inserted`, // xmax = 0 is a system column that indicates if the row was inserted
            [userId, productId, quantity]
        );

        const { id, inserted } = upsertResult.rows[0];

        // Get the complete cart item details to return to the client
        const cartItem = await client.query(
            `SELECT 
                ci.id as cart_item_id,
                ci.quantity,
                p.id as product_id,
                p.name,
                p.price,
                p.image_url,
                p.stock,
                c.name as category_name
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE ci.id = $1`,
            [id]
        );

        const message = inserted ? 'Item added to cart' : 'Cart item quantity updated';
        const statusCode = inserted ? 201 : 200;

        res.status(statusCode).json({
            message,
            item: cartItem.rows[0]
        });

    } catch (err) {
        console.error('Error adding to cart:', err);
        if (err.code === '23503') { // foreign_key_violation on product_id
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(500).json({ message: 'Failed to add item to cart' });
    } finally {
        client.release();
    }
});

// Update cart item quantity
app.put('/api/cart/:itemId', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
        return res.status(400).json({ message: 'Valid quantity is required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if cart item exists and belongs to user
        const cartItem = await client.query(
            `SELECT ci.*, p.stock 
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.id = $1 AND ci.user_id = $2`,
            [itemId, userId]
        );

        if (cartItem.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Cart item not found' });
        }

        // Check stock
        if (quantity > cartItem.rows[0].stock) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Not enough stock available' });
        }

        // Update quantity
        const result = await client.query(
            `UPDATE cart_items 
            SET quantity = $1
            WHERE id = $2 AND user_id = $3
            RETURNING id`,
            [quantity, itemId, userId]
        );

        // Get updated cart item
        const updatedItem = await client.query(
            `SELECT 
                ci.id as cart_item_id,
                ci.quantity,
                p.id as product_id,
                p.name,
                p.price,
                p.image_url,
                p.stock,
                c.name as category_name
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE ci.id = $1`,
            [result.rows[0].id]
        );

        await client.query('COMMIT');
        res.json({
            message: 'Cart item updated',
            item: updatedItem.rows[0]
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating cart item:', err);
        res.status(500).json({ message: 'Failed to update cart item' });
    } finally {
        client.release();
    }
});

// Remove item from cart
app.delete('/api/cart/:itemId', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { itemId } = req.params;

    const client = await pool.connect();
    try {
        const result = await client.query(
            'DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING id',
            [itemId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Cart item not found' });
        }

        res.json({ message: 'Item removed from cart' });
    } catch (err) {
        console.error('Error removing cart item:', err);
        res.status(500).json({ message: 'Failed to remove item from cart' });
    } finally {
        client.release();
    }
});

// Clear cart
app.delete('/api/cart', authenticateToken, async (req, res) => {
    const userId = req.user.userId;

    const client = await pool.connect();
    try {
        await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
        res.json({ message: 'Cart cleared successfully' });
    } catch (err) {
        console.error('Error clearing cart:', err);
        res.status(500).json({ message: 'Failed to clear cart' });
    } finally {
        client.release();
    }
});

// Checkout endpoint - Stock Check & Deduction Happens Here
app.post('/api/checkout', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { shippingAddressId } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get user's cart items with current stock information
        const cartItems = await client.query(
            `SELECT 
                ci.id as cart_item_id,
                ci.quantity,
                p.id as product_id,
                p.name,
                p.price,
                p.stock,
                c.name as category_name
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE ci.user_id = $1`,
            [userId]
        );

        if (cartItems.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Cart is empty' });
        }

        // Check stock availability for each item
        const stockIssues = [];
        let totalAmount = 0;

        for (const item of cartItems.rows) {
            if (item.stock < item.quantity) {
                stockIssues.push({
                    productId: item.product_id,
                    productName: item.name,
                    requestedQuantity: item.quantity,
                    availableStock: item.stock,
                    message: `Sorry, only ${item.stock} left in stock for ${item.name}`
                });
            } else {
                totalAmount += parseFloat(item.price) * item.quantity;
            }
        }

        // If there are stock issues, return them without proceeding
        if (stockIssues.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                message: 'Some items have insufficient stock',
                stockIssues,
                type: 'stock_insufficient'
            });
        }

        // Create order
        const orderResult = await client.query(
            `INSERT INTO orders (user_id, total_amount, shipping_address_id, status)
             VALUES ($1, $2, $3, 'pending')
             RETURNING id`,
            [userId, totalAmount, shippingAddressId || null]
        );

        const orderId = orderResult.rows[0].id;

        // Create order items and deduct stock
        for (const item of cartItems.rows) {
            // Insert order item
            await client.query(
                `INSERT INTO order_items (order_id, product_id, quantity, price_at_time)
                 VALUES ($1, $2, $3, $4)`,
                [orderId, item.product_id, item.quantity, item.price]
            );

            // Deduct stock from product
            await client.query(
                `UPDATE products 
                 SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [item.quantity, item.product_id]
            );

            // Log the stock deduction
            await client.query(
                `INSERT INTO stock_logs 
                 (product_id, previous_stock, new_stock, change_amount, change_type, reason, updated_by)
                 VALUES ($1, $2, $3, $4, 'decrease', 'Order checkout', $5)`,
                [
                    item.product_id,
                    item.stock,
                    item.stock - item.quantity,
                    item.quantity,
                    userId
                ]
            );
        }

        // Clear the user's cart
        await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

        await client.query('COMMIT');

        // Get the complete order details
        const orderDetails = await client.query(
            `SELECT 
                o.id as order_id,
                o.total_amount,
                o.status,
                o.created_at,
                oi.product_id,
                oi.quantity,
                oi.price_at_time,
                p.name as product_name,
                p.image_url,
                c.name as category_name
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE o.id = $1`,
            [orderId]
        );

        res.status(201).json({
            message: 'Order placed successfully',
            orderId,
            totalAmount,
            orderItems: orderDetails.rows
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error during checkout:', err);
        res.status(500).json({ message: 'Failed to process checkout' });
    } finally {
        client.release();
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Stock Management Endpoints
app.put('/api/admin/products/:id/stock', authenticateToken, authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    const { stock, reason } = req.body;
    const userId = req.user.userId;

    if (!stock || stock < 0) {
        return res.status(400).json({ message: 'Valid stock quantity is required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get current stock
        const currentStock = await client.query(
            'SELECT stock FROM products WHERE id = $1',
            [id]
        );

        if (currentStock.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Product not found' });
        }

        const previousStock = currentStock.rows[0].stock;
        const changeAmount = stock - previousStock;
        const changeType = changeAmount >= 0 ? 'increase' : 'decrease';

        // Update stock
        const result = await client.query(
            'UPDATE products SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [stock, id]
        );

        // Log the stock change
        await client.query(
            `INSERT INTO stock_logs 
             (product_id, previous_stock, new_stock, change_amount, change_type, reason, updated_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id, previousStock, stock, Math.abs(changeAmount), changeType, reason || null, userId]
        );

        await client.query('COMMIT');

        // Check if stock is low
        if (stock < 10) {
            console.log(`Low stock alert for product ${id}: ${stock} items remaining`);
        }

        res.json({
            ...result.rows[0],
            message: 'Stock updated successfully'
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating stock:', err);
        res.status(500).json({ message: 'Error updating stock' });
    } finally {
        client.release();
    }
});

// Get product stock level
app.get('/api/products/:id/stock', async (req, res) => {
    const { id } = req.params;

    try {
        const client = await pool.connect();
        const result = await client.query(
            'SELECT id, name, stock FROM products WHERE id = $1',
            [id]
        );
        client.release();

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error getting stock level:', err);
        res.status(500).json({ message: 'Error getting stock level' });
    }
});

// Batch update stock levels (admin only)
app.post('/api/admin/products/stock/batch', authenticateToken, authenticateAdmin, async (req, res) => {
    const { updates } = req.body; // Array of { id, stock, reason }
    const userId = req.user.userId;

    try {
        const client = await pool.connect();
        await client.query('BEGIN');

        const results = [];
        for (const update of updates) {
            if (update.stock < 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    message: `Invalid stock value for product ${update.id}`,
                    productId: update.id 
                });
            }

            // Get current stock
            const currentStock = await client.query(
                'SELECT stock FROM products WHERE id = $1',
                [update.id]
            );

            if (currentStock.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ 
                    message: `Product not found: ${update.id}`,
                    productId: update.id 
                });
            }

            const previousStock = currentStock.rows[0].stock;
            const changeAmount = update.stock - previousStock;
            const changeType = changeAmount >= 0 ? 'increase' : 'decrease';

            // Update stock
            const result = await client.query(
                'UPDATE products SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
                [update.stock, update.id]
            );

            // Log the stock change
            await client.query(
                `INSERT INTO stock_logs 
                 (product_id, previous_stock, new_stock, change_amount, change_type, reason, updated_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [update.id, previousStock, update.stock, Math.abs(changeAmount), changeType, update.reason || null, userId]
            );

            results.push(result.rows[0]);

            if (update.stock < 10) {
                console.log(`Low stock alert for product ${update.id}: ${update.stock} items remaining`);
            }
        }

        await client.query('COMMIT');
        res.json(results);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error in batch stock update:', err);
        res.status(500).json({ message: 'Error updating stock levels' });
    }
});

// Create stock_logs table if it doesn't exist
pool.query(`
    CREATE TABLE IF NOT EXISTS stock_logs (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id),
        previous_stock INTEGER NOT NULL,
        new_stock INTEGER NOT NULL,
        change_amount INTEGER NOT NULL,
        change_type VARCHAR(20) NOT NULL, -- 'increase' or 'decrease'
        reason VARCHAR(255),
        updated_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`, (err, result) => {
    if (err) {
        console.error('Error creating stock_logs table:', err);
    } else {
        console.log('stock_logs table created or already exists');
    }
});

// Get stock history for a product
app.get('/api/admin/products/:id/stock-history', authenticateToken, authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    
    try {
        const result = await client.query(
            `SELECT sl.*, u.name as updated_by_name, p.name as product_name
             FROM stock_logs sl
             JOIN products p ON sl.product_id = p.id
             LEFT JOIN users u ON sl.updated_by = u.id
             WHERE sl.product_id = $1
             ORDER BY sl.created_at DESC`,
            [id]
        );
        
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching stock history:', err);
        res.status(500).json({ message: 'Error fetching stock history' });
    } finally {
        client.release();
    }
});

// Admin Product Routes
app.get('/api/admin/products', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM products ORDER BY created_at DESC');
        client.release();
        res.json(result.rows);
    } catch (err) {
        console.error('Error getting products:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/api/admin/products', authenticateToken, authenticateAdmin, async (req, res) => {
    const { name, description, price, category_id, stock, image_url } = req.body;
    try {
        const client = await pool.connect();
        const result = await client.query(
            'INSERT INTO products (name, description, price, category_id, stock, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, description, price, category_id, stock, image_url]
        );
        client.release();
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating product:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.put('/api/admin/products/:id', authenticateToken, authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, description, price, category_id, stock, image_url } = req.body;
    try {
        const client = await pool.connect();
        const result = await client.query(
            'UPDATE products SET name = $1, description = $2, price = $3, category_id = $4, stock = $5, image_url = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
            [name, description, price, category_id, stock, image_url, id]
        );
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.delete('/api/admin/products/:id', authenticateToken, authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const client = await pool.connect();
        const result = await client.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Admin Category Routes
app.get('/api/admin/categories', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM categories ORDER BY name ASC');
        client.release();
        res.json(result.rows);
    } catch (err) {
        console.error('Error getting categories:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/api/admin/categories', authenticateToken, authenticateAdmin, async (req, res) => {
    const { name, description } = req.body;
    try {
        const client = await pool.connect();
        const result = await client.query(
            'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
            [name, description]
        );
        client.release();
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating category:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Utility function to fetch YouTube playlist videos
const fetchYouTubePlaylistVideos = async (playlistId) => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error('YouTube API key not configured in backend environment variables');
    const apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=20&playlistId=${playlistId}&key=${apiKey}`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'Failed to fetch playlist videos from YouTube API');
    return data.items.map(item => ({
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url
    }));
};

// YouTube Playlist API Endpoint
app.get('/api/youtube/playlist/:playlistId', async (req, res) => {
    try {
        const { playlistId } = req.params;
        const videos = await fetchYouTubePlaylistVideos(playlistId);
        res.json({ success: true, videos });
    } catch (error) {
        console.error('Error in YouTube playlist endpoint:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- ADMIN ORDER MANAGEMENT ---

// List all orders (with pagination)
app.get('/api/admin/orders', authenticateToken, authenticateAdmin, async (req, res) => {
    const { page = 1, limit = 20, status = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const client = await pool.connect();
    try {
        let baseQuery = `SELECT o.*, u.name as user_name, u.email as user_email
            FROM orders o
            JOIN users u ON o.user_id = u.id`;
        let where = [];
        let params = [];
        if (status) {
            where.push('o.status = $' + (params.length + 1));
            params.push(status);
        }
        let whereClause = where.length ? ' WHERE ' + where.join(' AND ') : '';
        let orderClause = ' ORDER BY o.created_at DESC';
        let limitClause = ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit);
        params.push(offset);
        const result = await client.query(baseQuery + whereClause + orderClause + limitClause, params);
        // Get total count
        const countResult = await client.query('SELECT COUNT(*) FROM orders' + (where.length ? ' WHERE ' + where.join(' AND ') : ''), params.slice(0, where.length));
        res.json({
            orders: result.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ message: 'Failed to fetch orders' });
    } finally {
        client.release();
    }
});

// Get order details
app.get('/api/admin/orders/:id', authenticateToken, authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        // Get order
        const orderRes = await client.query(
            `SELECT o.*, u.name as user_name, u.email as user_email, a.* as shipping_address
             FROM orders o
             JOIN users u ON o.user_id = u.id
             LEFT JOIN addresses a ON o.shipping_address_id = a.id
             WHERE o.id = $1`,
            [id]
        );
        if (orderRes.rows.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }
        // Get order items
        const itemsRes = await client.query(
            `SELECT oi.*, p.name as product_name, p.image_url
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = $1`,
            [id]
        );
        res.json({
            order: orderRes.rows[0],
            items: itemsRes.rows
        });
    } catch (err) {
        console.error('Error fetching order details:', err);
        res.status(500).json({ message: 'Failed to fetch order details' });
    } finally {
        client.release();
    }
});

// Update order status
app.put('/api/admin/orders/:id/status', authenticateToken, authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }
    const client = await pool.connect();
    try {
        const result = await client.query(
            'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [status, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json({ message: 'Order status updated', order: result.rows[0] });
    } catch (err) {
        console.error('Error updating order status:', err);
        res.status(500).json({ message: 'Failed to update order status' });
    } finally {
        client.release();
    }
});
// --- END ADMIN ORDER MANAGEMENT ---

// Test endpoint to check orders table (for debugging)
app.get('/api/admin/orders/test', authenticateToken, authenticateAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        // Check if orders table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'orders'
            );
        `);
        
        if (!tableCheck.rows[0].exists) {
            return res.json({ 
                message: 'Orders table does not exist',
                tableExists: false 
            });
        }
        
        // Count orders
        const countResult = await client.query('SELECT COUNT(*) FROM orders');
        const orderCount = parseInt(countResult.rows[0].count);
        
        // Get sample orders if any exist
        let sampleOrders = [];
        if (orderCount > 0) {
            const sampleResult = await client.query('SELECT * FROM orders LIMIT 3');
            sampleOrders = sampleResult.rows;
        }
        
        res.json({
            message: 'Orders table exists',
            tableExists: true,
            orderCount,
            sampleOrders
        });
    } catch (err) {
        console.error('Error testing orders table:', err);
        res.status(500).json({ 
            message: 'Error testing orders table',
            error: err.message 
        });
    } finally {
        client.release();
    }
});
