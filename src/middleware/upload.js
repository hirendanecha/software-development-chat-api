// const util = require("util");
// const multer = require("multer");
// const path = require("path");
// const maxSize = 0.1 * 1024 * 1024;
// const fs = require("fs");

// const folderName = path.join(__dirname, "../uploads");
// if (!fs.existsSync(folderName)) {
//   fs.mkdirSync(folderName);
// }

// let storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null,"uploads");
//   },
//   filename: (req, file, cb) => {
//     console.log(file.originalname);
//     cb(null, file.originalname);
//   },
// });

// let uploadFile = multer({
//   storage: storage,
//   // limits: { fileSize: maxSize },
// }).single("file");

// let uploadFileMiddleware = util.promisify(uploadFile);

// module.exports = uploadFileMiddleware;

const multer = require("multer");
const fs = require("fs");
var path = require("path");

const mimeTypes = (mediaType) => {
  switch (mediaType) {
    case "image":
      return [
        "image/bmp",
        "image/gif",
        "image/ief",
        "image/jpeg",
        "image/pipeg",
        "image/tiff",
        "image/svg+xml",
        "image/png",
        "image/ico",
      ];
    case "audio":
      return [
        "audio/basic",
        "audio/mid",
        "audio/mpeg",
        "audio/mp3",
        "audio/x-mpegurl",
        "audio/x-pn-realaudio",
        "audio/x-wav",
        "audio/x-pn-realaudio",
        "audio/x-aiff",
      ];
    case "video":
      return [
        "video/mpeg",
        "video/mp4",
        "video/quicktime",
        "video/x-la-asf",
        "video/x-ms-asf",
        "video/x-msvideo",
        "video/x-sgi-movie",
      ];
    case "pdf":
      return ["application/pdf"];
    case "csv":
      return ["application/vnd.ms-excel", "text/csv"];
    case "text":
      return ["text/plain"];

    default:
      return [];
  }
};

const fileFilter = (mimeTypeArray) => {
  const allowedMimes = mimeTypeArray.map((m) => mimeTypes(m));
  return (req, file, cb) => {
    if ([].concat.apply([], allowedMimes).includes(file.mimetype)) {
      cb(null, true);
    } else {
      req.fileValidationError = "invalid mime type";
      cb(null, false, new Error("invalid mime type"));
    }
  };
};

const folderName = path.join(__dirname, "../uploads");
if (!fs.existsSync(folderName)) {
  fs.mkdirSync(folderName);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, folderName);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const uploadFileMiddleware = multer({ storage: storage });
module.exports = uploadFileMiddleware;
//====================
