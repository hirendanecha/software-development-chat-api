"use strict";

const mysql = require("mysql2");
const environment = require("../src/environments/environment");

const db = mysql.createConnection({
  host: environment.DB_HOST,
  user: environment.DB_USER,
  password: environment.DB_PASS,
  database: environment.DB_NAME,
});

db.connect(function (err) {
  if (err) throw err;
  console.log("Database connected");
});

function keepAlive() {
  db.query("SELECT 1", (err) => {
    if (err) throw err;
  });
}
setInterval(keepAlive, 30000);

module.exports = db;
