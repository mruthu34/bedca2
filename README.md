# Boss Breaker (CA2 Frontend + CA1 Backend)

This repository contains a Wellness Challenge web app with a gamified flow:
- Users register/login (JWT-based auth)
- Users create and complete challenges to earn points
- Points can be spent in Boss Raid, Shop, and Inventory features

## Setup

### Requirements
- Node.js + npm
- MySQL (or compatible) database

### Install dependencies
```bash
npm install
```

### Configure environment
Create a `.env` file in the project root with these keys:
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_DATABASE`
- `JWT_SECRET_KEY`
- `JWT_EXPIRES_IN`
- `JWT_ALGORITHM`

Database connection details are read in `src/services/db.js`.

### Start the server
```bash
node index.js
```

App URLs:
- Frontend: `http://localhost:3000/`
- API: same origin (example: `POST http://localhost:3000/login`)

### Database notes for reviewers
- Tables are created automatically on startup via `src/configure/initTables.js`.
- The Shop and Boss pages require seed data:
  - Insert items into the `Item` table to populate the shop.
  - Insert a boss into the `Boss` table (or create one via a seed) to see an active boss.

## Frontend Pages

Frontend is served from `public/` (Express static):
- `/index.html` - landing page
- `/login.html` - login
- `/register.html` - registration
- `/dashboard.html` - points + shortcuts
- `/challenges.html` - CRUD + completion + attempts + reviews
- `/boss.html` - boss HP, leaderboard, spend points to hit boss
- `/shop.html` - list items + purchase
- `/inventory.html` - view inventory + use item for next completion

## Auth (JWT)

After login/register, a token is saved to `localStorage` and attached to protected requests as:
```
Authorization: Bearer <token>
```

## UI/Code Structure

- Bootstrap 5 + custom theme: `public/assets/css/styles.css`
- Small JS modules:
  - `public/assets/js/api.js` (fetch wrapper)
  - `public/assets/js/auth.js` (JWT helpers)
  - `public/assets/js/components/navbar.js` (shared nav)
  - `public/assets/js/pages/*` (page controllers)