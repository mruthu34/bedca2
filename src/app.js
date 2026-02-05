    //////////////////////////////////////////////////////
    // INCLUDES
    //////////////////////////////////////////////////////
    const express = require('express');
    const path = require('path');

    // Import your new route file
    // You would also import your other routes here
const mainRoutes = require('./routes/mainRoute.js');
// Side-effect: ensure DB tables exist on startup.
require("./configure/initTables");


    //////////////////////////////////////////////////////
    // CREATE APP
    //////////////////////////////////////////////////////
    const app = express();

    //////////////////////////////////////////////////////
    // USES (Middleware)
    //////////////////////////////////////////////////////
    // Serve frontend static files (public/*)
    // - This will serve /index.html at GET /
    // - API routes (POST /login, /register, etc.) still work normally
    app.use(express.static(path.join(__dirname, '..', 'public')));
    app.use(express.json()); // For parsing application/json
    app.use(express.urlencoded({ extended: false })); // For parsing application/x-www-form-urlencoded
    app.use("/", mainRoutes);

    //////////////////////////////////////////////////////
    // SETUP ROUTES
    //////////////////////////////////////////////////////

    // Note: GET / is handled by the static frontend (public/index.html)

    //////////////////////////////////////////////////////
    // EXPORT APP
    //////////////////////////////////////////////////////
    module.exports = app;
