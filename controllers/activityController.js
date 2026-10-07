const getAppDb = require("../db/appDb");
const path = require("path");

const runQuery = (db, sql, params) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)));
  });

// Page (session protected, same pattern as ViewBill)
const ActivityPage = (req, res) => {
  if (req.session.username) {
    res.sendFile(path.join(__dirname, "../public/notification/activity.html"));
  } else {
    res.redirect("/login");
  }
};

// API: GET /api/activity/list?priority=&dateFrom=&dateTo=&search=&page=&pageSize=
const fetchActivities = async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Not logged in" });

  const db = getAppDb(req.session.user.db_name);

  const { priority, dateFrom, dateTo, search } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize) || 20, 1), 100);
  const offset = (page - 1) * pageSize;

  const where = [];
  const params = [];

  if (priority && [1, 2, 3].includes(parseInt(priority))) {
    where.push("`al`.`activity_priority_id` = ?");
    params.push(parseInt(priority));
  }

  if (dateFrom) {
    where.push("`al`.`date` >= ?");
    params.push(dateFrom);
  }
  if (dateTo) {
    where.push("`al`.`date` <= ?");
    params.push(dateTo);
  }

  if (search && search.trim()) {
    const like = `%${search.trim()}%`;
    where.push(
      "(`al`.`log_text` LIKE ? OR `u`.`fname` LIKE ? OR `u`.`lname` LIKE ? " +
        "OR `u`.`username` LIKE ? OR CONCAT(`u`.`fname`, ' ', `u`.`lname`) LIKE ?)"
    );
    params.push(like, like, like, like, like);
  }

  const whereSql = where.length ? "WHERE " + where.join(" AND ") + " " : "";

  const fromSql =
    "FROM `activity_log` `al` " +
    "INNER JOIN `users` `u` ON `u`.`id` = `al`.`users_id` " +
    "INNER JOIN `activity_priority` `ap` ON `ap`.`id` = `al`.`activity_priority_id` " +
    "LEFT JOIN `user_type` `ut` ON `ut`.`id` = `u`.`user_type_id` " +
    "LEFT JOIN `location` `l` ON `l`.`id` = `u`.`location_id` ";

  try {
    const countRows = await runQuery(
      db,
      "SELECT COUNT(*) AS total " + fromSql + whereSql,
      params
    );

    const rows = await runQuery(
      db,
      "SELECT `al`.`log_id`, `al`.`log_text`, " +
        "DATE_FORMAT(`al`.`date`, '%Y-%m-%d') AS `date`, " +
        "`al`.`activity_priority_id`, `ap`.`priority`, " +
        "`u`.`id` AS `user_id`, `u`.`fname`, `u`.`lname`, `u`.`username`, " +
        "`ut`.`Type` AS `user_type`, `l`.`location_name` " +
        fromSql +
        whereSql +
        "ORDER BY `al`.`date` DESC, `al`.`log_id` DESC " +
        "LIMIT ? OFFSET ?",
      [...params, pageSize, offset]
    );

    res.json({
      rows,
      total: countRows[0].total,
      page,
      pageSize,
    });
  } catch (err) {
    console.error("Error fetching activities:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    db.end();
  }
};

module.exports = { ActivityPage, fetchActivities };