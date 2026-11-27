const { companyIdFromReq } = require('../utils/firmaScope');

/** req.firmaId = X-Firma-Id | ?company_id= */
function companyContext(req, res, next) {
  req.firmaId = companyIdFromReq(req);
  next();
}

module.exports = { companyContext };
