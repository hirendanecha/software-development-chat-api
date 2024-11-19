"use strict";
var db = require("../../config/db.config");
const { getPagination, getPaginationData } = require("../helpers/fn");
const { executeQuery } = require("../helpers/utils");

var dashboard = function () {};

dashboard.getCount = async function () {
  const query = "select count(ID) as userCount from profile";
  const [user] = await executeQuery(query);
  const data = {
    userCount: user.userCount,
  };
  return data;
};
module.exports = dashboard;
