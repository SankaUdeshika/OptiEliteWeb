const getAppDb = require("../db/appDb");

const addPrescription = async (req, res) => {
  const db = getAppDb(req.session.user.db_name);
  const { customerName, customerMobile, date, doctor, notes, right, left } =
    req.body;


  db.query(
    "INSERT INTO `prescription_details` (`L_SPH`,`L_Addition`,`L_DVA`,`L_NVA`,`L_M_PD`,`L_HEIGHT`,`customer_mobile`,`users_id`,`R_DVA`,`R_NVA`,`R_M_PD`,`R_SPH`,`R_Addition`,`prescripiton_date`,`L_CYL`,`R_CYL`,`L_Axis`,`R_Axis`,`R_HEIGHT`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [
      left.sph,
      left.addition,
      left.dva,
      left.nva,
      left.mpd,
      left.height,
      customerMobile,
      req.session.user.id,
      right.dva,
      right.nva,
      right.mpd,
      right.sph,
      right.addition,
      date,
      left.cyl,
      right.cyl,
      left.axis,
      right.axis,
      right.height,
    ],
    (err, result) => {
      if (err) {
        console.error("Error adding prescription:", err);
        return res.status(500).json({ error: "Failed to add prescription" });
      }
      res.status(201).json({ message: "Prescription added successfully" });
    },
  );
};

module.exports = {
  addPrescription,
};
