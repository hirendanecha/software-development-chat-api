var express = require("express");
var router = express.Router();

const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const utilsRoutes = require("./utils.routes");
const dashboardRouter = require("./dashboard.routes");
const messageRouter = require("./message.routes");

router.use("/login", authRoutes);
router.use("/customers", userRoutes);
router.use("/utils", utilsRoutes);
router.use("/dashboard", dashboardRouter);
router.use("/messages", messageRouter);

module.exports = router;
