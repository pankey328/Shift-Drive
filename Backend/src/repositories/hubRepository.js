const { Hub } = require("../models");

const createHub = async (hubData) => {
  return await Hub.create(hubData);
};

const getAllHubs = async () => {
  return await Hub.findAll();
};

module.exports = { createHub, getAllHubs };
