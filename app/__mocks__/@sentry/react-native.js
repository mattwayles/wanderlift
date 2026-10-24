/* global jest */
module.exports = {
  init: jest.fn(),
  wrap: (c) => c,
  captureException: jest.fn(),
};
