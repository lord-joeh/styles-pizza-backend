const express = require('express');
const router = express.Router();
const {
  createIngredient,
  getAllIngredients,
  getIngredientById,
  updateIngredient,
  deleteIngredient,
} = require('../controllers/ingredientController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validateIngredientsCreation } = require('../middleware/validationMiddleware')

// Public routes
router.get('/', getAllIngredients);
router.get('/:id', getIngredientById);

// Protected routes (admin only)
router.use(authenticate, authorize('admin'));

router.post('/',validateIngredientsCreation, createIngredient);
router.put('/:id', updateIngredient);
router.delete('/:id', deleteIngredient);

module.exports = router;
