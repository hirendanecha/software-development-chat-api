"use strict";

const formidable = require("formidable");
var fs = require("fs");
const path = require("path");
const utils = require("../helpers/utils");
const environment = require("../environments/environment");
const apiUrl = environment.API_URL + "utils";
const __upload_dir = environment.UPLOAD_DIR;
const s3 = require("../helpers/aws-s3.helper");

exports.fileupload = function (req, res) {
  const form = formidable({ multiples: true });
  form.parse(req, (err, fields, files) => {
    // oldpath : temporary folder to which file is saved to
    var oldpath = files.file.filepath;
    var parts = files.file.originalFilename.split(".");
    var extn = parts[parts.length - 1];
    var id = fields.id;
    var index = parts[0];
    var folder = fields.folder;
    var new_dir = __upload_dir + "/" + folder + "/" + id;
    if (!fs.existsSync(new_dir)) {
      fs.mkdirSync(new_dir, { recursive: true });
      // } else {
      //   let files = fs.readdirSync(new_dir);
      //   const oldImage = new_dir + "/" + files[0];
      //   fs.unlinkSync(oldImage);
    }

    var newpath = new_dir + "/" + index + "." + extn;
    try {
      fs.unlinkSync(newpath);
      fs.statSync(newpath);
    } catch (e) {}

    // copy the file to a new location
    fs.copyFile(oldpath, newpath, function (err) {
      if (err) throw err;
      // // you may respond with another html page
      // res.write('File uploaded and moved!');
      // res.end();
    });
    const url = `${apiUrl}/${folder}/${id}/${index}.${extn}`;
    res.send({ success: true, url: url });
  });
};

exports.fileupload2 = async (req, res) => {
  try {
    await uploadFile(req, res);

    if (req.file == undefined) {
      return res.status(400).send({ message: "Please upload a file!" });
    }

    res.status(200).send({
      message: "Uploaded the file successfully: " + req.file.originalname,
    });
  } catch (err) {
    console.log(err);

    if (err.code == "LIMIT_FILE_SIZE") {
      return res.status(500).send({
        message: "File size cannot be larger than 2MB!",
      });
    }

    res.status(500).send({
      message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    });
  }
};

exports.getFiles = (req, res) => {
  const dir = __upload_dir + "/" + req.params.folder + "/" + req.params.id;
  // console.log(dir);
  fs.readdir(dir, function (err, files) {
    if (err) {
      return res.status(500).send({ message: "Unable to scan files!" });
    }
    let fileInfos = [];

    if (files && files.length > 0) {
      files.forEach((file) => {
        fileInfos.push({
          name: file,
          url:
            apiUrl + "/" + req.params.folder + "/" + req.params.id + "/" + file,
        });
      });
    }

    res.status(200).send(fileInfos);
  });
};

exports.download = (req, res) => {
  const paths = utils.getactualfilename(
    req.params.name,
    req.params.folder,
    req.params.id
  );
  res.download(paths[0] + "/" + paths[1], paths[1], (err) => {
    if (err) {
      return res
        .status(500)
        .send({ message: "Could not download the file. " + err });
    }
  });
};
exports.downloadPartner = (req, res) => {
  const path = __upload_dir + "partner" + "/" + req.params.name;
  return res.download(path, req.params.name, (err) => {
    if (err) {
      return res
        .status(500)
        .send({ message: "Could not download the file. " + err });
    }
  });
};
exports.uploadPostImage = function (req, res) {
  const form = formidable({ multiples: true });
  form.parse(req, (err, fields, files) => {
    var oldpath = files.file.filepath;
    var parts = files.file.originalFilename.split(".");
    var extn = parts[parts.length - 1];
    var id = fields.id;
    var index = parts[0];
    var folder = fields.folder;
    var new_dir = __upload_dir + "/" + folder + "/" + id;
    if (!fs.existsSync(new_dir)) {
      fs.mkdirSync(new_dir, { recursive: true });
      // } else {
      // let files = fs.readdirSync(new_dir);
      // const oldImage = new_dir + "/" + files[0];
      // fs.unlinkSync(oldImage);
    }
    var timeStamp = new Date().getTime();
    var newpath = new_dir + "/" + timeStamp + "-" + index + "." + extn;
    // try {
    //   fs.unlinkSync(newpath);
    //   fs.statSync(newpath);
    // } catch (e) {}

    // copy the file to a new location
    fs.copyFile(oldpath, newpath, function (err) {
      if (err) throw err;
      // // you may respond with another html page
      // res.write('File uploaded and moved!');
      // res.end();
    });
    const url = `${apiUrl}/${folder}/${id}/${timeStamp}-${index}.${extn}`;
    res.send({ success: true, url: url });
  });
};
exports.readFile = async (req, res) => {
  try {
    const filepath = path.join(
      __upload_dir,
      req.params.folder,
      req.params.id,
      req.params.filename
    );
    // Set CORS headers
    res.header("Cross-Origin-Resource-Policy", "cross-origin");
    // Send the file
    res.sendFile(filepath, (err) => {
      if (err) {
        console.error(err);
        res.status(err.status).end();
      } else {
        console.log("File sent successfully");
      }
    });
  } catch (error) {
    console.log("Readfile Error:", error);
  }
};

exports.uploadVideo = async function (req, res) {
  console.log(req.file);
  const { roomId, groupId } = req.query;
  const url = await s3.uploadFileToWasabi(
    req.file,
    req.file?.originalname.replace(" ", "-")
  );
  console.log(url);
  if (url) {
    return res.json({
      error: false,
      url: url,
      roomId: +roomId || null,
      groupId: +groupId || null,
    });
  } else {
    return utils.send500(res, err);
  }
};
