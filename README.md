# 🏆 MAZAD - Online Auction Bidding Platform

A full-featured online auction platform built with PHP, MySQL, and vanilla JavaScript. Users can create auctions, place bids, manage favorites, and use an AI-powered chatbot for gift suggestions and product search.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [API Endpoints](#api-endpoints)
- [Usage](#usage)
- [Chatbot](#chatbot)
- [Admin Dashboard](#admin-dashboard)
- [Deployment](#deployment)

---

## ✨ Features

### User Features
- **User Authentication**: Sign up, login, and session management with bcrypt password hashing
- **Auction Creation**: Create auctions with multiple images, categories, and auction types (normal/live/important)
- **Image Upload**: Support for multi-image uploads with MIME validation and 5MB per-file limit
- **Bidding System**: Place bids on active auctions with real-time price updates
- **Wishlist/Favorites**: Save favorite auctions to your wishlist for easy access
- **Profile Management**: Edit user profile with personal details, avatar support
- **Category Browsing**: Browse auctions by category (Fashion, Electronics, Art, Watches, Cars, Home)

### Admin Features
- **Auction Approval System**: Review pending auctions before they go live
- **Auction Management**: Approve, reject, or delete auctions from admin dashboard
- **Image Cleanup**: Automatic deletion of associated images when auctions are removed
- **Dashboard Stats**: Real-time statistics for total, live, pending, and suspended auctions
- **Role-Based Access**: Admin and employee roles with permission checks

### Chatbot Features
- **Gift Suggestion**: AI chatbot asks 4 questions to recommend gifts (watches for men, bags for women)
- **Product Search**: Search auctions in natural language with filtered results
- **Conversation Flow**: Multi-step conversation with action buttons and text input
- **Server Integration**: Fetches live auction data for intelligent product matching

---

## 🛠 Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with gradients, flexbox, grid
- **Vanilla JavaScript** - No frameworks; lightweight and fast
- **Local Storage** - Client-side state management for favorites and drafts

### Backend
- **PHP 8.2** - Server-side logic and API endpoints
- **MySQL/MariaDB** - Relational database
- **MySQLi** - Database connection and queries
- **Session Management** - PHP sessions for user authentication

### Deployment
- **XAMPP** - Local development (Apache + PHP + MySQL)
- **GitHub** - Version control and repository hosting

---

## 📁 Project Structure

```
mazad/
├── admin.html                 # Admin control panel
├── index.html                 # Home page
├── login.html                 # Login page
├── register.html              # Sign-up page
├── profile.html               # User profile
├── chatbot.html               # Chatbot interface
├── seller-auctions.html       # User's created auctions
├── auction-details.html       # Auction detail view
│
├── api/
│   ├── login.php              # Authentication
│   ├── register.php           # User registration
│   ├── add-auction.php        # Create auction with images
│   ├── get-auctions.php       # List all auctions
│   ├── add-favorite.php       # Add to wishlist
│   ├── get-favorites.php      # Get user favorites
│   ├── remove-favorite.php    # Remove from wishlist
│   ├── approve-auction.php    # Admin: approve
│   ├── reject-auction.php     # Admin: reject
│   ├── delete-auction.php     # Admin: delete
│   └── get-pending-auctions.php  # Admin: pending list
│
├── config/
│   └── db.php                 # Database connection
│
├── css/
│   ├── style.css              # Global styles
│   ├── admin.css              # Admin dashboard
│   ├── chatbot.css            # Chatbot interface
│   └── [category].css         # Category styles
│
├── js/
│   ├── chatbot.js             # Gift suggestion + product search
│   ├── auth.js                # Authentication
│   ├── seller.js              # Auction creation
│   ├── admin.js               # Admin dashboard
│   ├── favorites.js           # Wishlist management
│   ├── details.js             # Auction detail logic
│   └── [category].js          # Category page scripts
│
├── images/
│   └── auctions/              # Uploaded auction images
│
└── README.md                  # This file
```

---

## 📦 Installation

### Prerequisites
- XAMPP (Apache + PHP 8.2 + MySQL/MariaDB)
- Git
- SQL knowledge (basic)

### Step 1: Clone Repository

```bash
git clone https://github.com/M4-Faraj/Mazad.git
cd Mazad
```

### Step 2: Setup XAMPP

1. Start Apache and MySQL from XAMPP control panel
2. Copy project to `C:\xampp\htdocs\mazad\`
3. Visit `http://localhost/mazad/` in browser

### Step 3: Configure Database

1. Open phpMyAdmin: `http://localhost/phpmyadmin/`
2. Create database: `mazad_db`
3. Import the main schema SQL first.
4. Import the current auction seed data:
   - `mazad_49_auctions_seed.sql`
   - `mazad_10_art_auctions_seed.sql`

### Step 4: Setup Config

Edit `config/db.php` if needed:

```php
$conn = mysqli_connect(
    "localhost",  // Host
    "root",       // Username
    "",           // Password (empty by default)
    "mazad_db"    // Database
);
```

For email, copy `config/mail.example.php` to `config/mail.php` and fill in real SMTP values. Do not commit real credentials.

### Step 5: Add Required Assets

```bash
mkdir -p images/auctions
mkdir -p images/showcase
mkdir -p assets/images
chmod 755 images/auctions
```

Copy auction images into `images/auctions/`, showcase hero images into `images/showcase/`, and add the default avatar at `assets/images/default-avatar.png`.

---

## 🗄 Database Schema

### Core Tables
- **users** - User accounts with roles (user, admin, employee)
- **auctions** - Auction listings with status (pending, approved, rejected)
- **auction_images** - Multiple images per auction with file paths
- **bids** - Bid history with amounts and timestamps
- **favorites** - User's wishlist items

---

## 🔌 API Endpoints

### Auth
- `POST /api/register.php` - Sign up
- `POST /api/login.php` - Login
- `GET /api/logout.php` - Logout
- `GET /api/get-current-user.php` - Get logged-in user

### Auctions
- `POST /api/add-auction.php` - Create auction (upload up to 6 images, validation: 5MB max, image MIME types)
- `GET /api/api/get-auctions.php` - Get all auctions with images array

### Favorites
- `POST /api/add-favorite.php` - Add to wishlist
- `GET /api/get-favorites.php` - Get user's favorites
- `POST /api/remove-favorite.php` - Remove from wishlist

### Admin (auth required)
- `GET /api/get-pending-auctions.php` - Pending auctions list
- `POST /api/approve-auction.php` - Approve auction
- `POST /api/reject-auction.php` - Reject auction
- `POST /api/delete-auction.php` - Delete auction (cleans up images)

---

## 💬 Chatbot (NEW!)

Access chatbot at `/chatbot.html`

### Features

#### 1. Gift Suggestion
Chatbot asks 4 questions:
1. **Gender** - Man or Woman?
2. **Occasion** - Birthday, anniversary, etc.
3. **Budget** - Price range
4. **Style** - Classic, modern, sporty, luxury, casual

**Logic:**
- Man → Suggests ⌚ **Premium Watch** (Watches & Jewelry)
- Woman → Suggests 👜 **Designer Bag** (Fashion)
- Links to relevant category for browsing

#### 2. Product Search
- User types what they want (e.g., "vintage rolex", "designer handbag")
- Chatbot searches live auctions with keyword matching
- Returns top 5 results with images, prices, seller
- User can navigate to main store or search again

### Implementation
- **chatbot.js**: Conversation state machine, API integration
- **chatbot.html**: Modal UI with messages and action buttons
- **chatbot.css**: Modern gradient design, responsive layout
- Client-side only (no backend chatbot API needed)
- Fetches from `/api/api/get-auctions.php` for product data

---

## 📊 Admin Dashboard

Access at `/Admin.html` (admin role required)

### Stats Panel
- Total Auctions
- Live Now
- Pending Review
- Suspended

### Auction Management
- **Table View**: All auctions with filters and sorting
- **Pending Tab**: New auctions awaiting approval
- **Actions**:
  - ✅ Approve (status → approved, timestamp recorded)
  - ❌ Reject (status → rejected, stored for records)
  - 🗑️ Delete (removes auction and images from disk)

### Search & Filter
- By category
- By status (pending, approved, live, ended, suspended)
- Sort: newest, oldest, price, bids

---

## 🔒 Security

- **Password Hashing**: bcrypt (password_hash/password_verify)
- **Sessions**: PHP session-based authentication
- **Role-Based Access**: Admin endpoints check user role
- **File Validation**: MIME type and size checks on uploads
- **Image Cleanup**: Automatic deletion when auctions are removed

---

## 🚀 Deployment

### Local (XAMPP)
```bash
# Ensure XAMPP is running
# Visit http://localhost/mazad/
```

### Production
1. Upload files via FTP/SFTP
2. Create MySQL database and import SQL
3. Update `config/db.php` with production credentials
4. Set file permissions (755 for dirs, 644 for files)
5. Ensure `images/auctions/` is writable

---

## 📝 How It's Made

### Frontend Architecture
- **Vanilla JavaScript** for all interactivity (no jQuery, React, or Vue)
- **localStorage** for client-side state (favorites, drafts)
- **Fetch API** for all server communication
- **CSS Grid & Flexbox** for responsive layouts
- **Multi-page SPA** with shared header/footer components

### Backend Architecture
- **PHP Sessions** for user authentication
- **MySQLi** for database queries
- **RESTful API** endpoints for all operations
- **Role-Based Authorization** (user, admin, employee)
- **File Upload** with MIME validation and size checks

### Chatbot Implementation
- **Conversation State Machine**: Tracks current step and user answers
- **Action Buttons**: Quick interaction for gift questions
- **Fetch Integration**: Real-time product search from live auctions
- **Client-Side Logic**: No backend AI needed; keyword matching suffices
- **Responsive UI**: Works on mobile and desktop

### Database Design
- **Foreign Keys**: Enforce referential integrity
- **Cascading Deletes**: Remove bids/images when auction deleted
- **Timestamps**: Track creation and approval times
- **Status Tracking**: Pending → Approved → Live → Ended

### Image Handling
- **Multi-Upload**: Up to 6 images per auction via FormData
- **Server Validation**: MIME type (JPEG, PNG, WebP, GIF) and size (5MB max)
- **File Storage**: Organized in `images/auctions/` with unique names
- **Database Mapping**: `auction_images` table links images to auctions
- **Cleanup**: Images deleted when admin removes auction

---

## 🛠 Future Enhancements

- Real-time bidding (WebSockets)
- AI-powered product recommendations
- Email notifications for bids
- Mobile app (React Native)
- Payment gateway integration
- Advanced search with filters
- User reviews and ratings
- Live auction streaming

---

## 📞 Support

- 🐛 Found a bug? Open an Issue
- 💡 Have a feature idea? Start a Discussion
- 🤝 Want to contribute? Submit a Pull Request

---

## 📄 License

MIT License - see LICENSE file for details

---

**Built with ❤️ by Mohamed Faraj**  
**Last Updated**: May 7, 2026  
**Version**: 1.0.0

