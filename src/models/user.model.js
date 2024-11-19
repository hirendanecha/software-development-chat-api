"use strict";
const jwt = require("jsonwebtoken");
var db = require("../../config/db.config");
const common = require("../common/common");
const environment = require("../environments/environment");
const { executeQuery } = require("../helpers/utils");

var User = function (user) {
  this.Email = user.Email;
  this.Username = user.Username;
  this.Password = user.Password;
  this.IsActive = user.IsActive || "N";
  this.IsAdmin = user.IsAdmin || "N";
  this.PartnerId = user.PartnerId;
  this.IsSuspended = user.IsSuspended || "N";
  this.FirstName = user.FirstName;
  this.LastName = user.LastName;
  this.Address = user.Address;
  this.Country = user.Country;
  this.Zip = user.Zip;
  this.State = user.State;
  this.City = user.City;
};

User.login = function (email, Id, result) {
  db.query(
    `SELECT u.Id,
            u.Email,
            u.Username,
            u.IsActive,
            u.DateCreation,
            u.IsAdmin,
            u.FirstName,
            u.LastName,
            u.Address,
            u.Country,
            u.City,
            u.State,
            u.Zip,
            u.IsSuspended,
            u.AccountType,
            p.ID as profileId,
            p.CoverPicName,
            p.ProfilePicName,
            p.MobileNo,
            p.MediaApproved,
            p.ChannelType,
            p.DefaultUniqueLink,
            p.UniqueLink,
            p.userStatus,
            p.AccountType
     FROM users as u left join profile as p on p.UserID = u.Id AND p.AccountType in ('I','M') WHERE u.Email = ? OR u.Username = ? AND u.Id = ?`,
    [email, email, Id],
    async function (err, res) {
      if (err) {
        console.log("error login", err);
        return result(err, null);
      } else {
        const user = res[0];
        console.log(user, "user===>");
        if (user?.IsActive === "N") {
          return result(
            {
              message:
                "Please check your email and click the activation link to activate your account.",
              errorCode: "not_verified",
            },
            null
          );
        }
        if (user?.IsSuspended === "Y") {
          return result(
            {
              message: "This user has been suspended by admin",
              errorCode: "not_verified",
            },
            null
          );
        }

        if (!user) {
          return result(
            {
              message: "Invalid Email and Password. Kindly try again !!!!",
              errorCode: "bad_credentials",
            },
            null
          );
        } else {
          // const token = await common.generateJwtToken(res[0]);
          const token = await common.generateJwtToken(
            {
              id: res[0].profileId,
              username: res[0].Username,
              active: res[0].IsActive,
            },
            "15d"
          );
          return result(null, {
            userId: user.Id,
            user: user,
            accessToken: token,
          });
        }
      }
    }
  );
};

User.create = function (userData, result) {
  db.query("INSERT INTO users set ?", userData, function (err, res) {
    if (err) {
      console.log("error", err);
      result(err, null);
    } else {
      console.log(res.insertId);
      result(null, res.insertId);
    }
  });
};

User.findAndSearchAll = async (limit, offset, search, startDate, endDate) => {
  let whereCondition = `${
    search ? `u.Username LIKE '%${search}%' OR u.Email LIKE '%${search}%'` : ""
  }`;
  if (startDate && endDate) {
    whereCondition += `${
      search ? `AND` : ``
    } u.DateCreation >= '${startDate}' AND u.DateCreation <= '${endDate}'`;
  } else if (startDate) {
    whereCondition += `${search ? `AND` : ``} u.DateCreation >= '${startDate}'`;
  } else if (endDate) {
    whereCondition += `${search ? `AND` : ``} u.DateCreation <= '${endDate}'`;
  }
  console.log(whereCondition);
  const searchCount = await executeQuery(
    `SELECT count(Id) as count FROM users as u ${
      whereCondition ? `WHERE ${whereCondition}` : ``
    }`
  );
  const searchData = await executeQuery(
    `SELECT u.Id, u.Email, u.Username, u.IsActive, u.DateCreation, u.IsAdmin, u.FirstName, u.LastName, u.Address, u.Country, u.City, u.State, u.Zip, u.AccountType, u.IsSuspended,p.MobileNo,p.ProfilePicName,p.ID as profileId,p.MediaApproved FROM users as u left join profile as p on p.UserID = u.Id  ${
      whereCondition ? `WHERE ${whereCondition}` : ``
    } order by DateCreation desc limit ? offset ?`,
    [limit, offset]
  );

  return {
    count: searchCount?.[0]?.count || 0,
    data: searchData,
  };
};

User.findById = async function (user_id) {
  const query = `SELECT u.Id,
  u.Email,
  u.IsActive,
  u.DateCreation,
  u.IsAdmin,
  u.FirstName,
  u.LastName,
  u.Address,
  u.Country,
  u.City,
  u.State,
  u.Zip,
  u.Username,
  u.AccountType,
  u.IsSuspended,
  p.ID as profileId,
  p.messageNotificationSound,
  p.callNotificationSound,
  p.tagNotificationSound
FROM users as u left join profile as p on p.UserID = u.Id WHERE u.Id = ? `;
  const values = [user_id];
  const user = await executeQuery(query, values);
  return user;
};

User.findByUsernameAndEmail = async function (email) {
  const query = `SELECT * from users WHERE Email = ? or Username = ?`;
  const values = [email, email];
  const user = await executeQuery(query, values);
  console.log(user);
  return user[0];
};

User.findByEmail = async function (email) {
  console.log(email);
  const query = `SELECT Username from users WHERE Email = ?`;
  const values = [email];
  const user = await executeQuery(query, values);
  return user[0];
};

User.findByUsername = async function (username) {
  const query = `SELECT Username from users WHERE Username = ?`;
  const values = [username];
  const user = await executeQuery(query, values);
  return user[0];
};

User.update = function (user_id, user, result) {
  db.query(
    "UPDATE users SET ? WHERE Id=?",
    [user, user_id],
    function (err, res) {
      if (err) {
        console.log("error", err);
        result(err, null);
      } else {
        console.log("update: ", res);
        result(null, res);
      }
    }
  );
};

User.delete = async function (userId, profileId) {
  const query = "DELETE FROM users WHERE Id = ?";
  const query1 = "DELETE FROM profile WHERE ID = ?";
  const query2 = `DELETE FROM chatRooms WHERE profileId1 = ${profileId} or profileId2 = ${profileId}`;
  const query3 = `DELETE FROM groupMembers WHERE profileId = ${profileId} `;
  const query4 = `DELETE FROM messages WHERE sentBy = ${profileId} `;
  const query5 = `DELETE FROM notifications WHERE notificationToProfileId = ${profileId} and notificationByProfileId = ${profileId}`;
  const values = [userId];
  const values1 = [profileId];
  await executeQuery(query, values);
  await executeQuery(query2);
  await executeQuery(query3);
  await executeQuery(query4);
  await executeQuery(query5);
  const data = await executeQuery(query1, values1);
  console.log(data);
};

User.changeAccountType = function (userId, type, result) {
  db.query(
    "UPDATE users SET AccountType = ? WHERE Id=?",
    [type, userId],
    function (err, res) {
      if (err) {
        console.log("error", err);
        result(err, null);
      } else {
        console.log("update: ", res);
        result(null, res);
      }
    }
  );
};

User.adminLogin = function (email, result) {
  db.query(
    `SELECT Id,
            Email,
            Username,
            IsActive,
            DateCreation,
            IsAdmin,
            FirstName,
            LastName,
            Address,
            Country,
            City,
            State,
            Zip,
            AccountType
     FROM users WHERE Email = ?`,
    email,
    async function (err, res) {
      if (err) {
        console.log("error login", err);
        return result(err, null);
      } else {
        const user = res[0];
        // console.log(user);

        // if (user?.IsAdmin === "N") {
        // return result(
        //   {
        //     message: "Invalid Email and Password. Kindly try again !!!!",
        //     errorCode: "bad_credentials",
        //   },
        //   null
        // );
        // } else {
        console.log("Login Data");
        console.log(user);
        // const token = await generateJwtToken(res[0]);
        const token = await common.generateJwtToken({
          id: res[0].Id,
          username: res[0].Username,
          active: res[0].IsActive,
        });
        return result(null, {
          userId: user.Id,
          user: user,
          accessToken: token,
        });
        // }
      }
    }
  );
};

User.changeStatus = function (userId, status, result) {
  db.query(
    "UPDATE users SET IsActive = ? WHERE Id= ?",
    [status, userId],
    function (err, res) {
      if (err) {
        console.log("error", err);
        result(err, null);
      } else {
        console.log("update: ", res);
        result(null, res);
      }
    }
  );
};

User.changeAdminAccess = function (userId, adminStatus, AccountType, result) {
  if (adminStatus === "N") {
    db.query(
      "UPDATE users SET IsAdmin = 'Y' WHERE Id = ?",
      [userId],
      function (err, res) {
        if (err) {
          console.log("error", err);
          result(err, null);
        } else {
          console.log("update: ", res);
          result(null, res);
        }
      }
    );
  }
};
User.suspendUser = function (userId, status, result) {
  db.query(
    "UPDATE users SET IsSuspended = ? WHERE Id= ?",
    [status, userId],
    function (err, res) {
      if (err) {
        console.log("error", err);
        result(err, null);
      } else {
        console.log("update: ", res);
        result(null, res);
      }
    }
  );
};

User.activateMedia = function (profileId, status, result) {
  db.query(
    "UPDATE profile SET MediaApproved = ? WHERE ID= ?",
    [status, profileId],
    function (err, res) {
      if (err) {
        console.log("error", err);
        result(err, null);
      } else {
        console.log("update: ", res);
        result(null, res);
      }
    }
  );
};

User.getAll = async function () {
  const query = `SELECT 
          p.ID,
          p.Username,
          p.FirstName
   from users as u left join profile as p on p.UserID = u.Id where u.IsActive='Y' AND u.IsAdmin != 'Y' AND u.IsSuspended !='Y' AND p.Username is not NULL order by p.CreatedOn desc limit 500`;
  const values = [];
  const user = await executeQuery(query, values);
  console.log("users===>", user);
  return user;
};

User.getEmail = async function (startDate, endDate) {
  let whereCondition = "";
  if (startDate && endDate) {
    whereCondition += `u.DateCreation >= '${startDate}' AND u.DateCreation <= '${endDate}'`;
  } else if (startDate) {
    whereCondition += `u.DateCreation >= '${startDate}'`;
  } else if (endDate) {
    whereCondition += `u.DateCreation <= '${endDate}'`;
  }
  const query = `select Email from users as u where ${whereCondition} order by u.DateCreation desc`;
  const user = await executeQuery(query);
  console.log("users===>", user);
  return user;
};

// ------------------- Zip Data ------------------

User.getZipData = function (zip, country, result) {
  let query =
    "SELECT country_code, state, city, place, country from zip_us WHERE zip=? ";
  if (country) {
    query = query + "AND country_code = ?";
  }
  query = query + "order by place";
  db.query(query, [zip, country], function (err, res) {
    if (err) {
      console.log("error", err);
      result(err, null);
    } else {
      let response = {};
      var promises = res.map(function (el) {
        response.country_code = el.country_code;
        response.state = el.state;
        response.city = el.city;
        response.places =
          (response.places ? response.places + "," : "") + el.place;
        response.country = el.country;
        return response;
      });

      Promise.all(promises).then(function (items) {
        // items is 2D array
        items = [].concat.apply([], items); // flatten the array
        //do something with the finalized list of items here
        result(null, items);
      });
    }
  });
};

User.getZipCountries = function (result) {
  db.query(
    "select country_code, country from zip_us group by country_code, country order by country asc;",
    function (err, res) {
      if (err) {
        console.log("error", err);
        result(err, null);
      } else {
        result(null, res);
      }
    }
  );
};

User.verification = function (token, result) {
  jwt.verify(token, environment.JWT_SECRET_KEY, async function (err, decoded) {
    if (err) {
      const decodedToken = jwt.decode(token);
      return result(err, decodedToken);
    }
    try {
      const updateQuery = await executeQuery(
        "UPDATE users SET IsActive ='Y' WHERE Id = ?",
        [decoded.user.userId]
      );
      const fetchUser = await executeQuery("select * from users where Id = ?", [
        decoded.user.userId,
      ]);
      console.log("fetchUser", updateQuery, fetchUser);
      return result(null, fetchUser[0]);
    } catch (error) {
      console.log(error);
      return result(err, null);
    }
  });
};

User.resendVerification = async function (email, result) {
  try {
    const findUserByEmail = await executeQuery(
      `select * from users where UserName = ?`,
      [email]
    );
    if (!findUserByEmail?.length) {
      throw "User not found by the given username.";
    }
    return result(null, findUserByEmail[0]);
  } catch (error) {
    return result(error, null);
  }
};

User.setPassword = async function (user_id, password) {
  const query = `UPDATE users SET Password=? WHERE Id=?`;
  const values = [password, user_id];
  const user = await executeQuery(query, values);
  return user;
};

User.findAdmin = async function () {
  const query = `SELECT Email FROM users WHERE AccountType = 'admin'`;
  const [user] = await executeQuery(query);
  console.log(user);
  return user;
};

User.getStats = async function (countryCode) {
  const query =
    "select state,country_code from zip_us where country_code = ? and state != '' group by state";
  const values = [countryCode];
  const stats = await executeQuery(query, values);
  return stats;
};

module.exports = User;
