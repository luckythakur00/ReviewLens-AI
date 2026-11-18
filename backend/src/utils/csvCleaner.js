import { parse } from 'csv-parse/sync';
import crypto from 'crypto';

/**
 * Cleans a raw CSV string of product reviews.
 * Returns valid, deduplicated rows with normalised ratings and a text hash.
 *
 * @param {string} csvString - Raw CSV content as a string
 * @returns {{ cleanedReviews: object[], stats: object }}
 */
export function cleanReviewsCsv(csvString) {
  // Parse the CSV into an array of row objects
  const rows = parse(csvString, {
    columns: true,          // use first row as column names
    skip_empty_lines: true, // skip blank lines
    trim: true,             // trim whitespace from every cell
    relax_quotes: true,     // tolerate slightly malformed quotes
    relax_column_count: true, // tolerate rows with wrong column count
  });

  const cleanedReviews = [];
  const seenTexts = new Set(); // tracks lowercase review_text for dedup

  // Counters for the stats summary
  let skippedEmpty = 0;
  let skippedDuplicates = 0;
  const totalRows = rows.length;

  for (const row of rows) {
    const rawText = row.review_text ?? '';
    const normalizedText = rawText.trim().toLowerCase();

    // --- Rule 1: skip rows with no review text ---
    if (normalizedText === '') {
      skippedEmpty++;
      continue;
    }

    // --- Rule 2: skip exact-duplicate review texts ---
    if (seenTexts.has(normalizedText)) {
      skippedDuplicates++;
      continue;
    }
    seenTexts.add(normalizedText);

    // --- Rule 3: normalise rating to a number 1-5 or 'unknown' ---
    const rawRating = row.rating ?? '';
    const parsedRating = Number(rawRating);
    const rating =
      Number.isInteger(parsedRating) &&
      parsedRating >= 1 &&
      parsedRating <= 5
        ? parsedRating
        : 'unknown';

    // --- Generate a SHA-256 fingerprint of the review text ---
    const textHash = crypto
      .createHash('sha256')
      .update(normalizedText)
      .digest('hex');

    cleanedReviews.push({
      ...row,
      rating,
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
