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

const addnewCustomer = async (req, res) => {
    console.log("addnewCustomer function called");

    const { 
        name, 
        gender,      // mapped to gender_gender_id
        location_name, // mapped to location_id
        address,     // mapped to address_line1
        mobile1,     // mapped to mobile
        mobile2, 
        landline,    // mapped to telephone_land
        birthday, 
        nic, 
        email 
    } = req.body;

    try {
        const result = await new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO customer (
                    name, 
                    gender_gender_id, 
                    location_id, 
                    address_line1, 
                    mobile, 
                    mobile2, 
                    telephone_land, 
                    birthday, 
                    nic, 
                    email,
                    register_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

            const values = [
                name, 
                gender, 
                location_name, 
                address, 
                mobile1, 
                mobile2, 
                landline, 
                birthday, 
                nic, 
                email
            ];

            db.query(sql, values, (err, result) => {
                if (err) {  
                    console.error("Error adding new customer:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });

        console.log("Customer added:", result);
        res.status(200).json({ message: "Customer added successfully", data: result });

    } catch (error) {
        res.status(500).json({ error: "Failed to insert customer", details: error.message });
    }
};

module.exports = {
  getCustomerbyMobile,
  getAllCustomer,
  addnewCustomer,
};
