# WellQuest (CA2 Frontend + CA1 Backend)

This repository contains a **Wellness Challenge Web Application** with a gamified flow:
- Users register/login (JWT-based auth)
- Users create and complete wellness challenges to earn points
- Points can be used for gamification features: **Boss Raid**, **Shop**, and **Inventory**

> Note: The CA2 brief requires a Review System page, but this repo currently focuses on the other required frontend components.

## 1) Setup

1. Install dependencies:
```bash
npm install
```

2. Configure your `.env` (DB credentials + JWT config). Example keys used by this backend:
- `JWT_SECRET_KEY`
- `JWT_EXPIRES_IN`
- `JWT_ALGORITHM`
- DB connection variables (see `src/services/db.js`)

3. Start the server:
```bash
node index.js
```

Open the app:
- Frontend: `http://localhost:3000/`
- API: same origin, e.g. `POST http://localhost:3000/login`

## 2) Frontend Pages

Frontend is served from `public/` (Express static):
- `/index.html` – landing page
- `/login.html` – login
- `/register.html` – registration
- `/dashboard.html` – points + shortcuts
- `/challenges.html` – CRUD + completion + attempts
- `/boss.html` – boss HP, leaderboard, spend points to hit boss
- `/shop.html` – list items + purchase
- `/inventory.html` – view inventory + use item for next completion

## 3) Auth (JWT)

After login/register, token is saved to `localStorage` and automatically attached to protected requests as:
```
Authorization: Bearer <token>
```

## 4) UI/Code Structure

- Bootstrap 5 + custom theme: `public/assets/css/styles.css`
- Small JS modules:
  - `public/assets/js/api.js` (fetch wrapper)
  - `public/assets/js/auth.js` (JWT helpers)
  - `public/assets/js/components/navbar.js` (shared nav)
  - `public/assets/js/pages/*` (page controllers)

