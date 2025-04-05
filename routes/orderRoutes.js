const express = require('express');
const router = express.Router();
const { param, body } = require('express-validator');
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  updatePaymentStatus,
  updateDeliveryStatus,
  deleteOrder,
  getOrdersByCustomer,
} = require('../controllers/orderController');
const {
  authenticate,
  authorize,
  ensureUser,
} = require('../middleware/authMiddleware');
const { validateOrderCreation } = require('../middleware/validationMiddleware');

// Apply authentication to all routes
router.use(authenticate);
router.use(ensureUser);

// Routes accessible to all authenticated users
router.post('/', validateOrderCreation, async (req, res, next) => {
  try {
    await createOrder(req, res);
  } catch (error) {
    next(error);
  }
});

router.get('/customer/:customerId', async (req, res, next) => {
  try {
    await getOrdersByCustomer(req, res);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    await getOrder(req, res);
  } catch (error) {
    next(error);
  }
});

// Admin/Staff only routes
router.use(authorize('admin', 'staff'));

router.get('/', async (req, res, next) => {
  try {
    await getOrders(req, res);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/status', async (req, res, next) => {
  try {
    await updateOrderStatus(req, res);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/payment-status', async (req, res, next) => {
  try {
    await updatePaymentStatus(req, res);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/delivery-status', async (req, res, next) => {
  try {
    await updateDeliveryStatus(req, res);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await deleteOrder(req, res);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
module.exports = router;
