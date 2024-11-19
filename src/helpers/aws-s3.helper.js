const AWS = require("aws-sdk");
const fs = require("fs");
require("aws-sdk/lib/maintenance_mode_message").suppress = true;
const s3 = new AWS.S3({
  accessKeyId: "XZ1L2U32Z7XMOW5S5ZBD",
  secretAccessKey: "2e3lYJoXmocA5W3mVSpaDQF4qrDbbUA3kuFOO2Pe",
  endpoint: new AWS.Endpoint("s3.wasabisys.com"), // Wasabi endpoint
  region: "us-east-2",
});
exports.uploadFileToWasabi = async (file, key) => {
  return new Promise((resolve, reject) => {
    try {
      fs.readFile(file.path, function (err, buffer) {
        if (err) throw err; // Something went wrong!
        const params = {
          // Bucket: "software-development-chat",
          Bucket: "2040-chat",
          Key: key,
          Body: buffer,
        };

        s3.upload(params, (err, data) => {
          if (err) {
            reject(err);
          } else {
            console.log("data location => ", data.Location);
            resolve(data.Location);
          }
        });
        fs.unlinkSync(file.path);
      });
    } catch (error) {
      reject(error);
    }
  });
};
