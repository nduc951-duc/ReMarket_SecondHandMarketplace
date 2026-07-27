const { z } = require('zod');

const nonEmptyString = z.string().trim().min(1);
const idParamsSchema = z.object({
  id: nonEmptyString,
});
const paymentMethodSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.enum(['momo', 'vnpay']));

const createProduct = {
  body: z
    .object({
      title: z.string().trim().min(10).max(200),
      description: z.string().trim().optional().default(''),
      price: z.coerce.number().finite().positive(),
      category: nonEmptyString,
      condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']).optional().default('good'),
      images: z.array(nonEmptyString).max(5).optional().default([]),
      image_url: z.string().trim().optional().default(''),
      location: z.string().trim().optional().default(''),
      is_negotiable: z.boolean().optional().default(false),
    })
    .refine((body) => body.image_url || body.images.length > 0, {
      path: ['images'],
      message: 'At least one product image is required',
    }),
};

const createTransaction = {
  body: z.object({
    product_id: nonEmptyString,
    payment_method: z.enum(['cod', 'momo', 'vnpay']).optional().default('cod'),
    note: z.string().optional(),
  }),
};

const updateTransactionStatus = {
  params: idParamsSchema,
  body: z.object({
    status: z.enum([
      'awaiting_payment',
      'pending',
      'confirmed',
      'shipped',
      'completed',
      'cancelled',
    ]),
    rejection_reason: z.string().trim().optional(),
  }),
};

const createReview = {
  body: z.object({
    transaction_id: nonEmptyString,
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(500).optional(),
  }),
};

const sendChatMessage = {
  body: z
    .object({
      conversation_id: nonEmptyString.optional(),
      receiver_id: nonEmptyString.optional(),
      product_id: nonEmptyString.optional(),
      content: z.string().trim().min(1).max(2000),
      client_message_id: z.string().trim().min(1).max(200).optional(),
    })
    .refine((body) => body.conversation_id || body.receiver_id, {
      path: ['conversation_id'],
      message: 'conversation_id or receiver_id is required',
    }),
};

const createPayment = {
  body: z
    .object({
      paymentMethod: paymentMethodSchema,
      orderId: nonEmptyString,
      amount: z.coerce.number().finite().positive().optional(),
      orderInfo: z.string().optional(),
      returnUrl: z.string().optional(),
      notifyUrl: z.string().optional(),
      extraData: z.string().optional(),
      bankCode: z.string().optional(),
      lang: z.string().optional(),
    })
    .passthrough(),
};

const refundPayment = {
  body: z
    .object({
      paymentMethod: paymentMethodSchema,
      orderId: nonEmptyString,
      amount: z.coerce.number().finite().positive().optional(),
    })
    .passthrough(),
};

const createReport = {
  body: z
    .object({
      target_type: z.enum(['product', 'user']),
      product_id: nonEmptyString.optional(),
      reported_user_id: nonEmptyString.optional(),
      reason: z.enum(['scam', 'counterfeit', 'prohibited', 'harassment', 'spam', 'other']),
      details: z.string().trim().max(2000).optional().default(''),
      evidence_urls: z.array(z.string().url()).max(5).optional().default([]),
    })
    .refine(
      (body) =>
        (body.target_type === 'product' && body.product_id) ||
        (body.target_type === 'user' && body.reported_user_id),
      {
        path: ['target_type'],
        message: 'Target identifier does not match target_type',
      },
    ),
};

const moderateReport = {
  params: idParamsSchema,
  body: z.object({
    status: z.enum(['in_review', 'resolved', 'dismissed']),
    action: z.enum(['none', 'warn', 'hide_listing', 'suspend_user']).optional().default('none'),
    note: z.string().trim().max(2000).optional().default(''),
  }),
};

module.exports = {
  createReport,
  createPayment,
  createProduct,
  createReview,
  createTransaction,
  refundPayment,
  moderateReport,
  sendChatMessage,
  updateTransactionStatus,
};
