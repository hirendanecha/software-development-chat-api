"use strict";

const User = require("../models/user.model");
const utils = require("../helpers/utils");
const environments = require("../environments/environment");
const jwt = require("jsonwebtoken");
const { getPagination, getCount, getPaginationData } = require("../helpers/fn");
const { Encrypt } = require("../helpers/cryptography");
const og = require("open-graph");
const authorize = require("../middleware/authorize");
const { approveUser } = require("../helpers/utils");
const Profile = require("../models/profile.model");

exports.login = async function (req, res) {
  console.log("jkfhguysdhfgbdf");
  const { email, password } = req.body;
  const user = await User.findByUsernameAndEmail(email);
  // console.log(user);
  if (user) {
    const encryptedPassword = Encrypt(password);
    const isMatch = encryptedPassword === user.Password;
    console.log(isMatch);
    if (isMatch) {
      User.login(email, user.Id, function (err, token) {
        if (err) {
          console.log(err);
          if (err?.errorCode) {
            return res.status(400).send({
              error: true,
              message: err?.message,
              errorCode: err?.errorCode,
            });
          }
          return res.status(400).send({ error: true, message: err });
        } else {
          res.cookie("auth-user", token, {
            // expire: new Date(Date.now() + 900000),
            secure: true,
            sameSite: "none",
            domain: environments.domain,
          });
          return res.json(token);
        }
      });
    } else {
      return res.status(400).send({
        error: true,
        message: "Password is incorrect!",
      });
    }
    // bcrypt.compare(password, user.Password, (error, isMatch) => {
    //   if (error) {
    //     console.log(error);
    //     return res.status(400).send({ error: true, message: error });
    //   }
    //   console.log(isMatch);
    //   if (isMatch) {
    //     User.login(email, user.Id, function (err, token) {
    //       if (err) {
    //         console.log(err);
    //         if (err?.errorCode) {
    //           return res.status(400).send({
    //             error: true,
    //             message: err?.message,
    //             errorCode: err?.errorCode,
    //           });
    //         }
    //         return res.status(400).send({ error: true, message: err });
    //       } else {
    //         return res.json(token);
    //       }
    //     });
    //   } else {
    //     return res
    //       .status(400)
    //       .send({ error: true, message: "Password not matched!" });
    //   }
    // });
  } else {
    return res.status(400).send({
      error: true,
      message: "Invalid Email and Password. Kindly try again!",
    });
  }
};
exports.getToken = async function (req, res) {
  const data = req?.cookies;
  console.log(data["auth-user"]);
  if (data) {
    const token = data["auth-user"];

    if (token) {
      return res.json(token);
    } else {
      return res.status(400).json({ message: "" });
    }
  } else {
    return res.status(400).json({ message: "" });
  }
};

exports.create = async function (req, res) {
  // console.log(req.body);
  if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
    res.status(400).send({ error: true, message: "Error in application" });
  } else {
    const user = new User({ ...req.body });
    const oldUser = await User.findByEmail(user.Email);
    const oldUserName = await User.findByUsername(user.Username);
    console.log(oldUserName);
    if (!oldUserName) {
      if (!oldUser) {
        // const encryptedPassword = await bcrypt.hash(user.Password, 10);
        const encryptedPassword = Encrypt(user.Password);
        user.Password = encryptedPassword;
        User.create(user, async function (err, user) {
          if (err) return utils.send500(res, err);
          const adminData = await User.findAdmin();
          const adminEmail = adminData.Email;

          if (adminEmail) {
            await utils.registeredUser(adminEmail, req.body.Username);
            await utils.registrationMail({ ...req.body }, user);
            return res.json({
              error: false,
              message: "Data saved successfully",
              data: user,
            });
          } else {
            return res.status(400).send({
              error: true,
              message: "Something went wrong!",
            });
          }
        });
      } else {
        return res.status(400).send({
          error: true,
          message: "Email already exists, please enter a different email",
        });
      }
    } else {
      return res.status(400).send({
        error: true,
        message: "Username already exists, please enter a different username",
      });
    }
  }
};

exports.findAll = async (req, res) => {
  const { page, size, search, startDate, endDate } = req.body;
  const { limit, offset } = getPagination(page, size);
  const searchCountData = await User.findAndSearchAll(
    limit,
    offset,
    search,
    startDate,
    endDate
  );
  return res.send(
    getPaginationData(
      { count: searchCountData.count, docs: searchCountData.data },
      page,
      limit
    )
  );
};

exports.getAll = async function (req, res) {
  // User.getAll(function (err, users) {
  //   if (err) return utils.send500(res, err);
  //   res.send(users);
  // });
  const Users = await User.getAll();
  res.send({
    error: false,
    data: Users,
  });
};

exports.getEmail = async function (req, res) {
  const { startDate, endDate } = req.body;
  const Users = await User.getEmail(startDate, endDate);
  res.send({
    error: false,
    data: Users,
  });
};

exports.getUserList = function (req, res) {
  User.getUserList(req.params.id, function (err, user) {
    if (err) return utils.send500(res, err);
    res.send(user);
  });
};

exports.findById = async function (req, res) {
  const user = await User.findById(req.params.id);
  if (user) {
    res.send(user);
  } else {
    res.status(400).send({
      error: true,
      message: "User not found",
    });
  }
  // , function (err, user) {
  //   if (err) return utils.send500(res, err);
  //   res.send(user);
  // });
};

exports.update = function (req, res) {
  if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
    res.status(400).send({ error: true, message: "Error in application" });
  } else {
    const userToUpdate = new User(req.body);
    // console.log(req.params.id, userToUpdate);
    User.update(req.params.id, userToUpdate, function (err, result) {
      if (err) return utils.send500(res, err);
      res.json({
        error: false,
        message: "User update successfully",
      });
    });
  }
};

exports.setPassword = async function (req, res) {
  if (Object.keys(req.body).length === 0) {
    res.status(400).send({ error: true, message: "Error in application" });
  } else {
    const token = req.body.token;
    const newPassword = req.body.password;
    const decoded = jwt.verify(token, environments.JWT_SECRET_KEY);
    if (decoded) {
      const user = await User.findById(decoded.userId, res);
      console.log("user=>", user);
      if (user) {
        const encryptedPassword = Encrypt(newPassword);
        // const encryptedPassword = await bcrypt.hash(newPassword, 10);
        User.setPassword(decoded.userId, encryptedPassword);
        res.json({ error: false, message: "success" });
      }
    } else {
      res.json({ error: true, message: "Error occurred" });
    }
  }
};

// exports.setPassword = async function (req, res) {
//   if (Object.keys(req.body).length === 0) {
//     res.status(400).send({ error: true, message: "Error in application" });
//   } else {
//     const email = req.body.email;
//     const newPassword = req.body.password;
//     const encryptedPassword = await bcrypt.hash(newPassword, 10);
//     console.log(email, newPassword, encryptedPassword);
//     // newPassword = encryptedPassword;
//     // let jwtSecretKey = environments.JWT_SECRET_KEY;
//     // const decoded = jwt.verify(token, jwtSecretKey);
//     if (email) {
//       User.setPassword(email, encryptedPassword);
//       res.json({
//         error: false,
//         message: "password update successfully, please login",
//       });
//     } else {
//       res.json({ error: true, message: "Error occurred" });
//     }
//   }
// };

exports.forgotPassword = async function (req, res) {
  if (Object.keys(req.body).length === 0) {
    res.status(400).send({ error: true, message: "Error in application" });
  } else {
    const email = req.body.email;
    const user = await User.findByUsernameAndEmail(email);
    if (user) {
      const data = await utils.forgotPasswordMail(user);
      if (data.messageId) {
        return res.json({
          error: false,
          message: "please check your mail for reset password",
        });
      } else {
        return res.json({ error: true, message: data.error });
      }
    } else {
      return res.status(404).json({
        error: true,
        message: "please check your mail for reset password",
      });
    }
  }
};

exports.changeActiveStatus = function (req, res) {
  console.log(req.params.id, req.query.IsActive);
  User.changeStatus(req.params.id, req.query.IsActive, function (err, result) {
    if (err) {
      utils.send500(res, err);
    } else {
      res.json({ error: false, message: "User status changed successfully" });
    }
  });
};

exports.userSuspend = function (req, res) {
  console.log(req.params.id, req.query.IsSuspended);
  User.suspendUser(
    req.params.id,
    req.query.IsSuspended,
    function (err, result) {
      if (err) {
        return utils.send500(res, err);
      } else {
        res.json({
          error: false,
          message:
            req.query.IsSuspended === "Y"
              ? "User suspend successfully"
              : "User unsuspend successfully",
        });
      }
    }
  );
};

exports.activateMedia = async function (req, res) {
  console.log(req.params.id, req.query.IsSuspended);
  const [user] = await User.findById(req.params.id);
  if (user) {
    let name = user?.Username || user?.FirstName;
    User.activateMedia(
      user.profileId,
      req.query.MediaApproved,
      async function (err, result) {
        if (err) {
          return utils.send500(res, err);
        } else {
          // const message = req.query?.MediaApproved
          //   // ? `${name} Account has been Approved`
          //   // : `${name} Account has been Rejected`;

          let message = "";
          if (req.query.MediaApproved == 1) {
            message = `Congratulations, ${name}! Your account has been successfully approved.`;
          } else {
            message = `${name}, your account approval request has been rejected by admin.`;
          }

          const userDetails = {
            firstName: user.FirstName,
            lastName: user.LastName,
            userName: user.Username,
            email: user.Email,
            msg: message,
          };

          await approveUser(userDetails);
          return res.send({ error: false, message: message });
        }
      }
    );
  } else {
    res.json({ error: true, message: "User not found" });
  }
};

exports.delete = function (req, res) {
  const userId = req.params.id;
  const profileId = req.query.profileId;
  console.log(req.query.profileId, req.user.id);
  if (req.query.profileId === req.user.id) {
    const isDeleted = User.delete(userId, profileId);
    if (isDeleted) {
      res.json({ error: false, message: "User deleted successfully" });
    }
  } else {
    return res.status(401).json({ message: "Unauthorized token" });
  }
};

exports.adminLogin = async function (req, res) {
  console.log("jkfhguysdhfgbdf");
  const { email, password } = req.body;
  const user = await User.findByUsernameAndEmail(email);
  console.log(user);
  if (user) {
    const encryptedPassword = Encrypt(password);
    const isMatch = encryptedPassword === user.Password;
    console.log(isMatch);
    if (isMatch) {
      User.adminLogin(email, function (err, token) {
        if (err) {
          console.log(err);
          if (err?.errorCode) {
            return res.status(400).send({
              error: true,
              message: err?.message,
              errorCode: err?.errorCode,
            });
          }
          return res.status(400).send({ error: true, message: err });
        } else {
          return res.json(token);
        }
      });
    } else {
      return res
        .status(400)
        .send({ error: true, message: "Password is incorrect" });
    }
  } else {
    return res.status(400).send({ error: true, message: "User not found" });
  }
};

exports.changeAccountType = function (req, res) {
  if (req.params.id) {
    const userId = req.params.id;
    User.changeAccountType(userId, req.query.type, function (err, result) {
      if (err) {
        return utils.send500(res, err);
      } else {
        res.send({
          error: false,
          message: "Account type change successfully",
        });
      }
    });
  } else {
    res.status(400).send({ error: true, message: "Error in application" });
  }
};

// ------------------- Zip Data ------------------

exports.getZipData = function (req, res) {
  User.getZipData(req.params.zip, req.query.country, function (err, data) {
    if (err) return utils.send500(res, err);
    if (data.length) {
      res.send(data);
    } else {
      res.send({
        error: true,
        message:
          "If Your postal code is not found in our database, Please enter a postal code nearest to you",
      });
    }
  });
};

exports.getZipCountries = function (req, res) {
  User.getZipCountries(function (err, data) {
    if (err) return utils.send500(res, err);
    res.send(data);
  });
};

exports.verification = function (req, res) {
  User.verification(req.params.token, function (err, data) {
    if (err) {
      if (err?.name === "TokenExpiredError" && data?.userId) {
        return res.redirect(
          `${
            environments.FRONTEND_URL
          }/user/verification-expired?user=${encodeURIComponent(data.email)}`
        );
      }
      return utils.send500(res, err);
    }
    // console.log(data);
    // if (data.IsAdmin === "Y") {
    //   return res.redirect(`${environments.ADMIN_URL}/auth/partner-login`);
    // }
    return res.redirect(`${environments.FRONTEND_URL}/login?isVerify=true`);
  });
};

exports.resendVerification = function (req, res) {
  if (Object.keys(req.body).length === 0 || !req.body?.email?.trim()) {
    return res
      .status(400)
      .send({ error: true, message: "No valid email is given." });
  }
  User.resendVerification(req.body?.email?.trim(), async function (err, data) {
    if (err) return utils.send500(res, err);
    if (data.IsAdmin === "Y") {
      await utils.partnerRegistrationMail({ ...data }, data?.user_id);
    } else {
      await utils.registrationMail({ ...data }, data?.user_id);
    }
    return res.json({
      error: false,
      message: "Verification mail sent successfully.",
    });
  });
};

exports.logout = function (req, res) {
  const token = req.headers.authorization.split(" ")[1];
  authorize.setTokenInList(token);
  res.clearCookie("auth-user", {
    sameSite: "none",
    secure: true,
    domain: environments.domain,
  });
  // res.cookie("auth-user", 'Hello', {
  //   expire: new Date(Date.now() - 900000),
  //   secure: true,
  //   sameSite: "none",
  //   domain: environments.domain,
  // });
  return res.status(200).json({ message: "logout successfully" });
};

exports.getMeta = function (req, res) {
  const url = req.body.url;
  console.log(url);
  if (url) {
    og(url, function (err, meta) {
      if (err) {
        return utils.send500(res, err);
      } else {
        return res.json({
          meta,
        });
      }
    });
  }
};

exports.verifyToken = async function (req, res) {
  try {
    const token = req.params.token;
    const decoded = jwt.verify(token, environments.JWT_SECRET_KEY);
    console.log(decoded.user);

    if (decoded.user) {
      const [profile] = await Profile.FindById(decoded.user.id);
      if (profile?.IsSuspended === "Y") {
        res
          .status(401)
          .send({ message: "user has been suspended", verifiedToken: false });
      } else {
        res
          .status(200)
          .send({ message: "Authorized User", verifiedToken: true });
      }
    } else {
      res
        .status(401)
        .json({ message: "Unauthorized Token", verifiedToken: false });
    }
  } catch (err) {
    res.status(401).json({ message: "Invalid token", verifiedToken: false });
  }
};

exports.createAdmin = async function (req, res) {
  try {
    const id = req.params.id;
    const [user] = await User.findById(id);
    if (user) {
      await User.changeAdminAccess(
        user.Id,
        user.IsAdmin,
        user.AccountType,
        async function (err, result) {
          if (err) {
            return utils.send500(res, err);
          } else {
            let message = "You're now Master-Admin!";
            const userDetails = {
              firstName: user.FirstName,
              lastName: user.LastName,
              userName: user.Username,
              email: user.Email,
              msg: message,
            };
            await approveUser(userDetails);
            return res.send({
              error: false,
              message: "Master Admin created successfully",
            });
          }
        }
      );
    }
  } catch {
    res.status(401).json({ message: "Unauthorized User" });
  }
};

exports.getStats = async function (req, res) {
  console.log("innn");
  const countryCode = req?.query?.countryCode;
  if (countryCode) {
    const states = await User.getStats(countryCode);
    if (states) {
      res.json(states);
    } else {
      res.status(404).send({ message: "not found" });
    }
  }
};
