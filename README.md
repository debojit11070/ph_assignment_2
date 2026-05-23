# 🚼 DevPulse – Issue Tracker API

> Internal Tech Issue & Feature Tracker
> 
> *A collaborative platform for software teams to report bugs, suggest features, and coordinate resolutions.*

**Live API:** [will be deployed to Vercel](#)

---

## ✨ Features

- 🔐 JWT-based authentication with secure password hashing
- 👥 Role-based access control (Contributor & Maintainer)
- 🐛 Bug tracking and feature request management
- 🔄 Issue status workflow (open → in_progress → resolved)
- 🛠️ RESTful API with comprehensive error handling
- 📊 Query filtering and sorting capabilities

---

## 🛠️ Technology Stack

| Technology | Note |
| --- | --- |
| Node.js | LTS runtime (24.x or higher) |
| TypeScript | use latest version, dont use beta version |
| Express.js | Modular router architecture |
| PostgreSQL | Relational database, native `pg` driver only |
| Raw SQL | Direct `pool.query()` calls, absolutely no query builders, ORMs, or SQL JOINs |
| bcrypt | Password hashing, salt rounds between 8 and 12 |
| jsonwebtoken | JWT generation & verification (standard tokens) |

---

## 👥 User Roles & Permissions

| Role | Allowed Actions |
| --- | --- |
| **contributor** | • Register and log in<br>• Create new issues (bug or feature request)<br>• View all issues<br>• Update own issue field |
| **maintainer** | • All contributor permissions<br>• Update any issue field<br>• Delete any issue<br>• Change issue workflow status independently<br>|

---

## 🔐 Authentication & Authorization System

- **JWT Flow:** Client sends credentials → Server validates & hashes/compares → Server returns signed JWT → Client attaches token to `Authorization: <token>` header → Server verifies signature & expiry before processing.
- **Security Rules:**
    - Passwords are never exposed in responses or logs.
    - Protected endpoints reject requests without a valid JWT.
    - Role verification occurs before privileged operations.

---

## 🗄️ Database Schema Design

### Table 1: `users`

| Field | Requirement (Plain Text) |
| --- | --- |
| `id` | Auto-incrementing unique identifier for each account |
| `name` | Full display name of the team member, must be provided |
| `email` | Valid login address, must be unique across all accounts, must be provided |
| `password` | Encrypted string stored securely, must be provided during registration, never returned in responses |
| `role` | Determines system access level, defaults to `contributor`, must be `contributor` or `maintainer` |
| `created_at` | Timestamp marking when the account was created, automatically generated on insert |
| `updated_at` | Timestamp marking when the account was last updated, automatically refreshed on update |

### Table 2: `issues`

| Field | Requirement (Plain Text) |
| --- | --- |
| `id` | Auto-incrementing unique identifier for each reported item |
| `title` | Short descriptive headline, must be provided, maximum 150 characters |
| `description` | Detailed explanation of the problem or suggestion, must be provided, minimum 20 characters |
| `type` | Categorizes the entry, must be either `bug` or `feature_request` |
| `status` | Current workflow state, defaults to `open`. Status must be one of: `open`, `in_progress`, `resolved` |
| `reporter_id` | References the user who submitted the issue (no foreign key constraint required; validate in application logic) |
| `created_at` | Timestamp marking when the issue was created, automatically generated on insert |
| `updated_at` | Timestamp marking when the issue was last updated, automatically refreshed on update |

---

## 🌐 API Endpoints Specification

### 🔹 Authentication Module

### 1. User Registration

**Access:** Public

**Description:** Register a new user account with contributor or maintainer role

**Endpoint**

`POST /api/auth/signup`

**Request Body**

```json
{
  "name": "Rajib Ahmed",
  "email": "rajib.ahmed@devpulse.com",
  "password": "securePassword123",
  "role": "contributor"
}
```

**Success Response (201 Created)**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 1,
    "name": "Rajib Ahmed",
    "email": "rajib.ahmed@devpulse.com",
    "role": "contributor",
    "created_at": "2026-01-20T09:00:00Z",
    "updated_at": "2026-01-20T09:00:00Z"
  }
}
```

---

### 2. User Login

**Access:** Public

**Description:** Authenticate user and receive JWT token

**Endpoint**

`POST /api/auth/login`

**Request Body**

```json
{
  "email": "rajib.ahmed@devpulse.com",
  "password": "securePassword123"
}
```

**Success Response (200 OK)**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "Rajib Ahmed",
      "email": "rajib.ahmed@devpulse.com",
      "role": "contributor",
      "created_at": "2026-01-20T09:00:00Z",
      "updated_at": "2026-01-20T09:00:00Z"
    }
  }
}
```

> 💡 **Hint:** When signing the JWT during login, include the user's `id`, `name`, and `role` in the token payload. These fields will be needed later to identify the requester and enforce permissions.
> 

---

### 🔹 Issues Module

### 3. Create Issue

**Access:** Authenticated users (`contributor`, `maintainer`)

**Description:** Create a new bug report or feature request

**Endpoint**

`POST /api/issues`

**Headers**

```
Authorization: <JWT_TOKEN>
```

**Request Body**

```json
{
  "title": "Database connection timeout under load",
  "description": "Pool exhausts after 50+ concurrent queries, causing 500 errors",
  "type": "bug"
}
```

**Success Response (201 Created)**

```json
{
  "success": true,
  "message": "Issue created successfully",
  "data": {
    "id": 45,
    "title": "Database connection timeout under load",
    "description": "Pool exhausts after 50+ concurrent queries, causing 500 errors",
    "type": "bug",
    "status": "open",
    "reporter_id": 1,
    "created_at": "2026-01-20T10:30:00Z",
    "updated_at": "2026-01-20T10:30:00Z"
  }
}
```

> 💡 **Hint:** The `reporter_id` is extracted from the decoded JWT (`req.user.id`), not from the request body.
> 

---

### 4. Get All Issues

**Access:** Public

**Description:** Retrieve all issues with optional sorting and filtering

**Endpoint**

`GET /api/issues?sort=newest`

**Query Parameters (`let’s take a challenge`)**

| Param | Values | Default |
| --- | --- | --- |
| `sort` | `newest`, `oldest` | `newest` |
| `type` | `bug`, `feature_request` | (none) |
| `status` | `open`, `in_progress`, `resolved` | (none) |

**Success Response (200 OK)**

```json
{
  "success": true,
  "message": "Issues retrived successfully",
  "data": [
    {
      "id": 45,
      "title": "Database connection timeout under load",
      "description": "Pool exhausts after 50+ concurrent queries, causing 500 errors",
      "type": "bug",
      "status": "open",
      "reporter": {
        "id": 1,
        "name": "John Doe",
        "role": "contributor"
      },
      "created_at": "2026-01-20T10:30:00Z",
      "updated_at": "2026-01-20T14:45:00Z"
    }
  ]
}
```

> 💡 **Hint:** To include `reporter` details without JOINs, fetch issues first, then fetch reporter data for each issue in a separate query (or batch with `WHERE id IN (...)`).
> 

---

### 5. Get Single Issue

**Access:** Public

**Description:** Retrieve full details of a specific issue

**Endpoint**

`GET /api/issues/:id`

**Success Response (200 OK)**

```json
{
  "success": true,
  "message": "Issue retrived successfully",
  "data": {
    "id": 45,
    "title": "Database connection timeout under load",
    "description": "Pool exhausts after 50+ concurrent queries, causing 500 errors",
    "type": "bug",
    "status": "open",
    "reporter": {
      "id": 1,
      "name": "Rajib Ahmed",
      "role": "contributor"
    },
    "created_at": "2026-01-20T10:30:00Z",
    "updated_at": "2026-01-20T14:45:00Z"
  }
}
```

---

### 6. Update Issue

**Access:** Maintainer (any issue) OR Contributor (own issue, only if status is `open`)

**Description:** Update issue title, description, or type

**Endpoint**

`PATCH /api/issues/:id`

**Headers**

```
Authorization: <JWT_TOKEN>
```

**Request Body**

```json
{
  "title": "Updated: Database pool exhaustion fix needed",
  "description": "Updated description with reproduction steps...",
  "type": "bug"
}
```

**Success Response (200 OK)**

```json
{
  "success": true,
  "message": "Issue updated successfully",
  "data": {
    "id": 45,
    "title": "Updated: Database pool exhaustion fix needed",
    "description": "Updated description with reproduction steps...",
    "type": "bug",
    "status": "in_progress",
    "reporter_id": 1,
    "created_at": "2026-01-20T10:30:00Z",
    "updated_at": "2026-01-20T14:45:00Z"
  }
}
```

---

### 7. Delete Issue

**Access:** Maintainer only

**Description:** Permanently remove an issue from the system

**Endpoint**

`DELETE /api/issues/:id`

**Headers**

```
Authorization: <JWT_TOKEN>
```

**Success Response (200 OK)**

```json
{
  "success": true,
  "message": "Issue deleted successfully"
}
```

---

## 🚨 Common Response Patterns

**Standard Success Response Structure**

```json
{
  "success": true,
  "message": "Operation description",
  "data": "Response data"
}
```

**Standard Error Response Structure**

```json
{
  "success": false,
  "message": "Error description",
  "errors": "Error details"
}
```

**HTTP Status Codes**

*(Tip: Use the [`http-status-codes`](https://www.npmjs.com/package/http-status-codes) package for consistent status code references)*

| Code | Reason Phrase | Usage |
| --- | --- | --- |
| `200` | OK | Successful GET, PATCH, PUT, DELETE |
| `201` | Created | Successful POST (resource created) |
| `204` | No Content | Successful DELETE with no response body |
| `400` | Bad Request | Validation errors, invalid input, duplicate resource |
| `401` | Unauthorized | Missing, expired, or invalid JWT token |
| `403` | Forbidden | Valid token but insufficient role/permissions |
| `404` | Not Found | Requested resource does not exist |
| `409` | Conflict | Business logic conflict (e.g., editing resolved issue) |
| `500` | Internal Server Error | Unexpected server or database error |

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js 24.x or higher
- PostgreSQL (Neon DB)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/devpulse.git
   cd devpulse
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   - Create a `.env` file in the root directory
   - Copy the provided connection parameters:
   ```env
   POSTGRES_HOST=ep-frosty-paper-aq43v19m.c-8.us-east-1.aws.neon.tech
   POSTGRES_PORT=5432
   POSTGRES_USER=neondb_owner
   POSTGRES_PASSWORD=npg_WHbvVd6PQuI2
   POSTGRES_DATABASE=neondb
   POSTGRES_POOLER_HOST=ep-frosty-paper-aq43v19m-pooler.c-8.us-east-1.aws.neon.tech
   JWT_SECRET=your_super_secret_jwt_key
   NODE_ENV=development
   PORT=5000
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```
   The API will be available at `http://localhost:5000`

---

## 📦 Project Structure

```
src/
├── config/
│   └── database.ts          # PostgreSQL connection pool
├── middleware/
│   └── auth.ts              # JWT authentication & authorization
├── modules/
│   ├── auth/
│   │   └── controller.ts    # Signup & Login logic
│   └── issues/
│       └── controller.ts    # CRUD operations for issues
├── routes/
│   ├── auth.ts              # Auth endpoints
│   └── issues.ts            # Issues endpoints
├── utils/
│   └── response.ts          # Standardized response formatting
└── server.ts                # Express app initialization
```

---

## 🔌 Database Schema

### Table: `users`
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'contributor',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table: `issues`
```sql
CREATE TABLE issues (
  id SERIAL PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'open',
  reporter_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📬 Submission Checklist

- ✅ GitHub Repo (Public)
- ✅ Live Deployment (Vercel/Render/Railway)
- ✅ All API endpoints functional
- ✅ Database schema implemented
- ✅ JWT authentication & authorization
- ✅ Role-based permissions
- ✅ Error handling with proper status codes
- ✅ Meaningful commit history (10+ commits)

---

## 🎓 Assignment Deadline

| Marks | Deadline |
| --- | --- |
| **60 Marks** | May 23, 2026 at 11:59 PM |
| **50 Marks** | May 24, 2026 at 11:59 PM |
| **30 Marks** | May 24 to June 15, 2026 at 11:59 PM |

---

## ⚠️ Academic Integrity

All code in this repository is original work. Plagiarism will not be tolerated and will result in disciplinary action.
> 

---

**Good luck! 🚀** Build something clean, secure, and well-documented.
