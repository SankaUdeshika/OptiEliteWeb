const { error, Console } = require("console");
const db = require("../db/db");
const path = require("path");
const { rejects } = require("assert");
const { json } = require("stream/consumers");
const session = require("express-session");

const getCustomerbyMobile = async (req, res) => {
    const NameOrMobile = req.body.mobileOrName;
    const result = await new Promise((promise, reject) => {
        db.query(
            "SELECT * FROM `customer` WHERE `mobile` LIKE ? OR `name` LIKE ?",
            [`%${NameOrMobile}%`, `%${NameOrMobile}%`],
            (err, result) => {
                if (err) {
                    console.error("Error fetching customer by mobile:", err);
                    return reject(err);
                }
                promise(result);
            }
        );
    });

    if (result.length === 0) {
        res.json(result);
    } else {
        console.log(result);
        res.json(result);
    }

};

const getAllCustomer = async (req, res) => {

    const result = await new Promise((promise, reject) => {
        db.query("SELECT * FROM `customer` INNER JOIN `location` ON `customer`.`location_id` = `location`.`id` INNER JOIN `gender` ON `customer`.`gender_gender_id` = `gender`.`gender_id`", (err, result) => {
            if (err) {
                console.error("Error fetching all customers:", err);
                return reject(err);
            }
            promise(result);
        });
    });
    console.log(result);
    res.json(result);
};

module.exports = {
  getCustomerbyMobile,
  getAllCustomer,
};
