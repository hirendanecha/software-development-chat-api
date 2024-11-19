const dashboard = require("../models/dashboard.model");

exports.getCount = async function (req, res) {
  const data = await dashboard.getCount();
  res.send({ data });
};
