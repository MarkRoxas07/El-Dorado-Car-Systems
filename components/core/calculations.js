
            // ========== CONFIGURATION ==========
            const DEFAULT_SAFETY_FACTOR = 1.5;
            const DEFAULT_LEAD_TIME_DAYS = 3;
            const DEFAULT_SAFETY_STOCK = 5;

            // ========== DAILY SALES CALCULATIONS ==========

            /**
             * Calculates average daily sales for a product over a specified period
             * @param {Object} product - Product object with id property
             * @param {number} analysisDays - Number of days to analyze (default: 30)
             * @returns {number} Average daily sales
             */

            export function calculateAverageDailySales(
                product,
                sales,
                analysisDays = 30
            ) {
                if (!product || !product.id) return 0;
                if (!Array.isArray(sales)) return 0;
                if (analysisDays <= 0) return 0;
                
                const analysisStartDate = new Date();
                analysisStartDate.setHours(0, 0, 0, 0);
                analysisStartDate.setDate(analysisStartDate.getDate() - analysisDays);

                const recentSales = sales.filter(function(sale) {
                    const saleDate = new Date(sale.rawTimestamp || sale.date);
                    saleDate.setHours(0, 0, 0, 0);
                    return saleDate >= analysisStartDate;
                });

                let totalSold = 0;

                recentSales.forEach(function(sale) {
                    if (sale.items) {
                        const item = sale.items.find(function(i) {
                            return i.productId === product.id || i.id === product.id;
                        });

                        if (item) {
                            totalSold += item.quantity;
                        }
                    }
                });

                return totalSold / analysisDays;
            }

            // ========== REORDER CALCULATIONS ==========

            /**
             * Calculates reorder point based on average daily sales, lead time, and safety stock
             * @param {Object} product - Product object with leadTimeDays and safetyStock properties
             * @param {Array} sales - Array of sale objects
             * @returns {number} Reorder point (minimum stock before reordering)
             */
            export function calculateReorderPoint(product, sales) {
                const avgDailySales = calculateAverageDailySales(product, sales);
                const leadTime = product.leadTimeDays || DEFAULT_LEAD_TIME_DAYS;
                const safetyStock = product.safetyStock || DEFAULT_SAFETY_STOCK;
                return Math.ceil(avgDailySales * leadTime + safetyStock);
            }

            /**
             * Gets products that are below their reorder point
             * @param {Array} products - Array of product objects
             * @param {Array} sales - Array of sale objects
             * @returns {Array} Products that need reordering
             */
            export function getLowStockProducts(products, sales, includeOutOfStock = false) {
                const lowStockItems = [];

                for (let i = 0; i < products.length; i++) {
                    const product = products[i];

                    if (product.archived) continue;
                    
                    if (product.stock === 0) {
                        if (includeOutOfStock) {
                            const reorderPoint = calculateReorderPoint(product, sales);

                            lowStockItems.push({
                                ...product,
                                reorderPoint,
                                suggestedOrderQty: calculateSuggestedOrderQuantity(
                                    product,
                                    reorderPoint
                                ),
                                isOutOfStock: true
                            });
                        }

                        continue;
                    }

                    const reorderPoint = calculateReorderPoint(product, sales);

                    if (product.stock < reorderPoint) {
                        lowStockItems.push({
                            ...product,
                            reorderPoint,
                            suggestedOrderQty: calculateSuggestedOrderQuantity(product, reorderPoint),
                            isOutOfStock: false
                        });
                    }
                }

                return lowStockItems;
            }

            /**
             * Gets products that are completely out of stock
             * @param {Array} products - Array of product objects
             * @returns {Array} Out of stock products
             */
            export function getOutOfStockProducts(products) {
                return products.filter(
                    product => !product.archived && product.stock === 0
                );
            }

            /**
             * Calculates suggested order quantity based on reorder point and current stock
             * @param {Object} product - Product object with stock property
             * @param {number} reorderPoint - The calculated reorder point
             * @returns {number} Suggested quantity to order
             */
            export function calculateSuggestedOrderQuantity(
                product,
                reorderPoint,
                safetyFactor = DEFAULT_SAFETY_FACTOR
            ) {
                const quantity = Math.ceil((reorderPoint - product.stock) * safetyFactor);
                return Math.max(quantity, 0);
            }

            // ========== HELPER / UTILITY FUNCTIONS ==========

            /**
             * Calculates stock status for all products
             * @param {Array} products - Array of product objects
             * @param {Array} sales - Array of sale objects
             * @returns {Object} Stock status summary
             */
            export function getStockStatusSummary(products, sales) {
                const lowStock = getLowStockProducts(products, sales);
                const outOfStock = getOutOfStockProducts(products);
                
                return {
                    totalProducts: products.length,
                    activeProducts: products.filter(p => !p.archived).length,
                    lowStockCount: lowStock.length,
                    outOfStockCount: outOfStock.length,
                    lowStockProducts: lowStock,
                    outOfStockProducts: outOfStock,
                    healthyStockCount: products.filter(p => 
                        !p.archived && 
                        p.stock > 0 && 
                        !lowStock.some(low => low.id === p.id)
                    ).length
                };
            }

            /**
             * Calculates total inventory value
             * @param {Array} products - Array of product objects with stock and cost properties
             * @returns {number} Total inventory value
             */
            export function getTotalInventoryValue(products) {
                return products.reduce((total, product) => {
                    if (!product.archived) {
                        const cost = product.costPrice || product.price || 0;
                        return total + (product.stock * cost);
                    }
                    return total;
                }, 0);
            }

            /**
             * Checks if a specific product needs reordering
             * @param {Object} product - Product object
             * @param {Array} sales - Array of sale objects
             * @returns {Object} Reorder status with details
             */
            export function checkProductReorderStatus(product, sales) {
                if (product.archived) {
                    return { needsReorder: false, reason: 'Product is archived' };
                }
                
                if (product.stock === 0) {
                    return { needsReorder: true, reason: 'Out of stock', urgency: 'high' };
                }
                
                const reorderPoint = calculateReorderPoint(product, sales);
                const needsReorder = product.stock < reorderPoint;
                
                return {
                    needsReorder,
                    currentStock: product.stock,
                    reorderPoint,
                    suggestedQuantity: needsReorder ? calculateSuggestedOrderQuantity(product, reorderPoint) : 0,
                    urgency: needsReorder ? (product.stock < reorderPoint / 2 ? 'high' : 'medium') : 'none'
                };
            }

            /**
             * Calculates inventory turnover rate
             * @param {Array} products - Array of product objects
             * @param {Array} sales - Array of sale objects
             * @param {number} periodDays - Number of days to analyze (default: 365)
             * @returns {number} Inventory turnover rate
             */
            export function calculateInventoryTurnover(products, sales, periodDays = 365) {
                if (!Array.isArray(products) || products.length === 0) return 0;
                if (!Array.isArray(sales) || sales.length === 0) return 0;
                
                const totalInventoryValue = getTotalInventoryValue(products);
                const activeProductCount = products.filter(p => !p.archived).length;
                const avgInventory = activeProductCount > 0
                    ? totalInventoryValue / activeProductCount
                    : 0;
                
                const startDate = new Date();
                startDate.setHours(0, 0, 0, 0);
                startDate.setDate(startDate.getDate() - periodDays);
                
                const periodSales = sales.filter(sale => {
                    const saleDate = new Date(sale.rawTimestamp || sale.date);
                    saleDate.setHours(0, 0, 0, 0);
                    return saleDate >= startDate;
                });
                
                const totalSalesRevenue = periodSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
                
                return avgInventory > 0 ? totalSalesRevenue / avgInventory : 0;
            }

            // ========== SALES ANALYTICS ==========
            /**
             * Calculates top selling products
             * @param {Array} sales - Array of sale objects
             * @param {number} limit - Number of products to return
             * @returns {Array} Top selling products
             */
            export function calculateTopSellingProducts(
                sales,
                limit = 5
            ) {
                const productSalesMap = {};

                for (let i = 0; i < sales.length; i++) {
                    const sale = sales[i];

                    if (!sale.items) {
                        continue;
                    }

                    for (let j = 0; j < sale.items.length; j++) {
                        const item = sale.items[j];
                        const productId = item.productId || item.id;
                        const productName = item.productName;
                        const quantity = item.quantity || 0;
                        const price = item.price || 0;

                        if (!productId || !productName) {
                            continue;
                        }

                        if (!productSalesMap[productId]) {
                            productSalesMap[productId] = {
                                id: productId,
                                name: productName,
                                quantity: 0,
                                revenue: 0
                            };
                        }

                        productSalesMap[productId].quantity += quantity;
                        productSalesMap[productId].revenue += price * quantity;
                    }
                }

                return Object.values(productSalesMap)
                    .sort((a, b) => b.quantity - a.quantity)
                    .slice(0, limit);
            }