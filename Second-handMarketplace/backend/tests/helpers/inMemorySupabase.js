const OPEN_TRANSACTION_STATUSES = new Set(['awaiting_payment', 'pending', 'confirmed']);

function clone(value) {
  return value == null ? value : structuredClone(value);
}

class Query {
  constructor(database, table) {
    this.database = database;
    this.table = table;
    this.action = 'select';
    this.filters = [];
    this.limitValue = null;
    this.payload = null;
    this.returning = false;
  }

  select() {
    this.returning = true;
    return this;
  }

  insert(payload) {
    this.action = 'insert';
    this.payload = Array.isArray(payload) ? payload : [payload];
    return this;
  }

  upsert(payload) {
    this.action = 'upsert';
    this.payload = Array.isArray(payload) ? payload : [payload];
    return this;
  }

  update(payload) {
    this.action = 'update';
    this.payload = payload;
    return this;
  }

  eq(field, value) {
    this.filters.push((row) => row[field] === value);
    return this;
  }

  neq(field, value) {
    this.filters.push((row) => row[field] !== value);
    return this;
  }

  in(field, values) {
    this.filters.push((row) => values.includes(row[field]));
    return this;
  }

  lt(field, value) {
    this.filters.push((row) => row[field] < value);
    return this;
  }

  limit(value) {
    this.limitValue = value;
    return this;
  }

  order() {
    return this;
  }

  range() {
    return this;
  }

  matches(row) {
    return this.filters.every((filter) => filter(row));
  }

  rows() {
    const rows = this.database.tables[this.table] || [];
    const matches = rows.filter((row) => this.matches(row));
    return this.limitValue == null ? matches : matches.slice(0, this.limitValue);
  }

  uniqueViolation(payload) {
    if (this.table === 'chat_messages') {
      const clientMessageId = String(payload.client_message_id || '');
      return Boolean(
        clientMessageId &&
        this.database.tables.chat_messages.some(
          (row) => row.sender_id === payload.sender_id && row.client_message_id === clientMessageId,
        ),
      );
    }

    if (this.table === 'wishlists') {
      return this.database.tables.wishlists.some(
        (row) => row.user_id === payload.user_id && row.product_id === payload.product_id,
      );
    }

    if (this.table === 'reviews') {
      return this.database.tables.reviews.some(
        (row) =>
          row.transaction_id === payload.transaction_id && row.reviewer_id === payload.reviewer_id,
      );
    }

    if (this.table !== 'transactions') {
      return false;
    }

    if (
      OPEN_TRANSACTION_STATUSES.has(payload.status) &&
      this.database.tables.transactions.some(
        (row) =>
          row.id !== payload.id &&
          row.product_id === payload.product_id &&
          OPEN_TRANSACTION_STATUSES.has(row.status),
      )
    ) {
      return true;
    }

    const gatewayId = String(payload.payment_gateway_transaction_id || '');
    return Boolean(
      gatewayId &&
      this.database.tables.transactions.some(
        (row) => row.id !== payload.id && row.payment_gateway_transaction_id === gatewayId,
      ),
    );
  }

  execute() {
    if (this.action === 'select') {
      return { data: clone(this.rows()), error: null };
    }

    if (this.action === 'insert') {
      const inserted = [];
      for (const rawPayload of this.payload) {
        const payload = clone(rawPayload);
        if (this.uniqueViolation(payload)) {
          return {
            data: null,
            error: { code: '23505', message: 'duplicate key value violates unique constraint' },
          };
        }

        const row = {
          id: payload.id || `${this.table}-${this.database.nextId++}`,
          ...payload,
        };
        this.database.tables[this.table].push(row);
        inserted.push(row);
      }
      return { data: clone(inserted), error: null };
    }

    if (this.action === 'upsert') {
      const upserted = [];
      for (const payload of this.payload) {
        const index = this.database.tables[this.table].findIndex((row) => row.id === payload.id);
        if (index >= 0) {
          this.database.tables[this.table][index] = {
            ...this.database.tables[this.table][index],
            ...clone(payload),
          };
          upserted.push(this.database.tables[this.table][index]);
        } else {
          const row = clone(payload);
          this.database.tables[this.table].push(row);
          upserted.push(row);
        }
      }
      return { data: clone(upserted), error: null };
    }

    const updated = [];
    for (const row of this.database.tables[this.table]) {
      if (!this.matches(row)) {
        continue;
      }
      const candidate = { ...row, ...clone(this.payload) };
      if (this.uniqueViolation(candidate)) {
        return {
          data: null,
          error: { code: '23505', message: 'duplicate key value violates unique constraint' },
        };
      }
      Object.assign(row, candidate);
      updated.push(row);
    }
    return { data: clone(updated), error: null };
  }

  async single() {
    const result = this.execute();
    if (result.error) {
      return result;
    }
    const rows = Array.isArray(result.data) ? result.data : [];
    if (rows.length !== 1) {
      return {
        data: null,
        error: { code: 'PGRST116', message: 'Expected exactly one row' },
      };
    }
    return { data: rows[0], error: null };
  }

  async maybeSingle() {
    const result = this.execute();
    if (result.error) {
      return result;
    }
    const rows = Array.isArray(result.data) ? result.data : [];
    return { data: rows[0] || null, error: null };
  }

  then(resolve, reject) {
    return Promise.resolve(this.execute()).then(resolve, reject);
  }
}

function createInMemorySupabase(seed = {}) {
  const tables = new Proxy(
    {},
    {
      get(target, property) {
        if (!Reflect.has(target, property)) {
          target[property] = [];
        }
        return target[property];
      },
    },
  );

  for (const [table, rows] of Object.entries(seed)) {
    tables[table] = clone(rows);
  }

  const database = {
    tables,
    nextId: 1,
  };

  async function processPaymentCallback(args) {
    const existingEvent = tables.payment_callback_events.find(
      (event) => event.idempotency_key === args.p_idempotency_key,
    );

    if (existingEvent) {
      return {
        data: {
          processed: false,
          replayed: true,
          outcome: existingEvent.outcome,
          eventId: existingEvent.id,
        },
        error: null,
      };
    }

    const event = {
      id: `payment-event-${database.nextId++}`,
      transaction_id: args.p_transaction_id,
      provider: args.p_provider,
      provider_transaction_id: args.p_provider_transaction_id,
      idempotency_key: args.p_idempotency_key,
      event_status: args.p_event_status,
      amount: args.p_amount,
      currency: args.p_currency,
      response_code: args.p_response_code,
      sanitized_payload: clone(args.p_sanitized_payload),
      processing_status: 'received',
      outcome: 'received',
    };
    tables.payment_callback_events.push(event);

    const transaction = tables.transactions.find((item) => item.id === args.p_transaction_id);
    let outcome = 'processed';

    if (!transaction) {
      outcome = 'transaction_not_found';
    } else if (transaction.payment_method !== args.p_provider) {
      outcome = 'provider_mismatch';
    } else if (Number(transaction.amount) !== Number(args.p_amount)) {
      outcome = 'amount_mismatch';
    } else if (
      String(transaction.payment_currency || 'VND').toUpperCase() !==
      String(args.p_currency || 'VND').toUpperCase()
    ) {
      outcome = 'currency_mismatch';
    } else if (
      transaction.status !== 'awaiting_payment' ||
      transaction.payment_status !== 'pending'
    ) {
      outcome = 'invalid_state';
    } else if (
      transaction.payment_expires_at &&
      new Date(transaction.payment_expires_at).getTime() < Date.now()
    ) {
      outcome = 'expired';
    } else if (
      args.p_provider_transaction_id &&
      tables.transactions.some(
        (item) =>
          item.id !== transaction.id &&
          item.payment_gateway_transaction_id === args.p_provider_transaction_id,
      )
    ) {
      outcome = 'provider_transaction_conflict';
    }

    event.outcome = outcome;
    event.processing_status = outcome === 'processed' ? 'processed' : 'rejected';

    if (outcome === 'processed') {
      const oldStatus = transaction.status;
      const oldPaymentStatus = transaction.payment_status;
      transaction.status = args.p_event_status === 'success' ? 'pending' : 'cancelled';
      transaction.payment_status = args.p_event_status === 'success' ? 'paid' : 'failed';
      transaction.payment_gateway_transaction_id = args.p_provider_transaction_id;
      transaction.payment_response_code = args.p_response_code;
      transaction.payment_currency = args.p_currency;
      transaction.payment_idempotency_key = args.p_idempotency_key;

      tables.transaction_status_audit_log.push({
        id: `audit-${database.nextId++}`,
        transaction_id: transaction.id,
        callback_event_id: event.id,
        old_status: oldStatus,
        new_status: transaction.status,
        old_payment_status: oldPaymentStatus,
        new_payment_status: transaction.payment_status,
      });
    }

    return {
      data: {
        processed: outcome === 'processed',
        replayed: false,
        outcome,
        eventId: event.id,
        transaction: clone(transaction),
      },
      error: null,
    };
  }

  return {
    database,
    client: {
      auth: {
        admin: {
          async getUserById(id) {
            return {
              data: {
                user: {
                  id,
                  email: `${id}@example.com`,
                  user_metadata: {},
                },
              },
              error: null,
            };
          },
        },
      },
      from(table) {
        return new Query(database, table);
      },
      rpc(name, args) {
        if (name === 'process_payment_callback') {
          return processPaymentCallback(args);
        }

        return Promise.resolve({
          data: null,
          error: { message: `Unknown RPC: ${name}` },
        });
      },
    },
  };
}

module.exports = { createInMemorySupabase };
