const jwt = require("jsonwebtoken");
const env = require("../environments/environment");

exports.generateJwtToken = (req) => {
  try {
    const payload = {};
    payload["user"] = req;
    return jwt.sign(payload, env.JWT_SECRET_KEY);
  } catch (error) {
    return error;
  }
};
