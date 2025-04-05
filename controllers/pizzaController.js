const { query, connect } = require('../config/db');
const { handleError } = require('../services/errorService');

// Helper function to generate slugs
const slugify = (name, uniqueId = '') => {
  let slug = name
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start
    .replace(/-+$/, ''); // Trim - from end

  if (uniqueId) {
    slug += `-${uniqueId}`;
  }

  return slug;
};

// Generate unique slug with fallback
const generateUniqueSlug = async (name) => {
  let baseSlug = slugify(name);
  let finalSlug = baseSlug;
  let counter = 1;

  // Check for existing slugs
  while (true) {
    const existing = await query('SELECT id FROM pizzas WHERE slug = $1', [
      finalSlug,
    ]);

    if (!existing.rows.length) break;

    finalSlug = `${baseSlug}-${Date.now().toString(36)}-${counter}`;
    counter++;
  }

  return finalSlug;
};

exports.createPizza = async (req, res) => {
  const client = await connect();
  try {
    await client.query('BEGIN');

    const { name, description, price, size, image, ingredients = [] } = req.body;

    // Validate required fields
    if (!name || !price || !size) {
      return handleError(res, 400, 'Name, price, and size are required');
    }

    // Generate unique slug
    const slug = await generateUniqueSlug(name);

    // Create pizza
    const pizzaResult = await client.query(
      `INSERT INTO pizzas 
       (name, slug, description, price, size, image) 
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, slug, description, price, size, image]
    );

    // Add ingredients
    for (const ingredientId of ingredients) {
      await client.query(
        `INSERT INTO pizza_ingredients (pizza_id, ingredient_id)
         VALUES ($1, $2)`,
        [pizzaResult.rows[0].id, ingredientId],
      );
    }

    // Get full pizza details
    const fullPizza = await client.query(
      `SELECT p.*, 
       json_agg(i.*) as ingredients
       FROM pizzas p
       LEFT JOIN pizza_ingredients pi ON p.id = pi.pizza_id
       LEFT JOIN ingredients i ON pi.ingredient_id = i.id
       WHERE p.id = $1
       GROUP BY p.id`,
      [pizzaResult.rows[0].id],
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        ...fullPizza.rows[0],
        ingredients: fullPizza.rows[0].ingredients.filter((i) => i.id !== null),
      },
      message: 'Pizza created successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');

    // Handle unique constraint errors
    if (error.code === '23505') {
      return handleError(
        res,
        409,
        'Pizza with this name or slug already exists',
      );
    }

    handleError(res, 500, 'Pizza creation failed', error);
  } finally {
    client.release();
  }
};

// Get all pizzas with filtering and pagination
exports.getPizzas = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      minPrice,
      maxPrice,
      size,
      search,
    } = req.query;
    const offset = (page - 1) * limit;
    const queryParams = [];
    let whereClauses = [];

    // Build filter conditions
    if (minPrice) {
      queryParams.push(minPrice);
      whereClauses.push(`price >= $${queryParams.length}`);
    }
    if (maxPrice) {
      queryParams.push(maxPrice);
      whereClauses.push(`price <= $${queryParams.length}`);
    }
    if (size) {
      queryParams.push(size);
      whereClauses.push(`size = $${queryParams.length}`);
    }
    if (search) {
      queryParams.push(`%${search}%`);
      whereClauses.push(`name ILIKE $${queryParams.length}`);
    }

    const baseQuery = `
      SELECT p.*, 
        json_agg(i.*) AS ingredients,
        (SELECT COUNT(*) FROM pizzas ${
          whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''
        }) AS total_count
      FROM pizzas p
      LEFT JOIN pizza_ingredients pi ON p.id = pi.pizza_id
      LEFT JOIN ingredients i ON pi.ingredient_id = i.id
      ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT $${queryParams.length + 1}
      OFFSET $${queryParams.length + 2}
    `;

    queryParams.push(limit, offset);

    const result = await query(baseQuery, queryParams);

    res.json({
      success: true,
      data: result.rows.map((row) => ({
        ...row,
        total_count: Number(row.total_count),
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: result.rows[0]?.total_count || 0,
      },
    });
  } catch (error) {
    handleError(res, 500, 'Failed to retrieve pizzas', error);
  }
};

// Get single pizza by ID with ingredients
exports.getPizzaById = async (req, res) => {
  try {
    const pizzaId = req.params.id;
    const pizza = await getFullPizzaDetails(null, pizzaId);

    if (!pizza) {
      return handleError(res, 404, 'Pizza not found');
    }

    res.json({
      success: true,
      data: pizza,
    });
  } catch (error) {
    handleError(res, 500, 'Failed to retrieve pizza', error);
  }
};

// Update pizza and ingredients
exports.updatePizza = async (req, res) => {
  const client = await connect();
  try {
    await client.query('BEGIN');
    const pizzaId = req.params.id;
    const { name, description, price, size, image, ingredients = [] } = req.body;

    // Update pizza details
    const updatedPizza = await client.query(
      `UPDATE pizzas
       SET name = $1, description = $2, price = $3, size = $4, image = $5
       WHERE id = $6
       RETURNING *`,
      [name, description, price, size, image, pizzaId],
    );

    if (updatedPizza.rows.length === 0) {
      return handleError(res, 404, 'Pizza not found');
    }

    // Update ingredients
    await client.query('DELETE FROM pizza_ingredients WHERE pizza_id = $1', [
      pizzaId,
    ]);

    for (const ingredientId of ingredients) {
      await client.query(
        `INSERT INTO pizza_ingredients (pizza_id, ingredient_id)
         VALUES ($1, $2)`,
        [pizzaId, ingredientId],
      );
    }

    await client.query('COMMIT');

    const fullPizza = await getFullPizzaDetails(client, pizzaId);

    res.json({
      success: true,
      data: fullPizza,
      message: 'Pizza updated successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    handleError(res, 500, 'Failed to update pizza', error);
  } finally {
    client.release();
  }
};

// Delete pizza
exports.deletePizza = async (req, res) => {
  const client = await connect();
  try {
    await client.query('BEGIN');
    const pizzaId = req.params.id;

    // Check pizza exists
    const pizzaCheck = await client.query(
      'SELECT * FROM pizzas WHERE id = $1',
      [pizzaId],
    );

    if (pizzaCheck.rows.length === 0) {
      return handleError(res, 404, 'Pizza not found');
    }

    // Delete ingredients first
    await client.query('DELETE FROM pizza_ingredients WHERE pizza_id = $1', [
      pizzaId,
    ]);

    // Delete pizza
    await client.query('DELETE FROM pizzas WHERE id = $1', [pizzaId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Pizza deleted successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    handleError(res, 500, 'Failed to delete pizza', error);
  } finally {
    client.release();
  }
};

// Helper function to get full pizza details
async function getFullPizzaDetails(client, pizzaId) {
  const localClient = client || (await connect());
  try {
    const result = await localClient.query(
      `SELECT p.*, 
        json_agg(i.*) AS ingredients
       FROM pizzas p
       LEFT JOIN pizza_ingredients pi ON p.id = pi.pizza_id
       LEFT JOIN ingredients i ON pi.ingredient_id = i.id
       WHERE p.id = $1
       GROUP BY p.id`,
      [pizzaId],
    );

    if (result.rows.length === 0) return null;

    return {
      ...result.rows[0],
      ingredients: result.rows[0].ingredients.filter((i) => i.id !== null),
    };
  } finally {
    if (!client) localClient.release();
  }
}
