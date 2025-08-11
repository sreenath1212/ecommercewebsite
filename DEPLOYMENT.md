# Deployment Guide for Render

This guide will help you deploy your Agri E-commerce Platform on Render.

## Prerequisites

1. A Render account (sign up at https://render.com)
2. A PostgreSQL database (you can use Render's PostgreSQL service)
3. Your GitHub repository connected to Render

## Step 1: Set up PostgreSQL Database on Render

1. Go to your Render dashboard
2. Click "New" → "PostgreSQL"
3. Configure your database:
   - **Name**: `agri-ecommerce-db`
   - **Database**: `agri_ecommerce`
   - **User**: `agri_user`
   - **Plan**: Free (for development)
4. Click "Create Database"
5. Note down the connection details (you'll need these for environment variables)

## Step 2: Deploy Backend

1. Go to your Render dashboard
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `agri-ecommerce-backend`
   - **Root Directory**: `agri_ecommerce_backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

5. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=10000
   DB_USER=your_db_user
   DB_HOST=your_db_host
   DB_DATABASE=agri_ecommerce
   DB_PASSWORD=your_db_password
   DB_PORT=5432
   JWT_SECRET=your_jwt_secret_key
   EMAIL_HOST=your_email_host
   EMAIL_PORT=587
   EMAIL_USER=your_email_user
   EMAIL_PASS=your_email_password
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=https://your-backend-url.onrender.com/auth/google/callback
   FRONTEND_URL=https://your-frontend-url.onrender.com
   ```

6. Click "Create Web Service"

## Step 3: Deploy Frontend

1. Go to your Render dashboard
2. Click "New" → "Static Site"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `agri-ecommerce-frontend`
   - **Root Directory**: `agri_ecommerce_frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`
   - **Plan**: Free

5. Add Environment Variables:
   ```
   REACT_APP_API_URL=https://your-backend-url.onrender.com/api
   ```

6. Click "Create Static Site"

## Step 4: Update Configuration Files

After deployment, update these files with your actual Render URLs:

### Backend (server.js)
Replace the CORS origin with your frontend URL:
```javascript
origin: [
    'http://localhost:3000',
    'https://your-frontend-app-name.onrender.com', // Your actual frontend URL
    process.env.FRONTEND_URL
].filter(Boolean),
```

### Frontend (render.yaml)
Update the API URL:
```yaml
envVars:
  - key: REACT_APP_API_URL
    value: https://your-backend-app-name.onrender.com/api
```

## Step 5: Database Setup

1. Connect to your PostgreSQL database
2. Run the SQL scripts from `agri_ecommerce_backend/scripts/`:
   - `create_cart_table.sql`
   - `create_order_tables.sql`
   - `modify_cart_tables.sql`
   - `run_order_tables.sql`

## Step 6: Environment Variables Setup

### Required Environment Variables for Backend:

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_USER` | PostgreSQL username | `agri_user` |
| `DB_HOST` | PostgreSQL host | `dpg-xxx-xxx.render.com` |
| `DB_DATABASE` | Database name | `agri_ecommerce` |
| `DB_PASSWORD` | Database password | `your_password` |
| `JWT_SECRET` | JWT signing secret | `your_secret_key` |
| `EMAIL_HOST` | SMTP host | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_USER` | Email username | `your_email@gmail.com` |
| `EMAIL_PASS` | Email password | `your_app_password` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `your_client_id` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `your_client_secret` |
| `GOOGLE_CALLBACK_URL` | Google OAuth callback URL | `https://your-backend.onrender.com/auth/google/callback` |
| `FRONTEND_URL` | Frontend application URL | `https://your-frontend.onrender.com` |

### Required Environment Variables for Frontend:

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | `https://your-backend.onrender.com/api` |

## Step 7: Test Your Deployment

1. Visit your frontend URL
2. Test user registration and login
3. Test product browsing and cart functionality
4. Test admin features

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Make sure your frontend URL is added to the backend CORS configuration
2. **Database Connection**: Verify your database credentials and connection string
3. **Environment Variables**: Ensure all required environment variables are set
4. **Build Failures**: Check the build logs for missing dependencies

### Useful Commands:

- Check backend logs: Render dashboard → Your backend service → Logs
- Check frontend build: Render dashboard → Your frontend service → Logs
- Restart services: Render dashboard → Your service → Manual Deploy

## Security Notes

1. Never commit sensitive information like API keys or passwords
2. Use strong, unique passwords for your database
3. Regularly update your dependencies
4. Monitor your application logs for any suspicious activity

## Cost Optimization

- Use Render's free tier for development
- Monitor your usage to avoid unexpected charges
- Consider upgrading to paid plans for production use

## Support

- Render Documentation: https://render.com/docs
- Render Community: https://community.render.com
- GitHub Issues: Create issues in your repository for code-related problems
