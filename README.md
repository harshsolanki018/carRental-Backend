# carRental Backend

Node.js backend API for the carRental – Car Rental Management System.

## Overview

This backend provides REST APIs for user authentication, vehicle management, booking operations, image uploads, and administrative functionalities. It is built using Node.js, Express.js, MongoDB, Multer, and Cloudinary.

---

## Features

### Authentication

* User Registration
* User Login
* JWT Authentication
* Protected Routes

### Car Management

* Add New Cars
* Update Car Details
* Delete Cars
* Manage Car Availability
* Upload Vehicle Images

### Booking Management

* Create Bookings
* View Booking History
* Manage User Bookings

### User Management

* View Registered Users
* Block / Unblock Users

### Image Upload

* Multer File Handling
* Cloudinary Cloud Storage

---

## Tech Stack

| Technology | Purpose              |
| ---------- | -------------------- |
| Node.js    | Runtime Environment  |
| Express.js | Backend Framework    |
| MongoDB    | Database             |
| Mongoose   | Database Modeling    |
| JWT        | Authentication       |
| bcryptjs   | Password Encryption  |
| Multer     | File Upload Handling |
| Cloudinary | Cloud Image Storage  |

---

## Prerequisites

* Node.js
* npm
* MongoDB Atlas / Local MongoDB
* Cloudinary Account

---

## Installation

### Clone Repository

```bash
git clone https://github.com/yourusername/car2go-backend.git
cd car2go-backend
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env` file:

```env
PORT=5000

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Start Development Server

```bash
npm run dev
```

API will run at:

```text
http://localhost:5000
```

---

## Project Structure

```text
server/
│
├── controllers/
├── models/
├── routes/
├── middleware/
├── config/
├── utils/
├── uploads/
└── server.js
```

---

## API Endpoints

### Authentication

| Method | Endpoint           | Description   |
| ------ | ------------------ | ------------- |
| POST   | /api/auth/register | Register User |
| POST   | /api/auth/login    | Login User    |

### Cars

| Method | Endpoint      | Description     |
| ------ | ------------- | --------------- |
| GET    | /api/cars     | Get All Cars    |
| GET    | /api/cars/:id | Get Car Details |
| POST   | /api/cars     | Add New Car     |
| PUT    | /api/cars/:id | Update Car      |
| DELETE | /api/cars/:id | Delete Car      |

### Bookings

| Method | Endpoint         | Description       |
| ------ | ---------------- | ----------------- |
| POST   | /api/bookings    | Create Booking    |
| GET    | /api/bookings/my | Get User Bookings |
| GET    | /api/bookings    | Get All Bookings  |

---

## Database Collections

* users
* cars
* bookings
* payments

---

## Security Features

* JWT Authentication
* Password Hashing (bcryptjs)
* Protected Admin Routes
* Input Validation
* Secure API Access

---

## Image Upload Flow

```text
User Upload
      ↓
Multer Middleware
      ↓
Cloudinary Storage
      ↓
MongoDB Stores Image URL
```

---

## Available Scripts

| Command     | Description        |
| ----------- | ------------------ |
| npm run dev | Development Server |
| npm start   | Production Server  |
| npm test    | Run Tests          |

---

## Future Enhancements

* Razorpay Payment Integration
* Email Notifications
* GPS Vehicle Tracking
* Analytics Dashboard
* Role-Based Access Control
* Mobile App API Support

---

## Author

* Harsh Solanki

---

## License

This project is developed for educational and learning purposes.
