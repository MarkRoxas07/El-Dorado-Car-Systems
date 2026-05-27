import { STORAGE_KEYS, ROLES } from './constants.js';
import { hashPassword, ensureArray } from './utils.js';

// ========== SAFE DATA GETTERS ==========
/**
 * Safely gets users array, validating and returning empty array if corrupt
 * @returns {Array} Users array or empty array
 */
function getSafeUsers() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error('Error reading users:', e);
        return [];
    }
}

/**
 * Safely gets products array, validating and returning empty array if corrupt
 * @returns {Array} Products array or empty array
 */
function getSafeProducts() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error('Error reading products:', e);
        return [];
    }
}

/**
 * Safely gets sales array, validating and returning empty array if corrupt
 * @returns {Array} Sales array or empty array
 */
function getSafeSales() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.SALES) || '[]');
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error('Error reading sales:', e);
        return [];
    }
}

/**
 * Safely gets activity logs array, validating and returning empty array if corrupt
 * @returns {Array} Activity logs array or empty array
 */
function getSafeActivityLogs() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS) || '[]');
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error('Error reading activity logs:', e);
        return [];
    }
}

// ========== AUDIT LOG HELPER (CONSISTENT TIME) ==========
const AUDIT_LOG_DEDUP_CACHE = new Map(); // Prevent duplicate logs within 5 seconds

export function addAuditLog(action, details, user, userRoles) {
    try {
        const cacheKey = `${user}:${action}:${details}`;
        const lastLog = AUDIT_LOG_DEDUP_CACHE.get(cacheKey);
        
        // Skip if same log was added within last 5 seconds
        if (lastLog && Date.now() - lastLog < 5000) {
            return;
        }
        
        AUDIT_LOG_DEDUP_CACHE.set(cacheKey, Date.now());
        
        const logs = getSafeActivityLogs();
        const now = new Date();
        
        logs.unshift({
            id: Date.now(),
            action,
            details,
            user: user ?? 'system',
            userRoles: userRoles || ['system'],
            module: 'System',
            timestamp: now.toLocaleString(),
            rawTimestamp: now.toISOString()
        });
        
        // Keep only last 500 logs
        while (logs.length > 500) logs.pop();
        localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(logs));
    } catch (e) {
        console.error('Audit log error:', e);
    }
}

// ========== USER MANAGEMENT ==========
export function getUsers() {
    return getSafeUsers();
}

export function saveUsers(users) {
    if (!Array.isArray(users)) return false;
    try {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        return true;
    } catch (e) {
        console.error('Error saving users:', e);
        return false;
    }
}

export function getUserById(id) {
    const users = getUsers();
    return users.find(u => u.id === id);
}

export async function createUser(userData, createdBy = 'system', createdByRoles = ['system']) {
    const users = getUsers();
    
    // Validate user data
    if (!userData.username || !userData.password) {
        throw new Error('Username and password are required');
    }
    
    // Check for duplicate username
    if (users.some(u => u.username === userData.username.toLowerCase())) {
        throw new Error('Username already exists');
    }
    
    // Generate unique ID - prevent duplicates
    let newId = Date.now();
    while (users.some(u => u.id === newId)) {
        newId = Date.now() + Math.random();
    }
    
    // Hash the password before storing
    const hashedPassword = await hashPassword(userData.password);
    
    const newUser = {
        id: newId,
        ...userData,
        username: userData.username.toLowerCase(),
        password: hashedPassword,
        status: userData.status || 'active',
        createdAt: new Date().toISOString()
    };
    users.push(newUser);
    saveUsers(users);
    addAuditLog('User Created', `User ${newUser.username} created by ${createdBy}`, createdBy, createdByRoles);
    return newUser;
}

export async function updateUser(id, updates, updatedBy = 'system', updatedByRoles = ['system']) {
    const users = getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
        // If password is being updated, hash it
        if (updates.password) {
            updates.password = await hashPassword(updates.password);
        }
        
        users[index] = { ...users[index], ...updates };
        saveUsers(users);
        addAuditLog('User Updated', `User ${users[index].username} updated by ${updatedBy}`, updatedBy, updatedByRoles);
        return users[index];
    }
    return null;
}

export function deleteUser(id, deletedBy = 'system', deletedByRoles = ['system']) {
    const users = getUsers();
    const userToDelete = users.find(u => u.id === id);
    const filtered = users.filter(u => u.id !== id);
    saveUsers(filtered);
    addAuditLog('User Deleted', `User ${userToDelete?.username || id} deleted by ${deletedBy}`, deletedBy, deletedByRoles);
    return true;
}

export function getAllProducts() {
    return getSafeProducts();
}

export function getProductById(id) {
    const products = getAllProducts();
    return products.find(p => p.id === id) || null;
}

export function saveProducts(products) {
    if (!Array.isArray(products)) return false;
    try {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
        return true;
    } catch (e) {
        console.error('Error saving products:', e);
        return false;
    }
}

export function addProduct(productData, addedBy = 'system', addedByRoles = ['system']) {
    const products = getAllProducts();
    
    // Generate unique ID - prevent duplicates
    let newId = Date.now();
    while (products.some(p => p.id === newId)) {
        newId = Date.now() + Math.random();
    }
    
    const newProduct = {
        id: newId,
        createdAt: new Date().toISOString(),
        stock: 0,
        archived: false,
        ...productData
    };
    products.push(newProduct);
    saveProducts(products);
    addAuditLog('Product Added', `Product ${newProduct.name} added by ${addedBy}`, addedBy, addedByRoles);
    return newProduct;
}

export function updateProduct(id, updates, updatedBy = 'system', updatedByRoles = ['system']) {
    const products = getAllProducts();
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
        products[index] = { ...products[index], ...updates };
        saveProducts(products);
        addAuditLog('Product Updated', `Product ${products[index].name} updated by ${updatedBy}`, updatedBy, updatedByRoles);
        return products[index];
    }
    return null;
}

export function archiveProduct(id, archivedBy = 'system', archivedByRoles = ['system']) {
    return updateProduct(id, { archived: true }, archivedBy, archivedByRoles);
}

// ========== SALES HELPERS ==========
export function getSales() {
    return getSafeSales();
}

export function saveSales(sales) {
    if (!Array.isArray(sales)) return false;
    try {
        localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
        return true;
    } catch (e) {
        console.error('Error saving sales:', e);
        return false;
    }
}

export function addSale(saleData) {
    const sales = getSales();
    
    // Generate unique ID - prevent duplicates
    let newId = Date.now();
    while (sales.some(s => s.id === newId)) {
        newId = Date.now() + Math.random();
    }
    
    const newSale = {
        id: newId,
        createdAt: new Date().toISOString(),
        ...saleData
    };

    // Validate and update product stock - with proper error handling
    try {
        if (newSale.items && Array.isArray(newSale.items)) {
            for (let i = 0; i < newSale.items.length; i++) {
                const item = newSale.items[i];
                const productId = item.productId || item.id;
                const quantity = parseInt(item.quantity) || 0;
                
                if (!productId || quantity <= 0) continue;
                
                const product = getProductById(productId);
                if (!product) {
                    throw new Error(`Product ${productId} not found`);
                }
                
                // Prevent selling archived products
                if (product.archived) {
                    throw new Error(`Cannot sell archived product: ${product.name}`);
                }
                
                // Validate stock
                if (quantity > product.stock) {
                    throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`);
                }

                // Ensure non-negative stock
                const newStock = Math.max(0, product.stock - quantity);
                updateProduct(product.id, { stock: newStock }, newSale.cashier || 'system', newSale.cashierRoles || ['system']);
            }
        }
    } catch (error) {
        console.error('Sale validation error:', error.message);
        throw error;
    }
    
    sales.push(newSale);
    saveSales(sales);
    addAuditLog('Sale Recorded', `Sale #${newSale.id} recorded`, newSale.cashier || 'system', newSale.cashierRoles || ['system']);
    return newSale;
}

export function getSalesByDateRange(startDate, endDate) {
    const sales = getSales();
    return sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        saleDate.setHours(0, 0, 0, 0);
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return saleDate >= start && saleDate <= end;
    });
}

export function getTodaySales() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    return getSalesByDateRange(today, endOfDay);
}

// ========== ACTIVITY LOGS HELPERS ==========
export function getActivityLogs() {
    return getSafeActivityLogs();
}

export function clearActivityLogs(clearedBy = 'system', clearedByRoles = ['system']) {
    try {
        localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, '[]');
        addAuditLog('Logs Cleared', 'Activity logs were cleared', clearedBy, clearedByRoles);
        return true;
    } catch (e) {
        console.error('Error clearing logs:', e);
        return false;
    }
}

export function getLogsByUser(username) {
    const logs = getActivityLogs();
    return logs.filter(log => log.user === username);
}

export function getLogsByAction(action) {
    const logs = getActivityLogs();
    return logs.filter(log => log.action === action);
}

// ========== SETTINGS HELPERS ==========
export function getSettings() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}');
}

export function updateSettings(updates, updatedBy = 'system', updatedByRoles = ['system']) {
    const settings = getSettings();
    const newSettings = { ...settings, ...updates };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
    addAuditLog('Settings Updated', 'System settings were updated', updatedBy, updatedByRoles);
    return newSettings;
}

export function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// ========== DATA BACKUP & RESTORE ==========
export function backupAllData(backedUpBy = 'system', backedUpByRoles = ['system']) {
    const backup = {
        users: getUsers(),
        products: getAllProducts(),
        sales: getSales(),
        logs: getActivityLogs(),
        backupDate: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.BACKUP, JSON.stringify(backup));
    addAuditLog('Backup Created', 'System backup created', backedUpBy, backedUpByRoles);
    return backup;
}

export function restoreFromBackup(backupData, restoredBy = 'system', restoredByRoles = ['system']) {
    if (backupData.users) saveUsers(backupData.users);
    if (backupData.products) saveProducts(backupData.products);
    if (backupData.sales) saveSales(backupData.sales);
    if (backupData.logs) localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(backupData.logs));
    addAuditLog('Backup Restored', 'System restored from backup', restoredBy, restoredByRoles);
    return true;
}

// ========== DATA VALIDATION ==========
export function validateProduct(product) {
    const errors = [];
    if (!product.name) errors.push('Product name is required');
    if (product.price && isNaN(product.price)) errors.push('Price must be a number');
    if (product.stock && isNaN(product.stock)) errors.push('Stock must be a number');
    return {
        valid: errors.length === 0,
        errors: errors
    };
}

export function validateUser(user) {
    const errors = [];
    if (!user.username) errors.push('Username is required');
    if (!user.password) errors.push('Password is required');
    if (!user.roles || user.roles.length === 0) errors.push('At least one role is required');
    return {
        valid: errors.length === 0,
        errors: errors
    };
}

// ========== INITIALIZATION ==========
export async function initializeDataStores() {
    // Hash default passwords
    const hashedAdminPassword = await hashPassword('admin123');
    const hashedClerkPassword = await hashPassword('clerk123');
    const hashedLoAPassword = await hashPassword('loa123');
    
    const DEFAULT_USERS = [
        {
            id: 1,
            username: 'admin',
            password: hashedAdminPassword,
            fullName: 'Administrator',
            roles: [ROLES.ADMIN],
            email: 'admin@eldorado.com',
            status: 'active',
            createdAt: new Date().toISOString()
        },
        {
            id: 2,
            username: 'clerk',
            password: hashedClerkPassword,
            fullName: 'Inventory Clerk',
            roles: [ROLES.INVENTORY_CLERK],
            email: 'clerk@eldorado.com',
            status: 'active',
            createdAt: new Date().toISOString()
        },
        {
            id: 3,
            username: 'loa',
            password: hashedLoAPassword,
            fullName: 'LOA Cashier',
            roles: [ROLES.LOA],
            email: 'loa@eldorado.com',
            status: 'active',
            createdAt: new Date().toISOString()
        }
    ];

    const existingUsers = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.USERS) || 'null'
    );

    const usersAreInvalid =
        !Array.isArray(existingUsers) ||
        existingUsers.length === 0 ||
        !existingUsers[0]?.password ||
        existingUsers[0].password === 'admin123';

    if (usersAreInvalid) {

        localStorage.setItem(
            STORAGE_KEYS.USERS,
            JSON.stringify(DEFAULT_USERS)
        );

        console.log('Default users initialized.');
    }

    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.SALES)) {
        localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([]));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({
            companyName: 'El Dorado Car Components',
            darkModeEnabled: true,
            auditLogsEnabled: true
        }));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS)) {
        localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify([]));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.BACKUP)) {
        localStorage.setItem(STORAGE_KEYS.BACKUP, JSON.stringify(null));
    }
}