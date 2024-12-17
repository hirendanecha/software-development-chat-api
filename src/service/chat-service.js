const { executeQuery } = require("../helpers/utils");
const {
  notificationMailOnInvite,
  notificationMail,
} = require("../helpers/utils");

const { getPagination, getCount, getPaginationData } = require("../helpers/fn");
const moment = require("moment");

exports.getChatList = async function (params) {
  return await getChatList(params);
};

exports.checkRoomCreated = async function (params) {
  return await checkRoomCreated(params);
};

exports.createChatRoom = async function (params) {
  return await createChatRoom(params);
};

exports.sendMessage = async function (params) {
  return await sendMessage(params);
};

exports.readMessage = async function (params) {
  return await readMessage(params);
};

exports.acceptRoom = async function (params) {
  return await acceptRoom(params);
};

exports.createNotification = async function (data) {
  return await createNotification(data);
};

exports.editMessage = async function (data) {
  return await editMessage(data);
};

exports.deleteMessage = async function (data) {
  return await deleteMessage(data);
};

exports.deleteRoom = async function (data) {
  return await deleteRoom(data);
};

exports.startCall = async function (data) {
  return await startCall(data);
};

exports.declineCall = async function (data) {
  return await declineCall(data);
};

exports.pickUpCall = async function (data) {
  return await pickUpCall(data);
};

exports.createGroups = async function (data) {
  return await createGroups(data);
};

exports.getGroupList = async function (data) {
  return await getGroupList(data);
};

exports.getGroup = async function (data) {
  return await getGroup(data);
};

exports.removeMember = async function (data) {
  return await removeMember(data);
};

exports.getRoomsIds = async function (data) {
  return await getRoomsIds(data);
};

exports.getUserDetails = async function (data) {
  return await getUserDetails(data);
};

exports.switchChat = async function (data) {
  return await switchChat(data);
};

exports.readGroupMessage = async function (data) {
  return await readGroupMessage(data);
};

exports.resendRoom = async function (data) {
  return await resendRoom(data);
};
exports.userStatus = async function (id) {
  return await userStatus(id);
};
exports.changeUserStatus = async function (data) {
  return await changeUserStatus(data);
};

exports.getMessages = async function (data) {
  return await getMessages(data);
};
exports.getRoomByProfileId = async function (data) {
  return await getRoomByProfileId(data);
};
exports.endCall = async function (data) {
  return await endCall(data);
};

exports.checkCall = async function (data) {
  return await checkCall(data);
};

exports.suspendUser = function (data) {
  return suspendUser(data);
};

exports.sendNotificationEmail = async function (data) {
  return await sendNotificationEmail(data);
};

const getChatList = async function (params) {
  try {
    const query = `SELECT
                  r.id AS roomId,
                  COUNT(CASE WHEN m.id IS NOT NULL THEN 1 END) AS unReadMessage,
                  r.profileId1 AS createdBy,
                  r.isAccepted,
                  r.lastMessageText,
                  r.updatedDate,
                  r.createdDate,
                  r.isDeleted,
                  r.sentBy,
                  p.ID AS profileId,
                  p.Username,
                  p.FirstName,
                  p.LastName,
                  p.ProfilePicName
FROM
    chatRooms AS r
JOIN
    profile AS p ON p.ID = CASE
        WHEN r.profileId1 = ${params.profileId} THEN r.profileId2
        WHEN r.profileId2 = ${params.profileId} THEN r.profileId1
    END
LEFT JOIN
    messages AS m ON m.roomId = r.id AND m.sentBy != ${params.profileId} AND m.isRead = 'N'
WHERE
    (r.profileId1 = ? OR r.profileId2 = ?) AND r.isDeleted = 'N'
GROUP BY
    r.id, r.profileId1, r.isAccepted,r.updatedDate,r.sentBy, p.ID, p.Username, p.FirstName, p.LastName, p.ProfilePicName
ORDER BY
r.updatedDate desc;`;
    const values = [params.profileId, params.profileId];
    const chatList = await executeQuery(query, values);
    return chatList;
  } catch (error) {
    console.log(error);
    return error;
  }
};

const checkRoomCreated = async function (params) {
  try {
    const query =
      "select r.* from chatRooms as r where (r.profileId1 = ? and r.profileId2 = ?) or (r.profileId2 = ? and r.profileId1 = ?) ";
    const values = [
      params.profileId1,
      params.profileId2,
      params.profileId1,
      params.profileId2,
    ];
    const room = await executeQuery(query, values);
    return room;
  } catch (error) {
    return error;
  }
};

const createChatRoom = async function (params) {
  try {
    const data = {
      profileId1: params?.profileId1,
      profileId2: params?.profileId2,
    };
    const query = `select * from chatRooms as r where r.isDeleted = 'N' AND (r.profileId1 = ? and r.profileId2 = ?) or (r.profileId2 = ? and r.profileId1 = ?)`;
    const values = [
      data.profileId1,
      data.profileId2,
      data.profileId1,
      data.profileId2,
    ];
    const oldRoom = await executeQuery(query, values);
    if (!oldRoom.length) {
      const query = "Insert Into chatRooms set ?";
      const values = [data];
      const room = await executeQuery(query, values);
      const notification = await createNotification({
        notificationToProfileId: data?.profileId2,
        roomId: room?.insertId,
        notificationByProfileId: data?.profileId1,
        actionType: "M",
        msg: "invited you to private chat",
      });
      const findUser = `select u.Email,p.FirstName,p.LastName,p.Username from users as u left join profile as p on p.UserID = u.Id where p.ID = ?`;
      const values1 = [notification.notificationToProfileId];
      const userData = await executeQuery(findUser, values1);
      const findSenderUser = `select p.ID,p.Username,p.FirstName,p.LastName from profile as p where p.ID = ?`;
      const values2 = [notification.notificationByProfileId];
      const senderData = await executeQuery(findSenderUser, values2);
      const userDetails = {
        email: userData[0].Email,
        profileId: senderData[0].ID,
        userName: userData[0].Username,
        senderUsername: senderData[0].Username,
        firstName: userData[0].FirstName,
        msg: `${senderData[0].Username} invited you to private chat`,
      };
      await notificationMailOnInvite(userDetails);
      const newRoom = await getRoom(room.insertId);
      return { room: newRoom, notification };
    } else {
      return null;
    }
  } catch (error) {
    return error;
  }
};

const sendMessage = async function (params) {
  try {
    const data = {
      messageText: params.messageText,
      roomId: params?.roomId,
      groupId: params?.groupId,
      sentBy: params.sentBy,
      messageMedia: params.messageMedia,
      parentMessageId: params.parentMessageId,
      isRead: params.isRead || null,
    };
    const query = "select * from chatRooms where id = ?";
    const values = [data.roomId];
    const oldRoom = await executeQuery(query, values);
    if (oldRoom) {
      const query = "Insert Into messages set ?";
      const values = [data];
      const message = await executeQuery(query, values);

      const query1 =
        "select m.*,p.Username,p.ProfilePicName,p.FirstName from messages as m left join profile as p on p.ID = m.sentBy where m.id = ?";
      const values1 = message.insertId;
      const [newMessage] = await executeQuery(query1, values1);
      if (newMessage?.parentMessageId) {
        const query1 =
          "select m.*,p.Username,p.ProfilePicName,p.FirstName from messages as m left join profile as p on p.ID = m.sentBy where m.id = ?";
        const values1 = newMessage?.parentMessageId;
        const [parentMessage] = await executeQuery(query1, values1);
        newMessage["parentMessage"] = parentMessage;
      }
      if (newMessage) {
        if (data.roomId) {
          const date = new Date();
          const query =
            "update chatRooms set lastMessageText = ?,updatedDate = ?,sentBy = ? where id = ?";
          const values = [data.messageText, date, data?.sentBy, data.roomId];
          const updatedRoom = await executeQuery(query, values);
          if (params.messageType === "C" || params.messageType === "D") {
            const notification = await createNotification({
              notificationToProfileId: params?.profileId,
              roomId: data?.roomId,
              notificationByProfileId: data?.sentBy,
              actionType: "M",
              msg:
                params.messageType === "C"
                  ? "You have missed call from"
                  : "has declined your call",
              messageType: params.messageType,
            });
            return { newMessage, notification };
          } else {
            const notification = await createNotification({
              notificationToProfileId: params?.profileId,
              roomId: data?.roomId,
              notificationByProfileId: data?.sentBy,
              actionType: "M",
              msg: "sent you a message",
            });
            return { newMessage, notification };
          }
        }
        if (data.groupId) {
          const date = new Date();
          const query =
            "update chatGroups set lastMessageText = ?,updatedDate = ?,sentBy = ? where id = ?";
          const values = [data.messageText, date, data?.sentBy, data.groupId];
          const updatedGroup = await executeQuery(query, values);
          let notification = {};
          if (params.messageType === "C") {
            notification = await createNotification({
              notificationToProfileId: params?.profileId,
              roomId: data?.roomId,
              notificationByProfileId: data?.sentBy,
              actionType: "M",
              msg: "You have missed call from",
              messageType: params.messageType,
            });
          } else {
            notification = await createNotification({
              // notificationToProfileId: params.profileId,
              groupId: data?.groupId,
              notificationByProfileId: data?.sentBy,
              actionType: "M",
              msg: "sent you a message in group",
            });
          }
          if (params?.tags?.length > 0) {
            const notifications = [];
            for (const key in params?.tags) {
              if (Object.hasOwnProperty.call(params?.tags, key)) {
                const tag = params?.tags[key];

                // const notification = await createNotification({
                //   notificationToProfileId: tag?.id,
                //   groupId: data?.groupId,
                //   notificationByProfileId: data?.sentBy,
                //   actionType: "T",
                //   msg: "tagged you in message",
                // });
                const findUser = `select u.Email,p.FirstName,p.LastName,p.Username from users as u left join profile as p on p.UserID = u.Id where p.messageNotificationEmail = 'Y' and p.ID = ?`;
                const values = [tag?.id];
                const userData = await executeQuery(findUser, values);
                if (userData?.length) {
                  const senderData = await getGroup({ groupId: data?.groupId });
                  // notifications.push(notification);
                  if (tag?.id) {
                    const userDetails = {
                      email: userData[0].Email,
                      userName: userData[0].Username,
                      senderUsername: senderData.groupName,
                      ProfilePicName: senderData.profileImage,
                      type: "message",
                      groupId: senderData?.id,
                    };
                    await notificationMail(userDetails);
                  }
                }
              }
            }
          }
          return { newMessage, notification };
        }
      }
      // let notifications = [];
      // if (params?.profileIds.length >= 0) {
      //   console.log("in===>");
      //   for (const key in params?.profileIds) {
      //     if (Object.hasOwnProperty.call(params?.profileIds, key)) {
      //       const id = params?.profileIds[key];
      //       const notification = await createNotification({
      //         notificationByProfileId: data?.sentBy,
      //         notificationToProfileId: id,
      //         groupId: params?.groupId,
      //         roomId: params?.roomId,
      //         actionType: "M",
      //         msg: "sent you a message",
      //       });
      //       notifications.push(notification);
      //     }
      //   }
      //   // return { newMessage, notifications };
      // }
    } else {
      return false;
    }
  } catch (error) {
    return error;
  }
};

const readMessage = async function (params) {
  try {
    const query = "update messages set isRead = 'Y' where id in (?)";
    const values = [params.ids];
    const messages = await executeQuery(query, values);
    if (messages) {
      return params.ids;
    }
  } catch (error) {
    return error;
  }
};

// const readGroupMessage = async function (params) {
//   try {
//     let readMessageIds = [];
//     params.ids.forEach(async (element) => {
//       const data = {
//         messageId: element,
//         readBy: params.readBy,
//         groupId: params.groupId,
//       };
//       console.log(data);
//       const query = `insert into readMessage set ?`;
//       const message = await executeQuery(query, data);
//       readMessageIds.push(message.insertId);
//     });
//     if (readMessageIds) {
//       return readMessageIds;
//     }
//     // return params.ids;
//   } catch (error) {
//     return error;
//   }
// };

const createNotification = async function (params) {
  try {
    const {
      notificationToProfileId,
      roomId,
      groupId,
      notificationByProfileId,
      actionType,
      msg,
      messageType = "",
    } = params;
    const query =
      "SELECT ID,ProfilePicName, Username, FirstName,LastName from profile where ID = ?";
    const values = [notificationByProfileId];
    const userData = await executeQuery(query, values);

    let desc;
    if (messageType === "C") {
      desc = `${msg} ${userData[0]?.Username || userData[0]?.FirstName}`;
    } else {
      desc = `${userData[0]?.Username || userData[0]?.FirstName} ${msg}`;
    }

    const data = {
      notificationToProfileId: notificationToProfileId || null,
      roomId: roomId || null,
      groupId: groupId || null,
      notificationByProfileId: notificationByProfileId || null,
      actionType: actionType,
      notificationDesc: desc,
    };
    console.log("New-notification", data);
    if (data.notificationByProfileId !== data.notificationToProfileId) {
      const query1 = "insert into notifications set ?";
      const values1 = [data];
      const notificationData = await executeQuery(query1, values1);
      return { ...data, id: notificationData.insertId };
      // return true;
    }
    // else {
    //   // const find =
    //   //   "select * from notifications where roomId= ? and notificationByProfileId = ?";
    //   // const value = [data.roomId, data.notificationByProfileId];
    //   // const oldData = await executeQuery(find, value);
    //   // if (oldData.length) {
    //   //   return oldData[0];
    //   // } else {
    //   // }
    //   const query1 = "insert into notifications set ?";
    //   const values1 = [data];
    //   const notificationData = await executeQuery(query1, values1);
    //   return { ...data, id: notificationData.insertId };
    // }
  } catch (error) {
    return error;
  }
};

const acceptRoom = async function (params) {
  try {
    const query = `update chatRooms set isAccepted = 'Y' where id = ? and profileId2 = ?`;
    const values = [params.roomId, params.profileId];
    const updatedRoom = await executeQuery(query, values);
    const room = await getRoom(params.roomId);
    let notification = {};
    if (room) {
      notification = await createNotification({
        notificationToProfileId: room?.createdBy,
        roomId: room?.roomId,
        notificationByProfileId: room?.profileId,
        actionType: "M",
        msg: `has accepted your messaging invite`,
      });
    }
    const findUser = `select u.Email,p.FirstName,p.LastName,p.Username from users as u left join profile as p on p.UserID = u.Id where p.ID = ?`;
    const values1 = [notification.notificationToProfileId];
    const userData = await executeQuery(findUser, values1);
    const findSenderUser = `select p.ID,p.Username,p.FirstName,p.LastName from profile as p where p.ID = ?`;
    const values2 = [notification.notificationByProfileId];
    const senderData = await executeQuery(findSenderUser, values2);
    const userDetails = {
      email: userData[0].Email,
      profileId: senderData[0].ID,
      userName: userData[0].Username,
      senderUsername: senderData[0].Username,
      firstName: userData[0].FirstName,
      msg: `${senderData[0].Username} has accepted your messaging invite`,
    };
    await notificationMailOnInvite(userDetails);

    return { room, notification };
  } catch (error) {
    return error;
  }
};

const getRoom = async function (id) {
  try {
    const query =
      "select r.id as roomId,r.profileId1 as createdBy, r.isAccepted,p.ID as profileId,p.Username,p.FirstName,p.lastName,p.ProfilePicName from chatRooms as r join profile as p on p.ID = r.profileId2 where r.id = ?";
    const values = [id];
    const [room] = await executeQuery(query, values);
    if (room) {
      return room;
    }
  } catch (error) {
    return error;
  }
};

const editMessage = async function (params) {
  try {
    const data = {
      id: params.id,
      messageText: params.messageText,
      roomId: params?.roomId,
      groupId: params?.groupId,
      sentBy: params.sentBy,
      messageMedia: params.messageMedia,
      parentMessageId: params.parentMessageId,
    };
    const query = "update messages set ? where id = ?";
    const values = [data, data.id];
    const message = await executeQuery(query, values);
    let parentMessage = {};
    if (data?.parentMessageId) {
      const query1 =
        "select m.*,p.Username,p.ProfilePicName,p.FirstName from messages as m left join profile as p on p.ID = m.sentBy where m.id = ?";
      const values1 = data?.parentMessageId;
      const [message] = await executeQuery(query1, values1);
      parentMessage = message;
    }
    if (data.roomId) {
      const date = new Date();
      const query =
        "update chatRooms set lastMessageText = ?,updatedDate = ?,sentBy = ? where id = ?";
      const values = [data.messageText, date, data?.sentBy, data.roomId];
      const updatedRoom = await executeQuery(query, values);
    }
    if (data.groupId) {
      const date = new Date();
      const query =
        "update chatGroups set lastMessageText = ?,updatedDate = ?,sentBy = ? where id = ?";
      const values = [data.messageText, date, data?.sentBy, data.groupId];
      const updatedGroup = await executeQuery(query, values);
    }
    const query1 = "select * from messages where id = ?";
    const values1 = [data?.id];
    const [editMessage] = await executeQuery(query1, values1);
    editMessage["parentMessage"] = parentMessage;
    return editMessage;
  } catch (error) {
    console.log(error);
    return error;
  }
};

const deleteMessage = async function (params) {
  try {
    let data = {
      id: params.id,
      roomId: params?.roomId,
      groupId: params?.groupId,
      sentBy: params.sentBy,
    };
    const query = "delete from messages where id = ?";
    const values = [data.id, data.id];
    const message = await executeQuery(query, values);
    const deleteChild = await executeQuery(
      "delete from messages where parentMessageId in (?)",
      values
    );
    console.log("message", message, deleteChild);
    if (message) {
      let messageList = [];
      if (data?.roomId) {
        const query =
          "select * from messages where roomId = ? order by createdDate desc limit 1";
        const values = data.roomId;
        [messageList] = await executeQuery(query, values);
        const query1 = `update chatRooms set lastMessageText = ?,updatedDate = ? where id = ?`;
        const values1 = [
          messageList?.messageText || null,
          messageList?.createdDate,
          messageList?.sentBy,
          data.roomId,
        ];
        const updatedRoom = await executeQuery(query1, values1);
        console.log("updateRoom->", updatedRoom);
        data.isDeleted = true;
        return data;
        // if (messageList) {
        // }
      }
      if (data?.groupId) {
        const query =
          "select * from messages where groupId = ? order by createdDate desc limit 1";
        const values = data.groupId;
        [messageList] = await executeQuery(query, values);
        // if (messageList) {
        // }
        const query1 = `update chatGroups set lastMessageText = ?,updatedDate = ?,sentBy = ? where id = ?`;
        const values1 = [
          messageList?.messageText || null,
          messageList?.createdDate,
          messageList?.sentBy,
          data.groupId,
        ];
        const updatedRoom = await executeQuery(query1, values1);
        console.log("updateRoom->", updatedRoom);
        data.isDeleted = true;
        return data;
      }
      console.log("messageList", messageList);
    }
    console.log("return");
  } catch (error) {
    return error;
  }
};

const deleteRoom = async function (params) {
  try {
    const data = {
      id: params?.roomId,
    };
    const query = `update chatRooms set isDeleted = 'Y' where id = ?`;
    const values = [data.id];
    const message = await executeQuery(query, values);
    let notification = {};
    if (params.profileId && params.createdBy) {
      notification = await createNotification({
        notificationByProfileId: params?.profileId,
        notificationToProfileId: params?.createdBy,
        actionType: "M",
        roomId: params?.roomId,
        msg: "has declined your invitation",
      });
      notification["isRoomDeleted"] = true;
      return { data, notification };
    } else {
      return { data };
    }
  } catch (error) {
    return error;
  }
};

// const startCall = async function (params) {
//   try {
//     if (params) {
//       // const data = {
//       //   // notificationToProfileId: params?.notificationToProfileId,
//       //   roomId: params?.roomId,
//       //   groupId: params?.groupId,
//       //   notificationByProfileId: params?.notificationByProfileId,
//       //   actionType: "VC",
//       //   msg: "incoming call...",
//       // };
//       let notifications = [];
//       if (params.notificationToProfileIds.length >= 0) {
//         for (const key in params.notificationToProfileIds) {
//           if (
//             Object.hasOwnProperty.call(params.notificationToProfileIds, key)
//           ) {
//             const id = params.notificationToProfileIds[key];
//             const notification = await createNotification({
//               notificationByProfileId: params?.notificationByProfileId,
//               notificationToProfileId: id,
//               actionType: "VC",
//               groupId: params?.groupId,
//               roomId: params?.roomId,
//               msg: "incoming call...",
//             });
//             notification["link"] = params?.link;
//             const query = `select p.Username,p.FirstName,p.LastName,p.ProfilePicName from profile as p where p.ID = ${params?.notificationByProfileId}`;
//             const [profile] = await executeQuery(query);
//             notification["Username"] = profile?.Username;
//             notification["ProfilePicName"] = profile?.ProfilePicName;
//             notifications.push(notification);
//           }
//         }
//         return { notifications };
//       }
//     }
//   } catch (error) {
//     return error;
//   }
// };

const startCall = async function (params) {
  try {
    if (params) {
      const notificationToProfileId = params?.notificationToProfileId ?? null;
      const groupId = params?.groupId ?? null;
      const query = `select * from calls_logs where (roomId = '${params?.roomId}' or groupId = '${groupId}') and isOnCall = 'Y' and endDate is null`;
      const [callLogs] = await executeQuery(query);
      console.log("callLogs", callLogs);

      const callLogsData = {
        // profileId: params?.notificationByProfileId,
        isOnCall: "Y",
        roomId: params?.roomId || null,
        groupId: params?.groupId || null,
        callLink: params?.link || null,
        members: callLogs?.members || 1,
      };
      if (!callLogs) {
        const query = `insert into calls_logs set ?`;
        const values = [callLogsData];
        await executeQuery(query, values);
      }

      if (params?.roomId) {
        const data = {
          notificationToProfileId: params?.notificationToProfileId || null,
          roomId: params?.roomId,
          notificationByProfileId: params?.notificationByProfileId || null,
          actionType: "VC",
          msg: "incoming call...",
        };
        const notification = await createNotification(data);
        notification["link"] = params?.link;
        const query = `select p.Username,p.FirstName,p.LastName,p.ProfilePicName from profile as p where p.ID = ${params?.notificationByProfileId}`;
        const [profile] = await executeQuery(query);
        notification["Username"] = profile?.Username;
        notification["ProfilePicName"] = profile?.ProfilePicName;
        if (callLogs?.isOnCall === "Y") {
          notification["isOnCall"] = callLogs?.isOnCall;
        } else {
          notification["isOnCall"] = "N";
        }
        return { notification };
      } else {
        const data = {
          notificationToProfileId: params?.notificationToProfileId || null,
          groupId: params?.groupId,
          notificationByProfileId: params?.notificationByProfileId || null,
          actionType: "VC",
          msg: "incoming call...",
        };
        const notification = await createNotification(data);
        notification["link"] = params?.link;
        const query = `select p.Username,p.FirstName,p.LastName,p.ProfilePicName from profile as p where p.ID = ${params?.notificationByProfileId}`;
        const [profile] = await executeQuery(query);
        notification["Username"] = profile?.Username;
        const group = await getGroup({ groupId: data.groupId });
        notification["ProfilePicName"] = group?.profileImage;
        notification["groupName"] = group?.groupName;
        notification["members"] = callLogsData?.members;
        if (callLogs?.isOnCall === "Y") {
          notification["isOnCall"] = callLogs?.isOnCall;
        } else {
          notification["isOnCall"] = "N";
        }
        return { notification };
      }
    }
  } catch (error) {
    return error;
  }
};

const declineCall = async function (params) {
  try {
    if (params) {
      if (params) {
        let query = "";
        query = `update calls_logs set endDate = now(), isOnCall = 'N',members = ${params?.members} where (roomId = ${params?.roomId} or groupId = ${params?.groupId}) and isOnCall = 'Y' and members >=  1 and endDate is null`;
        await executeQuery(query);
      }
      // else {
      //   query = `update calls_logs set endDate = now(), isOnCall = 'N' where groupId = ${params.groupId} and isOnCall = 'Y' and endDate is null`;
      // }
      // const query = `update calls_logs set endDate = now(), isOnCall = 'N' where (roomId = ${params.roomId} or groupId = ${params.groupId}) and isOnCall = 'Y'`;
      const data = {
        notificationToProfileId: params?.notificationToProfileId || null,
        roomId: params?.roomId,
        groupId: params?.groupId,
        notificationByProfileId: params?.notificationByProfileId || null,
        actionType: "DC",
        msg: params.message || "call decline...",
      };
      // const notification = await createNotification(data);
      return params?.members === 0 ? data : {};
    }
  } catch (error) {
    return error;
  }
};

const pickUpCall = async function (params) {
  try {
    if (params) {
      // const notificationToProfileId = params?.notificationToProfileId ?? null;
      const groupId = params?.groupId ?? null;
      const query = `select * from calls_logs where (roomId = '${params?.roomId}' or groupId = '${groupId}') and isOnCall = 'Y' and endDate is null`;
      const [existingCall] = await executeQuery(query);

      const callLogs = {
        // profileId: params?.notificationByProfileId,
        isOnCall: "Y",
        roomId: params?.roomId || null,
        groupId: params?.groupId || null,
        callLink: params?.link || null,
        members: existingCall.members + 1,
      };
      console.log("callLogs", existingCall);
      if (existingCall) {
        const query = `update calls_logs set members = ${callLogs?.members}, callLink = '${callLogs?.callLink}' where id = ${existingCall?.id}`;
        const values = [callLogs];
        await executeQuery(query, values);
      } else {
        if (callLogs) {
          const query = `insert into calls_logs set ?`;
          const values = [callLogs];
          await executeQuery(query, values);
        }
      }
      const data = {
        notificationToProfileId: params?.notificationToProfileId || null,
        roomId: params?.roomId,
        groupId: params?.groupId,
        notificationByProfileId: params?.notificationByProfileId || null,
        actionType: "SC",
        msg: "call start...",
        link: params?.link,
      };
      // const notification = await createNotification(data);
      // notification["link"] = params?.link;
      return data;
    }
  } catch (error) {
    return error;
  }
};

const createGroups = async function (params) {
  try {
    if (params) {
      const data = {
        profileId: params?.profileId,
        groupName: params?.groupName,
        profileImage: params?.profileImage,
      };
      if (!params?.groupId) {
        const query = "insert into chatGroups set ?";
        const values = [data];
        const group = await executeQuery(query, values);
        params["groupId"] = group?.insertId;
        const adminData = {
          groupId: group.insertId,
          profileId: data.profileId,
          isAdmin: "Y",
        };
        await addMembers(adminData);
      }
      if (params?.groupId) {
        const data = {
          groupName: params.groupName,
          profileImage: params.profileImage,
          updatedDate: new Date(),
        };
        const query = "update chatGroups set ? where id = ?";
        const values = [data, params?.groupId];
        const updateGroup = await executeQuery(query, values);
      }
      console.log(params.profileIds);

      let notifications = [];
      let groupList = {};
      if (params.isUpdate) {
        if (params.profileIds.length >= 0) {
          for (const id of params.profileIds) {
            const data = {
              groupId: params?.groupId,
              profileId: id,
            };
            const memberId = await addMembers(data);
            console.log("ids==>", id);
            const notification = await createNotification({
              notificationByProfileId: params?.profileId,
              notificationToProfileId: id,
              actionType: "M",
              groupId: params?.groupId,
              msg: `${"added you in chat group"}`,
            });
            notifications.push(notification);
          }
          // if (memberId) {

          // }
        } else {
          groupList = await getGroup(params);
          return { groupList };
        }
      } else {
        const notification = await createNotification({
          notificationByProfileId: params?.profileId,
          actionType: "M",
          groupId: params?.groupId,
          msg: `${"changed group details"}`,
        });
        notifications.push(notification);
      }
      groupList = await getGroup(params);
      return { notifications, groupList, groupId: params?.groupId };
    }
  } catch (error) {
    return error;
  }
};

const addMembers = async function (data) {
  try {
    const query = "insert into groupMembers set ?";
    const values = [data];
    const member = await executeQuery(query, values);
    console.log(member.insertId);
    return member.insertId;
  } catch (error) {
    return error;
  }
};

const getGroup = async function (params) {
  try {
    const query =
      "select g.*,count(gm.profileId) as members from chatGroups as g left join profile as p on p.ID = g.profileId left join groupMembers as gm on gm.groupId = g.id where g.id=?";
    const values = [params?.groupId];
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

const getGroupList = async function (params) {
  try {
    const query = `SELECT g.id AS groupId,
                g.profileId AS createdBy,
                g.profileImage,
                g.groupName,
                g.createdDate,
                g.lastMessageText,
                g.updatedDate,
                COUNT(CASE WHEN m.id IS NOT NULL THEN 1 END) AS unReadMessage,
                p.Username,
                p.ProfilePicName,
                p.ID AS profileId
            FROM chatGroups AS g
            LEFT JOIN groupMembers AS gm ON gm.groupId = g.id
            LEFT JOIN profile AS p ON p.ID = g.profileId
            LEFT JOIN messages AS m ON m.groupId = g.id
            AND m.createdDate > gm.switchDate
            AND m.sentBy != ?
            WHERE gm.profileId = ?
            GROUP BY g.id
            ORDER BY g.updatedDate DESC`;
    // LEFT JOIN readMessage AS rm ON rm.messageId = m.id
    const values = [params.profileId, params.profileId];
    const groupsList = await executeQuery(query, values);
    return groupsList;
  } catch (error) {
    return error;
  }
};

const removeMember = async function (params) {
  try {
    const query =
      "delete from groupMembers where profileId = ? and groupId = ?";
    const values = [params.profileId, params.groupId];
    const member = await executeQuery(query, values);
    const group = await getGroup(params);
    return group;
  } catch (error) {
    return error;
  }
};

const getRoomsIds = async function (id) {
  try {
    const query = `select id as roomId from chatRooms where profileId1 = ${id} or profileId2 = ${id}`;
    const query1 = `select groupId from groupMembers where profileId = ${id}`;
    const roomsIds = await executeQuery(query);
    const groupsIds = await executeQuery(query1);

    const chatData = { roomsIds, groupsIds };
    return chatData;
  } catch (error) {
    return error;
  }
};

const getUserDetails = async function (id) {
  const query = `select Username from profile where ID = ${id}`;
  const [profile] = await executeQuery(query);
  return profile?.Username;
};

const switchChat = async function (params) {
  const query = `update groupMembers set switchDate = '${params.date}' where groupId = ${params.groupId} and profileId = ${params.profileId}`;
  const data = await executeQuery(query);
  return data;
};

const readGroupMessage = async function (params) {
  try {
    const date = moment(params?.createdDate)
      .utc()
      .local()
      .format("YYYY-MM-DD HH:mm:ss");
    const query = `select p.ID,p.Username,p.ProfilePicName,p.FirstName from profile as p left join groupMembers as gm on p.ID = gm.profileId where gm.groupId = ${params.groupId} and gm.switchDate >= '${date}'`;
    const readUsers = await executeQuery(query);
    return readUsers;
  } catch (error) {
    return null;
  }
};

const resendRoom = async function (params) {
  try {
    const data = {
      id: params?.roomId,
    };
    const query = `update chatRooms set createdDate = now(),updatedDate = now() where id = ?`;
    const values = [data.id];
    const message = await executeQuery(query, values);
    let notification = {};
    if (params.profileId && params.createdBy) {
      notification = await createNotification({
        notificationByProfileId: params?.createdBy,
        notificationToProfileId: params?.profileId,
        actionType: "M",
        roomId: params?.roomId,
        msg: "invited you to private chat",
      });
      const findUser = `select u.Email,p.FirstName,p.LastName,p.Username from users as u left join profile as p on p.UserID = u.Id where p.ID = ?`;
      const values1 = [notification.notificationToProfileId];
      const userData = await executeQuery(findUser, values1);
      const findSenderUser = `select p.ID,p.Username,p.FirstName,p.LastName from profile as p where p.ID = ?`;
      const values2 = [notification.notificationByProfileId];
      const senderData = await executeQuery(findSenderUser, values2);
      const userDetails = {
        email: userData[0].Email,
        profileId: senderData[0].ID,
        userName: userData[0].Username,
        senderUsername: senderData[0].Username,
        firstName: userData[0].FirstName,
        msg: `${senderData[0].Username} invited you to private chat`,
      };
      await notificationMailOnInvite(userDetails);
      return { notification };
    } else {
      return { data };
    }
  } catch (error) {
    return error;
  }
};

const userStatus = async function (id) {
  try {
    const query = `select userStatus from profile where ID = ${id}`;
    const [status] = await executeQuery(query);
    return status.userStatus;
  } catch (error) {
    return error;
  }
};

const changeUserStatus = async function (params) {
  try {
    const query = `update profile set userStatus = '${params.status}' where ID = ${params.id}`;
    await executeQuery(query);
    const data = {
      status: params.status,
      id: params.id,
    };
    return data;
  } catch (error) {
    return error;
  }
};

const getMessages = async (params) => {
  const { limit, offset } = getPagination(params.page, params.size);
  const searchCount = await executeQuery(
    `SELECT count(m.id) as count FROM messages as m WHERE roomId = ${params.roomId} or groupId = ${params.groupId}`
  );
  const searchData = await executeQuery(
    `select m.*,p.Username,p.ProfilePicName,p.FirstName from messages as m left join profile as p on p.ID = m.sentBy where m.roomId =${params.roomId} or m.groupId = ${params.groupId} GROUP BY m.id order by m.createdDate desc limit ? offset ?`,
    [limit, offset]
  );
  for (const msg of searchData) {
    msg["parentMessage"] = await getMessageById(msg?.parentMessageId);
    // if (msg.groupId) {
    // }
  }
  console.log(searchData[0]);
  const readBy = await getReadUser(searchData[0]);
  console.log(readBy);
  const messageData = getPaginationData(
    { count: searchCount?.[0]?.count, docs: searchData },
    params.page,
    limit
  );
  messageData["readUsers"] = readBy;
  return messageData;
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

const getRoomByProfileId = async function (data) {
  try {
    const query = `select 
                  r.id AS roomId,
                  r.profileId1 AS createdBy,
                  r.isAccepted,
                  r.lastMessageText,
                  r.updatedDate,
                  r.createdDate,
                  r.isDeleted,
                  p.ID AS profileId,
                  p.Username,
                  p.FirstName,
                  p.LastName,
                  p.ProfilePicName
    from chatRooms as r left join
    profile as p on p.ID = ${data.profileId2} where r.isDeleted = 'N' and (r.profileId1 = ${data.profileId1} and r.profileId2 = ${data.profileId2} OR r.profileId1 = ${data.profileId2} and r.profileId2 = ${data.profileId1})`;
    const rooms = await executeQuery(query);
    return rooms;
  } catch (error) {
    return error;
  }
};

const endCall = async function (data) {
  try {
    console.log("data==?", data);
    // const query = `
    //   UPDATE calls_logs
    //   SET
    //     isOnCall = ?,
    //     ${data.members > 0  ? 'endDate = NOW(),' :''}
    //     members = ?
    //   WHERE
    //     (groupId = ? OR roomId = ?)
    //     AND endDate IS NULL
    // `;

    let query = `
    UPDATE calls_logs
    SET 
      isOnCall = ?
  `;
    if (data.members === 0) {
      query += `,
      endDate = NOW()
    `;
    }
    query += `,
      members = ?
    WHERE 
      (groupId = ? OR roomId = ?)
      AND callLink = ?
      AND endDate IS NULL
  `;
    const params = [
      data.isOnCall,
      data.members,
      data.groupId || null,
      data.roomId || null,
      data.callLink,
    ];
    const callData = await executeQuery(query, params);
    console.log("endCallData====>", callData);

    return callData;
  } catch (error) {
    console.error("Error in endCallData:", error); // Log the error for debugging
    throw error; // Throw the error to ensure it can be handled by the caller
  }
};

const checkCall = async function (data) {
  try {
    console.log("params==>", data);
    const query = `select * from calls_logs where (groupId = ${data?.groupId} or roomId = ${data?.roomId}) and isOnCall = 'Y' and members >=  1 and endDate is null`;
    const [callData] = await executeQuery(query);
    console.log("callData", callData);

    return callData;
  } catch (error) {
    return error;
  }
};
const suspendUser = async function (params) {
  try {
    const query = "UPDATE users SET IsSuspended = ? WHERE Id= ?";
    const values = [params.isSuspended, params.id];
    const user = await executeQuery(query, values);
    return user;
  } catch (error) {
    return error;
  }
};

const sendNotificationEmail = async function (data) {
  try {
    const findUser = `select u.Email,p.FirstName,p.LastName,p.Username from users as u left join profile as p on p.UserID = u.Id where p.messageNotificationEmail = 'Y' and p.ID = ?`;
    const values = [data?.profileId];
    const userData = await executeQuery(findUser, values);
    if (userData?.length) {
      const senderData = await getRoom(data?.roomId);
      console.log(senderData);
      const userDetails = {
        email: userData[0].Email,
        userName: userData[0].Username,
        senderUsername: senderData.Username,
        type: "message",
        roomId: senderData?.roomId,
      };
      await notificationMail(userDetails);
    } else {
      return true;
    }
  } catch (error) {
    return error;
  }
};
