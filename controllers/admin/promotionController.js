const Promotion = require('../../models/Promotion');

const promotionController = {
    async getAllPromotions(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 10;
            const offset = (page - 1) * pageSize;
            const coupons = await Promotion.findAll(pageSize, offset);
            const total = await Promotion.totalPromotions();
            const totalPages = Math.ceil(total / pageSize);
            res.render("admin/promotion_management", { coupons, page, totalPages, pageSize, total, user: req.user, token: req.cookies.token });
            //res.json({ data: coupons, total, page, pageSize, totalPages });
        } catch (err) {
            return res.status(401).send('Unauthorized');
        }
    },
    async createPromotion(req, res) {
        try {
            const { code, discount, start_date, end_date } = req.body;
            const promotionData = { code, discount, start_date, end_date };
            await Promotion.create(promotionData);
            res.json({ message: "Khuyến mãi đã được tạo thành công", promotionData: promotionData });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Lỗi khi tạo khuyến mãi" });
        }
    },
    async deletePromotion(req, res) {
        try {
            const { id } = req.params;
            await Promotion.delete(id);
            res.json({ message: "Khuyến mãi đã được xóa thành công" });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Lỗi khi xóa khuyến mãi" });
        }
    }, 

    async getPromotionAvailable(req, res) {
        const couponsAvailable = await Promotion.findPromotionAvailable();
        res.json({ coupons: couponsAvailable});
    }
};

module.exports = promotionController;