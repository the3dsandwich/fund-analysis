const TARGET_COMPANIES = {
  '0001': 'JPMorgan',
  '0002': 'Fidelity',
  '0003': 'Invesco',
  '0004': 'Allianz',
  '0005': 'UBS',
  '0006': 'Franklin Templeton',
  '0007': 'Schroders',
  '0009': 'Aberdeen',
  '0010': 'Franklin Templeton',
  '0012': 'Alliance Bernstein',
  '0018': 'Janus Henderson',
  '0040': 'BlackRock',
  '0047': 'Ninety One',
  '0058': 'Morgan Stanley',
  '0060': 'Amundi',
  '0062': 'Janus Henderson',
  '0072': 'MFS',
  '0074': 'Goldman Sachs',
  '0075': 'Eastspring',
  '0081': 'DWS',
  '0084': 'PIMCO',
  '0093': 'Pictet',
};

const PARENT_PREFIXES = Object.keys(TARGET_COMPANIES);

const SEARCH_API_URL = 'https://www.cathaybk.com.tw/cathaybk/web/api/investment/searchfunds';
const SEARCH_API_DATASOURCE = '{C0550DA7-B7C8-403A-B211-AD560704F493}';

const FUND_DETAIL_URL = 'https://www.cathaybk.com.tw/cathaybk/personal/investment/fund/details/?fundid=';

const getCompanyForFundId = (fundId) => {
  const prefix = fundId.substring(0, 4);
  return TARGET_COMPANIES[prefix] || null;
};

const isTargetFund = (fundId) => {
  const prefix = fundId.substring(0, 4);
  return PARENT_PREFIXES.includes(prefix);
};

module.exports = {
  TARGET_COMPANIES,
  PARENT_PREFIXES,
  SEARCH_API_URL,
  SEARCH_API_DATASOURCE,
  FUND_DETAIL_URL,
  getCompanyForFundId,
  isTargetFund,
};
