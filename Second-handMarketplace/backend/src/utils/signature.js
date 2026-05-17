const crypto = require('crypto');

function createHmacSignature(data, secretKey, algorithm = 'sha256') {
  return crypto.createHmac(algorithm, secretKey).update(data, 'utf8').digest('hex');
}

function sortObject(input = {}) {
  return Object.keys(input)
    .filter((key) => input[key] !== undefined && input[key] !== null && input[key] !== '')
    .sort()
    .reduce((acc, key) => {
      acc[key] = input[key];
      return acc;
    }, {});
}

function buildRawSignatureString(input = {}) {
  return Object.entries(sortObject(input))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

function encodeVnpayValue(value) {
  return encodeURIComponent(String(value)).replace(/%20/g, '+');
}

function buildVnpayHashData(input = {}) {
  return Object.entries(sortObject(input))
    .map(([key, value]) => `${key}=${encodeVnpayValue(value)}`)
    .join('&');
}

function buildVnpayQuery(input = {}) {
  return Object.entries(sortObject(input))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeVnpayValue(value)}`)
    .join('&');
}

function timingSafeEqual(left = '', right = '') {
  const leftBuffer = Buffer.from(String(left), 'utf8');
  const rightBuffer = Buffer.from(String(right), 'utf8');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyHmacSignature(data, signature, secretKey, algorithm = 'sha256') {
  const expectedSignature = createHmacSignature(data, secretKey, algorithm);
  return timingSafeEqual(expectedSignature, signature);
}

module.exports = {
  buildRawSignatureString,
  buildVnpayHashData,
  buildVnpayQuery,
  createHmacSignature,
  sortObject,
  verifyHmacSignature,
};
