const Order = require('../../models/Order');

const orderController = {
    async getAllOrders(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 10;
            const offset = (page - 1) * pageSize;
            const orders = await Order.findAll(pageSize, offset);
            const total = await Order.totalOrder();
            const totalPages = Math.ceil(total / pageSize);
            res.render("admin/order_management", { orders, page, totalPages, pageSize, user: req.user, token: req.cookies.token });
            //res.json({ orders });
        } catch (err) {
            return res.status(401).send('Unauthorized');
        }
    }
}

module.exports = orderController;