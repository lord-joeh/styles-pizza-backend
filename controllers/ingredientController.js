const { query, connect } = require('../config/db');
const { handleError } = require('../services/errorService');

// Create a new ingredient
exports.createIngredient = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validate input
    if (!name) {
      return handleError(res, 400, 'Name is required');
    }

    // Check for existing ingredient
    const existingIngredient = await query(
      'SELECT * FROM ingredients WHERE name = $1',
      [name],
    );

    if (existingIngredient.rows.length > 0) {
      return handleError(res, 409, 'Ingredient already exists');
    }

    // Create ingredient
    const newIngredient = await query(
      `INSERT INTO ingredients (name, description)
       VALUES ($1, $2)
       RETURNING *`,
      [name, description],
    );

    res.status(201).json({
      success: true,
      data: newIngredient.rows[0],
      message: 'Ingredient created successfully',
    });
  } catch (error) {
    handleError(res, 500, 'Failed to create ingredient', error);
  }
};

// Get all ingredients
exports.getAllIngredients = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const ingredients = await query(
      `SELECT * FROM ingredients
       ORDER BY name
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    res.json({
      success: true,
      data: ingredients.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: ingredients.rowCount,
      },
    });
  } catch (error) {
    handleError(res, 500, 'Failed to retrieve ingredients', error);
  }
};

// Get a single ingredient by ID
exports.getIngredientById = async (req, res) => {
  try {
    const ingredient = await query('SELECT * FROM ingredients WHERE id = $1', [
      req.params.id,
    ]);

    if (!ingredient.rows[0]) {
      return handleError(res, 404, 'Ingredient not found');
    }

    res.json({
      success: true,
      data: ingredient.rows[0],
    });
  } catch (error) {
    handleError(res, 500, 'Failed to retrieve ingredient', error);
  }
};

// Update an ingredient
exports.updateIngredient = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validate input
    if (!name) {
      return handleError(res, 400, 'Name is required');
    }

    const updatedIngredient = await query(
      `UPDATE ingredients
       SET name = $1, description = $2
       WHERE id = $3
       RETURNING *`,
      [name, description, req.params.id],
    );

    if (!updatedIngredient.rows[0]) {
      return handleError(res, 404, 'Ingredient not found');
    }

    res.json({
      success: true,
      data: updatedIngredient.rows[0],
      message: 'Ingredient updated successfully',
    });
  } catch (error) {
    handleError(res, 500, 'Failed to update ingredient', error);
  }
};

// Delete an ingredient
exports.deleteIngredient = async (req, res) => {
  const client = await connect();
  try {
    await client.query('BEGIN');

    // Check if ingredient is used in any pizzas
    const pizzaCheck = await client.query(
      'SELECT * FROM pizza_ingredients WHERE ingredient_id = $1',
      [req.params.id],
    );

    if (pizzaCheck.rows.length > 0) {
      return handleError(res, 400, 'Cannot delete ingredient used in pizzas');
    }

    // Delete ingredient
    const deletedIngredient = await client.query(
      'DELETE FROM ingredients WHERE id = $1 RETURNING *',
      [req.params.id],
    );

    if (!deletedIngredient.rows[0]) {
      return handleError(res, 404, 'Ingredient not found');
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Ingredient deleted successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    handleError(res, 500, 'Failed to delete ingredient', error);
  } finally {
    client.release();
  }
};
