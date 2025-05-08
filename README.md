# Pizza Order Application Backend

A robust Node.js/Express backend service for a pizza ordering system with features like user authentication, order management, and pizza customization.

## Features

- **User Management**
  - User registration with email verification
  - Authentication using JWT tokens
  - Password reset functionality
  - User profile management

- **Pizza Management**
  - CRUD operations for pizzas
  - Custom pizza creation with ingredients
  - Slug-based pizza URLs
  - Image support for pizzas

- **Order System**
  - Create and manage orders
  - Order status tracking
  - Payment status management
  - Delivery status updates
  - Special instructions support

- **Role-Based Access Control**
  - Admin-only routes for system management
  - Staff access for order processing
  - Customer-specific order views

- **Security Features**
  - JWT-based authentication
  - Password encryption
  - Protected routes
  - CORS configuration

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- JSON Web Tokens (JWT)
- Bcrypt for password hashing
- Nodemailer for email services
- Winston for logging

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- npm or yarn package manager

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```env
   NODE_ENV=development
   PORT=5000
   DATABASE_URL=your_postgresql_connection_string
   JWT_SECRET=your_jwt_secret
   EMAIL_SERVICE=your_email_service
   EMAIL_USER=your_email_username
   EMAIL_PASS=your_email_password
   ```

## API Endpoints

### User Routes
```
POST   /api/v1/users/register      - Register new user
GET    /api/v1/users/verify-email  - Verify email
POST   /api/v1/users/login         - User login
POST   /api/v1/users/forgot-password - Request password reset
POST   /api/v1/users/reset-password  - Reset password
GET    /api/v1/users/profile       - Get user profile
PUT    /api/v1/users/profile       - Update profile
POST   /api/v1/users/logout        - Logout user
```

### Pizza Routes
```
GET    /api/v1/pizzas             - Get all pizzas
GET    /api/v1/pizzas/:id         - Get pizza by ID
POST   /api/v1/pizzas             - Create new pizza (Admin)
PUT    /api/v1/pizzas/:id         - Update pizza (Admin)
DELETE /api/v1/pizzas/:id         - Delete pizza (Admin)
```

### Order Routes
```
POST   /api/v1/orders             - Create new order
GET    /api/v1/orders             - Get all orders (Admin/Staff)
GET    /api/v1/orders/:id         - Get order by ID
GET    /api/v1/orders/customer/:customerId - Get customer orders
PUT    /api/v1/orders/:id/status  - Update order status
PUT    /api/v1/orders/:id/payment-status - Update payment status
PUT    /api/v1/orders/:id/delivery-status - Update delivery status
DELETE /api/v1/orders/:id         - Delete order (Admin)
```

### Ingredient Routes
```
GET    /api/v1/ingredients        - Get all ingredients
GET    /api/v1/ingredients/:id    - Get ingredient by ID
POST   /api/v1/ingredients        - Create ingredient (Admin)
PUT    /api/v1/ingredients/:id    - Update ingredient (Admin)
DELETE /api/v1/ingredients/:id    - Delete ingredient (Admin)
```

## Error Handling

The application uses a centralized error handling mechanism with standardized error responses:

```json
{
  "success": false,
  "error": "Error message",
  "stack": "Error stack trace (development only)"
}
```

## Development

Start the development server:

```bash
npm run dev
```

The server will start on the configured port (default: 5000) with nodemon for automatic reloading.

## Production

For production deployment:

```bash
npm start
```

## Security Measures

- CORS configuration for frontend access
- JWT token authentication
- Password hashing with bcrypt
- Input validation using express-validator
- Rate limiting for API endpoints
- Secure HTTP headers

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

ISC