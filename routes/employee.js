const express = require("express");
const app = express();
const authenticate = require("../middleware/authEmployee");
const authController = require("../controllers/employee/authController");
const orderController = require("../controllers/employee/orderController");
const profileController = require("../controllers/employee/profileController");

app.get('/login', (req, res) => {
    res.render('employee/login');
})
app.get('', authenticate, (req, res) => {
    const employee = req.employee;
    res.render('employee/employee', { employee });
})
app.post('/api/login', authController.login);
app.get('/api/profile', authenticate, profileController.getProfile);
app.put('/api/profile-update', authenticate, profileController.updateProfile);
app.get('/api/orders', authenticate, orderController.getOrders);
app.put('/api/orders/:id/complete', authenticate, orderController.completeOrder);
app.put('/api/change-password', authenticate, profileController.changePassword);
app.post('/api/forgot-password', profileController.forgotPassword);
app.post('/api/reset-password', profileController.resetPassword);

module.exports = app;