const { query, connect } = require('../config/db');
const { handleError } = require('../services/errorService');

// Create new order with transaction
exports.createOrder = async (req, res) => {
  const client = await connect();
  try {
    await client.query('BEGIN');
    const userId = req.user.id;
    const { items, delivery_address, special_instructions } = req.body;

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return handleError(res, 400, 'Invalid order items');
    }

    // Calculate total
    const total = items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders 
       (user_id, total_amount, delivery_address, special_instructions) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [userId, total, delivery_address, special_instructions],
    );

    // Insert order items
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items 
         (order_id, pizza_id, quantity, price) 
         VALUES ($1, $2, $3, $4)`,
        [orderResult.rows[0].id, item.pizza_id, item.quantity, item.price],
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      order: orderResult.rows[0],
      message: 'Order created successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    handleError(res, 500, 'Order creation failed', error);
  } finally {
    client.release();
  }
};

// Get all orders (Admin only)
exports.getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    let baseQuery = `
      SELECT o.*, u.email AS customer_email 
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
    `;
    const queryParams = [];

    if (status) {
      baseQuery += ' WHERE o.status = $1';
      queryParams.push(status);
    }

    baseQuery += `
      ORDER BY o.created_at DESC
      LIMIT $${queryParams.length + 1}
      OFFSET $${queryParams.length + 2}
    `;
    queryParams.push(limit, offset);

    const orders = await query(baseQuery, queryParams);

    res.json({
      success: true,
      data: orders.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: orders.rowCount,
      },
    });
  } catch (error) {
    handleError(res, 500, 'Failed to retrieve orders', error);
  }
};

// Get single order by ID
exports.getOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const orderResult = await query(
      `SELECT o.*, 
       json_agg(oi.*) AS items,
       u.email AS customer_email
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = $1
       GROUP BY o.id, u.email`,
      [orderId],
    );

    if (orderResult.rows.length === 0) {
      return handleError(res, 404, 'Order not found');
    }

    const order = orderResult.rows[0];

    // Check authorization
    if (!isAdmin && order.user_id !== userId) {
      return handleError(res, 403, 'Unauthorized access');
    }

    res.json({ success: true, data: order });
  } catch (error) {
    handleError(res, 500, 'Failed to retrieve order', error);
  }
};

// Update order status (Admin only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;
    const validStatuses = [
      'pending',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
    ];

    if (!validStatuses.includes(status)) {
      return handleError(res, 400, 'Invalid order status');
    }

    const result = await query(
      `UPDATE orders SET status = $1 
       WHERE id = $2 RETURNING *`,
      [status, orderId],
    );

    if (result.rows.length === 0) {
      return handleError(res, 404, 'Order not found');
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Order status updated',
    });
  } catch (error) {
    handleError(res, 500, 'Failed to update order status', error);
  }
};

// Get orders by customer
exports.getOrdersByCustomer = async (req, res) => {
  try {
    const customerId = req.params.customerId;
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';

    if (!userId) {
      return handleError(res, 401, 'Unauthorized access, user not logged in');
    }

    // if (!isAdmin && customerId !== userId.toString()) {
    //   return handleError(res, 403, 'Unauthorized access');
    // }

    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const orders = await query(
      `SELECT * FROM orders 
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [customerId, limit, offset],
    );

    if (orders.rows.length === 0) {
      return handleError(res, 404, 'No orders found for customer');
    }

    res.json({
      success: true,
      data: orders.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: orders.rowCount,
      },
    });
  } catch (error) {
    handleError(res, 500, 'Failed to retrieve customer orders', error);
  }
};

// Delete order (Admin only)
exports.deleteOrder = async (req, res) => {
  const client = await connect();
  try {
    await client.query('BEGIN');
    const orderId = req.params.id;

    // Delete order items first
    await client.query('DELETE FROM order_items WHERE order_id = $1', [
      orderId,
    ]);

    // Delete order
    const result = await client.query(
      'DELETE FROM orders WHERE id = $1 RETURNING *',
      [orderId],
    );

    if (result.rows.length === 0) {
      return handleError(res, 404, 'Order not found');
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    handleError(res, 500, 'Failed to delete order', error);
  } finally {
    client.release();
  }
};

// Update payment status (Admin only)
exports.updatePaymentStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { payment_status } = req.body;
    const validStatuses = ['pending', 'paid', 'refunded', 'failed'];

    if (!validStatuses.includes(payment_status)) {
      return handleError(res, 400, 'Invalid payment status');
    }

    const result = await query(
      `UPDATE orders SET payment_status = $1 
       WHERE id = $2 RETURNING *`,
      [payment_status, orderId],
    );

    if (result.rows.length === 0) {
      return handleError(res, 404, 'Order not found');
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Payment status updated',
    });
  } catch (error) {
    handleError(res, 500, 'Failed to update payment status', error);
  }
};

// Update delivery status (Admin only)
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { delivery_status } = req.body;
    const validStatuses = ['pending', 'shipped', 'delivered', 'canceled'];

    if (!validStatuses.includes(delivery_status)) {
      return handleError(res, 400, 'Invalid delivery status');
    }

    const result = await query(
      `UPDATE orders SET delivery_status = $1 
       WHERE id = $2 RETURNING *`,
      [delivery_status, orderId],
    );

    if (result.rows.length === 0) {
      return handleError(res, 404, 'Order not found');
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Delivery status updated',
    });
  } catch (error) {
    handleError(res, 500, 'Failed to update delivery status', error);
  }
};
