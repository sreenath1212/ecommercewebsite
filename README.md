# Agri E-commerce Platform

A full-stack e-commerce platform for agricultural products, built with React.js frontend and Node.js backend.

## Project Structure

```
agri/
├── agri_ecommerce_backend/     # Node.js backend server
├── agri_ecommerce_frontend/    # React.js frontend application
└── README.md
```

## Features

### Frontend (React.js)
- User authentication (Login/Register)
- Product browsing and search
- Shopping cart functionality
- User profile management
- Admin dashboard for product and user management
- Responsive design

### Backend (Node.js)
- RESTful API endpoints
- User authentication and authorization
- Product management
- Order processing
- File upload handling
- Database integration

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MySQL database

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd agri_ecommerce_backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (create a `.env` file):
   ```
   PORT=5000
   DB_HOST=localhost
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_NAME=agri_ecommerce
   JWT_SECRET=your_jwt_secret
   ```

4. Run the server:
   ```bash
   npm start
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd agri_ecommerce_frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order status (Admin)

## Technologies Used

### Frontend
- React.js
- React Router
- Context API for state management
- CSS3 for styling

### Backend
- Node.js
- Express.js
- MySQL
- JWT for authentication
- Multer for file uploads

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
