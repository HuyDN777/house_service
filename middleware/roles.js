// Định nghĩa các role
const ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    MANAGER: 'manager',
    EMPLOYEE: 'employee',
    USER: 'user'
};

// Định nghĩa các permission
const PERMISSIONS = {
    // Quản lý người dùng
    VIEW_USERS: 'view_users',
    CREATE_USER: 'create_user',
    EDIT_USER: 'edit_user',
    DELETE_USER: 'delete_user',
    
    // Quản lý đơn hàng
    VIEW_ORDERS: 'view_orders',
    CREATE_ORDER: 'create_order',
    EDIT_ORDER: 'edit_order',
    DELETE_ORDER: 'delete_order',
    
    // Quản lý dịch vụ
    VIEW_SERVICES: 'view_services',
    CREATE_SERVICE: 'create_service',
    EDIT_SERVICE: 'edit_service',
    DELETE_SERVICE: 'delete_service',
    
    // Quản lý danh mục
    VIEW_CATEGORIES: 'view_categories',
    CREATE_CATEGORY: 'create_category',
    EDIT_CATEGORY: 'edit_category',
    DELETE_CATEGORY: 'delete_category',
    
    // Quản lý nhân viên
    VIEW_EMPLOYEES: 'view_employees',
    CREATE_EMPLOYEE: 'create_employee',
    EDIT_EMPLOYEE: 'edit_employee',
    DELETE_EMPLOYEE: 'delete_employee',
    
    // Quản lý mã khuyến mãi
    VIEW_COUPONS: 'view_coupons',
    CREATE_COUPON: 'create_coupon',
    EDIT_COUPON: 'edit_coupon',
    DELETE_COUPON: 'delete_coupon',
    
    // Quản lý hóa đơn
    VIEW_BILLS: 'view_bills',
    CREATE_BILL: 'create_bill',
    EDIT_BILL: 'edit_bill',
    DELETE_BILL: 'delete_bill'
};

// Định nghĩa quyền cho từng role
const ROLE_PERMISSIONS = {
    [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS), // Có tất cả quyền
    
    [ROLES.ADMIN]: [
        PERMISSIONS.VIEW_USERS,
        PERMISSIONS.CREATE_USER,
        PERMISSIONS.EDIT_USER,
        PERMISSIONS.DELETE_USER,
        PERMISSIONS.VIEW_ORDERS,
        PERMISSIONS.EDIT_ORDER,
        PERMISSIONS.VIEW_SERVICES,
        PERMISSIONS.CREATE_SERVICE,
        PERMISSIONS.EDIT_SERVICE,
        PERMISSIONS.DELETE_SERVICE,
        PERMISSIONS.VIEW_CATEGORIES,
        PERMISSIONS.CREATE_CATEGORY,
        PERMISSIONS.EDIT_CATEGORY,
        PERMISSIONS.DELETE_CATEGORY,
        PERMISSIONS.VIEW_EMPLOYEES,
        PERMISSIONS.CREATE_EMPLOYEE,
        PERMISSIONS.EDIT_EMPLOYEE,
        PERMISSIONS.DELETE_EMPLOYEE,
        PERMISSIONS.VIEW_COUPONS,
        PERMISSIONS.CREATE_COUPON,
        PERMISSIONS.EDIT_COUPON,
        PERMISSIONS.DELETE_COUPON,
        PERMISSIONS.VIEW_BILLS,
        PERMISSIONS.EDIT_BILL
    ],
    
    [ROLES.MANAGER]: [
        PERMISSIONS.VIEW_ORDERS,
        PERMISSIONS.EDIT_ORDER,
        PERMISSIONS.VIEW_SERVICES,
        PERMISSIONS.VIEW_CATEGORIES,
        PERMISSIONS.VIEW_EMPLOYEES,
        PERMISSIONS.EDIT_EMPLOYEE,
        PERMISSIONS.VIEW_COUPONS,
        PERMISSIONS.VIEW_BILLS,
        PERMISSIONS.EDIT_BILL
    ],
    
    [ROLES.EMPLOYEE]: [
        PERMISSIONS.VIEW_ORDERS,
        PERMISSIONS.VIEW_SERVICES,
        PERMISSIONS.VIEW_CATEGORIES,
        PERMISSIONS.VIEW_COUPONS
    ],
    
    [ROLES.USER]: [
        PERMISSIONS.VIEW_SERVICES,
        PERMISSIONS.VIEW_CATEGORIES,
        PERMISSIONS.CREATE_ORDER
    ]
};

// Middleware kiểm tra quyền
function checkPermission(permission) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userRole = req.user.role;
        const userPermissions = ROLE_PERMISSIONS[userRole] || [];

        if (!userPermissions.includes(permission)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        next();
    };
}

// Middleware kiểm tra role
function checkRole(roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        next();
    };
}

module.exports = {
    ROLES,
    PERMISSIONS,
    ROLE_PERMISSIONS,
    checkPermission,
    checkRole
}; 