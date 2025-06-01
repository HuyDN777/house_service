const Feedback = require('../../models/Feedback');

const FeedbackController = {
    async getAllFeedbacks(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 10;
            const offset = (page - 1) * pageSize;
            const feedback = await Feedback.findAll(pageSize, offset);
            const total = await Feedback.totalFeedback();
            const totalPages = Math.ceil(total / pageSize);
            //res.json({ feedbacks: result });
            res.render("admin/feedback_management", { feedback, page, totalPages, pageSize, user: req.user, token: req.cookies.token });
        } catch (err) {
            res.status(500).json({ error: "Lỗi khi lấy danh sách feedback" });
        }
    },
    async replyFeedback(req, res) {
        const feedbackId = req.params.id;
        const { admin_reply } = req.body;
        try {
            const feedbackId = req.params.id;
            const { admin_reply } = req.body;
            await Feedback.update(feedbackId, { admin_reply });
            res.json({ message: "Phản hồi đã được ghi nhận.", admin_reply: admin_reply });    
        } catch (err) {
            res.status(500).json({ error: "Lỗi khi phản hồi feedback" });
        }
    }
    
};

module.exports = FeedbackController;