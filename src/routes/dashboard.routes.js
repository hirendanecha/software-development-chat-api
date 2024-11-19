const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const authorize = require("../middleware/authorize");

router.get("/",authorize.authorization, dashboardController.getCount);

module.exports = router;
