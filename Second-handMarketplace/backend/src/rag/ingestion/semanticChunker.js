const crypto = require('node:crypto');

function hashContent(value) {
  return crypto
    .createHash('sha256')
    .update(String(value || ''), 'utf8')
    .digest('hex');
}

function estimateTokens(value) {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function splitSemanticSections(value) {
  const lines = String(value || '')
    .replace(/\r\n/g, '\n')
    .split('\n');
  const sections = [];
  let heading = '';
  let paragraphs = [];

  const flush = () => {
    const body = paragraphs.join('\n\n').trim();
    if (body) sections.push({ heading, body });
    paragraphs = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const headingMatch = trimmed.match(/^(?:#{1,6}\s+|)([^.!?]{2,100}):?$/);
    const isHeading = /^#{1,6}\s+/.test(trimmed) || (headingMatch && trimmed.endsWith(':'));
    if (isHeading) {
      flush();
      heading = trimmed
        .replace(/^#{1,6}\s+/, '')
        .replace(/:$/, '')
        .trim();
      continue;
    }
    if (trimmed) paragraphs.push(trimmed);
    else flush();
  }
  flush();
  return sections;
}

function takeOverlap(words, overlapTokens) {
  return words.slice(Math.max(0, words.length - overlapTokens));
}

function semanticChunkDocument(
  document,
  { minTokens = 250, maxTokens = 400, overlapTokens = 50 } = {},
) {
  if (minTokens < 1 || maxTokens < minTokens || overlapTokens < 0 || overlapTokens >= maxTokens) {
    throw new Error('Cấu hình semantic chunk không hợp lệ.');
  }

  const title = String(document?.title || '').trim();
  const category = String(document?.category || 'knowledge').trim();
  const sourceKey = String(document?.sourceKey || document?.source_key || '').trim();
  const sections = splitSemanticSections(document?.content || '');
  const chunks = [];
  let current = [];
  let currentHeading = '';

  const emit = () => {
    if (!current.length) return;
    const body = current.join(' ').trim();
    const prefix = [`Title: ${title}`, `Category: ${category}`, `Source: ${sourceKey}`];
    if (currentHeading) prefix.push(`Heading: ${currentHeading}`);
    const content = `${prefix.join('\n')}\n\n${body}`;
    chunks.push({
      content,
      body,
      title,
      category,
      sourceKey,
      heading: currentHeading,
      tokenCount: estimateTokens(body),
      contentHash: hashContent(content),
    });
    current = takeOverlap(current, overlapTokens);
  };

  for (const section of sections) {
    const words = section.body.split(/\s+/).filter(Boolean);
    let cursor = 0;
    if (current.length && section.heading && current.length >= minTokens) emit();
    if (section.heading) currentHeading = section.heading;
    while (cursor < words.length) {
      const capacity = maxTokens - current.length;
      current.push(...words.slice(cursor, cursor + capacity));
      cursor += capacity;
      if (current.length >= maxTokens) emit();
    }
  }
  if (current.length) {
    if (chunks.length && current.length <= overlapTokens) return chunks;
    emit();
  }
  return chunks;
}

module.exports = { estimateTokens, hashContent, semanticChunkDocument, splitSemanticSections };
