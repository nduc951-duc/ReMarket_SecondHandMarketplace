const { FRONTEND_ORIGIN } = require('./env');

const DEFAULT_MOMO_CREATE_ENDPOINT = 'https://test-payment.momo.vn/v2/gateway/api/create';
const DEFAULT_MOMO_QUERY_ENDPOINT = 'https://test-payment.momo.vn/v2/gateway/api/query';
const DEFAULT_VNPAY_PAYMENT_ENDPOINT = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const DEFAULT_VNPAY_QUERY_ENDPOINT = 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';

module.exports = {
  defaultReturnUrl: process.env.PAYMENT_RETURN_URL || `${FRONTEND_ORIGIN}/payment/return`,
  defaultNotifyUrl: process.env.PAYMENT_NOTIFY_URL || '',
  momo: {
    partnerCode: process.env.MOMO_PARTNER_CODE || '',
    accessKey: process.env.MOMO_ACCESS_KEY || '',
    secretKey: process.env.MOMO_SECRET_KEY || '',
    partnerName: process.env.MOMO_PARTNER_NAME || 'ReMarket',
    storeId: process.env.MOMO_STORE_ID || 'ReMarketStore',
    requestType: process.env.MOMO_REQUEST_TYPE || 'captureWallet',
    createEndpoint: process.env.MOMO_CREATE_ENDPOINT || DEFAULT_MOMO_CREATE_ENDPOINT,
    queryEndpoint: process.env.MOMO_QUERY_ENDPOINT || DEFAULT_MOMO_QUERY_ENDPOINT,
  },
  vnpay: {
    tmnCode: process.env.VNPAY_TMN_CODE || '',
    hashSecret: process.env.VNPAY_HASH_SECRET || '',
    paymentEndpoint: process.env.VNPAY_PAYMENT_ENDPOINT || DEFAULT_VNPAY_PAYMENT_ENDPOINT,
    queryEndpoint: process.env.VNPAY_QUERY_ENDPOINT || DEFAULT_VNPAY_QUERY_ENDPOINT,
    version: process.env.VNPAY_VERSION || '2.1.0',
    currCode: process.env.VNPAY_CURR_CODE || 'VND',
    locale: process.env.VNPAY_LOCALE || 'vn',
    orderType: process.env.VNPAY_ORDER_TYPE || 'other',
  },
};
