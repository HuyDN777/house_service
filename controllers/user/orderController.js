const { VNPay, ignoreLogger, ProductCode, VnpLocale, dateFormat, consoleLogger } = require('vnpay');
const db = require('../../config/database');

const orderUserController = {
    async order(req, res) {
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
    },

    async orderProcessing(req, res) {
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
                res.redirect(`/order-success/${orderId}`);
            } catch (err) {
                console.log('Deo hieu: ', err);
                res.send('Thanh toán thất bại');
            }
        } else {
            res.send('Thanh toán thất bại hoặc bị hủy.');
        }
        // const {
        //     resultCode,
        //     orderInfo,
        //     amount,
        //     orderId,
        //     transId,
        //     message
        // } = req.body;

        // if (resultCode === '00') {
        //     try {
        //         const orderInfo = JSON.parse(orderInfo);
        //         const {
        //             user_id, service_id, booking_date, implementing_date, address, note,
        //             promotionId, payment_method, quantity, price_per_unit, discount, final_price
        //         } = orderInfo;

        //         // 2. Điều phối nhân viên phù hợp
        //         const [employees] = await db.query(
        //             `SELECT e.*
        //             FROM employee e
        //             WHERE e.Serviceid = ?
        //             AND NOT EXISTS (
        //                 SELECT 1 FROM \`order\` o
        //                 WHERE o.Employeeid = e.id
        //                 AND o.status = 'in_progress'
        //                 AND o.implementing_date = ?
        //             )
        //             ORDER BY e.experience DESC
        //             LIMIT 1`,
        //             [service_id, implementing_date]
        //         );

        //         let employee_id = null;
        //         let orderStatus = 'pending';
        //         if (employees.length > 0) {
        //             employee_id = employees[0].id;
        //             orderStatus = 'in_progress';
        //         }

        //         // 3. Lưu đơn hàng
        //         const [orderResult] = await db.query(
        //             `INSERT INTO \`order\` (Userid, Serviceid, Employeeid, booking_date, implementing_date, Promotionid, status, address, note)
        //             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        //             [user_id, service_id, employee_id, booking_date, implementing_date, promotionId, orderStatus, address, note]
        //         );
        //         const orderId = orderResult.insertId;

        //         // 4. Lưu hóa đơn
        //         await db.query(
        //             "INSERT INTO bill (amount, status, date, Orderid) VALUES (?, ?, NOW(), ?)",
        //             [final_price, 'đã thanh toán', orderId]
        //         );

        //         res.redirect(`/order-success/${orderId}`);
        //     } catch (err) {
        //         res.send('Thanh toán thất bại hoặc bị hủy.');
        //     }
        // } else {
        //     res.send('Thanh toán thất bại hoặc bị hủy.');
        // }
    }, 

    async orderHistory(req, res) {
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
    }, 

    async orderSuccessful(req, res) {
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
    }
}

module.exports = orderUserController;