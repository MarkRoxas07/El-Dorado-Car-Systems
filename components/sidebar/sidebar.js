        // ========================================
        // EL DORADO - UNIFIED DASHBOARD
        // Multi-Role RBAC | Product Categories | Top Products
        // ========================================

        // ========== USER SESSION MANAGEMENT ==========
        function getCurrentUser() {
            const userData = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
            if (!userData) return null;
            try {
                const sessionData = JSON.parse(userData);
                if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) {
                    localStorage.removeItem('userSession');
                    sessionStorage.removeItem('userSession');
                    return null;
                }
                return sessionData;
            } catch (e) {
                return null;
            }
        }

        function setCurrentUser(user) {
            const storage = user.rememberMe ? localStorage : sessionStorage;
            user.expiresAt = Date.now() + 24 * 60 * 60 * 1000;
            storage.setItem('userSession', JSON.stringify(user));
        }

        function addAuditLog(action, details, category = 'System') {
            try {
                const user = getCurrentUser();
                const logs = JSON.parse(localStorage.getItem('auditLogs') || '[]');
                logs.unshift({
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    user: user?.username || 'System',
                    roles: user?.roles || [],
                    action: action,
                    details: details,
                    category: category,
                    page: window.location.pathname
                });
                if (logs.length > 1000) logs.pop();
                localStorage.setItem('auditLogs', JSON.stringify(logs));
            } catch (err) {
                console.error('Error adding audit log:', err);
            }
        }

        // ========== UTILITY FUNCTIONS ==========
        function formatTimestamp(date) {
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }) + ' • ' + date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
            });
        }

        const LOGIN_PAGE = 'index.html';

        const SYSTEM_PAGES = {
            dashboard: 'dashboard.html',
            inventory: 'inventory.html',
            sales: 'sales.html',
            user_management: 'users.html',
            reports: 'reports.html',
            audit_logs: 'audit.html',
            search: 'search.html',
            maintenance: 'maintenance.html',
            help: 'help.html',
            about: 'about.html'
        };

        // Auto-detect current page
        function getCurrentPageFromUrl() {
            const path = window.location.pathname;
            const filename = path.split('/').pop();
            for (const [key, value] of Object.entries(SYSTEM_PAGES)) {
                if (value === filename) return key;
            }
            return 'dashboard';
        }

        const CURRENT_PAGE = getCurrentPageFromUrl();

        // ========== ROLE PERMISSIONS ==========
        const ROLE_MODULES = {
            admin: ['dashboard', 'inventory', 'sales', 'search', 'user_management', 'reports', 'audit_logs', 'maintenance', 'help', 'about'],
            inventory_clerk: ['inventory', 'search', 'help', 'about'],
            loa: ['sales', 'search', 'help', 'about']
        };

        function getUserRolesFromSession() {
            const user = getCurrentUser();
            if (!user) return [];
            if (user.roles && Array.isArray(user.roles)) return user.roles;
            if (user.role) return [user.role];
            return [];
        }

        function hasModuleAccess(moduleName) {
            const userRoles = getUserRolesFromSession();
            if (userRoles.includes('admin')) return true;
            return userRoles.some(role => ROLE_MODULES[role] && ROLE_MODULES[role].includes(moduleName));
        }

        function isAdmin() {
            return getUserRolesFromSession().includes('admin');
        }

        function getRoleDisplayName(role) {
            var roles = { admin: 'Administrator', inventory_clerk: 'Inventory Clerk', loa: 'LOA - Cashier' };
            return roles[role] || role;
        }

        function getRoleIcon(role) {
            var icons = { admin: 'fa-crown', inventory_clerk: 'fa-clipboard-check', loa: 'fa-receipt' };
            return icons[role] || 'fa-user';
        }

        function updateSidebarAvatar(roles) {
            var avatar = document.getElementById('sidebarAvatar');
            var icon = document.getElementById('sidebarAvatarIcon');
            
            if (roles.includes('admin')) {
                avatar.className = 'sidebar-avatar admin';
                icon.className = 'fas fa-crown';
            } else if (roles.includes('inventory_clerk') && roles.includes('loa')) {
                avatar.className = 'sidebar-avatar multi-role';
                icon.className = 'fas fa-star-of-life';
            } else if (roles.includes('inventory_clerk')) {
                avatar.className = 'sidebar-avatar inventory_clerk';
                icon.className = 'fas fa-clipboard-check';
            } else if (roles.includes('loa')) {
                avatar.className = 'sidebar-avatar loa';
                icon.className = 'fas fa-receipt';
            } else {
                avatar.className = 'sidebar-avatar';
                icon.className = 'fas fa-user';
            }
        }

        function updateSidebarUserInfo() {
            const user = getCurrentUser();
            const userNameSpan = document.getElementById('userName');
            const userRoleSpan = document.getElementById('userRole');
            
            if (userNameSpan && user) {
                userNameSpan.textContent = user.username || user.name || user.fullName || 'User';
            }
            
            if (userRoleSpan && user) {
                const roles = getUserRolesFromSession();
                let roleText = '';
                let roleColor = '';
                
                if (roles.includes('admin')) {
                    roleText = 'Administrator';
                    roleColor = '#c084fc'; // Purple
                } else if (roles.includes('inventory_clerk')) {
                    roleText = 'Inventory Clerk';
                    roleColor = '#60a5fa'; // Blue
                } else if (roles.includes('loa')) {
                    roleText = 'LOA - Cashier';
                    roleColor = '#4ade80'; // Green
                } else {
                    roleText = 'No Role Assigned';
                    roleColor = '#adb5bd'; // Gray
                }
                
                userRoleSpan.textContent = roleText;
                userRoleSpan.style.color = roleColor;
                userRoleSpan.style.fontWeight = 'bold';
            }
        }

        // ========== NAVIGATION ==========
        function renderNavigation() {
            var navSections = [
                { section: "MAIN", items: [
                    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-line' },
                    { id: 'inventory', label: 'Inventory', icon: 'fas fa-boxes' },
                    { id: 'sales', label: 'Sales', icon: 'fas fa-shopping-cart' },
                    { id: 'search', label: 'Search', icon: 'fas fa-search' }
                ]},
                { section: "MANAGEMENT", items: [
                    { id: 'user_management', label: 'Users', icon: 'fas fa-users' },
                    { id: 'reports', label: 'Reports', icon: 'fas fa-chart-bar' },
                    { id: 'audit_logs', label: 'Audit Logs', icon: 'fas fa-file-alt' }
                ]},
                { section: "SYSTEM", items: [
                    { id: 'maintenance', label: 'Maintenance', icon: 'fas fa-tools' },
                    { id: 'help', label: 'Support', icon: 'fas fa-question-circle' },
                    { id: 'about', label: 'About', icon: 'fas fa-info-circle' }
                ]}
            ];
            
            var navHtml = '';
            for (var s = 0; s < navSections.length; s++) {
                var section = navSections[s];
                var sectionHasItems = false;
                var sectionHtml = '<div class="nav-section-title">' + section.section + '</div>';
                
                for (var i = 0; i < section.items.length; i++) {
                    var item = section.items[i];
                    if (hasModuleAccess(item.id)) {
                        sectionHasItems = true;
                        var activeClass = (item.id === CURRENT_PAGE) ? 'active' : '';
                        sectionHtml += '<button class="nav-item ' + activeClass + '" onclick="navigateTo(\'' + item.id + '\')">' +
                            '<i class="' + item.icon + '"></i>' +
                            '<span>' + item.label + '</span>' +
                            '</button>';
                    }
                }
                
                if (sectionHasItems) {
                    navHtml += sectionHtml;
                }
            }
            document.getElementById('navLinks').innerHTML = navHtml;
        }

        function navigateTo(module) {
            if (SYSTEM_PAGES[module]) {
                window.location.href = SYSTEM_PAGES[module];
            }
        }

        // ========== SIDEBAR TOGGLE ==========
        var sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';

        function toggleSidebar() {
            sidebarCollapsed = !sidebarCollapsed;
            localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
            
            var sidebar = document.getElementById('sidebar');
            var layout = document.querySelector('.layout');
            var toggleIcon = document.querySelector('#sidebarToggleBtn i');
            
            if (sidebarCollapsed) {
                if (toggleIcon) toggleIcon.className = 'fas fa-chevron-right';
                if (sidebar) sidebar.classList.add('collapsed');
                if (layout) layout.classList.add('sidebar-collapsed');
            } else {
                if (toggleIcon) toggleIcon.className = 'fas fa-chevron-left';
                if (sidebar) sidebar.classList.remove('collapsed');
                if (layout) layout.classList.remove('sidebar-collapsed');
            }
        }

        // ========== DARK MODE ==========
        function toggleDarkMode() {
            document.body.classList.toggle('dark');
            var isDark = document.body.classList.contains('dark');
            localStorage.setItem('darkMode', isDark);
            var icon = document.querySelector('#darkModeToggle i');
            if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        }

        // ========== SIDEBAR EVENT ATTACHMENT ==========
        function attachSidebarEvents() {

            const toggleBtn = document.getElementById('sidebarToggleBtn');
            if (toggleBtn) {
                toggleBtn.onclick = () => toggleSidebar();
            }

            const darkModeBtn = document.getElementById('darkModeToggle');
            if (darkModeBtn) {
                darkModeBtn.onclick = () => toggleDarkMode();
            }

            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.onclick = () => logout();
            }
        }

        // ========== LOGOUT (FIXED) ==========
        function logout() {
            if (confirm('Are you sure you want to logout?')) {
                const user = getCurrentUser(); // Fixed: Get user from session
                addAuditLog('User Logged Out', (user?.username || 'User') + ' logged out', 'System');
                localStorage.removeItem('userSession');
                sessionStorage.removeItem('userSession');
                window.location.href = LOGIN_PAGE;
            }
        }

        // ========== INITIALIZATION ==========
        function initializeSidebar() {
            // Apply dark mode preference
            if (localStorage.getItem('darkMode') === 'true') {
                document.body.classList.add('dark');
                const darkModeIcon = document.querySelector('#darkModeToggle i');
                if (darkModeIcon) darkModeIcon.className = 'fas fa-sun';
            }
            
            // Apply sidebar collapsed state
            if (sidebarCollapsed) {
                const sidebar = document.getElementById('sidebar');
                const layout = document.querySelector('.layout');
                const toggleIcon = document.querySelector('#sidebarToggleBtn i');
                
                if (sidebar) sidebar.classList.add('collapsed');
                if (layout) layout.classList.add('sidebar-collapsed');
                if (toggleIcon) toggleIcon.className = 'fas fa-chevron-right';
            }
            
            // Update avatar with user roles
            const userRoles = getUserRolesFromSession();
            updateSidebarAvatar(userRoles);
            
            // Update user info in sidebar
            updateSidebarUserInfo();
        }

        // ========== SESSION VALIDATION ==========
        function validateSession() {
            const user = getCurrentUser();
            const isLoginPage = window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
            
            if (!user && !isLoginPage) {
                window.location.href = LOGIN_PAGE;
                return false;
            }
            return true;
        }

        // ========== EXPORT FUNCTIONS TO GLOBAL SCOPE ==========
        // Make sure these functions are available globally
        window.getCurrentUser = getCurrentUser;
        window.setCurrentUser = setCurrentUser;
        window.addAuditLog = addAuditLog;
        window.formatTimestamp = formatTimestamp;
        window.getUserRolesFromSession = getUserRolesFromSession;
        window.hasModuleAccess = hasModuleAccess;
        window.isAdmin = isAdmin;
        window.getRoleDisplayName = getRoleDisplayName;
        window.getRoleIcon = getRoleIcon;
        window.updateSidebarAvatar = updateSidebarAvatar;
        window.updateSidebarUserInfo = updateSidebarUserInfo;
        window.renderNavigation = renderNavigation;
        window.navigateTo = navigateTo;
        window.toggleSidebar = toggleSidebar;
        window.toggleDarkMode = toggleDarkMode;
        window.logout = logout;
        window.initializeSidebar = initializeSidebar;
        window.attachSidebarEvents = attachSidebarEvents;
        window.validateSession = validateSession;