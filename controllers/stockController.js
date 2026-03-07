const getAppDb = require("../db/appDb");

const getAllStock = async (req, res) => {
  try {
    const db = getAppDb(req.session.user.db_name); // ✅ moved inside

    const username = req.session.username;
    console.log("this is username " + username);

    if (!username) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const userID = username.split("_");
    console.log("this is userID " + userID[1]);

    const locationID = req.session.location_Id;
    console.log("this is locationID " + locationID);

    const query = `
      SELECT * FROM stock 
      INNER JOIN product ON product.intid = stock.product_intid 
      INNER JOIN sub_category ON sub_category.id = product.sub_category_id 
      INNER JOIN category ON category.id = sub_category.category_id 
      INNER JOIN brand ON brand.id = product.brand_id 
      INNER JOIN location ON location.id = stock.location_id  
      WHERE (category.id = 1 OR category.id = 4)  
      AND stock.location_id = ?  
      AND qty > 0
    `;

    db.query(query, [locationID], (err, result) => {
      db.end(); // ✅ always close after query
      if (err) {
        console.error("Error fetching stock:", err);
        return res.status(500).json({ error: "Database error occurred" });
      }

      if (!result || result.length === 0) {
        return res.status(404).json({
          error: "No stock data found for this location",
          locationId: locationID,
        });
      }

      console.log("Stock data found for location ID:", locationID);
      res.status(200).json(result);
    });

  } catch (error) {
    console.error("Unexpected error in getAllStock:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { getAllStock };