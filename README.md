# FireArt Server Test

A complete NestJS backend application built from scratch with authentication and CRUD operations, demonstrating clean architecture and best practices.

## 🚀 Features

- **Authentication System**: Complete JWT-based authentication with access and refresh tokens
- **User Management**: User registration, login, logout, and password reset functionality
- **Product Management**: Full CRUD operations for products with search and pagination
- **Security**: Password hashing with bcrypt, JWT token validation, and route protection
- **Database**: PostgreSQL with automatic table initialization
- **API Documentation**: Swagger/OpenAPI documentation available at `/api`
- **Testing**: Comprehensive Postman collection with positive and negative test cases

## 🛠️ Technology Stack

- **Backend Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Package Manager**: npm
- **Authentication**: JWT tokens with refresh mechanism
- **Password Hashing**: bcryptjs
- **Validation**: class-validator and class-transformer
- **Documentation**: Swagger/OpenAPI

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- PostgreSQL (v12 or higher)
- Git

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd fireart-server-test
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the environment example file and configure your database:

```bash
cp env.example .env
```

Edit `.env` with your database credentials:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=fireart_test

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=15m

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 4. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE fireart_test;
```

The application will automatically create all necessary tables on startup.

### 5. Run the Application

**Development mode:**
```bash
npm run start:dev
```

**Production mode:**
```bash
npm run build
npm run start:prod
```

The server will start on `http://localhost:3000`

## 📚 API Documentation

Once the server is running, you can access the interactive API documentation at:
- **Swagger UI**: `http://localhost:3000/api`

## 🔐 Authentication Endpoints

### User Registration
```http
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

### User Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

### Get Current User
```http
POST /auth/me
Authorization: Bearer your_access_token
```

### Logout
```http
POST /auth/logout
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

### Password Reset Request
```http
POST /auth/password-reset
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Password Reset Confirmation
```http
POST /auth/password-reset/confirm
Content-Type: application/json

{
  "token": "reset_token",
  "newPassword": "newpassword123"
}
```

## 📦 Product Management Endpoints

All product endpoints require authentication via Bearer token.

### Create Product
```http
POST /products
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "name": "Product Name",
  "description": "Product description",
  "price": 99.99
}
```

### Get All Products
```http
GET /products?search=keyword&page=1&limit=10
Authorization: Bearer your_access_token
```

**Query Parameters:**
- `search` (optional): Search in name and description
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

### Get Product by ID
```http
GET /products/{id}
Authorization: Bearer your_access_token
```

### Update Product
```http
PATCH /products/{id}
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "name": "Updated Name",
  "price": 149.99
}
```

### Delete Product
```http
DELETE /products/{id}
Authorization: Bearer your_access_token
```

## 🧪 Testing with Postman

A comprehensive Postman collection is included in the repository:

1. Import `FireArt_Server_Test.postman_collection.json` into Postman
2. Set the `baseUrl` variable to `http://localhost:3000`
3. Run the tests in sequence:
   - Start with authentication tests (signup, login)
   - The login test will automatically store tokens in collection variables
   - Continue with product tests

### Test Coverage

The Postman collection includes tests for:

**Authentication:**
- ✅ User signup (success, duplicate email, invalid data)
- ✅ User login (success, invalid credentials, non-existent user)
- ✅ Token refresh
- ✅ User logout
- ✅ Get current user (with/without token)
- ✅ Password reset request

**Products:**
- ✅ Create product (success, no auth, invalid data, negative price)
- ✅ Get all products (with search, pagination)
- ✅ Get product by ID (success, not found)
- ✅ Update product (success, partial update, not found)
- ✅ Delete product (success, not found)

## 🏗️ Project Structure

```
src/
├── auth/                    # Authentication module
│   ├── auth.controller.ts   # Auth endpoints
│   ├── auth.service.ts      # Auth business logic
│   ├── auth.guard.ts        # Route protection
│   ├── jwt.service.ts       # JWT operations
│   └── auth.module.ts       # Auth module configuration
├── products/                # Products module
│   ├── products.controller.ts # Product endpoints
│   ├── products.service.ts   # Product business logic
│   └── products.module.ts    # Products module configuration
├── users/                   # Users module (basic structure)
│   └── users.module.ts      # Users module configuration
├── database/                # Database layer
│   ├── database.service.ts  # PostgreSQL connection & queries
│   └── database.module.ts   # Database module configuration
├── common/                  # Shared components
│   └── dto/                 # Data Transfer Objects
│       ├── auth.dto.ts      # Authentication DTOs
│       └── product.dto.ts   # Product DTOs
├── app.module.ts            # Main application module
└── main.ts                  # Application entry point
```

## 🔒 Security Features

- **Password Hashing**: Uses bcrypt with 12 salt rounds
- **JWT Tokens**: Access tokens (15min) + refresh tokens (7 days)
- **Route Protection**: All product endpoints require authentication
- **Input Validation**: Comprehensive DTO validation using class-validator
- **SQL Injection Prevention**: Parameterized queries
- **User Isolation**: Users can only access their own products

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Products Table
```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Refresh Tokens Table
```sql
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Available Scripts

```bash
# Development
npm run start:dev          # Start in watch mode
npm run start:debug        # Start with debug

# Production
npm run build              # Build the application
npm run start:prod         # Start production server

# Code Quality
npm run lint               # Run ESLint
npm run format             # Format code with Prettier

# Testing
npm run test               # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Run tests with coverage
npm run test:e2e           # Run end-to-end tests
```

## 🌍 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | `password` |
| `DB_NAME` | Database name | `fireart_test` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` |
| `JWT_EXPIRES_IN` | Access token expiration | `15m` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |

## 🔧 Configuration

### JWT Configuration
- **Access Token**: 15 minutes expiration
- **Refresh Token**: 7 days expiration
- **Secret**: Configurable via environment variable

### Database Configuration
- **Connection Pool**: Maximum 20 connections
- **Idle Timeout**: 30 seconds
- **Connection Timeout**: 2 seconds

### Validation
- **Email**: Must be valid email format
- **Password**: Minimum 6 characters
- **Price**: Must be non-negative number
- **Name**: Required field

## 🚨 Error Handling

The application provides comprehensive error handling:

- **400 Bad Request**: Validation errors, duplicate emails
- **401 Unauthorized**: Missing/invalid tokens, invalid credentials
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server-side errors

## 📝 Assumptions and Notes

1. **Password Reset**: The password reset functionality is implemented as a placeholder. In production, you would:
   - Generate secure reset tokens
   - Store them in the database with expiration
   - Send emails with reset links
   - Implement proper token verification

2. **Email Service**: No actual email service is implemented for password reset

3. **Rate Limiting**: No rate limiting is implemented (consider adding for production)

4. **Logging**: Basic console logging is used (consider structured logging for production)

5. **Health Checks**: No health check endpoints (consider adding for production)

6. **CORS**: CORS is enabled for all origins (restrict in production)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is for demonstration purposes.

## 🆘 Support

For any questions or issues, please refer to the project documentation or create an issue in the repository.

---

**Note**: This is a test project built from scratch without using authentication or CRUD libraries as per requirements. All authentication logic, database operations, and security measures are implemented manually to demonstrate understanding of the underlying concepts.
