const { firmaIdFromReq } = require('../utils/firmaScope');

/** req.firmaId = X-Firma-Id | ?firma_id= */
function firmaContext(req, res, next) {
  req.firmaId = firmaIdFromReq(req);
  next();
}

module.exports = { firmaContext };
