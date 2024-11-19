"use strict";
var db = require("../../config/db.config");
const environment = require("../environments/environment");
const { executeQuery } = require("../helpers/utils");

var Profile = function (profile) {
  this.UserName = profile.Username;
  this.FirstName = profile.FirstName;
  this.LastName = profile.LastName;
  this.Address = profile.Address;
  this.Country = profile.Country;
  this.City = profile.City;
  this.County = profile.County;
  this.State = profile.State;
  this.Zip = profile.Zip;
  this.UserID = profile.UserID;
  this.DateofBirth = profile.DateofBirth;
  this.Gender = profile.Gender;
  this.MobileNo = profile.MobileNo;
  this.AccountType = profile?.AccountType || "I";
  this.Business_NP_TypeID = profile.Business_NP_TypeID || 0;
  this.CoverPicName = profile.CoverPicName;
  this.ProfilePicName = profile.ProfilePicName;
  this.IsActivated = profile.IsActive;
  this.CreatedOn = new Date();
  this.callNotificationSound = profile?.callNotificationSound || 'Y';
  this.messageNotificationSound = profile?.messageNotificationSound || 'Y';
  this.tagNotificationSound = profile?.tagNotificationSound || 'Y';
  this.messageNotificationEmail = profile?.messageNotificationEmail || 'Y';
  this.postNotificationEmail = profile?.postNotificationEmail || 'Y';
};

Profile.create = function (profileData, result) {
  db.query("INSERT INTO profile set ?", profileData, function (err, res) {
    if (err) {
      console.log("error", err);
      result(err, null);
    } else {
      console.log(res.insertId);
      result(null, res.insertId);
    }
  });
};

Profile.FindById = async function (profileId) {
  // db.query(
  //   `SELECT ID as Id,
  //           FirstName,
  //           LastName,
  //           UserID,
  //           MobileNo,
  //           Gender,
  //           DateofBirth,
  //           Address,
  //           City,
  //           State,
  //           Zip,
  //           Country,
  //           Business_NP_TypeID,
  //           CoverPicName,
  //           IsActivated,
  //           Username,
  //           ProfilePicName,
  //           EmailVerified,
  //           CreatedOn,
  //           AccountType,
  //           MediaApproved,
  //           County
  //   FROM profile WHERE ID=? `,
  //   profileId,
  //   function (err, res) {
  //     if (err) {
  //       console.log(err);
  //       result(err, null);
  //     } else {
  //       result(null, res);
  //     }
  //   }
  // );
  const query = `
  SELECT 
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
            p.County,
            p.UserID,
            p.CoverPicName,
            p.ProfilePicName,
            p.MobileNo,
            p.MediaApproved,
            p.ChannelType,
            p.DefaultUniqueLink,
            p.UniqueLink,
            p.AccountType,
            p.userStatus,
            p.messageNotificationSound,
            p.callNotificationSound,
            p.tagNotificationSound,
            p.messageNotificationEmail,
            p.postNotificationEmail
        FROM users as u left join profile as p on p.UserID = u.Id AND p.AccountType in ('I','M') WHERE p.ID=?`;
  const values = profileId;
  let profile = await executeQuery(query, values);
  return profile;
};

Profile.update = function (profileId, profileData, result) {
  db.query(
    "UPDATE profile SET ? WHERE ID=?",
    [profileData, profileId],
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

Profile.getUsersByUsername = async function (searchText) {
  if (searchText) {
    const query = `select p.ID as Id, p.Username,p.ProfilePicName from profile as p left join users as u on u.Id = p.UserID WHERE u.IsAdmin='N' AND u.IsSuspended='N' AND p.Username LIKE ? order by p.Username limit 500`;
    const values = [`${searchText}%`];
    const searchData = await executeQuery(query, values);
    return searchData;
  } else {
    return { error: "data not found" };
  }
};

Profile.getNotificationById = async function (id, limit, offset) {
  if (id) {
    const query = `select n.*,p.Username,p.FirstName,p.ProfilePicName from notifications as n left join profile as p on p.ID = n.notificationByProfileId left join groupMembers as g on g.groupId = n.groupId and g.profileId != n.notificationByProfileId where g.profileId = ? OR n.notificationToProfileId =? order by n.createDate desc limit ${limit} offset ${offset}`;
    const values = [id, id];
    const searchCount = await executeQuery(
      `SELECT count(id) as count FROM notifications as n WHERE n.notificationToProfileId = ${id}`
    );
    const notificationData = await executeQuery(query, values);
    // return notificationData;
    return {
      count: searchCount?.[0]?.count || 0,
      data: notificationData,
    };
  } else {
    return { error: "data not found" };
  }
};

Profile.getNotification = async function (id) {
  if (id) {
    const query = "select * from notifications where id = ?";
    const values = [id];
    const notificationData = await executeQuery(query, values);
    return notificationData;
  } else {
    return { error: "data not found" };
  }
};

Profile.editNotifications = function (id, isRead, result) {
  db.query(
    "update notifications set isRead=? WHERE id = ?",
    [isRead, id],
    function (err, res) {
      if (err) {
        console.log("error", err);
        result(err, null);
      } else {
        console.log("notification updated", res);
        result(null, res);
      }
    }
  );
};

Profile.editNotificationSound = function (id, key, value) {
  try {
    const query = `update profile set ${key} = '${value}' where ID = ${id}`;
    console.log(query);
    const data = executeQuery(query);
    return data;
  } catch (error) {
    return error;
  }
};

Profile.deleteNotification = function (user_id, result) {
  db.query(
    "DELETE FROM notifications WHERE Id = ?",
    [user_id],
    function (err, res) {
      if (err) {
        console.log("error", err);
        result(err, null);
      } else {
        console.log("notification deleted", res);
        result(null, res);
      }
    }
  );
};

module.exports = Profile;
