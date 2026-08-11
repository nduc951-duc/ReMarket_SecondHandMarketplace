const { normalizeVietnamese } = require('./intentRouter');

const CATEGORY_ALIASES = [
  {
    category: 'electronics',
    phrases: [
      'dien thoai',
      'dt',
      'iphone',
      'laptop',
      'camera',
      'may anh',
      'tablet',
      'may tinh bang',
      'tai nghe',
      'dong ho thong minh',
    ],
  },
  { category: 'fashion', phrases: ['quan ao', 'ao', 'quan', 'giay', 'tui', 'thoi trang'] },
  { category: 'home', phrases: ['do gia dung', 'noi that', 'ban ghe', 'tu lanh', 'may giat'] },
  { category: 'vehicles', phrases: ['xe may', 'xe dap', 'oto', 'o to'] },
];

const LOCATION_ALIASES = [
  { location: 'Hồ Chí Minh', phrases: ['tp hcm', 'hcm', 'ho chi minh', 'sai gon'] },
  { location: 'Hà Nội', phrases: ['ha noi'] },
  { location: 'Đà Nẵng', phrases: ['da nang'] },
  { location: 'Cần Thơ', phrases: ['can tho'] },
  { location: 'Hải Phòng', phrases: ['hai phong'] },
];

const CONDITION_ALIASES = [
  { condition: 'new', phrases: ['moi 100', 'nguyen seal', 'hang moi'] },
  { condition: 'like_new', phrases: ['nhu moi', 'like new', 'moi 99'] },
  { condition: 'good', phrases: ['con tot', 'tinh trang tot', 'da qua su dung'] },
];

function parseNumericAmount(rawValue, rawUnit = '') {
  const value = String(rawValue || '').trim();
  const unit = String(rawUnit || '').toLowerCase();
  if (!value) return undefined;

  if (!unit && /^\d{1,3}(?:[.,]\d{3})+$/.test(value)) {
    return Number(value.replace(/[.,]/g, ''));
  }

  const normalizedNumber = Number(value.replace(',', '.'));
  if (!Number.isFinite(normalizedNumber)) return undefined;
  if (['tr', 'trieu', 'm'].includes(unit)) return normalizedNumber * 1_000_000;
  if (['k', 'nghin', 'ngan'].includes(unit)) return normalizedNumber * 1_000;
  return normalizedNumber;
}

function parsePriceRange(normalized) {
  const amount = '(\\d{1,3}(?:[.,]\\d{3})+|\\d+(?:[.,]\\d+)?)';
  const unit = '(trieu|tr|m|nghin|ngan|k)?';
  const range = normalized.match(
    new RegExp(
      `(?:tu\\s+)?${amount}\\s*${unit}\\s*(?:den|toi|[-–—])\\s*${amount}\\s*(trieu|tr|m|nghin|ngan|k)`,
    ),
  );
  if (range) {
    const sharedUnit = range[4] || range[2];
    return {
      minPrice: parseNumericAmount(range[1], range[2] || sharedUnit),
      maxPrice: parseNumericAmount(range[3], sharedUnit),
      matchedText: range[0],
    };
  }

  const maximum = normalized.match(
    new RegExp(
      `(?:duoi|toi da|khong qua|ngan sach|tam|khoang)\\s*${amount}\\s*(trieu|tr|m|nghin|ngan|k)?`,
    ),
  );
  const minimum = normalized.match(
    new RegExp(`(?:tren|toi thieu|it nhat|tu)\\s*${amount}\\s*(trieu|tr|m|nghin|ngan|k)?`),
  );
  const generic = normalized.match(new RegExp(`${amount}\\s*(trieu|tr|m|nghin|ngan|k)`));
  return {
    minPrice: minimum ? parseNumericAmount(minimum[1], minimum[2]) : undefined,
    maxPrice: maximum
      ? parseNumericAmount(maximum[1], maximum[2])
      : minimum
        ? undefined
        : generic
          ? parseNumericAmount(generic[1], generic[2])
          : undefined,
    matchedText: maximum?.[0] || minimum?.[0] || generic?.[0] || '',
  };
}

function findAlias(normalized, definitions, field) {
  return definitions.find((entry) =>
    entry.phrases.some((phrase) =>
      new RegExp(`(?:^|\\s)${phrase.replace(/ /g, '\\s+')}(?:$|\\s|[,.!?%])`).test(normalized),
    ),
  )?.[field];
}

function buildSemanticQuery(normalized, priceText) {
  let query = ` ${normalized} `;
  if (priceText) query = query.replace(priceText, ' ');
  query = query.replace(
    /\b(ma ben (minh|ban) co|ben (minh|ban) co|cac dong|dong nao|nhung loai nao|nhung loai|loai nao|mau nao|gia re|re nhat)\b/g,
    ' ',
  );
  [...LOCATION_ALIASES, ...CONDITION_ALIASES].forEach((entry) => {
    entry.phrases.forEach((phrase) => {
      query = query.replace(new RegExp(`\\b${phrase.replace(/ /g, '\\s+')}\\b`, 'g'), ' ');
    });
  });
  return query
    .replace(
      /\b(tim|mua|goi y|tu van|san pham|mau|gia|re|o|tai|giup|minh|toi|can|cho|di|nhe|voi|nao|duoc|cac|nhung|loai|ma|ben|co)\b/g,
      ' ',
    )
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function locationMatches(actual, requested) {
  if (!requested) return true;
  const actualNormalized = normalizeVietnamese(actual);
  const requestedNormalized = normalizeVietnamese(requested);
  const aliases =
    requestedNormalized === 'ho chi minh'
      ? ['ho chi minh', 'hcm', 'tp hcm', 'sai gon']
      : [requestedNormalized];
  return aliases.some((alias) => actualNormalized.includes(alias));
}

function parseProductQuery(message) {
  const normalized = normalizeVietnamese(message);
  const price = parsePriceRange(normalized);
  const category = findAlias(normalized, CATEGORY_ALIASES, 'category');
  const condition = findAlias(normalized, CONDITION_ALIASES, 'condition');
  const location = findAlias(normalized, LOCATION_ALIASES, 'location');
  return {
    minPrice: price.minPrice,
    maxPrice: price.maxPrice,
    category,
    condition,
    location,
    semanticQuery: buildSemanticQuery(normalized, price.matchedText) || normalized,
    knowledgeQuery: normalized,
  };
}

module.exports = { locationMatches, parseNumericAmount, parseProductQuery, parsePriceRange };
