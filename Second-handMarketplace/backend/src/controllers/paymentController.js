const paymentConfig = require('../config/payment');
const PaymentContext = require('../contexts/PaymentContext');
const { getPayment, updatePaymentFromGateway, upsertPayment } = require('../services/paymentStore');
const {
  processVerifiedPaymentCallback,
  sanitizeGatewayPayload,
} = require('../services/paymentCallbackService');
const {
  expireUnpaidTransactions,
  markTransactionPaymentCreated,
  prepareTransactionPayment,
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
    req.headers['x-forwarded-for']?.split(',')?.[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    '127.0.0.1'
  );
}

function normalizePaymentPayload(req) {
  const body = req.body || {};
  const paymentMethod = String(body.paymentMethod || '')
    .trim()
    .toLowerCase();
  const orderId = String(body.orderId || '').trim();
  const amount = Number(body.amount);

  if (!paymentMethod) {
    throw new Error('paymentMethod la bat buoc.');
  }

  if (!orderId) {
    throw new Error('orderId la bat buoc.');
  }

  if (body.amount != null && (!Number.isFinite(amount) || amount <= 0)) {
    throw new Error('amount phai lon hon 0.');
  }

  const baseUrl = getRequestBaseUrl(req);

  return {
    paymentMethod,
    orderId,
    amount,
    orderInfo: String(body.orderInfo || `Thanh toan don hang ${orderId}`).trim(),
    returnUrl:
      body.returnUrl ||
      paymentConfig.defaultReturnUrl ||
      `${baseUrl}/api/payment/return/${paymentMethod}`,
    notifyUrl:
      body.notifyUrl ||
      paymentConfig.defaultNotifyUrl ||
      `${baseUrl}/api/payment/ipn/${paymentMethod}`,
    extraData: body.extraData || '',
    bankCode: body.bankCode || '',
    lang: body.lang || 'vi',
    ipAddress: getClientIp(req),
  };
}

async function createPaymentHandler(req, res) {
  try {
    const payload = normalizePaymentPayload(req);
    const transaction = await prepareTransactionPayment({
      transactionId: payload.orderId,
      buyerId: req.user.id,
      paymentMethod: payload.paymentMethod,
    });
    payload.amount = Number(transaction.amount);
    payload.currency = String(transaction.payment_currency || 'VND').toUpperCase();

    const context = PaymentContext.create(payload.paymentMethod);
    const data = await context.createPayment(payload);
    const publicPaymentData = { ...data };
    delete publicPaymentData.signedPayload;

    upsertPayment(payload.orderId, {
      amount: payload.amount,
      orderInfo: payload.orderInfo,
      paymentMethod: payload.paymentMethod,
      requestId: data.requestId,
      status: 'pending',
      paymentUrl: data.paymentUrl,
      gatewayResponse: data.gatewayResponse,
    });

    const updatedTransaction = await markTransactionPaymentCreated({
      transactionId: payload.orderId,
      paymentMethod: payload.paymentMethod,
    });

    return res.status(201).json({
      ok: true,
      data: {
        ...publicPaymentData,
        expiresAt: updatedTransaction?.payment_expires_at || transaction.payment_expires_at,
      },
    });
  } catch (error) {
    return sendError(res, error, 'Khong the tao thanh toan.');
  }
}

async function syncTransactionPaymentResult(paymentMethod, result) {
  return processVerifiedPaymentCallback(paymentMethod, result);
}

function getIpnResponse(paymentMethod, defaultResponse, processingResult) {
  if (paymentMethod !== 'vnpay' || !processingResult) {
    return defaultResponse;
  }

  if (processingResult.replayed) {
    return { RspCode: '02', Message: 'Order Already Update' };
  }

  const responseByOutcome = {
    processed: { RspCode: '00', Message: 'Confirm Success' },
    transaction_not_found: { RspCode: '01', Message: 'Order Not Found' },
    amount_mismatch: { RspCode: '04', Message: 'Invalid Amount' },
    currency_mismatch: { RspCode: '04', Message: 'Invalid Currency' },
    invalid_state: { RspCode: '02', Message: 'Order Already Update' },
    expired: { RspCode: '02', Message: 'Order Already Update' },
    provider_mismatch: { RspCode: '99', Message: 'Invalid Provider' },
    provider_transaction_conflict: {
      RspCode: '99',
      Message: 'Provider Transaction Conflict',
    },
  };

  return responseByOutcome[processingResult.outcome] || defaultResponse;
}

async function handleVerifiedResult(res, paymentMethod, result, isIpn = false) {
  let processingResult = null;

  if (result.isValid) {
    const sanitizedPayload = sanitizeGatewayPayload(result.raw);
    processingResult = await syncTransactionPaymentResult(paymentMethod, result);
    updatePaymentFromGateway(paymentMethod, sanitizedPayload);
  }

  if (isIpn) {
    return res
      .status(200)
      .json(getIpnResponse(paymentMethod, result.responsePayload, processingResult));
  }

  return res.status(200).json({
    ok: result.isValid,
    data: {
      ...result,
      raw: sanitizeGatewayPayload(result.raw),
      processing: processingResult,
    },
    message: result.isValid ? 'Xac thuc thanh toan thanh cong.' : 'Chu ky thanh toan khong hop le.',
  });
}

async function paymentReturnHandler(req, res) {
  try {
    const paymentMethod = String(req.params.method || req.query.paymentMethod || '')
      .trim()
      .toLowerCase();
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
    const paymentMethod = String(req.params.method || req.query.paymentMethod || '')
      .trim()
      .toLowerCase();
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
    const paymentMethod = String(req.params.method || req.query.paymentMethod || '')
      .trim()
      .toLowerCase();
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
        transactionDate: req.query.transactionDate || localPayment?.gatewayResponse?.vnp_CreateDate,
        orderInfo: localPayment?.orderInfo,
        ipAddress: getClientIp(req),
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
    const paymentMethod = String(req.body?.paymentMethod || '')
      .trim()
      .toLowerCase();
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
