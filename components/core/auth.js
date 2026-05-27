// ========== DEPENDENCIES ==========
import { getUsers, addAuditLog } from './data.js';
import { showError, verifyPassword, generateSessionToken } from './utils.js';

// ========== CONFIGURATION ==========
export const DEFAULT_REDIRECT_PAGE = 'dashboard.html';

// ========== RATE LIMITING STATE ==========
const loginAttempts = new Map();

// ========== MULTI-ROLE HELPERS ==========
export function getUserRoles(user) {
    if (!user) return [];
    if (Array.isArray(user.roles)) return user.roles;
    if (typeof user.role === 'string') return [user.role];
    return [];
}

export function hasRole(allowedRoles, user = null) {
    if (!user) user = getCurrentUser();
    if (!user) return false;
    const userRoles = getUserRoles(user);
    return userRoles.some(role => allowedRoles.includes(role));
}

export function refreshSession() {
    const sessionJSON = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
    if (!sessionJSON) return false;
    
    try {
        const sessionData = JSON.parse(sessionJSON);
        sessionData.expiresAt = Date.now() + (8 * 60 * 60 * 1000);
        
        const storage = localStorage.getItem('userSession') ? localStorage : sessionStorage;
        storage.setItem('userSession', JSON.stringify(sessionData));
        return true;
    } catch (e) {
        return false;
    }
}

export function isAdmin(user = null) {
    return hasRole(['admin'], user);
}

export function isInventoryClerk(user = null) {
    return hasRole(['inventory_clerk'], user);
}

export function isLOA(user = null) {
    return hasRole(['loa'], user);
}

export function hasAnyRole(rolesToCheck, user = null) {
    if (!user) user = getCurrentUser();
    const userRoles = getUserRoles(user);
    return rolesToCheck.some(role => userRoles.includes(role));
}

export function hasAllRoles(rolesToCheck, user = null) {
    if (!user) user = getCurrentUser();
    const userRoles = getUserRoles(user);
    return rolesToCheck.every(role => userRoles.includes(role));
}

export function getMergedPermissions(user = null) {
    if (!user) user = getCurrentUser();
    const roles = getUserRoles(user);
    
    const permissions = {
        canViewDashboard: true,
        canViewInventory: false,
        canViewSales: false,
        canViewUsers: false,
        canViewReports: false,
        canViewAudit: false,
        canViewMaintenance: false,
        canViewSearch: false,
        canViewHelp: true,
        canViewAbout: true,
        
        canViewFinancialStats: false,
        canViewLowStockAlerts: false,
        canViewTopProducts: false,
        canViewRecentActivity: false,
        
        canViewHistoricalSales: false,
        canViewTodaySalesOnly: false,
        canExportReports: false,
        
        canViewFullCustomerList: false,
        canSearchCustomers: false,
        
        canManageUsers: false,
        canEditInventory: false,
        canAccessMaintenance: false
    };
    
    for (const role of roles) {
        if (role === 'admin') {
            permissions.canViewInventory = true;
            permissions.canViewSales = true;
            permissions.canViewUsers = true;
            permissions.canViewReports = true;
            permissions.canViewAudit = true;
            permissions.canViewMaintenance = true;
            permissions.canViewSearch = true;
            permissions.canViewFinancialStats = true;
            permissions.canViewLowStockAlerts = true;
            permissions.canViewTopProducts = true;
            permissions.canViewRecentActivity = true;
            permissions.canViewHistoricalSales = true;
            permissions.canExportReports = true;
            permissions.canManageUsers = true;
            permissions.canEditInventory = true;
            permissions.canAccessMaintenance = true;
            permissions.canViewFullCustomerList = true;
            permissions.canSearchCustomers = true;
        }
        
        if (role === 'inventory_clerk') {
            permissions.canViewInventory = true;
            permissions.canViewAudit = true;
            permissions.canViewLowStockAlerts = true;
            permissions.canViewTopProducts = true;
            permissions.canViewRecentActivity = true;
            permissions.canEditInventory = true;
            permissions.canViewSearch = true;
        }
        
        if (role === 'loa') {
            permissions.canViewSales = true;
            permissions.canViewTodaySalesOnly = true;
            permissions.canViewSearch = true;
            permissions.canSearchCustomers = true;
        }
    }
    
    return permissions;
}

// ========== SESSION HELPER FUNCTIONS ==========

function cleanExpiredSession() {
    localStorage.removeItem('userSession');
    sessionStorage.removeItem('userSession');
}

function getSessionFingerprint() {
    return {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform
    };
}

function checkRateLimit(username) {
    const attempts = loginAttempts.get(username) || { count: 0, lockoutUntil: null };
    
    if (attempts.lockoutUntil && Date.now() < attempts.lockoutUntil) {
        const remainingMinutes = Math.ceil((attempts.lockoutUntil - Date.now()) / 60000);
        throw new Error(`Too many failed attempts. Try again in ${remainingMinutes} minutes.`);
    }
    
    if (attempts.lockoutUntil && Date.now() >= attempts.lockoutUntil) {
        attempts.count = 0;
        attempts.lockoutUntil = null;
    }
    
    return attempts;
}

function recordFailedAttempt(username) {
    const attempts = loginAttempts.get(username) || { count: 0, lockoutUntil: null };
    attempts.count++;
    
    if (attempts.count >= 5) {
        attempts.lockoutUntil = Date.now() + (15 * 60 * 1000);
    }
    
    loginAttempts.set(username, attempts);
}

// ========== SESSION MANAGEMENT ==========

export function getCurrentUser() {
    const sessionJSON = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
    if (!sessionJSON) return null;
    
    try {
        const sessionData = JSON.parse(sessionJSON);
        
        if (!sessionData.expiresAt || Date.now() > sessionData.expiresAt) {
            cleanExpiredSession();
            return null;
        }
        
        // Re-validate against database
        const users = getUsers();
        const currentUser = users.find(u => u.id === sessionData.id);
        
        if (!currentUser || currentUser.status !== 'active') {
            cleanExpiredSession();
            return null;
        }
        
        // Check fingerprint
        if (sessionData.fingerprint) {
            const currentFingerprint = getSessionFingerprint();
            if (JSON.stringify(currentFingerprint) !== JSON.stringify(sessionData.fingerprint)) {
                cleanExpiredSession();
                return null;
            }
        }
        
        return { ...sessionData, ...currentUser };
    } catch (e) {
        cleanExpiredSession();
        return null;
    }
}

export async function login(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    if (!username || !password) {
        showError('Please enter both username and password');
        return;
    }

    try {
        checkRateLimit(username);
        
        const users = getUsers();
        const user = users.find(u => u.username === username);

        if (user && user.status === 'active') {
            const isValid = await verifyPassword(password, user.password);
            
            if (isValid) {
                const userRoles = getUserRoles(user);
                
                addAuditLog('User Logged In', user.username + ' logged into the system', user.username, userRoles);
                
                loginAttempts.delete(username);
                
                const sessionData = {
                    id: user.id,
                    sessionVersion: 1,
                    sessionToken: generateSessionToken(),
                    username: user.username,
                    fullName: user.fullName,
                    roles: userRoles,
                    email: user.email,
                    status: user.status,
                    loginTime: new Date().toISOString(),
                    expiresAt: Date.now() + (8 * 60 * 60 * 1000),
                    fingerprint: getSessionFingerprint()
                };

                localStorage.removeItem('userSession');
                sessionStorage.removeItem('userSession');

                if (rememberMe) {
                    localStorage.setItem('userSession', JSON.stringify(sessionData));
                } else {
                    sessionStorage.setItem('userSession', JSON.stringify(sessionData));
                }

                window.location.href = DEFAULT_REDIRECT_PAGE;
                return;
            }
        }
        
        recordFailedAttempt(username);
        addAuditLog('Failed Login Attempt', 'Failed login for username: ' + username, username, []);
        showError('Invalid username or password');
        
    } catch (error) {
        showError(error.message);
    }
}

export function extendSessionOnActivity() {
    const sessionJSON = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
    if (!sessionJSON) return;
    
    try {
        const sessionData = JSON.parse(sessionJSON);
        const newExpiry = Date.now() + (30 * 60 * 1000);
        const originalLoginTime = new Date(sessionData.loginTime).getTime();
        const maxExpiry = originalLoginTime + (8 * 60 * 60 * 1000);
        
        sessionData.expiresAt = Math.min(newExpiry, maxExpiry);
        
        const storage = localStorage.getItem('userSession') ? localStorage : sessionStorage;
        storage.setItem('userSession', JSON.stringify(sessionData));
    } catch (e) {
        // Silent fail
    }
}

export function setupActivityListeners() {
    // Prevent duplicate event listeners
    if (window.activityListenersAttached) return;
    window.activityListenersAttached = true;
    
    if (typeof document !== 'undefined') {
        const events = ['click', 'keypress', 'mousemove', 'scroll', 'touchstart'];
        const extendHandler = () => {
            try {
                extendSessionOnActivity();
            } catch (e) {
                console.error('Error extending session:', e);
            }
        };
        
        events.forEach(event => {
            document.addEventListener(event, extendHandler, { passive: true });
        });
    }
}

export function checkExistingSession() {
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.status === 'active') {
        window.location.href = DEFAULT_REDIRECT_PAGE;
    }
}

export function requireAuth() {
    const currentUser = getCurrentUser();

    if (!currentUser) {
        console.warn('Authentication required - redirecting to login');
        window.location.href = 'index.html';
        return null;
    }

    // Additional validation
    if (currentUser.status !== 'active') {
        console.error('User account is not active');
        cleanExpiredSession();
        window.location.href = 'index.html';
        return null;
    }

    return currentUser;
}

export function requireRole(allowedRoles) {
    const currentUser = requireAuth();

    if (!currentUser) {
        return false;
    }

    const allowed = hasRole(allowedRoles, currentUser);

    if (!allowed) {
        window.location.href = DEFAULT_REDIRECT_PAGE;
        return false;
    }

    return true;
}

export function logout() {
    if (!confirm('Logout?')) {
        return;
    }
    
    const currentUser = getCurrentUser();
    if (currentUser) {
        addAuditLog('User Logged Out', `${currentUser.username} logged out`, currentUser.username, currentUser.roles);
    }
    
    cleanExpiredSession();
    window.location.href = 'index.html';
}