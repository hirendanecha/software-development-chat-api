"use strict";
const { executeQuery } = require("../helpers/utils");
const moment = require("moment");
var Messages = function (data) {
  this.messageText = data.messageText;
  this.roomId = data.roomId;
  this.sentBy = data.sentBy;
  this.messageMedia = data.messageMedia;
  this.isRead = data.isRead || "N";
  this.groupId = data.groupId;
};

Messages.getMessages = async (limit, offset, roomId, groupId) => {
  const searchCount = await executeQuery(
    `SELECT count(m.id) as count FROM messages as m WHERE roomId = ${roomId} or groupId = ${groupId}`
  );
  const searchData = await executeQuery(
    `select m.*,p.Username,p.ProfilePicName,p.FirstName from messages as m left join profile as p on p.ID = m.sentBy where m.roomId =${roomId} or m.groupId = ${groupId} GROUP BY m.id order by m.createdDate desc limit ? offset ?`,
    [limit, offset]
  );
  for (const msg of searchData) {
    msg["parentMessage"] = await getMessageById(msg?.parentMessageId);
  }
  const readBy = await getReadUser(searchData[0]);
  return {
    count: searchCount?.[0]?.count || 0,
    messageList: searchData,
    readUsers: readBy,
  };
};

Messages.getMembers = async (groupId, searchText) => {
  try {
    const query =
      "select gm.profileId as Id,p.Username,p.FirstName,p.ProfilePicName from groupMembers as gm left join profile as p on p.ID = gm.profileId where gm.groupId = ? and p.Username Like ? order by p.Username";
    const values = [groupId, `${searchText}%`];
    const memberList = await executeQuery(query, values);
    return memberList;
  } catch (error) {
    return error;
  }
};

const getMessageById = async function (id) {
  try {
    const query =
      "select m.*,p.Username,p.ProfilePicName,p.FirstName from messages as m left join profile as p on p.ID = m.sentBy where m.id = ?";
    const values = [id];
    const [message] = await executeQuery(query, values);
    return message;
  } catch (error) {
    return null;
  }
};

const getReadUser = async function (msg) {
  try {
    const date = moment(msg?.createdDate)
      .utc()
      .local()
      .format("YYYY-MM-DD HH:mm:ss");
    const query = `select p.ID,p.Username,p.ProfilePicName,p.FirstName from profile as p left join groupMembers as gm on p.ID = gm.profileId where gm.groupId = ${msg.groupId} and gm.switchDate >= '${date}'`;
    const readUsers = await executeQuery(query);
    return readUsers;
  } catch (error) {
    return null;
  }
};

Messages.getGroup = async function (id) {
  try {
    const query = `select g.id as groupId,g.groupName,g.profileImage,g.profileId as createdBy,
      g.createdDate,g.updatedDate,count(gm.profileId) as members,
      p.ID as profileId,p.Username,p.FirstName,p.lastName,p.ProfilePicName 
      from chatGroups as g left join profile as p on p.ID = g.profileId left join groupMembers as gm on gm.groupId = g.id where g.id=?;`;
    const values = [id];
    const [groups] = await executeQuery(query, values);
    if (groups.id) {
      const getMembersQuery =
        "select gm.*,p.Username, p.ProfilePicName,p.FirstName,p.LastName from groupMembers as gm left join profile as p on p.ID = gm.profileId where gm.groupId = ?;";
      const members = await executeQuery(getMembersQuery, [groups?.id]);
      groups["memberList"] = members;
    }
    return groups;
  } catch (error) {
    return error;
  }
};

Messages.getRoom = async function (id) {
  try {
    const query =
      "select r.id as roomId,r.profileId1 as createdBy, r.isAccepted,p.ID as profileId,p.Username,p.FirstName,p.lastName,p.ProfilePicName from chatRooms as r join profile as p on p.ID = r.profileId2 where r.id = ?";
    const values = [id];
    const room = await executeQuery(query, values);
    console.log(room);
    if (room) {
      return room;
    }
  } catch (error) {
    return error;
  }
};

Messages.getMedia = async function (roomId, groupId, limit, offset) {
  try {
    const searchCount = await executeQuery(
      `SELECT count(m.id) as count FROM messages as m WHERE messageMedia is not null and (roomId = ${roomId} or groupId = ${groupId})`
    );
    const query = `select m.messageMedia,m.createdDate,m.sentBy,p.Username,p.FirstName from messages as m left join profile as p on p.ID = m.sentBy where m.messageMedia is not null and (m.roomId = ${roomId} or m.groupId = ${groupId}) GROUP BY m.id order by m.createdDate desc limit ? offset ?`;
    const values = [limit, offset];
    const mediaList = await executeQuery(query, values);
    if (mediaList) {
      return {
        count: searchCount?.[0]?.count || 0,
        mediaList: mediaList,
      };
    } else {
      return [];
    }
  } catch (error) {
    return error;
  }
};

module.exports = Messages;
