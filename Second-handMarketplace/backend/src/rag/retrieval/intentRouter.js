const INTENTS = Object.freeze({
  KNOWLEDGE: 'KNOWLEDGE',
  PRODUCT_SEARCH: 'PRODUCT_SEARCH',
  TRANSACTION: 'TRANSACTION',
  OUT_OF_SCOPE: 'OUT_OF_SCOPE',
});

function normalizeVietnamese(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const KNOWLEDGE_PATTERNS = [
  /chinh sach|quy dinh|dieu khoan|bao mat|an toan|lua dao/,
  /hoan tien|doi tra|khieu nai|tranh chap|khac mo ta|hang gia/,
  /lam sao|huong dan|can lam gi|co duoc khong|bao lau/,
  /dang ban|dang tin|phi dich vu|phi san|bao hanh/,
  /thanh toan|tru tien|tien bi tru|vnpay|momo|dang nhap|tai khoan|xac minh email/,
  /nguoi mua|lien he nhan vien|nhan vien ho tro|otp|ma xac thuc|hoan tin/,
];

const TRANSACTION_PATTERNS = [
  /don (hang )?(?:cua )?(toi|minh|em|anh)|ma don|don #[a-z0-9-]+/,
  /trang thai (don|giao dich)|kiem tra don|theo doi don/,
  /nguoi ban (da )?xac nhan|don (da )?(giao|huy|hoan tat|thanh toan)/,
  /giao dich (cua toi|minh)|lich su (don|giao dich)/,
];

const PRODUCT_PATTERNS = [
  /\b(tim|mua|goi y|tu van|can)\b.*\b(san pham|dien thoai|dt|iphone|laptop|camera|may anh|tui|giay|xe|tablet|may tinh bang|tai nghe|dong ho|do gia dung)\b/,
  /\b(dien thoai|dt|iphone|laptop|camera|may anh|tui|giay|xe|tablet|may tinh bang|tai nghe|dong ho|do gia dung)\b.*\b(duoi|tren|tu|den|trieu|tr|k|o|tai|nhu moi|cu)\b/,
  /\b(tim|mua|goi y)\b.*\b(duoi|tren|tu|trieu|tr|k|cu|moi)\b/,
  /thiet bi .*chup anh|\bsan pham nao\b|\bco .* nao (dang )?ban khong\b/,
  /\b(cac dong|dong nao|mau nao|nhung loai|loai nao)\b.*\b(dien thoai|dt|iphone|laptop|camera|may anh|tui|giay|xe|tablet|may tinh bang|tai nghe|dong ho|do gia dung)\b/,
  /\b(dien thoai|dt|iphone|laptop|camera|may anh|tui|giay|xe|tablet|may tinh bang|tai nghe|dong ho|do gia dung)\b.*\b(co|con|dang ban|nhung loai|loai nao|dong nao|gia re|re nhat)\b/,
];

function matchesAny(value, patterns) {
  return patterns.some((pattern) => pattern.test(value));
}

function routeIntent(message) {
  const normalized = normalizeVietnamese(message);
  if (!normalized) return { intent: INTENTS.OUT_OF_SCOPE, confidence: 1, normalized };

  // Policy/refund language wins over incidental product words such as "sản phẩm".
  if (matchesAny(normalized, TRANSACTION_PATTERNS)) {
    return { intent: INTENTS.TRANSACTION, confidence: 0.94, normalized };
  }
  if (matchesAny(normalized, KNOWLEDGE_PATTERNS)) {
    return { intent: INTENTS.KNOWLEDGE, confidence: 0.92, normalized };
  }
  if (matchesAny(normalized, PRODUCT_PATTERNS)) {
    return { intent: INTENTS.PRODUCT_SEARCH, confidence: 0.93, normalized };
  }

  return { intent: INTENTS.OUT_OF_SCOPE, confidence: 0.78, normalized };
}

module.exports = { INTENTS, normalizeVietnamese, routeIntent };
