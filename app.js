const express = require('express');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const pizzaRoutes = require('./routes/pizzaRoutes');
const ingredientRoutes = require('./routes/ingredientRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');
const cors = require('cors');

const app = express();

// Middleware
app.use(
  cors({
    origin:
      ~'http://localhost:3000' ||
      'https://l0mgm267-3000.uks1.devtunnels.ms/' ||
      'https://2c8fbb254d6229.lhr.life',
    credentials: true, // Allow cookies
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/pizzas', pizzaRoutes);
app.use('/api/v1/ingredients', ingredientRoutes);

// Error handling middleware
app.use(errorMiddleware);

module.exports = app;
