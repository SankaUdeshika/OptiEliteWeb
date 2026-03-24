const { response } = require("express");
const getAppDb = require("../db/appDb");

const addPrescription = async (req, res) => {
  const db = getAppDb(req.session.user.db_name);
  const { customerName, customerMobile, date, doctor, notes, right, left } =
    req.body;

  db.query(
    "INSERT INTO `prescription_details` (`L_SPH`,`L_Addition`,`L_DVA`,`L_NVA`,`L_M_PD`,`L_HEIGHT`,`customer_mobile`,`users_id`,`R_DVA`,`R_NVA`,`R_M_PD`,`R_SPH`,`R_Addition`,`prescripiton_date`,`L_CYL`,`R_CYL`,`L_Axis`,`R_Axis`,`R_HEIGHT`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [
      left.sph,
      left.add,
      left.dva,
      left.nva,
      left.pd,
      left.height,
      customerMobile,
      req.session.user.id,
      right.dva,
      right.nva,
      right.pd,
      right.sph,
      right.add,
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

const viewPrescriptionDetails = async (req, res) => {
  const p_id = req.params.id;
  const responseObject = {};

  if (p_id == null) {
    return res.status(400).json({ error: "Prescription ID is required" });
  }

  console.log(p_id);
  const db = getAppDb(req.session.user.db_name);

  try {
    const result = await new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM `prescription_details` INNER JOIN `users` ON `prescription_details`.`users_id` = `users`.`id` INNER JOIN `customer` ON `prescription_details`.`customer_mobile` = `customer`.`mobile` INNER JOIN `location` ON `location`.`id`  = `customer`.`location_id`  LEFT JOIN `invoice` ON `invoice`.`prescription_details_job_no` = `prescription_details`.`job_no`  WHERE job_no = ?",
        [p_id],
        (err, result) => {
          db.end();
          if (err) return reject(err);
          resolve(result);
        },
      );
    });
    if (result.length === 0) {
      return res.status(404).json({ error: "Prescription not found" });
    }

    if (result[0].invoice_id) {
    }

    console.log("address Line :"+result[0].branch_address);

    responseObject.prescription = {
      job_no: result[0].job_no,
      date: new Date(result[0].prescripiton_date).toLocaleDateString(),
      operator: result[0].fname + " " + result[0].lname,
      invoice_id:
        result[0].invoice_id != null ? result[0].invoice_id : "No Invoice",
      logo_url: result[0].logo_url,
      branch_address: result[0].branch_address,
      branch_mobile1: result[0].locaiton_mobile,
      branch_mobile2: result[0].location_mobile2,

      customerName: result[0].name,
      customerMobile: result[0].mobile,
      customerMobile2 : result[0].mobile2,


      right: {
        sph: result[0].R_SPH,
        cyl: result[0].R_CYL,
        axis: result[0].R_Axis,
        dva: result[0].R_DVA,
        add: result[0].R_Addition,
        nva: result[0].R_NVA,
        pd: result[0].R_M_PD,
        height: result[0].R_HEIGHT,
      },
      left: {
        sph: result[0].L_SPH,
        cyl: result[0].L_CYL,
        axis: result[0].L_Axis,
        dva: result[0].L_DVA,
        add: result[0].L_Addition,
        nva: result[0].L_NVA,
        pd: result[0].L_M_PD,
        height: result[0].L_HEIGHT,
      },
    };
    res.json(responseObject);
  } catch (err) {
    console.error("Error fetching prescription details:", err);
    res.status(500).json({ error: "Failed to fetch prescription details" });
  }
};
module.exports = {
  addPrescription,
  getCustomerPrescriptions,
  viewPrescriptionDetails,
};
