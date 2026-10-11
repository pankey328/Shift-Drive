const { Hub, User } = require("../models");

const createHub = async (hubData) => {
  return await Hub.create(hubData);
};

const getAllHubs = async () => {
  return await Hub.findAll({
    include: [
      {
        model: User,
        as: "Manager",
        attributes: ["userId", "name", "email", "phone"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
};

const findHubById = async (hubId) => {
  return await Hub.findByPk(hubId);
};

const findHubWithManager = async (hubId) => {
  return await Hub.findByPk(hubId, {
    include: [
      {
        model: User,
        as: "Manager",
        attributes: ["userId", "name", "email", "phone"],
      },
    ],
  });
};

const updateHubRecord = async (hubId, updateData) => {
  const hub = await Hub.findByPk(hubId);
  if (!hub) {
    const error = new Error("Hub not found");
    error.statusCode = 404;
    throw error;
  }
  return await hub.update(updateData);
};

const assignManagerToHub = async (hubId, managerId) => {
  const hub = await Hub.findByPk(hubId);
  if (!hub) {
    const error = new Error("Hub not found");
    error.statusCode = 404;
    throw error;
  }
  hub.manager_id = managerId;
  await hub.save();
  return hub;
};

const deleteHubRecord = async (hubId) => {
  const hub = await Hub.findByPk(hubId);
  if (!hub) {
    const error = new Error("Hub not found");
    error.statusCode = 404;
    throw error;
  }
  await hub.destroy();
  return true;
};

module.exports = {
  createHub,
  getAllHubs,
  findHubById,
  findHubWithManager,
  updateHubRecord,
  assignManagerToHub,
  deleteHubRecord,
};

