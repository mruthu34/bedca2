const app = require('./src/app');

// START SERVER
const PORT = process.env.PORT || 3000;

// Bind to 0.0.0.0 so it works on all network interfaces (required for cloud platforms like Render)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});