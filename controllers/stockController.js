const { error, Console } = require("console");
const db = require("../db/db");
const path = require("path");
const { rejects } = require("assert");
const { json } = require("stream/consumers");
const session = require("express-session");

const getAllStock = async (req, res) => {
  const username = req.session.username;
  console.log("this is  username "+username);
  const userID = username.split("_");
  console.log("this is  userID "+userID[1]);
  git 
};
