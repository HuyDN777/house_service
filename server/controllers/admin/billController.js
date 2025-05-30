const Bill = require('../../models/Bill');

const BillController = {
    async getAllBills(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 10;
            const offset = (page - 1) * pageSize;
            const bills = await Bill.findAll(pageSize, offset);
            const total = await Bill.totalBills();
            const totalPages = Math.ceil(total / pageSize);
            res.render("admin/bill_management", { bills, page, totalPages, pageSize, user: req.user, token: req.cookies.token });
            //res.json({ data: bills, total, page, pageSize, totalPages });
        } catch (err) {
            res.status(500).json({ error: 'Lỗi server' });
        }
    }
};

module.exports = BillController;