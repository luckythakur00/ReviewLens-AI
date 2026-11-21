import { parse } from 'csv-parse/sync';
import crypto from 'crypto';
import { inferCsvSchemaWithGemini } from '../services/geminiService.js';

export const HEADER_ALIASES = {
  review_text: ['review_text', 'review', 'text', 'comment', 'feedback', 'content', 'body'],
  product: ['product', 'product_name', 'item', 'item_name', 'title'],
  rating: ['rating', 'stars', 'score', 'star_rating'],
  review_id: ['review_id', 'id', 'reviewid'],
  date: ['date', 'review_date', 'created_at', 'timestamp'],
};

export function normalizeHeader(header) {
  return (header ?? '').trim().toLowerCase().replace(/\s+/g, '_');
}

export function detectHeaderMapping(headers) {
  const mapping = {};
  const normalizedMap = new Map();

  for (const raw of headers) {
    const norm = normalizeHeader(raw);
    normalizedMap.set(norm, raw);
  }

  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const alias of aliases) {
      if (normalizedMap.has(alias)) {
        mapping[canonical] = normalizedMap.get(alias);
        break;
      }
    }
  }

  return mapping;
}

function processCleanRows(rows, mapping) {
  const cleanedReviews = [];
  const seenTexts = new Set();
  let skippedEmpty = 0;
  let skippedDuplicates = 0;
  const totalRows = rows.length;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Safe fallbacks for metadata
    const rawId = mapping.review_id ? row[mapping.review_id] : null;
    const review_id =
      rawId !== null && rawId !== undefined && String(rawId).trim() !== ''
        ? String(rawId).trim()
        : `ROW-${i + 1}`;

    const rawProduct = mapping.product ? row[mapping.product] : null;
    const product =
      rawProduct !== null && rawProduct !== undefined && String(rawProduct).trim() !== ''
        ? String(rawProduct).trim()
        : 'General Product';

    const rawDate = mapping.date ? row[mapping.date] : null;
    const date =
      rawDate !== null && rawDate !== undefined ? String(rawDate).trim() : '';

    // Rule 1: skip rows where review_text is empty
    const rawText = mapping.review_text ? (row[mapping.review_text] ?? '') : '';
    const normalizedText = String(rawText).trim().toLowerCase();

    if (normalizedText === '') {
      skippedEmpty++;
      continue;
    }

    // Rule 2: skip duplicate review_text entries
    if (seenTexts.has(normalizedText)) {
      skippedDuplicates++;
      continue;
    }
    seenTexts.add(normalizedText);

    // Rule 3: normalise rating to integer 1-5 or 'unknown'
    const rawRating = mapping.rating ? (row[mapping.rating] ?? '') : '';
    const parsedRating = Number(rawRating);
    const rating =
      Number.isInteger(parsedRating) &&
      parsedRating >= 1 &&
      parsedRating <= 5
        ? parsedRating
        : 'unknown';

    // SHA-256 fingerprint for caching & dedup
    const textHash = crypto
      .createHash('sha256')
      .update(normalizedText)
      .digest('hex');

    cleanedReviews.push({
      ...row,
      review_id,
      product,
      rating,
      date,
      review_text: String(rawText).trim(),
      textHash,
    });
  }

  return {
    cleanedReviews,
    stats: {
      totalRows,
      validCount: cleanedReviews.length,
      skippedEmpty,
      skippedDuplicates,
    },
  };
}

export function cleanReviewsCsv(csvString, customMapping = null) {
  const rows = parse(csvString, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
  });

  if (rows.length === 0) {
    return {
      cleanedReviews: [],
      stats: {
        totalRows: 0,
        validCount: 0,
        skippedEmpty: 0,
        skippedDuplicates: 0,
      },
    };
  }

  const headers = Object.keys(rows[0]);
  let mapping = customMapping ? { ...customMapping } : detectHeaderMapping(headers);

  // If review_text is deterministically matched, process synchronously
  if (mapping.review_text) {
    return processCleanRows(rows, mapping);
  }

  // If review_text cannot be matched deterministically, run AI schema inference
  return (async () => {
    const inferred = await inferCsvSchemaWithGemini(headers, rows.slice(0, 3));
    if (inferred && inferred.review_text) {
      mapping = { ...mapping, ...inferred };
      return processCleanRows(rows, mapping);
    }

    const err = new Error('No review text column found in CSV.');
    err.statusCode = 400;
    throw err;
  })();
}
