        import {
            getCurrentUser,
            logout,
            setupActivityListeners 
        } from '../core/auth.js';    
        import { addAuditLog } from '../core/data.js';
        import { escapeHtml, sanitizeForDisplay } from '../core/utils.js';

        const LOGIN_PAGE = 'index.html';
        let sidebarInitialized = false; // Prevent duplicate initialization

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

        const ROLE_MODULES = {
            admin: [
                'dashboard',
                'inventory',
                'sales',
                'search',
                'user_management',
                'reports',
                'audit_logs',
                'maintenance',
                'help',
                'about'
            ],

            inventory_clerk: [
                'dashboard',
                'inventory',
                'search',
                'audit_logs',
                'help',
                'about'
            ],

            loa: [
                'dashboard',
                'sales',
                'search',
                'help',
                'about'
            ]
        };

        // ========== ROLE PERMISSIONS ==========

        function getUserRolesFromSession() {
            const user = getCurrentUser();
            if (!user) return [];
            if (user.roles && Array.isArray(user.roles)) return user.roles;
            if (user.role) return [user.role];
            return [];
        }

        function hasModuleAccess(moduleName) {
            if (!moduleName) return false;
            
            const userRoles = getUserRolesFromSession();
            if (!Array.isArray(userRoles) || userRoles.length === 0) return false;
            
            // Admin has access to everything
            if (userRoles.includes('admin')) return true;
            
            // For multi-role users, merge permissions from ALL roles
            // If user has BOTH inventory_clerk AND loa, they get access to BOTH inventory AND sales
            for (const role of userRoles) {
                const modules = ROLE_MODULES[role];
                if (modules && Array.isArray(modules) && modules.includes(moduleName)) {
                    return true;
                }
            }
            
            return false;
        }

        function updateSidebarAvatar(roles) {
            var avatar = document.getElementById('sidebarAvatar');
            var icon = document.getElementById('sidebarAvatarIcon');
            
            if (!avatar || !icon) return;
            
            if (Array.isArray(roles) && roles.includes('admin')) {
                avatar.className = 'sidebar-avatar admin';
                icon.className = 'fas fa-crown';
            } else if (Array.isArray(roles) && roles.includes('inventory_clerk') && roles.includes('loa')) {
                avatar.className = 'sidebar-avatar multi-role';
                icon.className = 'fas fa-star-of-life';
            } else if (Array.isArray(roles) && roles.includes('inventory_clerk')) {
                avatar.className = 'sidebar-avatar inventory_clerk';
                icon.className = 'fas fa-clipboard-check';
            } else if (Array.isArray(roles) && roles.includes('loa')) {
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
            
            if (!user) return;
            
            if (userNameSpan) {
                const displayName = user.username || user.name || user.fullName || 'User';
                userNameSpan.textContent = sanitizeForDisplay(displayName);
            }
            
            if (userRoleSpan) {
                const roles = getUserRolesFromSession();
                let roleText = '';
                let roleColor = '';
                
                if (Array.isArray(roles)) {
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
                var sectionHtml = '<div class="nav-section-title">' + escapeHtml(section.section) + '</div>';
                
                for (var i = 0; i < section.items.length; i++) {
                    var item = section.items[i];
                    if (hasModuleAccess(item.id)) {
                        sectionHasItems = true;
                        var activeClass = (item.id === CURRENT_PAGE) ? 'active' : '';
                        sectionHtml += '<button class="nav-item ' + activeClass + '" onclick="navigateTo(\'' + escapeHtml(item.id) + '\')" title="' + escapeHtml(item.label) + '">' +
                            '<i class="' + escapeHtml(item.icon) + '"></i>' +
                            '<span>' + escapeHtml(item.label) + '</span>' +
                            '</button>';
                    }
                }
                
                if (sectionHasItems) {
                    navHtml += sectionHtml;
                }
            }
            
            const navLinksContainer = document.getElementById('navLinks');
            if (navLinksContainer) {
                navLinksContainer.innerHTML = navHtml;
            }
        }

        function navigateTo(module) {
            if (module && SYSTEM_PAGES[module]) {
                // Validate module access before navigation
                if (hasModuleAccess(module)) {
                    window.location.href = SYSTEM_PAGES[module];
                } else {
                    console.warn('Access denied to module:', module);
                    window.location.href = 'dashboard.html';
                }
            }
        }

        // ========== SIDEBAR TOGGLE ==========
        var sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';

        function toggleSidebar() {
            sidebarCollapsed = !sidebarCollapsed;
            localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString());
            
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
            localStorage.setItem('darkMode', isDark.toString());
            var icon = document.querySelector('#darkModeToggle i');
            if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        }

        // ========== SIDEBAR EVENT ATTACHMENT ==========
        let eventsAttached = false; // Prevent duplicate listener attachment

        function attachSidebarEvents() {
            // Prevent duplicate event listeners
            if (eventsAttached) return;
            eventsAttached = true;

            const toggleBtn = document.getElementById('sidebarToggleBtn');
            if (toggleBtn && !toggleBtn.dataset.listenerAttached) {
                toggleBtn.addEventListener('click', toggleSidebar);
                toggleBtn.dataset.listenerAttached = 'true';
            }

            const darkModeBtn = document.getElementById('darkModeToggle');
            if (darkModeBtn && !darkModeBtn.dataset.listenerAttached) {
                darkModeBtn.addEventListener('click', toggleDarkMode);
                darkModeBtn.dataset.listenerAttached = 'true';
            }

            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn && !logoutBtn.dataset.listenerAttached) {
                logoutBtn.addEventListener('click', logout);
                logoutBtn.dataset.listenerAttached = 'true';
            }
        }

        // ========== INITIALIZATION ==========
        function initializeSidebar() {
            if (sidebarInitialized) return;
            sidebarInitialized = true;
            
            try {
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
            } catch (error) {
                console.error('Error initializing sidebar:', error);
            }
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
        window.addAuditLog = addAuditLog;
        window.getUserRolesFromSession = getUserRolesFromSession;
        window.hasModuleAccess = hasModuleAccess;
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

        // ========== EXPORT ES MODULE FUNCTIONS ==========
        export {
            renderNavigation,
            initializeSidebar,
            attachSidebarEvents,
            validateSession,
            getCurrentPageFromUrl,
            hasModuleAccess
        };