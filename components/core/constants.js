export const ROLES = Object.freeze({
    ADMIN: 'admin',
    INVENTORY_CLERK: 'inventory_clerk',
    LOA: 'loa'
});

export const ROLE_CONFIG = Object.freeze({
    [ROLES.ADMIN]: {
        label: 'Administrator',
        icon: 'fa-crown',
        color: '#c084fc'
    },

    [ROLES.INVENTORY_CLERK]: {
        label: 'Inventory Clerk',
        icon: 'fa-clipboard-check',
        color: '#60a5fa'
    },

    [ROLES.LOA]: {
        label: 'LOA - Cashier',
        icon: 'fa-receipt',
        color: '#4ade80'
    }
});

export const STORAGE_KEYS = Object.freeze({
    USERS: 'systemUsers',
    PRODUCTS: 'eldorado_products',
    SALES: 'eldorado_sales',
    ACTIVITY_LOGS: 'activityLogs',
    BACKUP: 'eldorado_backup',
    SETTINGS: 'systemSettings'
});