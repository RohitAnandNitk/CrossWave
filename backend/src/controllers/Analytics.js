
import { Product } from "../models/product.model.js";
import prisma from "../config/prisma_db.js";

// Get seller analytics
export const getSellerAnalytics =  async (req, res) => {
  try {
    const sellerId = req.id;
    const { period } = req.query; // Get the selected period from the frontend

    // Calculate date range based on period
    const today = new Date();
    let startDate = new Date();

    if (period === "30days") {
      startDate.setDate(today.getDate() - 29);
    } else if (period === "90days") {
      startDate.setDate(today.getDate() - 89);
    } else {
      startDate.setDate(today.getDate() - 6); // Default to 7 days
    }

    // Fetch total products for the seller
    const totalProducts = await Product.countDocuments({ seller_id: sellerId });

    // Fetch total orders for the seller
    const totalOrders = await prisma.order.count({
      where: { seller_id: sellerId },
      where: { seller_id: sellerId },
    });

    // Fetch total revenue from delivered orders
    const totalRevenue = await prisma.order.aggregate({
      _sum: { price: true },
      where: { seller_id: sellerId, status: "DELIVERED" },
    });

    // Fetch active shipments (Processing or Shipped)
    const activeShipments = await prisma.order.count({
      where: { seller_id: sellerId, status: { in: ["PROCESSING", "SHIPPED"] } },
      where: { seller_id: sellerId, status: { in: ["PROCESSING", "SHIPPED"] } },
    });

    // Fetch orders per day for the selected period
    const rawOrdersPerDay = await prisma.$queryRaw`
      SELECT DATE(created_at) as date, COUNT(id) as count 
      FROM "orders"
      WHERE seller_id = ${sellerId} AND created_at >= ${startDate}
      GROUP BY date
      ORDER BY date ASC;
    `;

    console.log("🔍 Raw Orders Per Day Query Result:", rawOrdersPerDay);

    // Convert query result into a map for fast lookup
    const ordersMap = new Map(rawOrdersPerDay.map(order => [order.date.toISOString().split("T")[0], order.count]));

    // Generate all days dynamically
    const ordersPerDay = [];
    for (let i = 0; i <= (today - startDate) / (1000 * 60 * 60 * 24); i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateString = date.toISOString().split("T")[0];

      ordersPerDay.push({ date: dateString, count: Number(ordersMap.get(dateString) || 0) });
    }

    console.log("📊 Final Orders Per Day:", ordersPerDay);

    // Fetch product category count
    const productCategories = await Product.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    res.json({
      totalProducts,
      totalOrders,
      totalRevenue: String(totalRevenue._sum.price) || 0,
      activeShipments,
      ordersPerDay,
      ordersPerDay,
      productCategories,
    });

  } catch (error) {
    console.error("❌ Error in getSellerAnalytics:", "❌ Error in getSellerAnalytics:", error);
    res.status(500).json({ message: "Server Error" });
  }
};






export const getBuyerAnalytics = async (req, res) => {
  try {
    const buyerId = req.id;
    const currentYear = new Date().getFullYear();

    // ✅ Active orders (Accepted)
    const activeOrders = await prisma.order.count({
      where: { buyer_id: buyerId, status: "PROCESSING" }
    });

    // ✅ Pending RFCs (Fix status to match enum)
    const pendingRFCs = await prisma.order.count({
      where: { buyer_id: buyerId, status: "PENDING" }
    });

    // ✅ In-transit orders (shipped but not delivered)
    const inTransitOrders = await prisma.order.count({
      where: { buyer_id: buyerId, status: "SHIPPED" }
    });

    // ✅ Total spend (sum of prices of all completed orders)
    const totalSpend = await prisma.order.aggregate({
      _sum: { price: true },
      where: { buyer_id: buyerId, status: "DELIVERED" },
    });

    // ✅ Purchase volume by month (Fix Prisma `groupBy` issue with raw SQL)
    const purchaseVolume = await prisma.$queryRaw`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month, SUM(quantity) as quantity
      FROM "orders"
      WHERE buyer_id = ${buyerId} AND created_at >= ${new Date(`${currentYear}-01-01`)}
      GROUP BY month
      ORDER BY month ASC;
    `;

    // ✅ Fetch product categories correctly
    const productIds = await prisma.order.findMany({
      where: { buyer_id: buyerId },
      select: { product_id: true }
    });

    const productCategories = await Product.aggregate([
      { $match: { _id: { $in: productIds.map(p => new ObjectId(p.product_id)) } } }, // ✅ Convert IDs to ObjectId
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    res.json({
      activeOrders,
      pendingRFCs,
      inTransitOrders,
      totalSpend: totalSpend._sum.price || 0,
      purchaseVolume: purchaseVolume.map(order => ({
        month: order.month,
        quantity: order.quantity,
      })),
      productCategories,
    });

  } catch (error) {
    console.error("❌ Error in getBuyerAnalytics:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
