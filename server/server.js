const express = require("express");
const path = require("path");
const morgan = require("morgan");
const ejs = require("ejs");
const mysql = require("mysql2/promise");
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const jwt = require('jsonwebtoken');
const { ROLES, PERMISSIONS, checkPermission, checkRole } = require('./middleware/roles');
const serviceController = require("./controllers/admin/serviceController");
const categoryController = require("./controllers/admin/categoryController");
const userController = require("./controllers/admin/userController");
const userAuthController = require("./controllers/user/authController");
const employeeController = require("./controllers/admin/employeeController");
const promotionController = require("./controllers/admin/promotionController");
const billController = require("./controllers/admin/billController");
const feedbackController = require("./controllers/admin/feedbackController");
const Feedback = require('./models/Feedback');
const authenticateAdminToken  = require("./middleware/authAdmin");
const { authenticateToken: authenticateUserToken, authenticateTokenWithHeader } = require("./middleware/authUser")
const authenticateEmployeeToken = require("./middleware/authEmployee");
const { VNPay, ignoreLogger, ProductCode, VnpLocale, dateFormat, consoleLogger } = require('vnpay');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const User = require('./models/User');
const router = express.Router();
const nodemailer = require('nodemailer');
const axios = require('axios');
// Cấu hình Google OAuth
passport.use(   
    new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/callback"
    }, 
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Kiểm tra user trong cơ sở dữ liệu
            const email = profile.emails[0].value;
            let user = await User.findByEmail(email)

            // Nếu user chưa tồn tại, tạo mới
            if (!user) {
                const userId = await User.create({
                    name: profile.displayName,
                    email,
                    username: email.split('@')[0],
                    password: null, // Không cần mật khẩu
                    avatar_url: profile.photos[0].value
                });
                user = await User.findByEmail(email);
            }

            done(null, user);
        } catch (err) {
            done(err, null);
        }
    }
));

// Serialize và deserialize user
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});

// Cloudinary configuration
cloudinary.config({
    cloud_name: 'duwkcqdnk',
    api_key: '422366969519188',
    api_secret: 'DlG2gf5P1Ura8_VoPgBNmpUD0Yk'
});

// Configure multer storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'services_images',
        allowed_formats: ['jpg', 'jpeg', 'png']
    }
});

const upload = multer({ storage: storage });

const app = express();
const PORT = 3000;

// Middleware session
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Route bắt đầu Google OAuth
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));


app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        const token = jwt.sign(
            { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role },
            process.env.ACCESS_SECRET_KEY,
            { expiresIn: '1h' }
        );
        console.log("Avatar URL: ", req.user.avatar_url);
        res.cookie('token', token, {
            httpOnly: false, 
            secure: process.env.NODE_ENV === 'production', 
            maxAge: 3600000, 
            path: '/', 
        });
        //res.render("users/home", { title: "Home", user: req.user }); // Chuyển hướng về trang chính sau khi đăng nhập thành công
        res.redirect("/home");
    }
);

// Middleware để đọc dữ liệu từ form POST
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Kết nối MySQL
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'houseservicedb' 
});

// EJS và middleware
app.set("view engine", "ejs");
app.use(morgan("combined"));
app.use(express.static(path.join(__dirname, "../public")));
// API upload ảnh
app.post("/api/upload", upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Không có file được tải lên" });
    }

    // Trả về URL của ảnh đã được tải lên Cloudinary
    res.status(200).json({ imageUrl: req.file.path });
});


// app.get("/", (req, res) => {
//     res.render("users/home", { title: "Home"});
// });

app.get("/", (req, res) => { 
    res.render("users/home", { 
        title: "Home", 
        user: req.user || null, 
        token: req.cookies?.token || null 
    });
});

app.get("/home", (req, res) => {
    res.render("users/home", { 
        title: "Home", 
        user: req.user,
        token: req.cookies.token
    });
});


// Trang dịch vụ
app.get("/services", (req, res) => {
    res.render("users/services", { title: "Services" });
});

// Middleware kiểm tra quyền admin

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).send('Bạn không có quyền truy cập!');
    }
    next();
}
// Áp dụng middleware cho các route admin
app.get("/admin/categories", authenticateAdminToken, categoryController.getAllCategories);

// Xử lý thêm danh mục
app.post("/admin/categories/add", authenticateAdminToken, categoryController.createCategory);

// Xử lý thêm dịch vụ với upload ảnh
app.post("/admin/services/add", authenticateAdminToken, serviceController.createService);

// Route hiển thị giao diện quản lý dịch vụ và lấy dữ liệu từ CSDL
app.get("/admin/services", authenticateAdminToken, serviceController.getAllServices);

// Route hiển thị giao diện quản lý nhân viên
app.get("/admin/employees", authenticateAdminToken, employeeController.getAllEmployees);

// API lấy danh sách người dùng
app.get("/admin/user", authenticateAdminToken, userController.getAllUsers);

// API thêm người dùng
app.post("/admin/users/add", authenticateAdminToken, checkPermission(PERMISSIONS.CREATE_USER), upload.single('avatar'), async (req, res) => {
    const { name, username, password, address, phone, email } = req.body;
    let avatar_url = null;

    // Nếu có file ảnh, tải lên Cloudinary
    if (req.file) {
        avatar_url = req.file.path; // Đường dẫn ảnh trên Cloudinary
    }

    try {
        await db.query(
            "INSERT INTO user (name, username, password, address, phone, email, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [name, username, password, address, phone, email, avatar_url]
        );
        //res.status(201).send("Người dùng đã được thêm thành công");
        res.redirect("/admin/user");
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi khi thêm người dùng");
    }
});

// Đăng ký tài khoản user
app.post('/user/register', userAuthController.register);

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query("SELECT * FROM user WHERE username = ? AND password = ?", [username, password]);
        if (rows.length === 0) {
            return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
        }
        const user = rows[0];
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.ACCESS_SECRET_KEY, { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: false });
        res.json({ token, role: user.role, username: user.username });
    } catch (err) {
        res.status(500).json({ error: "Lỗi server" });
    }
});

// Hủy đơn hàng
app.put('/api/orders/:id/cancel', authenticateUserToken, async (req, res) => {
    const orderId = req.params.id;
    try {
        // Lấy Employeeid của đơn hàng trước khi xóa
        const [orders] = await db.query("SELECT Employeeid FROM `order` WHERE id = ?", [orderId]);
        const employeeId = orders.length > 0 ? orders[0].Employeeid : null;

        // Xóa hóa đơn liên quan trước
        await db.query("DELETE FROM bill WHERE Orderid = ?", [orderId]);
        // Xóa đơn hàng
        await db.query("DELETE FROM `order` WHERE id = ?", [orderId]);

        // Nếu có nhân viên, kiểm tra xem còn đơn nào in_progress không
        if (employeeId) {
            const [remainOrders] = await db.query(
                "SELECT id FROM `order` WHERE Employeeid = ? AND status = 'in_progress'",
                [employeeId]
            );
            if (remainOrders.length === 0) {
                // Nếu không còn đơn nào đang thực hiện, cập nhật lại available = 1
                await db.query("UPDATE employee SET available = 1 WHERE id = ?", [employeeId]);
            }
        }

        res.json({ message: "Đơn hàng đã được hủy và xóa khỏi hệ thống." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi khi hủy đơn hàng" });
    }
});

app.post('/api/orders', authenticateTokenWithHeader, async (req, res) => {
    const { service_id, booking_date, implementing_date, address, note, coupon_code, payment_method, quantity = 1 } = req.body;
    const user_id = req.user.id;
    
    
    // 1. Kiểm tra dịch vụ tồn tại
    const [services] = await db.query("SELECT * FROM service WHERE id = ?", [service_id]);
    if (services.length === 0) {
        return res.status(400).json({ error: "Dịch vụ không tồn tại" });
    }
    const service = services[0];
    const unit = service.price;
    
    // 2. Tính giá gốc
    let price = service.price * quantity;
    
    // 3. Kiểm tra mã giảm giá nếu có
    let promotionId = null;
    let discount = 0;
    let final_price = price;
    if (coupon_code) {
        const [promotions] = await db.query("SELECT * FROM promotion WHERE code = ?", [coupon_code]);
        if (promotions.length === 0) {
            return res.status(400).json({ error: "Mã khuyến mãi không hợp lệ" });
        }
        promotionId = promotions[0].id;
        discount = promotions[0].discount;
        final_price = price * (1 - discount / 100);
    }
    // Nếu trả trước (pay_now): trả về paymentUrl để redirect sang VNPAY
    if (payment_method === 'pay_now') {
        const orderInfoData = {
            user_id,
            service_id,
            booking_date,
            implementing_date,
            address,
            note,
            promotionId,
            discount,
            final_price
        };
        const [tempOrderResult] = await db.query(
            `INSERT INTO temp_order (user_id, service_id, booking_date, implementing_date, address, note, promotion_id, discount, final_price)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [user_id, service_id, booking_date, implementing_date, address, note, promotionId, discount, final_price]
        );
        const temp_order_id = tempOrderResult.insertId;

        const vnpay = new VNPay({
            tmnCode: 'P75XRS1Q',
            secureSecret: 'S3LPGOFIH7XY00QB4BGHY0NKHXKEF75X',
            vnpayHost: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
            testMode: true,
            hashAlgorithm: 'SHA512',
            logger: ignoreLogger,
        });
        const paymentUrl = await vnpay.buildPaymentUrl({
            vnp_OrderInfo: `TEMPORDER_${temp_order_id}`,
            vnp_IpAddr: '127.0.0.1',
            vnp_OrderType: ProductCode.Other,
            vnp_Amount: orderInfoData.final_price,
            vnp_ReturnUrl: 'http://localhost:3000/api/vnpay/vnpay-return',
            vnp_TxnRef: Date.now().toString(),
            vnp_Locale: VnpLocale.VN,
            vnp_CreateDate: dateFormat(new Date(Date.now())),
            vnp_ExpireDate: dateFormat(new Date(Date.now() + 30 * 60 * 1000))
        });
        res.json({ paymentUrl });
        //thanh toán momo
        // var partnerCode = "MOMO";
        // var accessKey = "F8BBA842ECF85";
        // var secretkey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
        // var requestId = partnerCode + new Date().getTime();
        // var orderId = requestId;
        // var orderInfo = orderInfoStr;
        // var redirectUrl = "https://momo.vn/return";
        // var ipnUrl = "https://localhost:3000/api/momo/momo-return"; // URL để nhận thông báo IPN từ MoMo
        // // var ipnUrl = redirectUrl = "https://webhook.site/454e7b77-f177-4ece-8236-ddf1c26ba7f8";
        // var amount = final_price.toString(); 
        // var requestType = "captureWallet"
        // var extraData = ""; //pass empty value if your merchant does not have stores

        // //before sign HMAC SHA256 with format
        // //accessKey=$accessKey&amount=$amount&extraData=$extraData&ipnUrl=$ipnUrl&orderId=$orderId&orderInfo=$orderInfo&partnerCode=$partnerCode&redirectUrl=$redirectUrl&requestId=$requestId&requestType=$requestType
        // var rawSignature = "accessKey="+accessKey+"&amount=" + amount+"&extraData=" + extraData+"&ipnUrl=" + ipnUrl+"&orderId=" + orderId+"&orderInfo=" + orderInfo+"&partnerCode=" + partnerCode +"&redirectUrl=" + redirectUrl+"&requestId=" + requestId+"&requestType=" + requestType
        // //puts raw signature
        // console.log("--------------------RAW SIGNATURE----------------")
        // console.log(rawSignature)
        // //signature
        // const crypto = require('crypto');
        // var signature = crypto.createHmac('sha256', secretkey)
        //     .update(rawSignature)
        //     .digest('hex');
        // console.log("--------------------SIGNATURE----------------")
        // console.log(signature)

        // //json object send to MoMo endpoint
        // const requestBody = JSON.stringify({
        //     partnerCode : partnerCode,
        //     accessKey : accessKey,
        //     requestId : requestId,
        //     amount : amount,
        //     orderId : orderId,
        //     orderInfo : orderInfo,
        //     redirectUrl : redirectUrl,
        //     ipnUrl : ipnUrl,
        //     extraData : extraData,
        //     requestType : requestType,
        //     signature : signature,
        //     lang: 'en'
        // });
        // const response = await axios.post('https://test-payment.momo.vn/v2/gateway/api/create', requestBody, {
        //     headers: {
        //         'Content-Type': 'application/json'
        //     }
        // });
        // res.json({
        //     paymentUrl: response.data.payUrl,
        //     orderInfo: orderInfo,
        //     final_price: final_price
        // });
        return;
    }

    // Nếu trả sau (pay_later): lưu đơn hàng, hóa đơn, điều phối nhân viên ngay
    // 1. Điều phối nhân viên phù hợp
    const [employees] = await db.query(
        `SELECT e.*
         FROM employee e
         WHERE e.Serviceid = ?
           AND NOT EXISTS (
             SELECT 1 FROM \`order\` o
             WHERE o.Employeeid = e.id
               AND o.status = 'in_progress'
               AND o.implementing_date = ?
           )
         ORDER BY e.experience DESC
         LIMIT 1`,
        [service_id, implementing_date]
    );

    let employee_id = null;
    let orderStatus = 'pending';
    let employeeInfo = null;
    if (employees.length > 0) {
        employee_id = employees[0].id;
        orderStatus = 'in_progress';
        employeeInfo = {
            id: employees[0].id,
            name: employees[0].name,
            phone: employees[0].phone,
            experience: employees[0].experience
        };
        // Cập nhật trạng thái available của nhân viên
        //await db.query("UPDATE employee SET available = 0 WHERE id = ?", [employee_id]);
    }

    // 2. Lưu đơn hàng
    const [orderResult] = await db.query(
        `INSERT INTO \`order\` (Userid, Serviceid, Employeeid, booking_date, implementing_date, Promotionid, status, address, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [user_id, service_id, employee_id, booking_date, implementing_date, promotionId, orderStatus, address, note]
    );
    const orderIdData = orderResult.insertId;

    // 3. Lưu hóa đơn
    await db.query(
        "INSERT INTO bill (amount, status, date, Orderid) VALUES (?, ?, NOW(), ?)",
        [final_price, 'chưa thanh toán', orderId]
    );

    // 4. Trả về thông tin đơn hàng, nhân viên cho client
    return res.json({
        message: "Đặt hàng thành công! Đơn hàng của bạn sẽ được xử lý.",
        order: {
            id: orderIdData,
            service_name: service.name,
            booking_date,
            implementing_date,
            address,
            note,
            price_per_unit: service.price,
            quantity,
            discount,
            final_price,
            status: orderStatus
        },
        employee: employeeInfo
    });
});

// Xác nhận thanh toán đơn hàng (giả lập, thực tế sẽ là webhook từ cổng thanh toán)
app.post('/api/orders/:id/confirm-payment', authenticateUserToken, async (req, res) => {
    try {
        const orderId = req.params.id;
        // Cập nhật trạng thái đơn sang in_progress và phân công nhân viên
        // (Bạn có thể thêm logic chọn nhân viên phù hợp ở đây)
        await db.query("UPDATE \`order`\ SET status = 'in_progress' WHERE id = ?", [orderId]);
        // TODO: Phân công nhân viên nếu cần
        res.json({ message: "Đã xác nhận thanh toán, đơn hàng sẽ được xử lý." });
    } catch (err) {
        res.status(500).json({ error: "Lỗi xác nhận thanh toán" });
    }
});

// Route render trang đăng ký, đăng nhập, đặt hàng cho user
app.get('/register', (req, res) => res.render('users/register'));
app.get('/login', (req, res) => res.render('users/login'));
app.get('/order', (req, res) => res.render('users/order'));
app.get('/admin/dashboard', (req, res) => res.render('admin/dashboard'));

// API phân trang dịch vụ
app.get("/api/services", async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    try {
        const [rows] = await db.query(
            `SELECT s.*, c.name AS category 
             FROM service s
             LEFT JOIN category c ON s.Categoryid = c.id
             LIMIT ? OFFSET ?`, [pageSize, offset]
        );
        const [countRows] = await db.query("SELECT COUNT(*) as total FROM service");
        res.json({
            data: rows,
            total: countRows[0].total,
            page,
            pageSize
        });
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi lấy danh sách dịch vụ" });
    }
});

// Route hiển thị giao diện quản lý mã khuyến mãi
app.get("/admin/coupons", authenticateAdminToken, promotionController.getAllPromotions);

// Đã có cấu hình Cloudinary và multer Cloudinary như upload dịch vụ
app.post("/admin/employees/add", authenticateAdminToken, employeeController.createEmployee);
app.delete("/admin/employees/:id", authenticateAdminToken, employeeController.deleteEmployee);
// Chạy server
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});

app.post('/admin/coupons/add', authenticateAdminToken, promotionController.createPromotion);

// Quản lý hóa đơn
app.get("/admin/bills", authenticateAdminToken, billController.getAllBills);

// Quản lý đánh giá
// app.get("/admin/feedbacks", async (req, res) => {
//     const [feedbacks] = await db.query("SELECT * FROM feedback");
//     res.render("admin/feedback_management", { feedbacks });
// });
// app.get("/admin/orders", authenticateAdminToken, async (req, res) => {
//     res.render("admin/order_management");
// });
// Route hiển thị giao diện quản lý đơn hàng
app.get("/admin/orders", authenticateAdminToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;
        const [orders] = await db.query(`
            SELECT o.id, o.booking_date, o.implementing_date, o.status,
                   u.name as customer_name,
                   s.name as service_name,
                   e.name as employee_name,
                   p.code as coupon_code,
                   p.discount as coupon_discount
            FROM \`order\` o
            LEFT JOIN user u ON o.Userid = u.id
            LEFT JOIN service s ON o.Serviceid = s.id
            LEFT JOIN employee e ON o.Employeeid = e.id
            LEFT JOIN promotion p ON o.Promotionid = p.id
            ORDER BY o.booking_date DESC
            LIMIT ? OFFSET ?
        `, [pageSize, offset]);
        const [countRows] = await db.query("SELECT COUNT(*) as total FROM `order`");
        const total = countRows[0].total;
        const totalPages = Math.ceil(total / pageSize);
        res.render("admin/order_management", { orders, page, totalPages, pageSize, user: req.user, token: req.cookies.token });
        //res.json({ orders });
    } catch (err) {
        return res.status(401).send('Unauthorized');
    }
});


// API cập nhật đơn hàng
app.put('/api/orders/:id', authenticateAdminToken, checkPermission(PERMISSIONS.EDIT_ORDER), async (req, res) => {
    const orderId = req.params.id;
    const { booking_date, implementing_date } = req.body;
    try {
        await db.query(
            "UPDATE `order` SET booking_date = ?, implementing_date = ? WHERE id = ?",
            [booking_date, implementing_date, orderId]
        );
        res.json({ message: "Cập nhật đơn hàng thành công" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi khi cập nhật đơn hàng" });
    }
});

// API xóa danh mục
app.delete('/admin/categories/:id', authenticateAdminToken, categoryController.deleteCategory);

// API cập nhật danh mục
app.put('/admin/categories/:id', authenticateAdminToken, categoryController.updateCategory);

// API xóa dịch vụ
app.delete('/admin/services/:id', authenticateAdminToken, serviceController.deleteService);

// API cập nhật dịch vụ
app.put('/admin/services/:id', authenticateAdminToken, serviceController.updateService);


// API cập nhật nhân viên
app.put('/admin/employees/:id', authenticateAdminToken, employeeController.updateEmployee);

// API xóa mã khuyến mãi
app.delete('/admin/coupons/:id', authenticateAdminToken, promotionController.deletePromotion);

// API cập nhật mã khuyến mãi
app.put('/api/promotions/:id', authenticateAdminToken, checkPermission(PERMISSIONS.EDIT_COUPON), async (req, res) => {
    const promotionId = req.params.id;
    const { code, discount, start_date, end_date, Orderid } = req.body;
    try {
        await db.query(
            "UPDATE promotion SET code = ?, discount = ?, start_date = ?, end_date = ?, Orderid = ? WHERE id = ?",
            [code, discount, start_date, end_date, Orderid || null, promotionId]
        );
        res.json({ message: "Cập nhật mã khuyến mãi thành công" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi khi cập nhật mã khuyến mãi" });
    }
});

app.get('/api/employee/orders', authenticateEmployeeToken, async (req, res) => {
    const employeeId = req.employee.id;
    try {
        const [orders] = await db.query(`
            SELECT o.id, o.implementing_date, o.status,
                   u.name as customer_name,
                   s.name as service_name
            FROM \`order\` o
            LEFT JOIN user u ON o.Userid = u.id
            LEFT JOIN service s ON o.Serviceid = s.id
            WHERE o.Employeeid = ?
            ORDER BY o.implementing_date DESC
        `, [employeeId]);
        res.json({ orders });
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi lấy danh sách đơn hàng" });
    }
});

app.put('/api/orders/:id/complete', authenticateEmployeeToken, async (req, res) => {
    const orderId = req.params.id;
    const employeeId = req.employee.id;
    try {
        // Kiểm tra đơn có thuộc về nhân viên này không và đang in_progress
        const [orders] = await db.query("SELECT * FROM `order` WHERE id = ? AND Employeeid = ? AND status = 'in_progress'", [orderId, employeeId]);
        if (orders.length === 0) {
            return res.status(403).json({ error: "Bạn không có quyền hoàn thành đơn này hoặc đơn đã hoàn thành." });
        }
        // Cập nhật trạng thái
        await db.query("UPDATE `order` SET status = 'completed' WHERE id = ?", [orderId]);

        // Lấy Serviceid của nhân viên
        const [empRows] = await db.query("SELECT Serviceid FROM employee WHERE id = ?", [employeeId]);
        const serviceId = empRows.length > 0 ? empRows[0].Serviceid : null;

        if (serviceId) {
            // Tìm đơn pending phù hợp (ưu tiên đơn đặt sớm nhất)
            const [pendingOrders] = await db.query(
                `SELECT * FROM \`order\`
                 WHERE status = 'pending'
                   AND Serviceid = ?
                   AND (Employeeid IS NULL OR Employeeid = 0)
                 ORDER BY booking_date ASC
                 LIMIT 1`,
                [serviceId]
            );
            if (pendingOrders.length > 0) {
                const pendingOrder = pendingOrders[0];
                // Gán đơn cho nhân viên này, chuyển trạng thái sang in_progress
                await db.query(
                    "UPDATE `order` SET Employeeid = ?, status = 'in_progress' WHERE id = ?",
                    [employeeId, pendingOrder.id]
                );
                const userId = pendingOrder.Userid;
                notifyUser(userId, `Đơn hàng của bạn đã được phân công cho nhân viên.`);
                // (Có thể gửi thông báo cho nhân viên hoặc trả về thông tin đơn mới này)
            }
        }

        res.json({ message: "Đơn hàng đã được đánh dấu hoàn thành. Nếu có đơn chờ phù hợp, bạn đã được gán đơn mới." });
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi cập nhật trạng thái đơn hàng" });
    }
});

// Cập nhật thông tin cá nhân (trừ mật khẩu)
app.put('/api/user/profile-update', authenticateTokenWithHeader, async (req, res) => {
    const userId = req.user.id;
    const { name, username, address, phone, email, avatar_url } = req.body;
    try {
        await db.query(
            "UPDATE user SET name = ?, username = ?, address = ?, phone = ?, email = ?, avatar_url = ? WHERE id = ?",
            [name, username, address, phone, email, avatar_url, userId]
        );
        res.json({ message: "Cập nhật thông tin cá nhân thành công." , user: { id: userId, name: name, username: username, address: address, phone: phone, email: email, avatar_url: avatar_url }});
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi cập nhật thông tin cá nhân" });
    }
});

app.get('/profile', async (req, res) => {
    res.render('users/profile', { title: "Profile" });
});

// Lấy thông tin người dùng
app.get('/api/user/profile', authenticateTokenWithHeader, async (req, res) => {
    const userId = req.user.id;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "Không tìm thấy người dùng" });
        }
        res.json({ user: { 
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            phone: user.phone,
            address: user.address,
            avatar_url: user.avatar_url,
            role: user.role
        }});
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi lấy thông tin người dùng" });
    }
});

// Đổi mật khẩu
app.put('/api/user/change-password', authenticateUserToken, async (req, res) => {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;
    try {
        // Lấy mật khẩu hiện tại
        const [rows] = await db.query("SELECT password FROM user WHERE id = ?", [userId]);
        if (rows.length === 0) return res.status(404).json({ error: "Không tìm thấy người dùng" });

        // So sánh mật khẩu cũ (nếu đã hash thì dùng bcrypt.compare)
        if (rows[0].password !== oldPassword) {
            return res.status(400).json({ error: "Mật khẩu cũ không đúng" });
        }

        // Cập nhật mật khẩu mới (nên hash nếu dùng thực tế)
        await db.query("UPDATE user SET password = ? WHERE id = ?", [newPassword, userId]);
        res.json({ message: "Đổi mật khẩu thành công." });
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi đổi mật khẩu" });
    }
});

// Chỉ render giao diện, không kiểm tra token ở đây
app.get('/order-history', (req, res) => {
    res.render('users/order_history');
});

// Gửi feedback cho đơn hàng đã hoàn thành
app.post('/api/feedback', authenticateTokenWithHeader, async (req, res) => {
    try {
        const userId = req.user.id;
        const { order_id, rating, comment } = req.body;
        // Kiểm tra đơn hàng có thuộc về user và đã hoàn thành chưa
        const [orders] = await db.query("SELECT * FROM `order` WHERE id = ? AND Userid = ? AND status = 'completed'", [order_id, userId]);
        if (orders.length === 0) {
            return res.status(400).json({ error: "Bạn chỉ có thể đánh giá đơn đã hoàn thành của mình." });
        }
        // Kiểm tra đã feedback chưa
        const [fb] = await db.query("SELECT * FROM feedback WHERE Orderid = ?", [order_id]);
        if (fb.length > 0) {
            return res.status(400).json({ error: "Bạn đã đánh giá đơn này rồi." });
        }
        // Thêm feedback
        await db.query(
            "INSERT INTO feedback (Userid, Orderid, rating, comment, created_at) VALUES (?, ?, ?, ?, ?)",
            [userId, order_id, rating, comment, new Date()]
        );
        res.json({ message: "Cảm ơn bạn đã đánh giá dịch vụ!", order_id: order_id, rating: rating, comment: comment });
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi gửi feedback" });
    }
});

// Chỉnh sửa feedback
app.put('/api/feedback/:id', authenticateUserToken, async (req, res) => {
    const feedbackId = req.params.id;
    const userId = req.user.id;
    const { rating, comment } = req.body;
    try {
        const [rows] = await db.query("SELECT * FROM feedback WHERE id = ? AND Userid = ?", [feedbackId, userId]);
        if (rows.length === 0) return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa feedback này" });
        const feedback = rows[0];
        if (feedback.admin_reply) return res.status(400).json({ error: "Feedback đã có phản hồi, không thể chỉnh sửa." });
        const createdAt = new Date(feedback.created_at).getTime();
        if (Date.now() - createdAt > 24*60*60*1000) return res.status(400).json({ error: "Quá thời gian cho phép chỉnh sửa (24h)." });
        await db.query("UPDATE feedback SET rating = ?, comment = ? WHERE id = ?", [rating, comment, feedbackId]);
        res.json({ message: "Chỉnh sửa feedback thành công." });
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi chỉnh sửa feedback" });
    }
});

// Xóa feedback
app.delete('/api/feedback/:id', authenticateUserToken, async (req, res) => {
    const feedbackId = req.params.id;
    const userId = req.user.id;
    try {
        const [rows] = await db.query("SELECT *, UNIX_TIMESTAMP(created_at) as created_ts FROM feedback WHERE id = ? AND Userid = ?", [feedbackId, userId]);
        if (rows.length === 0) return res.status(403).json({ error: "Bạn không có quyền xóa feedback này" });
        const feedback = rows[0];
        if (feedback.admin_reply) return res.status(400).json({ error: "Feedback đã có phản hồi, không thể xóa." });
        const createdAt = new Date(feedback.created_at).getTime();
        if (Date.now() - createdAt > 60*60*1000) return res.status(400).json({ error: "Quá thời gian cho phép xóa (1h)." });
        await db.query("DELETE FROM feedback WHERE id = ?", [feedbackId]);
        res.json({ message: "Xóa feedback thành công." });
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi xóa feedback" });
    }
});

// Admin phản hồi feedback
app.put('/admin/feedback/:id/reply', authenticateAdminToken, feedbackController.replyFeedback);

app.get('/admin/feedback', authenticateAdminToken, feedbackController.getAllFeedbacks);

app.get('/api/vnpay/vnpay-return', async (req, res) => {
    const { vnp_ResponseCode, vnp_OrderInfo } = req.query;

    if (vnp_ResponseCode === '00') {
        try {
            const tmpOrderId = parseInt(vnp_OrderInfo.split('_')[1]);

            const [rows] = await db.query("SELECT * FROM temp_order WHERE id = ?", [tmpOrderId]);
            if (rows.length === 0) return res.send("Không tìm thấy đơn hàng tạm thời");
            const {
                user_id, service_id, booking_date, implementing_date, address, note,
                promotionId, final_price
            } = rows[0];
            // Xóa đơn hàng tạm thời
            await db.query("DELETE FROM temp_order WHERE id = ?", [tmpOrderId]);

            // 2. Điều phối nhân viên phù hợp
            const [employees] = await db.query(
                `SELECT e.*
                 FROM employee e
                 WHERE e.Serviceid = ?
                   AND NOT EXISTS (
                     SELECT 1 FROM \`order\` o
                     WHERE o.Employeeid = e.id
                       AND o.status = 'in_progress'
                       AND o.implementing_date = ?
                   )
                 ORDER BY e.experience DESC
                 LIMIT 1`,
                [service_id, implementing_date]
            );

            let employee_id = null;
            let orderStatus = 'pending';
            if (employees.length > 0) {
                employee_id = employees[0].id;
                orderStatus = 'in_progress';
            }

            // 3. Lưu đơn hàng
            const [orderResult] = await db.query(
                `INSERT INTO \`order\` (Userid, Serviceid, Employeeid, booking_date, implementing_date, Promotionid, status, address, note)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [user_id, service_id, employee_id, booking_date, implementing_date, promotionId, orderStatus, address, note]
            );
            const orderId = orderResult.insertId;

            // 4. Lưu hóa đơn
            await db.query(
                "INSERT INTO bill (amount, status, date, Orderid) VALUES (?, ?, NOW(), ?)",
                [final_price, 'đã thanh toán', orderId]
            );

            // 5. Nếu có nhân viên, cập nhật trạng thái available
            // if (employee_id) {
            //     await db.query("UPDATE employee SET available = 0 WHERE id = ?", [employee_id]);
            // }
            //res.json({ message: "Thanh toán thành công", orderInfo });
            res.redirect(`/order-success/${orderId}`);
        } catch (err) {
            console.log('Deo hieu: ', err);
            res.send('Thanh toán thất bại');
        }
    } else {
        res.send('Thanh toán thất bại hoặc bị hủy.');
    }
});

// app.get('/api/momo/momo-return', async (req, res) => {
//     const {
//         resultCode,
//         orderInfo,
//         amount,
//         orderId,
//         transId,
//         message
//     } = req.body;

//     if (resultCode === '00') {
//         try {
//             const orderInfo = JSON.parse(orderInfo);
//             const {
//                 user_id, service_id, booking_date, implementing_date, address, note,
//                 promotionId, payment_method, quantity, price_per_unit, discount, final_price
//             } = orderInfo;

//             // 2. Điều phối nhân viên phù hợp
//             const [employees] = await db.query(
//                 `SELECT e.*
//                  FROM employee e
//                  WHERE e.Serviceid = ?
//                    AND NOT EXISTS (
//                      SELECT 1 FROM \`order\` o
//                      WHERE o.Employeeid = e.id
//                        AND o.status = 'in_progress'
//                        AND o.implementing_date = ?
//                    )
//                  ORDER BY e.experience DESC
//                  LIMIT 1`,
//                 [service_id, implementing_date]
//             );

//             let employee_id = null;
//             let orderStatus = 'pending';
//             if (employees.length > 0) {
//                 employee_id = employees[0].id;
//                 orderStatus = 'in_progress';
//             }

//             // 3. Lưu đơn hàng
//             const [orderResult] = await db.query(
//                 `INSERT INTO \`order\` (Userid, Serviceid, Employeeid, booking_date, implementing_date, Promotionid, status, address, note)
//                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//                 [user_id, service_id, employee_id, booking_date, implementing_date, promotionId, orderStatus, address, note]
//             );
//             const orderId = orderResult.insertId;

//             // 4. Lưu hóa đơn
//             await db.query(
//                 "INSERT INTO bill (amount, status, date, Orderid) VALUES (?, ?, NOW(), ?)",
//                 [final_price, 'đã thanh toán', orderId]
//             );

//             // 5. Nếu có nhân viên, cập nhật trạng thái available
//             // if (employee_id) {
//             //     await db.query("UPDATE employee SET available = 0 WHERE id = ?", [employee_id]);
//             // }
//             //res.json({ message: "Thanh toán thành công", orderInfo });
//             res.redirect(`/order-success/${orderId}`);
//         } catch (err) {
//             res.send('Thanh toán thất bại hoặc bị hủy.');
//         }
//     } else {
//         res.send('Thanh toán thất bại hoặc bị hủy.');
//     }
// });
app.get('/order-success/:orderId', async (req, res) => {
    const orderId = req.params.orderId;
    const [orders] = await db.query(`
        SELECT o.*, s.name as service_name, s.unit, e.name as employee_name, e.phone as employee_phone, b.amount, b.status as bill_status
        FROM \`order\` o
        LEFT JOIN service s ON o.Serviceid = s.id
        LEFT JOIN employee e ON o.Employeeid = e.id
        LEFT JOIN bill b ON b.Orderid = o.id
        WHERE o.id = ?
    `, [orderId]);
    if (orders.length === 0) return res.send('Không tìm thấy đơn hàng!');
    const order = orders[0];
    res.render('users/order_success', { order });
});

app.get('/api/user/orders/history', authenticateTokenWithHeader, async (req, res) => {
    try {
        // Lấy page và pageSize từ query, mặc định page=1, pageSize=10
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;

        const userId = req.user.id;

        // Đếm tổng số đơn hàng
        const [countRows] = await db.query(`
            SELECT COUNT(*) as total FROM \`order\` WHERE Userid = ?
        `, [userId]);
        const totalOrders = countRows[0].total;
        const totalPages = Math.ceil(totalOrders / pageSize);

        // Lấy đơn hàng theo phân trang
        const [orders] = await db.query(`
            SELECT o.id, o.implementing_date, o.status, s.name as service_name, e.name as employee_name, e.phone as employee_phone, o.address, o.note
            FROM \`order\` o
            LEFT JOIN service s ON o.Serviceid = s.id
            LEFT JOIN Employee e ON o.Employeeid = e.id
            WHERE o.Userid = ?
            ORDER BY o.implementing_date DESC
            LIMIT ? OFFSET ?
        `, [userId, pageSize, offset]);

        // Lấy feedback cho từng đơn
        for (let order of orders) {
            const [fb] = await db.query("SELECT id, rating, comment, admin_reply FROM feedback WHERE Orderid = ?", [order.id]);
            order.feedback = fb[0] || null;
        }

        res.json({
            orders,
            page,
            pageSize,
            totalOrders,
            totalPages
        });
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi lấy lịch sử đơn hàng" });
    }
});

app.post('/logout', (req, res, next) => {
    // Xóa token trong cookie
    res.clearCookie('token');
    
    // Kết thúc phiên Passport (Google OAuth)
    req.logout(err => {
        if (err) return next(err);
        // Xóa session
        req.session.destroy(err => {
            if (err) return next(err);
            // Chuyển hướng về trang chủ
            res.redirect('/');
        });
    });
});

// API employee cập nhật thông tin cá nhân (trừ mật khẩu)
app.put('/api/employee/profile-update', authenticateEmployeeToken, async (req, res) => {
    const employeeId = req.employee.id;
    const { name, email, phone, address, avatar_url } = req.body;

    try {
        // Nếu có avatar_url, cập nhật avatar
        const avatarPath = avatar_url || null;

        // Cập nhật thông tin nhân viên
        const query = `
            UPDATE employee 
            SET name = ?, email = ?, phone = ?, address = ?, profile_image_url = COALESCE(?, profile_image_url)
            WHERE id = ?
        `;
        await db.query(query, [name, email, phone, address, avatarPath, employeeId]);

        res.json({ message: "Cập nhật thông tin cá nhân thành công." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi khi cập nhật thông tin cá nhân." });
    }
});

// API employee đổi mật khẩu
app.put('/api/employee/change-password', authenticateEmployeeToken, async (req, res) => {
    const employeeId = req.employee.id;
    const { currentPassword, newPassword } = req.body;

    try {
        // Lấy mật khẩu hiện tại từ cơ sở dữ liệu
        const [rows] = await db.query("SELECT password FROM employee WHERE id = ?", [employeeId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy nhân viên." });
        }

        const employee = rows[0];

        // Kiểm tra mật khẩu hiện tại
        if (employee.password !== currentPassword) { // Nếu mật khẩu đã hash, dùng bcrypt.compare
            return res.status(400).json({ error: "Mật khẩu hiện tại không đúng." });
        }

        // Cập nhật mật khẩu mới (nên hash mật khẩu nếu dùng thực tế)
        await db.query("UPDATE employee SET password = ? WHERE id = ?", [newPassword, employeeId]);

        res.json({ message: "Cập nhật mật khẩu thành công." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi khi cập nhật mật khẩu." });
    }
});

// WebSocket cho thông báo thời gian thực
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let clients = {}; // Lưu trữ kết nối WebSocket của người dùng

wss.on('connection', (ws, req) => {
    const userId = req.url.split('?userId=')[1]; // Lấy userId từ query string
    if (userId) {
        clients[userId] = ws; // Lưu kết nối WebSocket theo userId
    }

    ws.on('close', () => {
        delete clients[userId]; // Xóa kết nối khi người dùng ngắt kết nối
    });
});

// Hàm gửi thông báo đến người dùng
function notifyUser(userId, message) {
    if (clients[userId]) {
        clients[userId].send(JSON.stringify({ message }));
    }
}

// Đăng nhập nhân viên
app.post('/api/employee/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query("SELECT * FROM employee WHERE username = ?", [username]);
        if (rows.length === 0) {
            return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
        }
        const employee = rows[0];
        // So sánh password (nếu đã hash thì dùng bcrypt.compare)
        if (employee.password !== password) {
            return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
        }
        // Tạo token
        const token = jwt.sign({ id: employee.id, role: 'employee', name: employee.name, username: employee.username, profile_image_url: employee.profile_image_url, phone: employee.phone, email: employee.email, address: employee.address }, process.env.ACCESS_SECRET_KEY, { expiresIn: '8h' });
        res.cookie('token', token, { httpOnly: false });
        res.json({ token, employee });
    } catch (err) {
        res.status(500).json({ error: "Lỗi server" });
    }
});
app.get('/api/employee/profile', authenticateEmployeeToken, async (req, res) => {
    const employeeId = req.employee.id; // Lấy ID nhân viên từ token
    try {
        const [rows] = await db.query(`
            SELECT id, name, username, phone, email, address, profile_image_url 
            FROM employee 
            WHERE id = ?
        `, [employeeId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy nhân viên" });
        }

        res.json({ employee: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi khi lấy thông tin nhân viên." });
    }
});
// Lấy thông tin cá nhân của nhân viên
router.get('/profile', authenticateEmployeeToken, async (req, res) => {
    const employeeId = req.employee.id;
    try {
        const [rows] = await db.query("SELECT id, name, username, phone, email, address, profile_image_url FROM employee WHERE id = ?", [employeeId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy nhân viên" });
        }
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi lấy thông tin cá nhân" });
    }
});
// Cập nhật thông tin cá nhân (trừ mật khẩu)
router.put('/profile-update', authenticateEmployeeToken, async (req, res) => {
    const employeeId = req.employee.id;
    const { username, phone, email, address, profile_image_url } = req.body;
    try {
        await db.query(
            "UPDATE employee SET username = ?, phone = ?, email = ?, address = ?, profile_image_url = ? WHERE id = ?",
            [username, phone, email, address, profile_image_url, employeeId]
        );
        res.json({ message: "Cập nhật thông tin cá nhân thành công.", employee: { id: employeeId, username, phone, email, address, profile_image_url } });
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi cập nhật thông tin cá nhân" });
    }
});
// Đổi mật khẩu
router.put('/change-password', authenticateEmployeeToken, async (req, res) => {
    const employeeId = req.employee.id;
    const { oldPassword, newPassword } = req.body;
    try {
        // Lấy mật khẩu hiện tại
        const [rows] = await db.query("SELECT password FROM employee WHERE id = ?", [employeeId]);
        if (rows.length === 0) return res.status(404).json({ error: "Không tìm thấy nhân viên" });

        // So sánh mật khẩu cũ (nếu đã hash thì dùng bcrypt.compare)
        if (rows[0].password !== oldPassword) {
            return res.status(400).json({ error: "Mật khẩu cũ không đúng" });
        }

        // Cập nhật mật khẩu mới (nên hash nếu dùng thực tế)
        await db.query("UPDATE employee SET password = ? WHERE id = ?", [newPassword, employeeId]);
        res.json({ message: "Đổi mật khẩu thành công." });
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi đổi mật khẩu" });
    }
});
// Lấy danh sách đơn hàng của nhân viên
router.get('/orders', authenticateEmployeeToken, async (req, res) => {
    const employeeId = req.employee.id;
    try {
        const [orders] = await db.query(`
            SELECT o.id, o.implementing_date, o.status,
                   u.name as customer_name,
                   s.name as service_name
            FROM \`order\` o
            LEFT JOIN user u ON o.Userid = u.id
            LEFT JOIN service s ON o.Serviceid = s.id
            WHERE o.Employeeid = ?
            ORDER BY o.implementing_date DESC
        `, [employeeId]);
        res.json({ orders });
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi lấy danh sách đơn hàng" });
    }
});
// Đánh dấu đơn hàng hoàn thành
router.put('/orders/:id/complete', authenticateEmployeeToken, async (req, res) => {
    const orderId = req.params.id;
    const employeeId = req.employee.id;
    try {
        // Kiểm tra đơn có thuộc về nhân viên này không và đang in_progress
        const [orders] = await db.query("SELECT * FROM `order` WHERE id = ? AND Employeeid = ? AND status = 'in_progress'", [orderId, employeeId]);
        if (orders.length === 0) {
            return res.status(403).json({ error: "Bạn không có quyền hoàn thành đơn này hoặc đơn đã hoàn thành." });
        }
        // Cập nhật trạng thái
        await db.query("UPDATE `order` SET status = 'completed' WHERE id = ?", [orderId]);

        res.json({ message: "Đơn hàng đã được đánh dấu hoàn thành." });
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi cập nhật trạng thái đơn hàng" });
    }
});

app.get('/employee', (req, res) => {
    const token = req.cookies.token; // Lấy token từ cookie

    if (!token) {
        console.log("Không có token, chuyển đến trang login");
        return res.render('employee/login', { title: "Đăng nhập nhân viên" });
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_SECRET_KEY);
        console.log("Token hợp lệ:", decoded);

        if (decoded.role === 'employee') {
            return res.render('employee/employee', { title: "Trang nhân viên", employee: decoded });
        } else {
            console.log("Vai trò không hợp lệ");
            return res.render('employee/login', { title: "Đăng nhập nhân viên" });
        }
    } catch (err) {
        console.error("Lỗi xác thực token:", err);
        return res.render('employee/login', { title: "Đăng nhập nhân viên" });
    }
});


// Quên mật khẩu - Gửi OTP qua email
app.post('/api/employee/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        // Kiểm tra email có tồn tại không
        const [rows] = await db.query("SELECT id FROM employee WHERE email = ?", [email]);
        if (rows.length === 0) {
            return res.status(404).json({ error: "Email không tồn tại." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000);
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000 + 7 * 60 * 60 * 1000);
        const formattedExpiry = otpExpiry.toISOString().slice(0, 19).replace('T', ' ');


        // Lưu OTP vào cơ sở dữ liệu
        await db.query("UPDATE employee SET otp = ?, otp_expiry = ? WHERE email = ?", [otp, formattedExpiry, email]);

        // Gửi email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Đặt lại mật khẩu',
            text: `Mã OTP của bạn là: ${otp}`
        });

        res.json({ message: "OTP đã được gửi đến email của bạn." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi khi gửi OTP." });
    }

});
app.post('/api/employee/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        // Kiểm tra OTP
        const [rows] = await db.query("SELECT otp, otp_expiry FROM employee WHERE email = ?", [email]);
        if (rows.length === 0) {
            return res.status(404).json({ error: "Email không tồn tại." });
        }

        const employee = rows[0];
        const otpExpiryTime = new Date(employee.otp_expiry).getTime();
        if (employee.otp !== otp || Date.now() > otpExpiryTime) {
            return res.status(400).json({ error: "OTP không hợp lệ hoặc đã hết hạn." });
        }

        // Cập nhật mật khẩu mới
        await db.query("UPDATE employee SET password = ?, otp = NULL, otp_expiry = NULL WHERE email = ?", [newPassword, email]);

        res.json({ message: "Đặt lại mật khẩu thành công." });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Lỗi khi đặt lại mật khẩu." });
    }
});
app.post('/api/user/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        // Kiểm tra email có tồn tại không
        const [rows] = await db.query("SELECT id FROM user WHERE email = ?", [email]);
        if (rows.length === 0) {
            return res.status(404).json({ error: "Email không tồn tại." });
        }

        // Tạo OTP và thời gian hết hạn
        const otp = Math.floor(100000 + Math.random() * 900000);
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000 ); // OTP hết hạn sau 10 phút

        // Lưu OTP vào cơ sở dữ liệu
        await db.query("UPDATE user SET otp = ?, otp_expiry = ? WHERE email = ?", [otp, otpExpiry, email]);

        // Gửi email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Đặt lại mật khẩu',
            text: `Mã OTP của bạn là: ${otp}`
        });

        res.json({ message: "OTP đã được gửi đến email của bạn." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi khi gửi OTP." });
    }
});
app.post('/api/user/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    try {
        // Kiểm tra OTP
        const [rows] = await db.query("SELECT otp, otp_expiry FROM user WHERE email = ?", [email]);
        if (rows.length === 0) {
            return res.status(404).json({ error: "Email không tồn tại." });
        }

        const user = rows[0];
        const otpExpiryTime = new Date(user.otp_expiry).getTime();

        // Kiểm tra OTP và thời gian hết hạn
        if (user.otp !== otp || Date.now() > otpExpiryTime) {
            return res.status(400).json({ error: "OTP không hợp lệ hoặc đã hết hạn." });
        }

        res.json({ message: "OTP hợp lệ. Bạn có thể đặt lại mật khẩu." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi khi xác nhận OTP." });
    }
});
app.post('/api/user/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
        // Kiểm tra OTP
        const [rows] = await db.query("SELECT otp, otp_expiry FROM user WHERE email = ?", [email]);
        if (rows.length === 0) {
            return res.status(404).json({ error: "Email không tồn tại." });
        }

        const user = rows[0];
        const otpExpiryTime = new Date(user.otp_expiry).getTime();

        // Kiểm tra OTP và thời gian hết hạn
        if (user.otp !== otp || Date.now() > otpExpiryTime) {
            return res.status(400).json({ error: "OTP không hợp lệ hoặc đã hết hạn." });
        }

        // Cập nhật mật khẩu mới
        await db.query("UPDATE user SET password = ?, otp = NULL, otp_expiry = NULL WHERE email = ?", [newPassword, email]);

        res.json({ message: "Đặt lại mật khẩu thành công." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi khi đặt lại mật khẩu." });
    }
});

app.get("/api/services/search", async (req, res) => {
    const { keyword, category, minPrice, maxPrice, page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;

    try {
        let query = `
            SELECT s.*, c.name AS category_name 
            FROM service s
            LEFT JOIN category c ON s.Categoryid = c.id
            WHERE 1=1
        `;
        const params = [];

        if (keyword) {
            query += " AND s.name LIKE ?";
            params.push(`%${keyword}%`);
        }

        if (category) {
            query += " AND c.name = ?";
            params.push(category);
        }

        if (minPrice) {
            query += " AND s.price >= ?";
            params.push(minPrice);
        }

        if (maxPrice) {
            query += " AND s.price <= ?";
            params.push(maxPrice);
        }

        query += " LIMIT ? OFFSET ?";
        params.push(parseInt(pageSize), parseInt(offset));

        const [rows] = await db.query(query, params);

        const [countRows] = await db.query(`
            SELECT COUNT(*) AS total 
            FROM service s
            LEFT JOIN category c ON s.Categoryid = c.id
            WHERE 1=1
            ${keyword ? " AND s.name LIKE ?" : ""}
            ${category ? " AND c.name = ?" : ""}
            ${minPrice ? " AND s.price >= ?" : ""}
            ${maxPrice ? " AND s.price <= ?" : ""}
        `, params.slice(0, params.length - 2));

        res.json({
            data: rows,
            total: countRows[0].total,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi khi tìm kiếm và lọc dịch vụ" });
    }
});

app.get('/api/coupons', async (req, res) => {
    try {
        const [coupons] = await db.query(`
            SELECT code, discount, start_date, end_date 
            FROM promotion 
            WHERE start_date <= CURDATE() AND end_date >= CURDATE()
        `);
        res.json({ coupons });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi khi lấy danh sách mã giảm giá" });
    }
});
app.get('/api/admin/statistics/revenue', authenticateAdminToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT DATE_FORMAT(date, '%Y-%m') AS month, SUM(amount) AS total_revenue
            FROM bill
            WHERE status = 'đã thanh toán'
            GROUP BY DATE_FORMAT(date, '%Y-%m')
            ORDER BY DATE_FORMAT(date, '%Y-%m') ASC
        `);
        res.json({ data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi khi lấy thống kê doanh thu." });
    }
});
app.get('/api/admin/statistics/orders', authenticateAdminToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT status, COUNT(*) AS total_orders
            FROM \`order\`
            GROUP BY status
        `);
        res.json({ data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi khi lấy thống kê đơn hàng." });
    }
});
app.get('/api/admin/statistics/popular-services', authenticateAdminToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT s.name AS service_name, COUNT(o.id) AS total_orders
            FROM \`order\` o
            JOIN service s ON o.Serviceid = s.id
            GROUP BY s.name
            ORDER BY total_orders DESC
            LIMIT 5
        `);
        res.json({ data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Lỗi khi lấy thống kê dịch vụ phổ biến." });
    }
});