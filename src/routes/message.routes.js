const express = require("express");
const router = express.Router();
const messagesController = require("../controllers/message.controller");
const authorize = require("../middleware/authorize");

router.use(authorize.authorization);
router.post("/", messagesController.getMessages);
router.get("/get-room/:id", messagesController.getRoom);
router.get("/get-group/:id", messagesController.getGroup);
router.get("/get-members/:id", messagesController.getMembers);
router.post("/get-media", messagesController.getMedia);

module.exports = router;
