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

const getCustomerPrescriptions = async (req, res) => {
  const db = getAppDb(req.session.user.db_name);
  const mobile = req.body.mobile;
  console.log(mobile + " in getCustomerPrescriptions");

  db.query(
    "SELECT * FROM `prescription_details` INNER JOIN `users` ON `prescription_details`.`users_id` = `users`.`id` INNER JOIN `customer` ON `prescription_details`.`customer_mobile` = `customer`.`mobile` WHERE customer_mobile = ? ORDER BY prescripiton_date DESC",
    [mobile],
    (err, results) => {
      if (err) {
        console.error("Error fetching prescriptions:", err);
        return res.status(500).json({ error: "Failed to fetch prescriptions" });
      }

      // Bug #2 & #3 fixed: use an array, push each mapped prescription
      const prescriptions = results.map((prescription) => {
        console.log("Prescription Date:", prescription.prescripiton_date);
        return {
          job_no: prescription.job_no,
          date: new Date(prescription.prescripiton_date).toLocaleDateString(),
          operator: prescription.fname + " " + prescription.lname,
          customerName: prescription.name,
          right: {
            sph: prescription.R_SPH,
            cyl: prescription.R_CYL,
            axis: prescription.R_Axis,
            dva: prescription.R_DVA,
            add: prescription.R_Addition,
            nva: prescription.R_NVA,
            pd: prescription.R_M_PD,
            height: prescription.R_HEIGHT,
          },
          left: {
            sph: prescription.L_SPH,
            cyl: prescription.L_CYL,
            axis: prescription.L_Axis,
            dva: prescription.L_DVA,
            add: prescription.L_Addition,
            nva: prescription.L_NVA,
            pd: prescription.L_M_PD,
            height: prescription.L_HEIGHT,
          },
        };
      });

      // Bug #1 fixed: only one res.json() call
      res.json(prescriptions);
    },
  );
};

module.exports = {
  addPrescription,
  getCustomerPrescriptions,
};
