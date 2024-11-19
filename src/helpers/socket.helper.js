let logger = console;
const socket = {};
const chatService = require("../service/chat-service");
const environment = require("../environments/environment");
const jwt = require("jsonwebtoken");
const Profile = require("../models/profile.model");

socket.config = (server) => {
  const io = require("socket.io")(server, {
    transports: ["websocket", "polling"],
    cors: {
      origin: "*",
    },
  });
  socket.io = io;
  let onlineUsers = [];

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.Authorization.split(" ")[1];
      if (!token) {
        const err = new Error("Unauthorized Access");
        return next(err);
      }
      let decoded = jwt.decode(token);
      jwt.verify(token, environment.JWT_SECRET_KEY, async (err, user) => {
        if (err) {
          const err = new Error("Invalid or Expired Token");
          return next(err);
        }
        socket.user = decoded.user;
        if (decoded.user.username !== "admin") {
          const [profile] = await Profile.FindById(decoded.user.id);
          if (profile?.IsSuspended === "Y") {
            const err = new Error("user has been suspended");
            return next(err);
          }
        }
        if (socket.user.id) {
          const chatData = await chatService.getRoomsIds(socket.user.id);
          if (chatData) {
            for (const roomId of chatData?.roomsIds) {
              const chat = roomId;
              socket.join(`${chat.roomId}`);
            }
            for (const groupId of chatData?.groupsIds) {
              const chat = groupId;
              socket.join(`${chat.groupId}`);
            }
          }
          socket.join(`${socket.user?.id}`);
        }
        socket.join(`${socket.user?.id}`);
        next();
      });
    } catch (error) {
      const err = new Error("Invalid or Expired Token");
      return next(err);
    }
  });

  io.sockets.on("connection", (socket) => {
    let address = socket.request.connection.remoteAddress;

    logger.info(`New Connection`, {
      address,
      id: socket.id,
    });
    socket.on("leave", (params) => {
      logger.info("leaved", {
        ...params,
        address,
        id: socket.id,
        method: "leave",
      });
      socket.leave(params.room);
    });

    socket.on("join", async (params) => {
      socket.join(params.room, {
        ...params,
      });
      logger.info("join", {
        ...params,
        address,
        id: socket.id,
        method: "join",
      });
    });
    socket.on("online-users", async (cb) => {
      logger.info("online user", {
        id: socket.id,
        method: "online",
        type: typeof cb,
      });
      const newUserId = socket.user.id;
      if (!onlineUsers.some((user) => user.userId === newUserId)) {
        const status = await chatService.userStatus(newUserId);
        console.log("userStatus", status);
        if (status) {
          onlineUsers.push({
            userId: newUserId,
            socketId: socket.id,
            status: status,
          });
        } else {
          onlineUsers.push({ userId: newUserId, socketId: socket.id });
        }
      }
      io.emit("get-users", onlineUsers);
      // return cb(onlineUsers);
    });

    socket.on("offline", () => {
      // remove user from active users
      onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);
      // send all online users to all users
      io.emit("get-users", onlineUsers);
    });

    socket.on("disconnect", () => {
      logger.info("disconnected", {
        id: socket.id,
        method: "disconnect",
      });
      onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);
      // send all online users to all users
      io.emit("get-users", onlineUsers);
    });

    socket.on("rooms", (params, cb) => {
      logger.info("Rooms", {
        id: socket.id,
        method: "rooms",
        type: typeof cb,
        params: params,
      });

      if (typeof cb === "function")
        cb({
          rooms: ["DSDsds"],
        });
    });

    socket.on("isReadNotification", async (params) => {
      logger.info("like", {
        method: "read notification",
        params: params,
      });
      try {
        if (params.profileId) {
          params["isRead"] = "Y";
          io.to(`${params.profileId}`).emit("isReadNotification_ack", params);
        }
      } catch (error) {
        return error;
      }
    });

    // Message Socket //
    socket.on("join-chat-room", async (params) => {
      socket.join(params.room, {
        ...params,
      });
      logger.info("join", {
        ...params,
        address,
        id: socket.id,
        method: "join",
      });
    });

    socket.on("get-chat-list", async (params, cb) => {
      // logger.info("get-chat", {
      //   ...params,
      //   address,
      //   id: socket.id,
      //   method: "get-chat",
      // });
      try {
        if (params) {
          const chatList = await chatService.getChatList(params);
          // for (const key in chatList) {
          //   if (Object.hasOwnProperty.call(chatList, key)) {
          //     const chat = chatList[key];
          //     socket.join(`${chat.roomId}`);
          //     console.log(socket.id);
          //   }
          // }
          if (cb) {
            // socket.emit("chat-list", chatList);
            return cb(chatList);
          }
        }
      } catch (error) {
        cb(error);
      }
    });

    socket.on("check-room", async (params, cb) => {
      logger.info("join", {
        ...params,
        address,
        id: socket.id,
        method: "join",
      });
      try {
        if (params) {
          const room = await chatService.checkRoomCreated(params);
          if (cb) {
            // socket.emit("chat-list", chatList);
            return cb(room);
          } else {
          }
        }
      } catch (error) {
        cb(error);
      }
    });

    socket.on("create-room", async (params, cb) => {
      logger.info("join", {
        ...params,
        address,
        id: socket.id,
        method: "join",
      });
      try {
        if (params) {
          const data = await chatService.createChatRoom(params);
          if (data?.room) {
            socket.join(`${data.room.roomId}`);
            if (data?.notification) {
              io.to(`${data.notification?.notificationToProfileId}`).emit(
                "notification",
                data?.notification
              );
            }
            return cb({ room: data.room });
          } else {
            return cb({ message: "Room already created" });
          }
        }
      } catch (error) {
        cd(error);
      }
    });

    socket.on("send-message", async (params, cb) => {
      logger.info("send-message", {
        ...params,
        address,
        id: socket.id,
        method: "send-message",
      });
      try {
        if (params) {
          const data = await chatService.sendMessage(params);
          console.log("new-message", data);
          if (data.newMessage) {
            if (params?.groupId) {
              if (!socket.rooms.has(`${params?.groupId}`)) {
                socket.join(`${params?.groupId}`);
              }
              io.to(`${params.groupId}`).emit("new-message", data.newMessage);
              if (data?.notification) {
                io.to(`${params.groupId || socket.user.id}`).emit(
                  "notification",
                  data?.notification
                );
              }
            } else {
              console.log("in=========>");
              if (!socket.rooms.has(`${params?.roomId}`)) {
                socket.join(`${params?.roomId}`);
              }
              io.to(`${params.roomId || socket.user.id}`).emit(
                "new-message",
                data.newMessage
              );
              if (data?.notification) {
                io.to(`${data?.notification?.notificationToProfileId}`).emit(
                  "notification",
                  data?.notification
                );
              }
            }
            // if (data?.notifications) {
            //   for (const key in data?.notifications) {
            //     if (Object.hasOwnProperty.call(data?.notifications, key)) {
            //       const notification = data?.notifications[key];
            //       io.to(`${notification.notificationToProfileId}`).emit(
            //         "notification",
            //         notification
            //       );
            //     }
            //   }
            // }
            return cb(data.newMessage);
          }
        }
      } catch (error) {
        cb(error);
      }
    });

    socket.on("read-message", async (params, cb) => {
      logger.info("read-message", {
        ...params,
        address,
        id: socket.id,
        method: "read-message",
      });
      try {
        if (params) {
          const data = await chatService.readMessage(params);
          if (params?.profileId) {
            console.log(data);
            io.to(params?.profileId).emit("seen-room-message", data);
          }
          if (data) {
            return cb(data);
          }
        }
      } catch (error) {
        cb(error);
      }
    });

    socket.on("read-group-message", async (params, cb) => {
      logger.info("read-group-message", {
        ...params,
        address,
        id: socket.id,
        method: "read-group-message",
      });
      try {
        if (params) {
          const data = await chatService.readGroupMessage(params);
          if (params?.groupId) {
            console.log("read-message-user", data);
            io.to(`${params?.groupId}`).emit("read-message-user", data);
          }
          if (data) {
            return cb(data);
          }
        }
      } catch (error) {
        cb(error);
      }
    });

    socket.on("accept-room", async (params, cb) => {
      logger.info("accept-room", {
        ...params,
        address,
        id: socket.id,
        method: "accept-room",
      });
      try {
        if (params) {
          const data = await chatService.acceptRoom(params);
          console.log(data);
          if (data) {
            if (!socket.rooms.has(`${data?.room?.roomId}`)) {
              socket.join(`${data?.room?.roomId}`);
            }
            io.to(`${data?.notification?.notificationToProfileId}`).emit(
              "notification",
              data?.notification
            );
            io.to(`${data?.notification?.notificationToProfileId}`).emit(
              "accept-invitation",
              data?.room
            );
            return cb(data?.room);
          }
        }
      } catch (error) {
        return cb(error);
      }
    });

    socket.on("edit-message", async (params, cb) => {
      logger.info("edit-message", {
        ...params,
        address,
        id: socket.id,
        method: "edit-message",
      });
      try {
        if (params) {
          const data = await chatService.editMessage(params);
          if (params.groupId) {
            io.to(`${params?.groupId}`).emit("new-message", data);
          } else {
            io.to(`${params?.profileId}`).emit("new-message", data);
          }
          if (data) {
            return cb(data);
          }
        }
      } catch (error) {
        return cb(error);
      }
    });

    socket.on("delete-message", async (params, cb) => {
      logger.info("delete-message", {
        ...params,
        address,
        id: socket.id,
        method: "delete-message",
      });
      try {
        if (params) {
          const data = await chatService.deleteMessage(params);
          io.to(`${params?.profileId}`).emit("new-message", data);
          if (data) {
            return cb(data);
          }
        }
      } catch (error) {
        return cb(error);
      }
    });

    socket.on("delete-room", async (params, cb) => {
      logger.info("delete-room", {
        ...params,
        address,
        id: socket.id,
        method: "delete-room",
      });
      try {
        if (params) {
          const data = await chatService.deleteRoom(params);
          console.log(data);
          if (data?.notification) {
            io.to(`${data.notification?.notificationToProfileId}`).emit(
              "notification",
              data?.notification
            );
          }
          if (data) {
            return cb(data);
          }
        }
      } catch (error) {
        return cb(error);
      }
    });

    socket.on("start-call", async (params, cb) => {
      logger.info("start-call", {
        ...params,
        address,
        id: socket.id,
        method: "start-call",
      });
      try {
        if (params) {
          const data = await chatService.startCall(params);
          if (data?.notification) {
            if (params.groupId) {
              console.log("in=========>");
              io.to(`${params.groupId}`).emit("new-message", data.newMessage);
              io.to(`${params.groupId}`).emit(
                "notification",
                data?.notification
              );
            } else {
              console.log("in=========>");
              io.to(`${params.roomId}`).emit("new-message", data.newMessage);
              io.to(`${params.roomId}`).emit(
                "notification",
                data?.notification
              );
            }
            // for (const key in data?.notifications) {
            //   if (Object.hasOwnProperty.call(data?.notifications, key)) {
            //     const notification = data?.notifications[key];
            //     io.to(`${notification.notificationToProfileId}`).emit(
            //       "notification",
            //       notification
            //     );
            //   }
            // }
          }
        }
      } catch (error) {
        return cb(error);
      }
    });

    socket.on("decline-call", async (params, cb) => {
      logger.info("decile-call", {
        ...params,
        address,
        id: socket.id,
        method: "decline-call",
      });
      try {
        if (params) {
          const data = await chatService.declineCall(params);
          if (params?.roomId) {
            io.to(`${params?.roomId}`).emit("notification", data);
            return cb(true);
          } else if (params.groupId) {
            console.log("decline-group-calll===>>>>>>>>>>>>>>>>>>>>>", data);
            io.to(`${params?.groupId}`).emit("notification", data);
            return cb(true);
          }
        }
      } catch (error) {
        return cb(error);
      }
    });

    socket.on("pick-up-call", async (params, cb) => {
      logger.info("pick-up-call", {
        ...params,
        address,
        id: socket.id,
        method: "pick-up-call",
      });
      try {
        if (params) {
          const data = await chatService.pickUpCall(params);
          if (params?.roomId) {
            io.to(`${params?.roomId}`).emit("notification", data);
            return cb(true);
          } else {
            io.to(`${params?.notificationToProfileId}`).emit(
              "notification",
              data
            );
            return cb(true);
          }
        }
      } catch (error) {
        return cb(error);
      }
    });

    // Group chats //
    socket.on("create-group", async (params, cb) => {
      logger.info("create-group", {
        ...params,
        address,
        id: socket.id,
        method: "create-group",
      });
      try {
        if (params) {
          const data = await chatService.createGroups(params);
          // if (params.profileIds.length > 0) {
          //   for (const id of params.profileIds) {
          //     socket.join(`${id}`);
          //   }
          // }
          socket.join(`${data.groupId}`);
          if (data?.notifications) {
            for (const notification of data?.notifications) {
              if (notification?.notificationToProfileId) {
                io.to(`${notification?.notificationToProfileId}`).emit(
                  "notification",
                  notification
                );
              }
            }
          } else {
            console.warn("No notifications found in data.");
          }
          return cb(data?.groupList);
        }
      } catch (error) {
        return cb(error);
      }
    });

    socket.on("get-group-list", async (params, cb) => {
      // logger.info("get-group", {
      //   ...params,
      //   address,
      //   id: socket.id,
      //   method: "get-group",
      // });
      try {
        if (params) {
          const groupList = await chatService.getGroupList(params);
          // for (const key in groupList) {
          //   if (Object.hasOwnProperty.call(groupList, key)) {
          //     const group = groupList[key];
          //     // io.to(`${group.groupId}`).emit("join", group);
          //     socket.join(`${group.groupId}`);
          //     console.log(socket.id);
          //   }
          // }
          if (cb) {
            return cb(groupList);
          }
        }
      } catch (error) {
        cb(error);
      }
    });

    socket.on("get-group", async (params, cb) => {
      logger.info("get-group", {
        ...params,
        address,
        id: socket.id,
        method: "get-group",
      });
      try {
        if (params) {
          const groupList = await chatService.getGroup(params);
          if (cb) {
            return cb(groupList);
          }
        }
      } catch (error) {
        cb(error);
      }
    });

    socket.on("remove-member", async (params, cb) => {
      logger.info("remove-member", {
        ...params,
        address,
        id: socket.id,
        method: "remove-member",
      });
      try {
        if (params) {
          const groupList = await chatService.removeMember(params);
          if (cb) {
            return cb(groupList);
          }
        }
      } catch (error) {
        cb(error);
      }
    });

    socket.on("start-typing", async (params, cb) => {
      logger.info("start-typing", {
        ...params,
        address,
        id: socket.id,
        method: "start-typing",
      });
      try {
        if (params) {
          const data = {
            profileId: params.profileId,
            isTyping: params.isTyping,
            roomId: params.roomId,
            groupId: params.groupId,
          };
          data["Username"] = await chatService.getUserDetails(data.profileId);
          if (params.roomId) {
            io.to(`${data?.roomId || socket.user.id}`).emit("typing", data);
          } else {
            io.to(`${data?.groupId || socket.user.id}`).emit("typing", data);
          }
          if (cb) {
            return cb();
          }
        }
      } catch (error) {
        cb(error);
      }
    });

    socket.on("switch-group", async (params, cb) => {
      logger.info("switch-group", {
        ...params,
        address,
        id: socket.id,
        method: "switch-group",
      });
      try {
        if (params) {
          const data = await chatService.switchChat(params);
          if (cb) {
            return cb(true);
          }
        }
      } catch (error) {
        cb(error);
      }
    });

    socket.on("resend-chat-invite", async (params, cb) => {
      logger.info("resend-chat-invite", {
        ...params,
        address,
        id: socket.id,
        method: "resend-chat-invite",
      });
      try {
        if (params) {
          const data = await chatService.resendRoom(params);
          console.log(data);
          if (data.notification) {
            io.to(`${data.notification.notificationToProfileId}`).emit(
              "notification",
              data.notification
            );
          }
          if (cb) {
            return cb(data);
          }
        }
      } catch (error) {
        cb(error);
      }
    });
    socket.on("change-status", async (params, cb) => {
      logger.info("change-status", {
        ...params,
        address,
        id: socket.id,
        method: "change-status",
      });
      try {
        if (params) {
          const data = await chatService.changeUserStatus(params);
          if (cb) {
            return cb(data);
          }
        }
      } catch (error) {
        cb(error);
      }
    });

    socket.on("get-messages", async (params, cb) => {
      logger.info("get-messages", {
        ...params,
        address,
        id: socket.id,
        method: "get-messages",
      });
      try {
        if (params) {
          const data = await chatService.getMessages(params);
          console.log("messageList==>", data);
          if (cb) {
            return cb(data);
          }
        }
      } catch (error) {
        cb(error);
      }
    });

    socket.on("check-call", async (params, cb) => {
      logger.info("check-call", {
        ...params,
        address,
        id: socket.id,
        method: "check-call",
      });
      try {
        if (params) {
          const data = await chatService.checkCall(params);
          if (cb) {
            return cb(data);
          }
        }
      } catch (error) {
        cb(error);
      }
    });

    socket.on("end-call", async (params) => {
      logger.info("end-call", {
        ...params,
        address,
        id: socket.id,
        method: "end-call",
      });
      try {
        if (params) {
          const data = await chatService.endCall(params);
          if (params.roomId) {
            return io.to(`${params.roomId}`).emit("notification", {
              actionType: "EC",
              roomId: params.roomId,
              notificationByProfileId: params.profileId,
            });
          }
          return;
        }
      } catch (error) {
        return error;
      }
    });

    socket.on("suspend-user", async (params, cb) => {
      logger.info("suspend-user", {
        ...params,
        address,
        id: socket.id,
        method: "suspend-user",
      });
      try {
        if (params) {
          const data = await chatService.suspendUser(params);
          const notificationData = {
            actionType: "S",
            notificationDesc: "Your account has been suspended by Admin",
          };
          if (data) {
            if (params.isSuspended === "Y") {
              io.to(`${params.profileId}`).emit(
                "notification",
                notificationData
              );
            }
            cb({
              error: false,
              message:
                params.isSuspended === "Y"
                  ? "User suspend successfully"
                  : "User unsuspend successfully",
            });
          }
        }
      } catch (error) {
        cb(error);
      }
    });
  });
};

module.exports = socket;
