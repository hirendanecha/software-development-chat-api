const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const profileController = require("./../controllers/profile.controller");
const authorize = require("../middleware/authorize");

router.post("/register", userController.create);
router.post("/profile", profileController.create);
router.post("/get-meta", userController.getMeta);
router.get("/user/verification/:token", userController.verification);
router.get("/countries", userController.getZipCountries);
router.get("/zip/:zip", userController.getZipData);
router.get("/profile/:id", profileController.FindProfileById);
router.get("/verify-token/:token", userController.verifyToken);
router.post("/forgot-password", userController.forgotPassword);
router.get("/states", userController.getStats);
router.use(authorize.authorization);
router.get("/create-admin/:id", userController.createAdmin);
router.post("/", userController.findAll);
router.get("/get", userController.getAll);
router.get("/logout", userController.logout);
router.get("/change-status/:id", userController.changeActiveStatus);
router.get("/suspend-user/:id", userController.userSuspend);
router.get("/activate-media/:id", userController.activateMedia);
router.get("/change-user-type/:id", userController.changeAccountType);
router.post("/get-emails", userController.getEmail);
router.post("/get-notification/:id", profileController.getNotificationById);
// router.post("/", userController.login);
router.post("/set-password", userController.setPassword);
router.get("/search-user", profileController.getUsersByUsername);
router.get("/:id", userController.findById);
router.put("/onOff-notification", profileController.editNotificationSound);
router.put("/:id", userController.update);
router.put("/profile/:id", profileController.updateProfile);
router.get("/notification/:id", profileController.getNotification);
router.post("/user/verification/resend", userController.resendVerification);
router.get("/edit-notification/:id", profileController.editNotifications);
router.get("/read-all-notification/:id", profileController.readAllNotifications);
router.delete("/:id", userController.delete);
router.delete("/notification/:id", profileController.deleteNotification);
router.delete(
  "/delete-all-notification/:id",
  profileController.deleteAllNotification
);

module.exports = router;
