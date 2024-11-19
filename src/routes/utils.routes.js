const express = require("express");
const router = express.Router();
const utilsController = require("../controllers/utils.controller");
const uploadFileMiddleware = require("../middleware/upload");

router.post(
  "/image-upload",
  uploadFileMiddleware.single("file"),
  utilsController.uploadVideo
);
router.get("/files/:folder/:id", utilsController.getFiles); 
router.get("/:folder/:id/:filename", utilsController.readFile);
router.post("/upload", utilsController.fileupload);
// router.post("/upload2", utilsController.fileupload2);
router.get("/download/partner/:name", utilsController.downloadPartner);
router.get("/download/:folder/:id/:name", utilsController.download);

module.exports = router;
