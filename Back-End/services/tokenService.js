const generateToken = require('../utils/generateToken');

exports.generateJwtToken = (id) => {
  return generateToken(id);
};
