const express = require("express");
const app = express();
const authenticate = require("../middleware/authEmployee");
const authController = require("../controllers/employee/authController");
const orderController = require("../controllers/employee/orderController");
const profileController = require("../controllers/employee/profileController");

app.post('/api/employee/login', authController.login);
app.get('/api/employee/profile', authenticate, profileController.getProfile);
app.put('/api/employee/profile-update', authenticate, profileController.updateProfile);
app.get('/api/employee/orders', authenticate, orderController.getOrders);
app.put('/api/orders/:id/complete', authenticate, orderController.completeOrder);
app.put('/api/employee/change-password', authenticate, profileController.changePassword);
app.post('/api/employee/forgot-password', profileController.forgotPassword);
app.post('/api/employee/reset-password', profileController.resetPassword);

module.exports = app;