const assert = require('node:assert/strict');
const test = require('node:test');

const validateRequest = require('../src/middlewares/validateRequest');
const {
  createPayment,
  createProduct,
  createReview,
  createTransaction,
  refundPayment,
  sendChatMessage,
  updateTransactionStatus,
} = require('../src/validation/requestSchemas');

function runValidation(schemas, request) {
  let nextValue;
  validateRequest(schemas)(request, {}, (value) => {
    nextValue = value;
  });
  return nextValue;
}

test('product creation reports field-level errors', () => {
  const error = runValidation(createProduct, {
    body: { title: 'short', price: -1, category: '' },
  });

  assert.equal(error.code, 'VALIDATION_ERROR');
  assert.equal(error.statusCode, 400);
  assert.ok(error.fields['body.title']);
  assert.ok(error.fields['body.price']);
  assert.ok(error.fields['body.category']);
  assert.ok(error.fields['body.images']);
});

test('product creation accepts image_url and normalizes numeric price', () => {
  const request = {
    body: {
      title: 'A valid product title',
      price: '125000',
      category: 'electronics',
      image_url: '/uploads/product.jpg',
    },
  };

  const error = runValidation(createProduct, request);

  assert.equal(error, undefined);
  assert.equal(request.body.price, 125000);
  assert.equal(request.body.condition, 'good');
});

test('transaction creation requires product_id', () => {
  const error = runValidation(createTransaction, { body: {} });

  assert.equal(error.code, 'VALIDATION_ERROR');
  assert.ok(error.fields['body.product_id']);
});

test('transaction status rejects unsupported values', () => {
  const error = runValidation(updateTransactionStatus, {
    params: { id: 'transaction-1' },
    body: { status: 'unknown' },
  });

  assert.equal(error.code, 'VALIDATION_ERROR');
  assert.ok(error.fields['body.status']);
});

test('review rating must be an integer from one to five', () => {
  const error = runValidation(createReview, {
    body: { transaction_id: 'transaction-1', rating: 6 },
  });

  assert.equal(error.code, 'VALIDATION_ERROR');
  assert.ok(error.fields['body.rating']);
});

test('review comment cannot exceed 500 characters', () => {
  const error = runValidation(createReview, {
    body: {
      transaction_id: 'transaction-1',
      rating: 5,
      comment: 'x'.repeat(501),
    },
  });

  assert.equal(error.code, 'VALIDATION_ERROR');
  assert.ok(error.fields['body.comment']);
});

test('payment creation validates provider, order, and amount', () => {
  const error = runValidation(createPayment, {
    body: { paymentMethod: 'cash', orderId: '', amount: 0 },
  });

  assert.equal(error.code, 'VALIDATION_ERROR');
  assert.ok(error.fields['body.paymentMethod']);
  assert.ok(error.fields['body.orderId']);
  assert.ok(error.fields['body.amount']);
});

test('payment creation normalizes provider and amount', () => {
  const request = {
    body: { paymentMethod: 'MoMo', orderId: 'order-1', amount: '25000' },
  };

  const error = runValidation(createPayment, request);

  assert.equal(error, undefined);
  assert.equal(request.body.paymentMethod, 'momo');
  assert.equal(request.body.amount, 25000);
});

test('refund requires an order ID', () => {
  const error = runValidation(refundPayment, {
    body: { paymentMethod: 'vnpay' },
  });

  assert.equal(error.code, 'VALIDATION_ERROR');
  assert.ok(error.fields['body.orderId']);
});

test('chat message requires content and a trusted conversation resolution path', () => {
  const error = runValidation(sendChatMessage, {
    body: { content: '' },
  });

  assert.equal(error.code, 'VALIDATION_ERROR');
  assert.ok(error.fields['body.content']);
  assert.ok(error.fields['body.conversation_id']);
});
