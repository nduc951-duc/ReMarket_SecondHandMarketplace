const errorResponse = {
  description: 'Request failed. The response includes a stable error code and request ID.',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponse' },
    },
  },
};

const successResponse = (description, schema) => ({
  description,
  content: {
    'application/json': {
      schema,
    },
  },
});

const jsonRequest = (schema, example) => ({
  required: true,
  content: {
    'application/json': {
      schema,
      example,
    },
  },
});

const bearerSecurity = [{ bearerAuth: [] }];
const optionalBearerSecurity = [{ bearerAuth: [] }, {}];

const openapiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'ReMarket API',
    version: '1.0.0',
    description:
      'HTTP API for the ReMarket second-hand marketplace. Login and access-token issuance are handled by Supabase Auth; send the resulting JWT as `Bearer <token>`.',
  },
  servers: [
    {
      url: '/',
      description: 'Current ReMarket backend',
    },
  ],
  tags: [
    {
      name: 'Auth',
      description: 'Email verification, password recovery, and authenticated password changes.',
    },
    {
      name: 'Products',
      description: 'Public product discovery and owner-only listing mutations.',
    },
    {
      name: 'Transactions',
      description: 'Buyer/seller order lifecycle operations.',
    },
    {
      name: 'Payment',
      description: 'MoMo/VNPAY payment creation, callbacks, queries, and refunds.',
    },
    {
      name: 'Admin',
      description: 'Administration endpoints for admin and support-agent roles.',
    },
  ],
  security: bearerSecurity,
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        operationId: 'requestSignupVerification',
        summary: 'Register and send a verification email',
        description:
          'Public endpoint. Creates a Supabase signup link and sends it by email. It does not return an access token.',
        security: [],
        'x-roles': ['public'],
        requestBody: jsonRequest(
          { $ref: '#/components/schemas/RegisterRequest' },
          {
            fullName: 'Nguyen Van A',
            email: 'buyer@example.com',
            password: 'StrongPassword123',
          },
        ),
        responses: {
          200: successResponse('Verification email sent.', {
            $ref: '#/components/schemas/MessageResponse',
          }),
          400: errorResponse,
          409: errorResponse,
          429: errorResponse,
          500: errorResponse,
        },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        operationId: 'requestPasswordRecovery',
        summary: 'Request a password recovery email',
        description:
          'Public endpoint. Returns the same success shape when the email does not exist.',
        security: [],
        'x-roles': ['public'],
        requestBody: jsonRequest(
          { $ref: '#/components/schemas/EmailRequest' },
          { email: 'buyer@example.com' },
        ),
        responses: {
          200: successResponse('Recovery request accepted.', {
            $ref: '#/components/schemas/MessageResponse',
          }),
          400: errorResponse,
          429: errorResponse,
          500: errorResponse,
        },
      },
    },
    '/api/auth/resend-verification': {
      post: {
        tags: ['Auth'],
        operationId: 'resendSignupVerification',
        summary: 'Resend the account verification email',
        description: 'Public endpoint with cooldown protection.',
        security: [],
        'x-roles': ['public'],
        requestBody: jsonRequest(
          { $ref: '#/components/schemas/EmailRequest' },
          { email: 'buyer@example.com' },
        ),
        responses: {
          200: successResponse('Verification request accepted.', {
            $ref: '#/components/schemas/MessageResponse',
          }),
          400: errorResponse,
          429: errorResponse,
          500: errorResponse,
        },
      },
    },
    '/api/auth/change-password': {
      post: {
        tags: ['Auth'],
        operationId: 'changePassword',
        summary: 'Change the authenticated user password',
        description:
          'Requires a valid Supabase access token. Users can change only their own password.',
        security: bearerSecurity,
        'x-roles': ['customer', 'agent', 'admin'],
        requestBody: jsonRequest(
          { $ref: '#/components/schemas/ChangePasswordRequest' },
          {
            currentPassword: 'OldPassword123',
            newPassword: 'NewPassword456',
          },
        ),
        responses: {
          200: successResponse('Password changed.', {
            $ref: '#/components/schemas/MessageResponse',
          }),
          400: errorResponse,
          401: errorResponse,
          500: errorResponse,
        },
      },
    },
    '/api/products': {
      get: {
        tags: ['Products'],
        operationId: 'listProducts',
        summary: 'Search and list marketplace products',
        description:
          'Public endpoint. Bearer auth is optional and can expand visibility for the listing owner.',
        security: optionalBearerSecurity,
        'x-roles': ['public', 'customer', 'agent', 'admin'],
        parameters: [
          { $ref: '#/components/parameters/Page' },
          { $ref: '#/components/parameters/Limit' },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            example: 'camera',
          },
          {
            name: 'category',
            in: 'query',
            schema: { type: 'string' },
            example: 'electronics',
          },
          {
            name: 'condition',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['new', 'like_new', 'good', 'fair', 'poor'],
            },
          },
          { name: 'min_price', in: 'query', schema: { type: 'number', minimum: 0 } },
          { name: 'max_price', in: 'query', schema: { type: 'number', minimum: 0 } },
          {
            name: 'sort',
            in: 'query',
            schema: {
              type: 'string',
              enum: [
                'relevance',
                'newest',
                'oldest',
                'price_asc',
                'price_desc',
                'view_desc',
                'comment_desc',
                'rating_desc',
              ],
            },
          },
        ],
        responses: {
          200: successResponse('Product page.', {
            $ref: '#/components/schemas/ProductListResponse',
          }),
          500: errorResponse,
        },
      },
      post: {
        tags: ['Products'],
        operationId: 'createProduct',
        summary: 'Create a product listing',
        description:
          'Authenticated users only. `seller_id` is always derived from the access token and cannot be supplied by the caller.',
        security: bearerSecurity,
        'x-roles': ['customer', 'agent', 'admin'],
        requestBody: jsonRequest(
          { $ref: '#/components/schemas/ProductCreateRequest' },
          {
            title: 'Sony Alpha mirrorless camera',
            description: 'Used carefully for one year.',
            price: 8500000,
            category: 'electronics',
            condition: 'like_new',
            images: ['https://example.com/camera.jpg'],
            location: 'Ho Chi Minh City',
            is_negotiable: true,
          },
        ),
        responses: {
          201: successResponse('Product created.', {
            $ref: '#/components/schemas/ProductResponse',
          }),
          400: errorResponse,
          401: errorResponse,
          500: errorResponse,
        },
      },
    },
    '/api/products/autocomplete': {
      get: {
        tags: ['Products'],
        operationId: 'autocompleteProducts',
        summary: 'Autocomplete product titles',
        description: 'Public lightweight product search.',
        security: [],
        'x-roles': ['public'],
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            schema: { type: 'string', minLength: 2 },
            example: 'cam',
          },
        ],
        responses: {
          200: successResponse('Autocomplete results.', {
            type: 'object',
            properties: {
              ok: { type: 'boolean', example: true },
              data: {
                type: 'array',
                items: { $ref: '#/components/schemas/ProductSummary' },
              },
            },
          }),
          500: errorResponse,
        },
      },
    },
    '/api/products/seller/{sellerId}': {
      get: {
        tags: ['Products'],
        operationId: 'listSellerProducts',
        summary: 'List public products from one seller',
        description: 'Public endpoint. Bearer auth is optional.',
        security: optionalBearerSecurity,
        'x-roles': ['public', 'customer', 'agent', 'admin'],
        parameters: [
          {
            name: 'sellerId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          { $ref: '#/components/parameters/Page' },
          { $ref: '#/components/parameters/Limit' },
        ],
        responses: {
          200: successResponse('Seller product page.', {
            $ref: '#/components/schemas/ProductListResponse',
          }),
          500: errorResponse,
        },
      },
    },
    '/api/products/user/my': {
      get: {
        tags: ['Products'],
        operationId: 'listMyProducts',
        summary: 'List the current user product listings',
        description: 'Includes the authenticated owner’s hidden and sold listings.',
        security: bearerSecurity,
        'x-roles': ['customer', 'agent', 'admin'],
        parameters: [
          { $ref: '#/components/parameters/Page' },
          { $ref: '#/components/parameters/Limit' },
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/ProductStatus' } },
        ],
        responses: {
          200: successResponse('Owner product page.', {
            $ref: '#/components/schemas/ProductListResponse',
          }),
          401: errorResponse,
          500: errorResponse,
        },
      },
    },
    '/api/products/{id}': {
      get: {
        tags: ['Products'],
        operationId: 'getProduct',
        summary: 'Get a product',
        description: 'Public for visible products. Bearer auth is optional for owner visibility.',
        security: optionalBearerSecurity,
        'x-roles': ['public', 'customer', 'agent', 'admin'],
        parameters: [
          { $ref: '#/components/parameters/Id' },
          {
            name: 'skip_view',
            in: 'query',
            schema: { type: 'boolean', default: false },
          },
        ],
        responses: {
          200: successResponse('Product details.', {
            $ref: '#/components/schemas/ProductResponse',
          }),
          404: errorResponse,
          500: errorResponse,
        },
      },
      patch: {
        tags: ['Products'],
        operationId: 'updateProduct',
        summary: 'Update an owned product',
        description:
          'Authenticated owner only. Ownership comes from the token; `seller_id` is not accepted.',
        security: bearerSecurity,
        'x-roles': ['product owner'],
        parameters: [{ $ref: '#/components/parameters/Id' }],
        requestBody: jsonRequest(
          { $ref: '#/components/schemas/ProductUpdateRequest' },
          {
            price: 8000000,
            status: 'active',
            is_negotiable: true,
          },
        ),
        responses: {
          200: successResponse('Product updated.', {
            $ref: '#/components/schemas/ProductResponse',
          }),
          400: errorResponse,
          401: errorResponse,
          404: errorResponse,
          500: errorResponse,
        },
      },
      delete: {
        tags: ['Products'],
        operationId: 'deleteProduct',
        summary: 'Hide an owned product',
        description: 'Authenticated owner only. Products with open orders cannot be hidden.',
        security: bearerSecurity,
        'x-roles': ['product owner'],
        parameters: [{ $ref: '#/components/parameters/Id' }],
        responses: {
          200: successResponse('Product hidden.', {
            $ref: '#/components/schemas/MessageResponse',
          }),
          400: errorResponse,
          401: errorResponse,
          404: errorResponse,
          500: errorResponse,
        },
      },
    },
    '/api/transactions': {
      get: {
        tags: ['Transactions'],
        operationId: 'listTransactions',
        summary: 'List current user transactions',
        description: 'Returns only transactions where the token user is buyer or seller.',
        security: bearerSecurity,
        'x-roles': ['buyer', 'seller'],
        parameters: [
          {
            name: 'type',
            in: 'query',
            schema: { type: 'string', enum: ['buy', 'sell', 'all'], default: 'all' },
          },
          { $ref: '#/components/parameters/Page' },
          { $ref: '#/components/parameters/Limit' },
          {
            name: 'status',
            in: 'query',
            schema: { $ref: '#/components/schemas/TransactionStatus' },
          },
        ],
        responses: {
          200: successResponse('Transaction page.', {
            $ref: '#/components/schemas/TransactionListResponse',
          }),
          401: errorResponse,
          500: errorResponse,
        },
      },
      post: {
        tags: ['Transactions'],
        operationId: 'createTransaction',
        summary: 'Create an order for a product',
        description:
          'Authenticated buyer only. Buyer, seller, product price, and product snapshot are resolved server-side. A seller cannot buy their own product.',
        security: bearerSecurity,
        'x-roles': ['buyer'],
        requestBody: jsonRequest(
          { $ref: '#/components/schemas/TransactionCreateRequest' },
          {
            product_id: '6ff0520b-38a1-4bc4-b546-e54422de0562',
            payment_method: 'cod',
            note: 'Please pack carefully.',
          },
        ),
        responses: {
          201: successResponse('Transaction created.', {
            $ref: '#/components/schemas/TransactionResponse',
          }),
          400: errorResponse,
          401: errorResponse,
          409: errorResponse,
          500: errorResponse,
        },
      },
    },
    '/api/transactions/stats': {
      get: {
        tags: ['Transactions'],
        operationId: 'getTransactionStats',
        summary: 'Get current user transaction statistics',
        description: 'Authenticated buyer or seller.',
        security: bearerSecurity,
        'x-roles': ['buyer', 'seller'],
        responses: {
          200: successResponse('Transaction statistics.', {
            type: 'object',
            properties: {
              ok: { type: 'boolean', example: true },
              data: { type: 'object', additionalProperties: true },
            },
          }),
          401: errorResponse,
          500: errorResponse,
        },
      },
    },
    '/api/transactions/{id}': {
      get: {
        tags: ['Transactions'],
        operationId: 'getTransaction',
        summary: 'Get one transaction',
        description: 'Only its buyer or seller can read the transaction.',
        security: bearerSecurity,
        'x-roles': ['transaction buyer', 'transaction seller'],
        parameters: [{ $ref: '#/components/parameters/Id' }],
        responses: {
          200: successResponse('Transaction details.', {
            $ref: '#/components/schemas/TransactionResponse',
          }),
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          500: errorResponse,
        },
      },
    },
    '/api/transactions/{id}/status': {
      patch: {
        tags: ['Transactions'],
        operationId: 'updateTransactionStatus',
        summary: 'Advance or cancel a transaction',
        description:
          'Role depends on transition: seller confirms/ships/rejects; buyer completes receipt. Invalid transitions are rejected.',
        security: bearerSecurity,
        'x-roles': ['transaction buyer', 'transaction seller'],
        parameters: [{ $ref: '#/components/parameters/Id' }],
        requestBody: jsonRequest(
          { $ref: '#/components/schemas/TransactionStatusRequest' },
          { status: 'confirmed' },
        ),
        responses: {
          200: successResponse('Transaction updated.', {
            $ref: '#/components/schemas/TransactionResponse',
          }),
          400: errorResponse,
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          500: errorResponse,
        },
      },
    },
    '/api/payment/create': {
      post: {
        tags: ['Payment'],
        operationId: 'createPayment',
        summary: 'Create an online payment',
        description:
          'Authenticated transaction buyer only. The backend ignores caller amount and uses the stored transaction amount.',
        security: bearerSecurity,
        'x-roles': ['transaction buyer'],
        requestBody: jsonRequest(
          { $ref: '#/components/schemas/PaymentCreateRequest' },
          {
            paymentMethod: 'vnpay',
            orderId: '6b94c08d-f30c-42fb-8254-0fbe2f6da526',
            orderInfo: 'Payment for marketplace order',
          },
        ),
        responses: {
          201: successResponse('Payment URL created.', {
            $ref: '#/components/schemas/PaymentCreateResponse',
          }),
          400: errorResponse,
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          500: errorResponse,
        },
      },
    },
    '/api/payment/return/{method}': {
      get: {
        tags: ['Payment'],
        operationId: 'handlePaymentReturnGet',
        summary: 'Handle browser return from a payment provider',
        description:
          'Public provider callback. The gateway signature is verified before state changes.',
        security: [],
        'x-roles': ['payment gateway', 'public browser redirect'],
        parameters: [
          { $ref: '#/components/parameters/PaymentMethod' },
          { $ref: '#/components/parameters/GatewayQuery' },
        ],
        responses: {
          200: successResponse('Verification result.', {
            $ref: '#/components/schemas/PaymentCallbackResponse',
          }),
          400: errorResponse,
        },
      },
      post: {
        tags: ['Payment'],
        operationId: 'handlePaymentReturnPost',
        summary: 'Handle POST return from a payment provider',
        description: 'Public provider callback. Payload fields depend on MoMo or VNPAY.',
        security: [],
        'x-roles': ['payment gateway'],
        parameters: [{ $ref: '#/components/parameters/PaymentMethod' }],
        requestBody: jsonRequest(
          { type: 'object', additionalProperties: true },
          { orderId: 'order-id', resultCode: 0, signature: 'provider-signature' },
        ),
        responses: {
          200: successResponse('Verification result.', {
            $ref: '#/components/schemas/PaymentCallbackResponse',
          }),
          400: errorResponse,
        },
      },
    },
    '/api/payment/ipn/{method}': {
      get: {
        tags: ['Payment'],
        operationId: 'handlePaymentIpnGet',
        summary: 'Handle a provider IPN query callback',
        description:
          'Public gateway callback. Safe to retry: callback processing is idempotent and atomic.',
        security: [],
        'x-roles': ['payment gateway'],
        parameters: [
          { $ref: '#/components/parameters/PaymentMethod' },
          { $ref: '#/components/parameters/GatewayQuery' },
        ],
        responses: {
          200: successResponse('Gateway-compatible acknowledgement.', {
            type: 'object',
            additionalProperties: true,
          }),
        },
      },
      post: {
        tags: ['Payment'],
        operationId: 'handlePaymentIpnPost',
        summary: 'Handle a provider IPN body callback',
        description:
          'Public gateway callback. Safe to retry: callback processing is idempotent and atomic.',
        security: [],
        'x-roles': ['payment gateway'],
        parameters: [{ $ref: '#/components/parameters/PaymentMethod' }],
        requestBody: jsonRequest(
          { type: 'object', additionalProperties: true },
          { orderId: 'order-id', transId: 'provider-transaction-id', signature: 'signature' },
        ),
        responses: {
          200: successResponse('Gateway-compatible acknowledgement.', {
            type: 'object',
            additionalProperties: true,
          }),
        },
      },
    },
    '/api/payment/query/{method}/{orderId}': {
      get: {
        tags: ['Payment'],
        operationId: 'queryPayment',
        summary: 'Query locally cached or provider payment status',
        description:
          'Currently public. Set `gateway=true` to query the provider in addition to local state.',
        security: [],
        'x-roles': ['public'],
        parameters: [
          { $ref: '#/components/parameters/PaymentMethod' },
          {
            name: 'orderId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          { name: 'gateway', in: 'query', schema: { type: 'boolean', default: false } },
          { name: 'requestId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: successResponse('Payment query result.', {
            type: 'object',
            properties: {
              ok: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  localPayment: { type: 'object', nullable: true, additionalProperties: true },
                  gatewayResult: { type: 'object', nullable: true, additionalProperties: true },
                },
              },
            },
          }),
          400: errorResponse,
        },
      },
    },
    '/api/payment/refund': {
      post: {
        tags: ['Payment'],
        operationId: 'refundPayment',
        summary: 'Refund a payment',
        description: 'Admin-only endpoint. Provider refund support may return 501.',
        security: bearerSecurity,
        'x-roles': ['admin'],
        requestBody: jsonRequest(
          { $ref: '#/components/schemas/PaymentRefundRequest' },
          {
            paymentMethod: 'vnpay',
            orderId: '6b94c08d-f30c-42fb-8254-0fbe2f6da526',
            amount: 8500000,
          },
        ),
        responses: {
          200: successResponse('Refund result.', {
            type: 'object',
            properties: {
              ok: { type: 'boolean', example: true },
              data: { type: 'object', additionalProperties: true },
            },
          }),
          400: errorResponse,
          401: errorResponse,
          403: errorResponse,
          501: errorResponse,
        },
      },
    },
    '/api/admin/overview': {
      get: {
        tags: ['Admin'],
        operationId: 'getAdminOverview',
        summary: 'Get marketplace administration overview',
        description: 'Read-only administration endpoint.',
        security: bearerSecurity,
        'x-roles': ['agent', 'admin'],
        responses: {
          200: successResponse('Administration overview.', {
            $ref: '#/components/schemas/GenericDataResponse',
          }),
          401: errorResponse,
          403: errorResponse,
          500: errorResponse,
        },
      },
    },
    '/api/admin/users': {
      get: {
        tags: ['Admin'],
        operationId: 'listAdminUsers',
        summary: 'List users for administration',
        description: 'Agent or admin read access.',
        security: bearerSecurity,
        'x-roles': ['agent', 'admin'],
        parameters: [
          { $ref: '#/components/parameters/Page' },
          { $ref: '#/components/parameters/Limit' },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: successResponse('User page.', {
            $ref: '#/components/schemas/GenericDataResponse',
          }),
          401: errorResponse,
          403: errorResponse,
          500: errorResponse,
        },
      },
      post: {
        tags: ['Admin'],
        operationId: 'createAdminUser',
        summary: 'Create a user',
        description: 'Admin-only mutation.',
        security: bearerSecurity,
        'x-roles': ['admin'],
        requestBody: jsonRequest(
          { $ref: '#/components/schemas/AdminCreateUserRequest' },
          {
            email: 'agent@example.com',
            password: 'StrongPassword123',
            full_name: 'Support Agent',
            role: 'agent',
          },
        ),
        responses: {
          201: successResponse('User created.', {
            $ref: '#/components/schemas/GenericDataResponse',
          }),
          400: errorResponse,
          401: errorResponse,
          403: errorResponse,
          500: errorResponse,
        },
      },
    },
    '/api/admin/products': {
      get: {
        tags: ['Admin'],
        operationId: 'listAdminProducts',
        summary: 'List products for moderation',
        description: 'Agent or admin read access.',
        security: bearerSecurity,
        'x-roles': ['agent', 'admin'],
        parameters: [
          { $ref: '#/components/parameters/Page' },
          { $ref: '#/components/parameters/Limit' },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/ProductStatus' } },
        ],
        responses: {
          200: successResponse('Moderation product page.', {
            $ref: '#/components/schemas/GenericDataResponse',
          }),
          401: errorResponse,
          403: errorResponse,
          500: errorResponse,
        },
      },
    },
    '/api/admin/transactions': {
      get: {
        tags: ['Admin'],
        operationId: 'listAdminTransactions',
        summary: 'List transactions for administration',
        description: 'Agent or admin read access.',
        security: bearerSecurity,
        'x-roles': ['agent', 'admin'],
        parameters: [
          { $ref: '#/components/parameters/Page' },
          { $ref: '#/components/parameters/Limit' },
          {
            name: 'status',
            in: 'query',
            schema: { $ref: '#/components/schemas/TransactionStatus' },
          },
        ],
        responses: {
          200: successResponse('Administration transaction page.', {
            $ref: '#/components/schemas/GenericDataResponse',
          }),
          401: errorResponse,
          403: errorResponse,
          500: errorResponse,
        },
      },
    },
    '/api/admin/users/{id}/role': {
      patch: {
        tags: ['Admin'],
        operationId: 'updateAdminUserRole',
        summary: 'Change a user role',
        description: 'Admin-only mutation.',
        security: bearerSecurity,
        'x-roles': ['admin'],
        parameters: [{ $ref: '#/components/parameters/Id' }],
        requestBody: jsonRequest(
          {
            type: 'object',
            required: ['role'],
            properties: {
              role: { type: 'string', enum: ['customer', 'agent', 'admin'] },
            },
            additionalProperties: false,
          },
          { role: 'agent' },
        ),
        responses: {
          200: successResponse('Role updated.', {
            $ref: '#/components/schemas/GenericDataResponse',
          }),
          400: errorResponse,
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          500: errorResponse,
        },
      },
    },
    '/api/admin/users/{id}/status': {
      patch: {
        tags: ['Admin'],
        operationId: 'updateAdminUserStatus',
        summary: 'Change a user status',
        description: 'Admin-only mutation.',
        security: bearerSecurity,
        'x-roles': ['admin'],
        parameters: [{ $ref: '#/components/parameters/Id' }],
        requestBody: jsonRequest(
          {
            type: 'object',
            required: ['status'],
            properties: {
              status: { type: 'string', enum: ['active', 'blocked'] },
            },
            additionalProperties: false,
          },
          { status: 'blocked' },
        ),
        responses: {
          200: successResponse('User status updated.', {
            $ref: '#/components/schemas/GenericDataResponse',
          }),
          400: errorResponse,
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          500: errorResponse,
        },
      },
    },
    '/api/admin/products/{id}/status': {
      patch: {
        tags: ['Admin'],
        operationId: 'updateAdminProductStatus',
        summary: 'Moderate a product status',
        description: 'Admin-only mutation.',
        security: bearerSecurity,
        'x-roles': ['admin'],
        parameters: [{ $ref: '#/components/parameters/Id' }],
        requestBody: jsonRequest(
          {
            type: 'object',
            required: ['status'],
            properties: {
              status: { $ref: '#/components/schemas/ProductStatus' },
            },
            additionalProperties: false,
          },
          { status: 'banned' },
        ),
        responses: {
          200: successResponse('Product status updated.', {
            $ref: '#/components/schemas/GenericDataResponse',
          }),
          400: errorResponse,
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          500: errorResponse,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Supabase access token. Enter the JWT without adding another Bearer prefix.',
      },
    },
    parameters: {
      Id: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
      },
      Page: {
        name: 'page',
        in: 'query',
        schema: { type: 'integer', minimum: 1, default: 1 },
      },
      Limit: {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
      },
      PaymentMethod: {
        name: 'method',
        in: 'path',
        required: true,
        schema: { type: 'string', enum: ['momo', 'vnpay'] },
      },
      GatewayQuery: {
        name: 'gatewayPayload',
        in: 'query',
        description:
          'Provider-specific signed query fields. Swagger represents them as one free-form object.',
        style: 'deepObject',
        explode: true,
        schema: { type: 'object', additionalProperties: true },
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        required: ['ok', 'success', 'message', 'error'],
        properties: {
          ok: { type: 'boolean', example: false },
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Product is no longer available.' },
          error: {
            type: 'object',
            required: ['code', 'message', 'requestId'],
            properties: {
              code: { type: 'string', example: 'PRODUCT_NOT_AVAILABLE' },
              message: { type: 'string', example: 'Product is no longer available.' },
              requestId: {
                type: 'string',
                example: 'req_5b754c42-24d2-49b3-811f-cdf1c844efc2',
              },
              fields: {
                type: 'object',
                additionalProperties: {
                  type: 'array',
                  items: { type: 'string' },
                },
                example: {
                  'body.price': ['Too small: expected number to be >0'],
                },
              },
            },
          },
        },
      },
      MessageResponse: {
        type: 'object',
        required: ['ok', 'message'],
        properties: {
          ok: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully.' },
        },
      },
      GenericDataResponse: {
        type: 'object',
        required: ['ok', 'data'],
        properties: {
          ok: { type: 'boolean', example: true },
          data: { type: 'object', additionalProperties: true },
          message: { type: 'string' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['fullName', 'email', 'password'],
        additionalProperties: false,
        properties: {
          fullName: { type: 'string', minLength: 2 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password', minLength: 8 },
        },
      },
      EmailRequest: {
        type: 'object',
        required: ['email'],
        additionalProperties: false,
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        additionalProperties: false,
        properties: {
          currentPassword: { type: 'string', format: 'password' },
          newPassword: { type: 'string', format: 'password', minLength: 8 },
        },
      },
      ProductStatus: {
        type: 'string',
        enum: ['active', 'sold', 'hidden', 'banned'],
      },
      ProductSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          category: { type: 'string' },
          price: { type: 'number', minimum: 0, exclusiveMinimum: true },
        },
      },
      Product: {
        allOf: [
          { $ref: '#/components/schemas/ProductSummary' },
          {
            type: 'object',
            properties: {
              seller_id: { type: 'string', format: 'uuid' },
              description: { type: 'string' },
              condition: {
                type: 'string',
                enum: ['new', 'like_new', 'good', 'fair', 'poor'],
              },
              images: { type: 'array', items: { type: 'string', format: 'uri' } },
              image_url: { type: 'string' },
              location: { type: 'string' },
              status: { $ref: '#/components/schemas/ProductStatus' },
              is_negotiable: { type: 'boolean' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
            },
          },
        ],
      },
      ProductCreateRequest: {
        type: 'object',
        required: ['title', 'price', 'category'],
        additionalProperties: false,
        properties: {
          title: { type: 'string', minLength: 10, maxLength: 200 },
          description: { type: 'string' },
          price: { type: 'number', minimum: 0, exclusiveMinimum: true },
          category: { type: 'string', minLength: 1 },
          condition: {
            type: 'string',
            enum: ['new', 'like_new', 'good', 'fair', 'poor'],
            default: 'good',
          },
          images: {
            type: 'array',
            maxItems: 5,
            items: { type: 'string', minLength: 1 },
          },
          image_url: { type: 'string' },
          location: { type: 'string' },
          is_negotiable: { type: 'boolean', default: false },
        },
        description: 'At least one value in `images` or `image_url` is required.',
      },
      ProductUpdateRequest: {
        type: 'object',
        minProperties: 1,
        additionalProperties: false,
        properties: {
          title: { type: 'string', minLength: 10, maxLength: 200 },
          description: { type: 'string' },
          price: { type: 'number', minimum: 0, exclusiveMinimum: true },
          category: { type: 'string' },
          condition: {
            type: 'string',
            enum: ['new', 'like_new', 'good', 'fair', 'poor'],
          },
          images: {
            type: 'array',
            maxItems: 5,
            items: { type: 'string', minLength: 1 },
          },
          image_url: { type: 'string' },
          location: { type: 'string' },
          status: { type: 'string', enum: ['active', 'sold', 'hidden'] },
          is_negotiable: { type: 'boolean' },
        },
        description: 'Partial product fields. `seller_id` is never accepted.',
      },
      ProductResponse: {
        type: 'object',
        required: ['ok', 'data'],
        properties: {
          ok: { type: 'boolean', example: true },
          data: { $ref: '#/components/schemas/Product' },
          message: { type: 'string' },
        },
      },
      ProductListResponse: {
        type: 'object',
        required: ['ok', 'data'],
        properties: {
          ok: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              products: {
                type: 'array',
                items: { $ref: '#/components/schemas/Product' },
              },
              pagination: { $ref: '#/components/schemas/Pagination' },
            },
          },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 42 },
          totalPages: { type: 'integer', example: 3 },
        },
      },
      TransactionStatus: {
        type: 'string',
        enum: ['awaiting_payment', 'pending', 'confirmed', 'shipped', 'completed', 'cancelled'],
      },
      PaymentStatus: {
        type: 'string',
        enum: ['unpaid', 'pending', 'paid', 'failed', 'expired', 'cod'],
      },
      Transaction: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          buyer_id: { type: 'string', format: 'uuid', nullable: true },
          seller_id: { type: 'string', format: 'uuid', nullable: true },
          product_id: { type: 'string', format: 'uuid' },
          product_name: { type: 'string' },
          product_image: { type: 'string' },
          amount: { type: 'number', minimum: 0 },
          status: { $ref: '#/components/schemas/TransactionStatus' },
          payment_method: { type: 'string', enum: ['cod', 'momo', 'vnpay'] },
          payment_status: { $ref: '#/components/schemas/PaymentStatus' },
          note: { type: 'string' },
          rejection_reason: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      TransactionCreateRequest: {
        type: 'object',
        required: ['product_id'],
        additionalProperties: false,
        properties: {
          product_id: { type: 'string', format: 'uuid' },
          payment_method: {
            type: 'string',
            enum: ['cod', 'momo', 'vnpay'],
            default: 'cod',
          },
          note: { type: 'string' },
        },
      },
      TransactionStatusRequest: {
        type: 'object',
        required: ['status'],
        additionalProperties: false,
        properties: {
          status: { $ref: '#/components/schemas/TransactionStatus' },
          rejection_reason: { type: 'string' },
        },
      },
      TransactionResponse: {
        type: 'object',
        required: ['ok', 'data'],
        properties: {
          ok: { type: 'boolean', example: true },
          data: { $ref: '#/components/schemas/Transaction' },
          message: { type: 'string' },
        },
      },
      TransactionListResponse: {
        type: 'object',
        required: ['ok', 'data'],
        properties: {
          ok: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              transactions: {
                type: 'array',
                items: { $ref: '#/components/schemas/Transaction' },
              },
              pagination: { $ref: '#/components/schemas/Pagination' },
            },
          },
        },
      },
      PaymentCreateRequest: {
        type: 'object',
        required: ['paymentMethod', 'orderId'],
        properties: {
          paymentMethod: { type: 'string', enum: ['momo', 'vnpay'] },
          orderId: { type: 'string', description: 'Existing transaction ID.' },
          amount: {
            type: 'number',
            minimum: 0,
            exclusiveMinimum: true,
            description:
              'Accepted for compatibility but replaced by the stored transaction amount.',
          },
          orderInfo: { type: 'string' },
          returnUrl: { type: 'string', format: 'uri' },
          notifyUrl: { type: 'string', format: 'uri' },
          extraData: { type: 'string' },
          bankCode: { type: 'string' },
          lang: { type: 'string', default: 'vi' },
        },
      },
      PaymentCreateResponse: {
        type: 'object',
        required: ['ok', 'data'],
        properties: {
          ok: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              paymentUrl: { type: 'string', format: 'uri' },
              requestId: { type: 'string' },
              gatewayResponse: { type: 'object', additionalProperties: true },
            },
            additionalProperties: true,
          },
        },
      },
      PaymentCallbackResponse: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          data: { type: 'object', additionalProperties: true },
          message: { type: 'string' },
        },
      },
      PaymentRefundRequest: {
        type: 'object',
        required: ['paymentMethod', 'orderId'],
        properties: {
          paymentMethod: { type: 'string', enum: ['momo', 'vnpay'] },
          orderId: { type: 'string' },
          amount: { type: 'number', minimum: 0, exclusiveMinimum: true },
        },
        additionalProperties: true,
      },
      AdminCreateUserRequest: {
        type: 'object',
        required: ['email', 'password', 'full_name', 'role'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password', minLength: 8 },
          full_name: { type: 'string', minLength: 2 },
          role: { type: 'string', enum: ['customer', 'agent', 'admin'] },
        },
        additionalProperties: false,
      },
    },
  },
};

module.exports = openapiDocument;
