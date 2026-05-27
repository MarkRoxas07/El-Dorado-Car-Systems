           
            import { ROLE_CONFIG } from './constants.js';

            // ========== CONSISTENT TIME FORMATTER ==========

            /**
             * Formats a date object into a readable string
             * @param {Date} date - Date object to format
             * @returns {string} Formatted date string (e.g., "January 15, 2024 • 02:30:45 PM")
             */
            export function formatTimestamp(date) {
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

            /**
             * Formats a date object into a compact string for storage/filenames
             * @param {Date} date - Date object to format
             * @returns {string} Compact date string (e.g., "2024-01-15_14-30-45")
             */
            export function formatTimestampCompact(date) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');
                return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
            }

            /**
             * Formats a date object for API/ISO storage
             * @param {Date} date - Date object to format
             * @returns {string} ISO date string
             */
            export function formatISODate(date) {
                return date.toISOString();
            }

            // ========== CATEGORY HELPERS ==========

            /**
             * Gets the display label for a product category
             * @param {string} category - Category key
             * @returns {string} Display label
             */
            export function getCategoryLabel(category) {
                const labels = {
                    mechanical: 'Mechanical',
                    electrical: 'Electrical',
                    body: 'Body',
                    maintenance: 'Maintenance'
                };
                return labels[category] || category;
            }

            /**
             * Gets the FontAwesome icon class for a category
             * @param {string} category - Category key
             * @returns {string} Icon class name
             */
            export function getCategoryIcon(category) {
                const icons = {
                    mechanical: 'fa-tools',
                    electrical: 'fa-bolt',
                    body: 'fa-car',
                    maintenance: 'fa-oil-can'
                };
                return icons[category] || 'fa-tag';
            }

            /**
             * Gets the CSS pill class for a category (for styling)
             * @param {string} category - Category key
             * @returns {string} CSS class name
             */
            export function getCategoryPillClass(category) {
                const classes = {
                    mechanical: 'mechanical',
                    electrical: 'electrical',
                    body: 'body',
                    maintenance: 'maintenance'
                };
                return classes[category] || 'mechanical';
            }

            // ========== ROLE HELPERS ==========

            export function getRoleDisplayName(role) {
                return ROLE_CONFIG[role]?.label || role;
            }

            export function getAllRoles() {
                return Object.entries(ROLE_CONFIG).map(([value, config]) => ({
                    value,
                    label: config.label
                }));
            }

            // ========== HTML/STRING HELPERS ==========

            /**
             * Escapes HTML special characters to prevent XSS attacks
             * @param {string} str - String to escape
             * @returns {string} Escaped string
             */
            export function escapeHtml(str = '') {
                return String(str)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');
            }

            /**
             * Truncates a string to a maximum length and adds ellipsis
             * @param {string} str - String to truncate
             * @param {number} maxLength - Maximum length (default: 50)
             * @returns {string} Truncated string
             */
            export function truncateString(str = '', maxLength = 50) {
                if (str.length <= maxLength) return str;
                return str.substring(0, maxLength) + '...';
            }

            /**
             * Capitalizes the first letter of each word in a string
             * @param {string} str - String to capitalize
             * @returns {string} Capitalized string
             */
            export function capitalizeWords(str = '') {
                return str.replace(/\b\w/g, char => char.toUpperCase());
            }

            // ========== VALIDATION HELPERS ==========

            /**
             * Validates an email address format
             * @param {string} email - Email to validate
             * @returns {boolean} True if valid
             */
            export function isValidEmail(email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(email);
            }

            /**
             * Validates a phone number format
             * @param {string} phone - Phone number to validate
             * @returns {boolean} True if valid
             */
            export function isValidPhone(phone) {
                const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,5}[-\s\.]?[0-9]{1,5}$/;
                return phoneRegex.test(phone);
            }

            /**
             * Validates if a value is a number
             * @param {*} value - Value to check
             * @returns {boolean} True if valid number
             */
            export function isValidNumber(value) {
                return !isNaN(parseFloat(value)) && isFinite(value);
            }

            // ========== CURRENCY HELPERS ==========

            /**
             * Formats a number as currency
             * @param {number} amount - Amount to format
             * @param {string} currencySymbol - Currency symbol (default: '$')
             * @returns {string} Formatted currency string
             */
            export function formatCurrency(amount) {
                const value = Number(amount) || 0;

                return new Intl.NumberFormat('en-PH', {
                    style: 'currency',
                    currency: 'PHP'
                }).format(value);
            }

            /**
             * Formats a number with comma separators
             * @param {number} number - Number to format
             * @returns {string} Formatted number
             */
            export function formatNumber(number) {
                return Number(number || 0).toLocaleString();
            }

            // ========== UI HELPERS ==========

            export function showError(message) {
                console.error(message);
                
                // Try to use the DOM error element if it exists
                const errorDiv = document.getElementById('errorMessage');
                const errorText = document.getElementById('errorText');
                if (errorDiv && errorText) {
                    errorText.textContent = message;
                    errorDiv.classList.add('show');
                    setTimeout(() => {
                        errorDiv.classList.remove('show');
                    }, 5000);
                } else {
                    alert('❌ Error: ' + message);
                }
            }
            export function showSuccess(message) {
                console.log(message);
                alert('✅ Success: ' + message);
            }

            export function showWarning(message) {
                console.warn(message);
                alert('⚠️ Warning: ' + message);
            }

            // ========== DATE HELPERS ==========

            /**
             * Gets a relative time string (e.g., "2 hours ago")
             * @param {Date|string} date - Date to compare
             * @returns {string} Relative time string
             */
            export function getRelativeTime(date) {
                const now = new Date();
                const past = new Date(date);
                const diffMs = now - past;
                const diffSec = Math.floor(diffMs / 1000);
                const diffMin = Math.floor(diffSec / 60);
                const diffHour = Math.floor(diffMin / 60);
                const diffDay = Math.floor(diffHour / 24);
                
                if (diffSec < 60) return 'just now';
                if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
                if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
                if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
                
                return past.toLocaleDateString() + ' • ' + past.toLocaleTimeString();
            }

            /**
             * Gets the start of today (midnight)
             * @returns {Date} Start of today
             */
            export function getStartOfToday() {
                const date = new Date();
                date.setHours(0, 0, 0, 0);
                return date;
            }

            /**
             * Gets the end of today (11:59:59 PM)
             * @returns {Date} End of today
             */
            export function getEndOfToday() {
                const date = new Date();
                date.setHours(23, 59, 59, 999);
                return date;
            }

            // ========== STORAGE HELPERS ==========

            /**
             * Safely parses JSON from localStorage
             * @param {string} key - Storage key
             * @param {*} defaultValue - Default value if not found
             * @returns {*} Parsed data or default value
             */
            export function getStorageItem(key, defaultValue = null) {
                try {
                    const item = localStorage.getItem(key);
                    return item ? JSON.parse(item) : defaultValue;
                } catch (e) {
                    console.error(`Error parsing storage key "${key}":`, e);
                    return defaultValue;
                }
            }

            /**
             * Safely saves data to localStorage
             * @param {string} key - Storage key
             * @param {*} data - Data to save
             * @returns {boolean} Success status
             */
            export function setStorageItem(key, data) {
                try {
                    localStorage.setItem(key, JSON.stringify(data));
                    return true;
                } catch (e) {
                    console.error(`Error saving to storage key "${key}":`, e);
                    return false;
                }
            }

            // ========== DATA VALIDATION HELPERS ==========

            /**
             * Ensures value is a safe array, returns empty array if invalid
             * @param {*} value - Value to validate
             * @returns {Array} Valid array or empty array
             */
            export function ensureArray(value) {
                if (Array.isArray(value) && value.length > 0) return value;
                return [];
            }

            /**
             * Ensures value is a safe number, returns 0 if invalid
             * @param {*} value - Value to validate
             * @returns {number} Valid number or 0
             */
            export function ensureNumber(value) {
                const num = Number(value) || 0;
                if (!isFinite(num)) return 0;
                return num;
            }

            /**
             * Ensures value is a safe positive number
             * @param {*} value - Value to validate
             * @returns {number} Valid positive number or 0
             */
            export function ensurePositiveNumber(value) {
                const num = ensureNumber(value);
                return num < 0 ? 0 : num;
            }

            /**
             * Ensures value is a safe string, returns empty string if invalid
             * @param {*} value - Value to validate
             * @returns {string} Valid string or empty string
             */
            export function ensureString(value) {
                return String(value || '').trim();
            }

            /**
             * Safely sanitizes and escapes HTML for display
             * @param {*} value - Value to sanitize
             * @returns {string} Escaped string safe for HTML
             */
            export function sanitizeForDisplay(value) {
                return escapeHtml(ensureString(value));
            }

            /**
             * Creates a safe HTML element with text content (prevents XSS)
             * @param {string} tag - HTML tag name
             * @param {string} text - Text content (will be escaped)
             * @param {string} className - Optional CSS class
             * @returns {HTMLElement} Safe element
             */
            export function createSafeElement(tag, text = '', className = '') {
                const el = document.createElement(tag);
                el.textContent = text;
                if (className) el.className = className;
                return el;
            }

            // ========== EXPORT ALL UTILITIES ==========
            // Optional: Export as a single object for convenience
            export const Utils = {
                formatTimestamp,
                formatTimestampCompact,
                formatISODate,
                getCategoryLabel,
                getCategoryIcon,
                getCategoryPillClass,
                getRoleDisplayName,
                getAllRoles,
                escapeHtml,
                truncateString,
                capitalizeWords,
                isValidEmail,
                isValidPhone,
                isValidNumber,
                formatCurrency,
                formatNumber,
                showError,
                getRelativeTime,
                getStartOfToday,
                getEndOfToday,
                getStorageItem,
                setStorageItem,
                ensureArray,
                ensureNumber,
                ensureString,
                sanitizeForDisplay,
                createSafeElement
            };

            // ========== CRYPTOGRAPHY HELPERS ==========
            /**
             * Hashes a password using SHA-256
             * @param {string} password - Plain text password
             * @returns {Promise<string>} Hashed password
             */
            export async function hashPassword(password) {
                const encoder = new TextEncoder();
                const data = encoder.encode(password);
                const hash = await crypto.subtle.digest('SHA-256', data);
                return Array.from(new Uint8Array(hash))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
            }

            /**
             * Verifies a password against its hash
             * @param {string} password - Plain text password
             * @param {string} hash - Stored hash
             * @returns {Promise<boolean>} True if valid
             */
            export async function verifyPassword(password, hash) {

                const hashedInput = await hashPassword(password);

                console.log({
                    password,
                    hash,
                    hashedInput,
                    match: hashedInput === hash
                });

                return hashedInput === hash;
            }

            /**
             * Generates a random session token
             * @returns {string} Random token
             */
            export function generateSessionToken() {
                return crypto.randomUUID();
            }