const paymentConfig = require('../config/payment');
const PaymentContext = require('../contexts/PaymentContext');
const {
  getPayment,
  updatePaymentFromGateway,
  upsertPayment,
} = require('../services/paymentStore');
const {
  expireUnpaidTransactions,
  markTransactionPaymentCreated,
  markTransactionPaymentFailed,
  markTransactionPaymentPaid,
} = require('../services/transactionService');

function sendError(res, error, fallbackMessage) {
  const statusCode = Number(error?.statusCode) || 400;

  return res.status(statusCode).json({
    ok: false,
    message: error?.message || fallbackMessage,
  });
}

function getRequestBaseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')?.[0]?.trim()
    || req.socket?.remoteAddress
    || req.ip
    || '127.0.0.1'
  );
}

function normalizePaymentPayload(req) {
  const body = req.body || {};
  const paymentMethod = String(body.paymentMethod || '').trim().toLowerCase();
  const orderId = String(body.orderId || '').trim();
  const amount = Number(body.amount);

  if (!paymentMethod) {
    throw new Error('paymentMethod la bat buoc.');
  }

  if (!orderId) {
    throw new Error('orderId la bat buoc.');
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('amount phai lon hon 0.');
  }

  const baseUrl = getRequestBaseUrl(req);

  return {
    paymentMethod,
    orderId,
    amount,
    orderInfo: String(body.orderInfo || `Thanh toan don hang ${orderId}`).trim(),
    returnUrl: body.returnUrl || paymentConfig.defaultReturnUrl || `${baseUrl}/api/payment/return/${paymentMethod}`,
    notifyUrl: body.notifyUrl || paymentConfig.defaultNotifyUrl || `${baseUrl}/api/payment/ipn/${paymentMethod}`,
    extraData: body.extraData || '',
    bankCode: body.bankCode || '',
    lang: body.lang || 'vi',
    ipAddress: getClientIp(req),
  };
}

async function createPaymentHandler(req, res) {
  try {
    const payload = normalizePaymentPayload(req);
    const context = PaymentContext.create(payload.paymentMethod);
    const data = await context.createPayment(payload);

    upsertPayment(payload.orderId, {
      amount: payload.amount,
      orderInfo: payload.orderInfo,
      paymentMethod: payload.paymentMethod,
      requestId: data.requestId,
      status: 'pending',
      paymentUrl: data.paymentUrl,
      gatewayResponse: data.gatewayResponse,
    });

    await markTransactionPaymentCreated({
      transactionId: payload.orderId,
      paymentMethod: payload.paymentMethod,
      paymentUrl: data.paymentUrl,
    }).catch((error) => {
      console.error('Mark transaction payment created error:', error);
    });

    return res.status(201).json({
      ok: true,
      data,
    });
  } catch (error) {
    return sendError(res, error, 'Khong the tao thanh toan.');
  }
}

async function syncTransactionPaymentResult(paymentMethod, result) {
  if (!result.isValid) {
    return;
  }

  const transactionId = result.orderId;
  if (!transactionId) {
    return;
  }

  if (result.status === 'success') {
    await markTransactionPaymentPaid({
      transactionId,
      paymentMethod,
      gatewayTransactionId: result.gatewayTransactionId,
      responseCode: result.responseCode,
    });
    return;
  }

  if (result.status === 'failed') {
    await markTransactionPaymentFailed({
      transactionId,
      paymentMethod,
      gatewayTransactionId: result.gatewayTransactionId,
      responseCode: result.responseCode,
      reason: 'Thanh toan khong thanh cong.',
      paymentStatus: 'failed',
    });
  }
}

async function handleVerifiedResult(res, paymentMethod, result, isIpn = false) {
  if (result.isValid) {
    updatePaymentFromGateway(paymentMethod, result.raw);
    await syncTransactionPaymentResult(paymentMethod, result).catch((error) => {
      console.error('Sync transaction payment result error:', error);
    });
  }

  if (isIpn) {
    return res.status(200).json(result.responsePayload);
  }

  return res.status(200).json({
    ok: result.isValid,
    data: result,
    message: result.isValid ? 'Xac thuc thanh toan thanh cong.' : 'Chu ky thanh toan khong hop le.',
  });
}

async function paymentReturnHandler(req, res) {
  try {
    const paymentMethod = String(req.params.method || req.query.paymentMethod || '').trim().toLowerCase();
    const context = PaymentContext.create(paymentMethod);
    const payload = { ...req.query, ...req.body };
    const result = context.verifyReturn(payload);

    return await handleVerifiedResult(res, paymentMethod, result, false);
  } catch (error) {
    return sendError(res, error, 'Khong the xu ly return URL.');
  }
}

async function paymentIpnHandler(req, res) {
  try {
    const paymentMethod = String(req.params.method || req.query.paymentMethod || '').trim().toLowerCase();
    const context = PaymentContext.create(paymentMethod);
    const payload = { ...req.query, ...req.body };
    const result = context.verifyIpn(payload);

    return await handleVerifiedResult(res, paymentMethod, result, true);
  } catch (error) {
    if (req.params.method === 'vnpay') {
      return res.status(200).json({ RspCode: '99', Message: error.message || 'Unknown error' });
    }

    return sendError(res, error, 'Khong the xu ly IPN.');
  }
}

async function queryPaymentStatusHandler(req, res) {
  try {
    const paymentMethod = String(req.params.method || req.query.paymentMethod || '').trim().toLowerCase();
    const orderId = String(req.params.orderId || req.query.orderId || '').trim();

    if (!orderId) {
      throw new Error('orderId la bat buoc.');
    }

    const localPayment = getPayment(orderId);
    await expireUnpaidTransactions().catch((error) => {
      console.error('Expire unpaid transactions error:', error);
    });
    const shouldQueryGateway = String(req.query.gateway || '').toLowerCase() === 'true';
    let gatewayResult = null;

    if (shouldQueryGateway) {
      const context = PaymentContext.create(paymentMethod || localPayment?.paymentMethod);
      gatewayResult = await context.queryStatus({
        orderId,
        requestId: req.query.requestId || localPayment?.requestId,
      });
    }

    return res.status(200).json({
      ok: true,
      data: {
        localPayment,
        gatewayResult,
      },
    });
  } catch (error) {
    return sendError(res, error, 'Khong the truy van trang thai thanh toan.');
  }
}

async function refundPaymentHandler(req, res) {
  try {
    const paymentMethod = String(req.body?.paymentMethod || '').trim().toLowerCase();
    const context = PaymentContext.create(paymentMethod);
    const data = await context.refund(req.body || {});

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (error) {
    return res.status(501).json({
      ok: false,
      message: error.message || 'Refund chua duoc ho tro.',
    });
  }
}

module.exports = {
  createPaymentHandler,
  paymentIpnHandler,
  paymentReturnHandler,
  queryPaymentStatusHandler,
  refundPaymentHandler,
};
