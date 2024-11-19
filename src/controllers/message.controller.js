const Message = require("../models/message.model");
const utils = require("../helpers/utils");
const { getPagination, getCount, getPaginationData } = require("../helpers/fn");

exports.getMessages = async (req, res) => {
  const { page, size, roomId, groupId } = req.body;
  const { limit, offset } = getPagination(page, size);
  const data = await Message.getMessages(limit, offset, roomId, groupId);
  const messageData = getPaginationData(
    { count: data.count, docs: data.messageList },
    page,
    limit
  );
  messageData["readUsers"] = data.readUsers;
  return res.send(messageData);
};

exports.getMembers = async (req, res) => {
  try {
    const groupId = req.params.id;
    const { searchText } = req.query;
    const data = await Message.getMembers(groupId, searchText);
    return res.send({ data: data });
  } catch (error) {
    return res.status(500).send(error);
  }
};

exports.getGroup = async function (req, res) {
  try {
    if (req.params.id) {
      const groups = await Message.getGroup(req.params.id);
      res.send({ error: false, data: groups });
    } else {
      res.status(404).send({ error: true, message: "group not found" });
    }
  } catch (error) {
    return error;
  }
};

exports.getRoom = async function (req, res) {
  try {
    if (req.params.id) {
      const room = await Message.getRoom(req.params.id);
      res.send({ error: false, data: room });
    } else {
      res.status(404).send({ error: true, message: "room not found" });
    }
  } catch (error) {
    return error;
  }
};

exports.getMedia = async function (req, res) {
  try {
    const { roomId, groupId, page, size } = req.body;
    const { limit, offset } = getPagination(page, size);
    const data = await Message.getMedia(roomId, groupId, limit, offset);
    if (data) {
      const mediaList = getPaginationData(
        { count: data.count, docs: data.mediaList },
        page,
        limit
      );
      return res.send(mediaList);
    } else {
      res.send({ error: false, message: "no media found" });
    }
  } catch (error) {
    return error;
  }
};
