// controllers/reportController.js

const getAppDb = require("../db/appDb");

/**
 * Helper function to safely get database connection from session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object|null} Database connection or null if failed
 */
function getDbConnection(req, res) {
    try {
        // Check if session exists
        if (!req.session) {
            console.error('No session found in request');
            return null;
        }
        
        // Check if user exists in session
        if (!req.session.user) {
            console.error('No user found in session');
            return null;
        }
        
        // Check if db_name exists
        const dbName = req.session.user.db_name;
        if (!dbName) {
            console.error('db_name not found in session user');
            return null;
        }
        
        console.log(`Connecting to database: ${dbName}`);
        return getAppDb(dbName);
    } catch (error) {
        console.error('Error getting database connection:', error);
        return null;
    }
}

/**
 * Get monthly report summary
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getMonthlySummary = async (req, res) => {
    const db = getDbConnection(req, res);
    
    if (!db) {
        return res.status(401).json({
            success: false,
            error: "Session expired or database not configured. Please login again."
        });
    }
    
    try {
        const { yearMonth } = req.query;

        if (!yearMonth) {
            return res.status(400).json({
                success: false,
                error: "yearMonth parameter is required (format: YYYY-MM)",
            });
        }

        const [year, month] = yearMonth.split("-");
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month}-${lastDay}`;

        // 1) Total Sales
        const salesResult = await new Promise((resolve, reject) => {
            db.query(
                `SELECT COALESCE(SUM(subtotal), 0) as totalSales 
                FROM invoice 
                WHERE DATE(date) BETWEEN ? AND ? 
                AND JobType_job_id = 1`,
                [startDate, endDate],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });

        const totalSales = parseFloat(salesResult[0]?.totalSales) || 0;

        // 2) Total Orders count
        const ordersResult = await new Promise((resolve, reject) => {
            db.query(
                `SELECT COUNT(*) as orderCount 
                FROM invoice 
                WHERE DATE(date) BETWEEN ? AND ? 
                AND JobType_job_id = 1`,
                [startDate, endDate],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });

        const totalOrdersCount = ordersResult[0]?.orderCount || 0;

        // 3) Total Cash Collection
        const collectionResult = await new Promise((resolve, reject) => {
            db.query(
                `SELECT COALESCE(SUM(paid_amount), 0) as totalCollected
                FROM advance_payment_history
                WHERE DATE(date) BETWEEN ? AND ?`,
                [startDate, endDate],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });

        const totalCashCollected = parseFloat(collectionResult[0]?.totalCollected) || 0;

        res.json({
            success: true,
            totalSales,
            totalOrdersCount,
            totalCashCollected,
            differenceVsSales: totalCashCollected - totalSales,
        });
    } catch (error) {
        console.error("Error in getMonthlySummary:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Internal server error",
        });
    } finally {
        if (db) db.end();
    }
};

/**
 * Get payment method breakdown for monthly report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getPaymentBreakdown = async (req, res) => {
    const db = getDbConnection(req, res);
    
    if (!db) {
        return res.status(401).json({
            success: false,
            error: "Session expired. Please login again."
        });
    }
    
    try {
        const { yearMonth } = req.query;

        if (!yearMonth) {
            return res.status(400).json({
                success: false,
                error: "yearMonth parameter is required",
            });
        }

        const [year, month] = yearMonth.split("-");
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month}-${lastDay}`;

        const results = await new Promise((resolve, reject) => {
            db.query(
                `SELECT 
                    pm.payment_name AS payment_method_name,
                    COALESCE(SUM(aph.paid_amount), 0) AS total_amount,
                    COUNT(DISTINCT aph.idadvance_payment_history) AS transaction_count,
                    COUNT(DISTINCT aph.invoice_invoice_id) AS invoice_count
                FROM advance_payment_history aph
                INNER JOIN payment_method pm ON aph.payment_method = pm.Payment_id
                WHERE DATE(aph.date) BETWEEN ? AND ?
                GROUP BY pm.Payment_id, pm.payment_name
                ORDER BY total_amount DESC`,
                [startDate, endDate],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });

        res.json({
            success: true,
            data: results,
        });
    } catch (error) {
        console.error("Error in getPaymentBreakdown:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Internal server error",
        });
    } finally {
        if (db) db.end();
    }
};

/**
 * Get daily trend (sales vs collection)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDailyTrend = async (req, res) => {
    const db = getDbConnection(req, res);
    
    if (!db) {
        return res.status(401).json({
            success: false,
            error: "Session expired. Please login again."
        });
    }
    
    try {
        const { yearMonth } = req.query;

        if (!yearMonth) {
            return res.status(400).json({
                success: false,
                error: "yearMonth parameter is required",
            });
        }

        const [year, month] = yearMonth.split("-");
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month}-${lastDay}`;

        // Daily sales from invoice table
        const dailySales = await new Promise((resolve, reject) => {
            db.query(
                `SELECT 
                    DATE(date) as transaction_date,
                    COALESCE(SUM(subtotal), 0) as sales_amount,
                    COUNT(*) as invoice_count
                FROM invoice
                WHERE DATE(date) BETWEEN ? AND ? 
                AND JobType_job_id = 1
                GROUP BY DATE(date)
                ORDER BY transaction_date`,
                [startDate, endDate],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });

        // Daily collection from advance_payment_history
        const dailyCollection = await new Promise((resolve, reject) => {
            db.query(
                `SELECT 
                    DATE(date) as transaction_date,
                    COALESCE(SUM(paid_amount), 0) as collected_amount,
                    COUNT(*) as payment_count
                FROM advance_payment_history
                WHERE DATE(date) BETWEEN ? AND ?
                GROUP BY DATE(date)
                ORDER BY transaction_date`,
                [startDate, endDate],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });

        // Merge both datasets
        const dateMap = new Map();

        dailySales.forEach((sale) => {
            let dateStr = sale.transaction_date;
            if (sale.transaction_date instanceof Date) {
                dateStr = sale.transaction_date.toISOString().split("T")[0];
            }
            dateMap.set(dateStr, {
                transaction_date: dateStr,
                sales_amount: parseFloat(sale.sales_amount) || 0,
                invoice_count: sale.invoice_count,
                collected_amount: 0,
                payment_count: 0,
            });
        });

        dailyCollection.forEach((collection) => {
            let dateStr = collection.transaction_date;
            if (collection.transaction_date instanceof Date) {
                dateStr = collection.transaction_date.toISOString().split("T")[0];
            }
            if (dateMap.has(dateStr)) {
                const existing = dateMap.get(dateStr);
                existing.collected_amount = parseFloat(collection.collected_amount) || 0;
                existing.payment_count = collection.payment_count;
            } else {
                dateMap.set(dateStr, {
                    transaction_date: dateStr,
                    sales_amount: 0,
                    invoice_count: 0,
                    collected_amount: parseFloat(collection.collected_amount) || 0,
                    payment_count: collection.payment_count,
                });
            }
        });

        const result = Array.from(dateMap.values()).sort(
            (a, b) => new Date(a.transaction_date) - new Date(b.transaction_date)
        );

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error("Error in getDailyTrend:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Internal server error",
        });
    } finally {
        if (db) db.end();
    }
};

/**
 * Get branch-wise breakdown for monthly report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getBranchBreakdown = async (req, res) => {
    const db = getDbConnection(req, res);
    
    if (!db) {
        return res.status(401).json({
            success: false,
            error: "Session expired. Please login again."
        });
    }
    
    try {
        const { yearMonth } = req.query;

        if (!yearMonth) {
            return res.status(400).json({
                success: false,
                error: "yearMonth parameter is required",
            });
        }

        const [year, month] = yearMonth.split("-");
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month}-${lastDay}`;

        const results = await new Promise((resolve, reject) => {
            db.query(
                `SELECT 
                    l.id as location_id,
                    l.location_name,
                    l.branch_name,
                    COUNT(DISTINCT i.invoice_id) as total_orders,
                    COALESCE(SUM(i.subtotal), 0) as total_sales,
                    COALESCE(SUM(aph.paid_amount), 0) as total_collection,
                    COUNT(DISTINCT c.mobile) as unique_customers
                FROM location l
                LEFT JOIN invoice i ON i.invoice_location = l.id 
                    AND DATE(i.date) BETWEEN ? AND ?
                    AND i.JobType_job_id = 1
                LEFT JOIN advance_payment_history aph ON aph.invoice_invoice_id = i.invoice_id
                    AND DATE(aph.date) BETWEEN ? AND ?
                LEFT JOIN customer c ON c.mobile = i.customer_mobile
                GROUP BY l.id, l.location_name, l.branch_name
                ORDER BY total_sales DESC`,
                [startDate, endDate, startDate, endDate],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });

        res.json({
            success: true,
            data: results,
        });
    } catch (error) {
        console.error("Error in getBranchBreakdown:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Internal server error",
        });
    } finally {
        if (db) db.end();
    }
};

/**
 * Get complete monthly report with all metrics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCompleteMonthlyReport = async (req, res) => {
    const db = getDbConnection(req, res);
    
    if (!db) {
        return res.status(401).json({
            success: false,
            error: "Session expired. Please login again."
        });
    }
    
    try {
        const { yearMonth } = req.query;

        if (!yearMonth) {
            return res.status(400).json({
                success: false,
                error: "yearMonth parameter is required (format: YYYY-MM)",
            });
        }

        const [year, month] = yearMonth.split("-");
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month}-${lastDay}`;

        // Execute all queries in parallel
        const [
            salesResult,
            ordersResult,
            collectionResult,
            paymentBreakdown,
            branchBreakdown,
            dailyTrend,
            pendingInvoices
        ] = await Promise.all([
            // Total Sales
            new Promise((resolve, reject) => {
                db.query(
                    `SELECT COALESCE(SUM(subtotal), 0) as totalSales 
                    FROM invoice 
                    WHERE DATE(date) BETWEEN ? AND ? 
                    AND JobType_job_id = 1`,
                    [startDate, endDate],
                    (err, results) => {
                        if (err) reject(err);
                        else resolve(results);
                    }
                );
            }),
            
            // Total Orders
            new Promise((resolve, reject) => {
                db.query(
                    `SELECT COUNT(*) as orderCount 
                    FROM invoice 
                    WHERE DATE(date) BETWEEN ? AND ? 
                    AND JobType_job_id = 1`,
                    [startDate, endDate],
                    (err, results) => {
                        if (err) reject(err);
                        else resolve(results);
                    }
                );
            }),
            
            // Total Collection
            new Promise((resolve, reject) => {
                db.query(
                    `SELECT COALESCE(SUM(paid_amount), 0) as totalCollected
                    FROM advance_payment_history
                    WHERE DATE(date) BETWEEN ? AND ?`,
                    [startDate, endDate],
                    (err, results) => {
                        if (err) reject(err);
                        else resolve(results);
                    }
                );
            }),
            
            // Payment Breakdown
            new Promise((resolve, reject) => {
                db.query(
                    `SELECT 
                        pm.payment_name AS payment_method_name,
                        COALESCE(SUM(aph.paid_amount), 0) AS total_amount,
                        COUNT(DISTINCT aph.invoice_invoice_id) AS invoice_count
                    FROM advance_payment_history aph
                    INNER JOIN payment_method pm ON aph.payment_method = pm.Payment_id
                    WHERE DATE(aph.date) BETWEEN ? AND ?
                    GROUP BY pm.Payment_id, pm.payment_name
                    ORDER BY total_amount DESC`,
                    [startDate, endDate],
                    (err, results) => {
                        if (err) reject(err);
                        else resolve(results);
                    }
                );
            }),
            
            // Branch Breakdown
            new Promise((resolve, reject) => {
                db.query(
                    `SELECT 
                        l.location_name,
                        l.branch_name,
                        COUNT(DISTINCT i.invoice_id) as total_orders,
                        COALESCE(SUM(i.subtotal), 0) as total_sales,
                        COALESCE(SUM(aph.paid_amount), 0) as total_collection
                    FROM location l
                    LEFT JOIN invoice i ON i.invoice_location = l.id 
                        AND DATE(i.date) BETWEEN ? AND ?
                        AND i.JobType_job_id = 1
                    LEFT JOIN advance_payment_history aph ON aph.invoice_invoice_id = i.invoice_id
                        AND DATE(aph.date) BETWEEN ? AND ?
                    GROUP BY l.id, l.location_name, l.branch_name
                    ORDER BY total_sales DESC`,
                    [startDate, endDate, startDate, endDate],
                    (err, results) => {
                        if (err) reject(err);
                        else resolve(results);
                    }
                );
            }),
            
            // Daily Trend
            new Promise((resolve, reject) => {
                db.query(
                    `SELECT 
                        DATE(i.date) as transaction_date,
                        COALESCE(SUM(i.subtotal), 0) as sales_amount,
                        COUNT(DISTINCT i.invoice_id) as invoice_count,
                        (
                            SELECT COALESCE(SUM(paid_amount), 0)
                            FROM advance_payment_history aph2
                            WHERE DATE(aph2.date) = DATE(i.date)
                        ) as collected_amount
                    FROM invoice i
                    WHERE DATE(i.date) BETWEEN ? AND ? 
                    AND i.JobType_job_id = 1
                    GROUP BY DATE(i.date)
                    ORDER BY transaction_date`,
                    [startDate, endDate],
                    (err, results) => {
                        if (err) reject(err);
                        else resolve(results);
                    }
                );
            }),
            
            // Pending Invoices
            new Promise((resolve, reject) => {
                db.query(
                    `SELECT 
                        i.invoice_id,
                        i.subtotal as total_price,
                        COALESCE(SUM(aph.paid_amount), 0) as paid_amount,
                        (i.subtotal - COALESCE(SUM(aph.paid_amount), 0)) as pending_amount,
                        c.name as customer_name,
                        c.mobile
                    FROM invoice i
                    LEFT JOIN advance_payment_history aph ON aph.invoice_invoice_id = i.invoice_id
                    LEFT JOIN customer c ON c.mobile = i.customer_mobile
                    WHERE DATE(i.date) BETWEEN ? AND ?
                    AND i.JobType_job_id = 1
                    AND i.payment_status_id = 1
                    GROUP BY i.invoice_id, i.subtotal, c.name, c.mobile
                    HAVING pending_amount > 0
                    ORDER BY pending_amount DESC
                    LIMIT 20`,
                    [startDate, endDate],
                    (err, results) => {
                        if (err) reject(err);
                        else resolve(results);
                    }
                );
            })
        ]);

        const totalSales = parseFloat(salesResult[0]?.totalSales) || 0;
        const totalOrdersCount = ordersResult[0]?.orderCount || 0;
        const totalCashCollected = parseFloat(collectionResult[0]?.totalCollected) || 0;

        res.json({
            success: true,
            data: {
                summary: {
                    totalSales,
                    totalOrdersCount,
                    totalCashCollected,
                    averageOrderValue: totalOrdersCount > 0 ? totalSales / totalOrdersCount : 0,
                    collectionRate: totalSales > 0 ? (totalCashCollected / totalSales) * 100 : 0,
                    pendingAmount: totalSales - totalCashCollected,
                    variance: totalCashCollected - totalSales,
                    variancePercentage: totalSales > 0 ? ((totalCashCollected - totalSales) / totalSales) * 100 : 0
                },
                paymentBreakdown: paymentBreakdown,
                branchBreakdown: branchBreakdown,
                dailyTrend: dailyTrend,
                pendingInvoices: pendingInvoices
            },
        });
    } catch (error) {
        console.error("Error in getCompleteMonthlyReport:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Internal server error",
        });
    } finally {
        if (db) db.end();
    }
};

/**
 * Export monthly report to CSV
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.exportMonthlyReport = async (req, res) => {
    const db = getDbConnection(req, res);
    
    if (!db) {
        return res.status(401).json({
            success: false,
            error: "Session expired. Please login again."
        });
    }
    
    try {
        const { yearMonth, format = "csv" } = req.query;

        if (!yearMonth) {
            return res.status(400).json({
                success: false,
                error: "yearMonth parameter is required",
            });
        }

        const [year, month] = yearMonth.split("-");
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month}-${lastDay}`;

        const invoices = await new Promise((resolve, reject) => {
            db.query(
                `SELECT 
                    i.invoice_id,
                    i.date as invoice_date,
                    c.name as customer_name,
                    c.mobile,
                    i.total_price,
                    COALESCE(SUM(aph.paid_amount), 0) as paid_amount,
                    (i.total_price - COALESCE(SUM(aph.paid_amount), 0)) as pending_amount,
                    i.payment_status_id,
                    ps.status_name as payment_status,
                    l.branch_name,
                    l.location_name
                FROM invoice i
                LEFT JOIN customer c ON c.mobile = i.customer_mobile
                LEFT JOIN advance_payment_history aph ON aph.invoice_invoice_id = i.invoice_id
                LEFT JOIN payment_status ps ON ps.id = i.payment_status_id
                LEFT JOIN location l ON l.id = i.invoice_location
                WHERE DATE(i.date) BETWEEN ? AND ?
                AND i.JobType_job_id = 1
                GROUP BY i.invoice_id, i.date, c.name, c.mobile, i.total_price, 
                         i.payment_status_id, ps.status_name, l.branch_name, l.location_name
                ORDER BY i.date DESC`,
                [startDate, endDate],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });

        if (format === "csv") {
            // Set CSV headers
            res.setHeader("Content-Type", "text/csv");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename=monthly_report_${yearMonth}.csv`,
            );

            // Create CSV content
            const headers = [
                "Invoice ID",
                "Date",
                "Customer Name",
                "Mobile",
                "Total Amount",
                "Paid Amount",
                "Pending Amount",
                "Payment Status",
                "Branch",
            ];
            const csvRows = [headers];

            invoices.forEach((inv) => {
                csvRows.push([
                    inv.invoice_id,
                    inv.invoice_date,
                    `"${(inv.customer_name || "N/A").replace(/"/g, '""')}"`,
                    inv.mobile || "N/A",
                    inv.total_price,
                    inv.paid_amount,
                    inv.pending_amount,
                    inv.payment_status || "Unknown",
                    `"${(inv.branch_name || inv.location_name || "N/A").replace(/"/g, '""')}"`,
                ]);
            });

            const csvContent = csvRows.map((row) => row.join(",")).join("\n");
            res.send(csvContent);
        } else {
            res.json({
                success: true,
                data: invoices,
            });
        }
    } catch (error) {
        console.error("Error in exportMonthlyReport:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Internal server error",
        });
    } finally {
        if (db) db.end();
    }
};