const express = require('express');
const router = express.Router();
const {
  createPizza,
  getPizzas,
  getPizzaById,
  updatePizza,
  deletePizza,
} = require('../controllers/pizzaController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getPizzas);
router.get('/:id', getPizzaById);

// Protected admin routes
router.use(authenticate, authorize('admin'));

router.post('/', createPizza);
router.put('/:id', updatePizza);
router.delete('/:id', deletePizza);

module.exports = router;
