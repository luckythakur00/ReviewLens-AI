import express from "express";
import multer from "multer";
import Review from "../models/Review.js";
import { cleanReviewsCsv } from "../utils/csvCleaner.js";
import { analyzeReviewsBatch, generateSingleReply } from "../services/geminiService.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function checkRatingMismatch(rating, sentiment) {
  if (typeof rating !== "number") return false;
  if (rating >= 4 && sentiment === "negative") return true;
  if (rating <= 2 && sentiment === "positive") return true;
  return false;
}

router.get("/", async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch reviews." });
  }
});

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const startTime = Date.now();
    const csvString = req.file.buffer.toString("utf-8");
    const { cleanedReviews, stats } = await cleanReviewsCsv(csvString);

    if (cleanedReviews.length === 0) {
      return res.status(422).json({ message: "No valid reviews found in CSV." });
    }

    const allHashes = cleanedReviews.map((r) => r.textHash);
    const existing = await Review.find({ text_hash: { $in: allHashes } });
    const cachedHashSet = new Set(existing.map((r) => r.text_hash));

    const uncached = cleanedReviews.filter((r) => !cachedHashSet.has(r.textHash));
    const cacheHits = cleanedReviews.length - uncached.length;

    const BATCH_SIZE = 20;
    const CONCURRENCY = 5;
    const batches = [];

    for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
      batches.push(uncached.slice(i, i + BATCH_SIZE));
    }

    const aiBatchesCalled = batches.length;
    const analysisMap = new Map();

    existing.forEach((r) => analysisMap.set(r.text_hash, r));

    for (let i = 0; i < batches.length; i += CONCURRENCY) {
      const chunk = batches.slice(i, i + CONCURRENCY);
      const chunkResults = await Promise.all(
        chunk.map((batch) => analyzeReviewsBatch(batch))
      );

      chunkResults.forEach((results, chunkIdx) => {
        const batch = chunk[chunkIdx];
        results.forEach((result, idx) => {
          if (batch[idx]) {
            analysisMap.set(batch[idx].textHash, result);
          }
        });
      });
    }

    const newDocs = [];

    const reviews = cleanedReviews.map((row) => {
      const analysis = analysisMap.get(row.textHash);
      const rating_mismatch = checkRatingMismatch(row.rating, analysis?.sentiment);

      const doc = {
        review_id: row.review_id,
        product: row.product,
        rating: row.rating,
        review_text: row.review_text,
        text_hash: row.textHash,
        date: row.date || "",
        sentiment: analysis?.sentiment || "analysis_failed",
        topics: analysis?.topics || ["other"],
        summary: analysis?.summary || "No summary available.",
        needs_reply: Boolean(analysis?.needs_reply),
        rating_mismatch,
        suggested_reply: analysis?.suggested_reply || "",
      };

      if (!cachedHashSet.has(row.textHash) && analysis?.sentiment !== "analysis_failed") {
        newDocs.push(doc);
      }

      return doc;
    });

    if (newDocs.length > 0) {
      await Review.insertMany(newDocs, { ordered: false }).catch(() => {});
    }

    const processingTimeMs = Date.now() - startTime;

    res.json({
      reviews,
      stats: {
        totalRows: stats.totalRows,
        validRows: stats.validCount,
        skippedEmpty: stats.skippedEmpty,
        duplicatesRemoved: stats.skippedDuplicates,
        cacheHits,
        aiBatchesCalled,
        processingTimeMs,
        processingTime: (processingTimeMs / 1000).toFixed(2) + "s",
      },
    });
  } catch (err) {
    const status = err.statusCode || (err.message?.includes("review text") ? 400 : 500);
    res.status(status).json({ message: err.message || "Failed to process reviews." });
  }
});

router.post("/:id/reply", async (req, res) => {
  try {
    const { id } = req.params;

    let review = await Review.findById(id).catch(() => null);
    if (!review) {
      review = await Review.findOne({ review_id: id });
    }
    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    if (review.suggested_reply) {
      return res.json({ suggested_reply: review.suggested_reply });
    }

    const reply = await generateSingleReply(review);
    review.suggested_reply = reply;
    await review.save();

    res.json({ suggested_reply: reply });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to generate reply." });
  }
});

export default router;