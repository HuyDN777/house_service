const express = require("express");
const app = express();
const authenticate = require("../middleware/authAdmin");
const authController = require("../controllers/user/authController");
const orderController = require("../controllers/admin/orderController");
const serviceController = require("../controllers/admin/serviceController");
const userController = require("../controllers/admin/userController");
const categoryController = require("../controllers/admin/categoryController");
const employeeController = require("../controllers/admin/employeeController");
const promotionController = require("../controllers/admin/promotionController");
const billController = require("../controllers/admin/billController");
const feedbackController = require("../controllers/admin/feedbackController");
const statisticsController = require("../controllers/admin/statisticsController");


app.post('/api/login', authController.login);
app.get("/dashboard", (req, res) => {
    res.render("admin/dashboard");
});
app.get("/categories", authenticate, categoryController.getAllCategories);
app.post("/categories/add", authenticate, categoryController.createCategory);
app.post("/services/add", authenticate, serviceController.createService);
app.get("/services", authenticate, serviceController.getAllServices);
app.get("/employees", authenticate, employeeController.getAllEmployees);
app.get("/user", authenticate, userController.getAllUsers);
app.post("/users/add", authenticate, userController.addUser);
app.get("/orders", authenticate, orderController.getAllOrders);
app.delete('/services/:id', authenticate, serviceController.deleteService);
app.put('/services/:id', authenticate, serviceController.updateService);
app.get("/user", authenticate, userController.getAllUsers);
app.delete('/categories/:id', authenticate, categoryController.deleteCategory);
app.put('/categories/:id', authenticate, categoryController.updateCategory);
app.post("/employees/add", authenticate, employeeController.createEmployee);
app.delete("/employees/:id", authenticate, employeeController.deleteEmployee);
app.get("/coupons", authenticate, promotionController.getAllPromotions);
app.post('/coupons/add', authenticate, promotionController.createPromotion);
app.delete('/coupons/:id', authenticate, promotionController.deletePromotion);
app.get("/bills", authenticate, billController.getAllBills);
app.put('/feedback/:id/reply', authenticate, feedbackController.replyFeedback);
app.get('/feedback', authenticate, feedbackController.getAllFeedbacks);
app.get('/statistics/revenue', authenticate, statisticsController.revenueStatistics);
app.get('/statistics/orders', authenticate, statisticsController.orderStatistics);
app.get('/statistics/popular-services', authenticate, statisticsController.popularServicesStatistics);

module.exports = app;