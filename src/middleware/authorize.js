const jwt = require("jsonwebtoken");
const env = require("../environments/environment");
const tokenBlacklist = new Set();
const Profile = require("../models/profile.model");

exports.authorization = async function (req, res, next) {
  if (req.headers.authorization) {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized token" });
    }
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({ message: "invalid token" });
    }
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET_KEY);
      req.user = decoded.user;
      if (decoded.user && decoded.user.username !== "admin") {
        const [profile] = await Profile.FindById(decoded.user.id);

        if (profile?.IsSuspended === "Y") {
          res
            .status(401)
            .send({ message: "user has been suspended", verifiedToken: false });
        }
      }
      next();
    } catch (err) {
      console.log(err);
      res.status(401).json({ message: "not valid token" });
    }
  } else {
    return res.status(401).json({ message: "Unauthorized token" });
  }
};

exports.setTokenInList = function (token) {
  tokenBlacklist.add(token);
};
