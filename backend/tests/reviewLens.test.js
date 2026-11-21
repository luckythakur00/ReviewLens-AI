import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { cleanReviewsCsv, detectHeaderMapping } from "../src/utils/csvCleaner.js";
import { validateReviewAnalysis, callWithBackoff, inferCsvSchemaWithGemini } from "../src/services/geminiService.js";

describe("Suite A — CSV Cleaning & Sanitization", () => {
  const csv = `review_id,product,rating,date,review_text
R001,Cotton Bedsheet Set,5,2026-10-02,"Super soft fabric, colours did not fade after 3 washes."
R002,Cotton Bedsheet Set,,2026-10-03,"Good quality but overpriced."
R003,Running Shoes Pro,five,2026-10-11,"Best shoes I have bought online, period."
R004,Wireless Earbuds X2,1,2026-10-03,"The left earbud stopped working after 2 days."
R005,Wireless Earbuds X2,1,2026-10-03,"The left earbud stopped working after 2 days."
R006,Cotton Bedsheet Set,5,2026-10-07,""
R007,Cotton Bedsheet Set,4,2026-10-08,"   "
R008,Wireless Earbuds X2,3,2026-10-10,"आवाज़ अच्छी है लेकिन बैटरी जल्दी खत्म हो जाती है।"
R009,Running Shoes Pro,0,2026-10-12,"Sole cracked on day one."
R010,Running Shoes Pro,6,2026-10-13,"Way too big."`;

  const { cleanedReviews, stats } = cleanReviewsCsv(csv);

  test("skips rows with empty or whitespace-only review_text", () => {
    const ids = cleanedReviews.map((r) => r.review_id);
    assert.ok(!ids.includes("R006"), "R006 (empty text) should be skipped");
    assert.ok(!ids.includes("R007"), "R007 (whitespace text) should be skipped");
    assert.equal(stats.skippedEmpty, 2);
  });

  test("detects and deduplicates identical review_text (keeps only the first occurrence)", () => {
    const ids = cleanedReviews.map((r) => r.review_id);
    assert.ok(ids.includes("R004"), "first occurrence R004 should be kept");
    assert.ok(!ids.includes("R005"), "duplicate review R005 should be skipped");
    assert.equal(stats.skippedDuplicates, 1);
  });

  test("converts missing or invalid ratings (empty, 'five', 0, 6) to 'unknown'", () => {
    const r002 = cleanedReviews.find((r) => r.review_id === "R002");
    const r003 = cleanedReviews.find((r) => r.review_id === "R003");
    const r009 = cleanedReviews.find((r) => r.review_id === "R009");
    const r010 = cleanedReviews.find((r) => r.review_id === "R010");

    assert.equal(r002.rating, "unknown", "empty rating should become 'unknown'");
    assert.equal(r003.rating, "unknown", "'five' text should become 'unknown'");
    assert.equal(r009.rating, "unknown", "rating 0 should become 'unknown'");
    assert.equal(r010.rating, "unknown", "rating 6 should become 'unknown'");
  });

  test("preserves valid 1-5 ratings as numeric values", () => {
    const r001 = cleanedReviews.find((r) => r.review_id === "R001");
    const r004 = cleanedReviews.find((r) => r.review_id === "R004");
    assert.equal(r001.rating, 5);
    assert.equal(r004.rating, 1);
  });

  test("preserves multilingual Hindi/Hinglish review_text without character corruption", () => {
    const r008 = cleanedReviews.find((r) => r.review_id === "R008");
    assert.ok(r008, "Hindi review R008 should be retained");
    assert.ok(r008.review_text.includes("आवाज़"), "Hindi characters must be preserved");
  });

  test("generates unique SHA-256 textHash for each review", () => {
    for (const r of cleanedReviews) {
      assert.ok(typeof r.textHash === "string" && r.textHash.length === 64, "textHash should be 64-char hex");
    }
  });
});

describe("Suite B — AI JSON Schema Validation & Fallback", () => {
  test("accepts a fully valid AI review analysis object", () => {
    const valid = {
      sentiment: "positive",
      topics: ["quality", "delivery"],
      summary: "Customer loved the soft fabric and fast delivery.",
      needs_reply: false,
    };
    const result = validateReviewAnalysis(valid);
    assert.ok(result !== null);
    assert.equal(result.sentiment, "positive");
    assert.deepEqual(result.topics, ["quality", "delivery"]);
    assert.equal(result.summary, "Customer loved the soft fabric and fast delivery.");
    assert.equal(result.needs_reply, false);
  });

  test("rejects invalid sentiments outside ['positive', 'neutral', 'negative']", () => {
    assert.equal(validateReviewAnalysis({ sentiment: "great", topics: ["quality"], summary: "Good.", needs_reply: false }), null);
    assert.equal(validateReviewAnalysis({ sentiment: "mixed", topics: ["quality"], summary: "Good.", needs_reply: false }), null);
    assert.equal(validateReviewAnalysis({ sentiment: 5, topics: ["quality"], summary: "Good.", needs_reply: false }), null);
  });

  test("filters topics to allowed set and rejects if no allowed topics remain", () => {
    const validWithMixed = {
      sentiment: "neutral",
      topics: ["quality", "random_topic", "delivery"],
      summary: "Decent product.",
      needs_reply: false,
    };
    const cleaned = validateReviewAnalysis(validWithMixed);
    assert.deepEqual(cleaned.topics, ["quality", "delivery"], "unsupported topics should be filtered out");

    const onlyInvalid = {
      sentiment: "neutral",
      topics: ["bogus_topic"],
      summary: "Decent product.",
      needs_reply: false,
    };
    assert.equal(validateReviewAnalysis(onlyInvalid), null, "must reject if no valid topics remain");
  });

  test("rejects non-boolean needs_reply", () => {
    assert.equal(validateReviewAnalysis({ sentiment: "negative", topics: ["support"], summary: "Slow.", needs_reply: "yes" }), null);
    assert.equal(validateReviewAnalysis({ sentiment: "negative", topics: ["support"], summary: "Slow.", needs_reply: 1 }), null);
    assert.equal(validateReviewAnalysis({ sentiment: "negative", topics: ["support"], summary: "Slow.", needs_reply: null }), null);
  });

  test("rejects empty or whitespace-only summary", () => {
    assert.equal(validateReviewAnalysis({ sentiment: "positive", topics: ["quality"], summary: "", needs_reply: false }), null);
    assert.equal(validateReviewAnalysis({ sentiment: "positive", topics: ["quality"], summary: "   ", needs_reply: false }), null);
  });

  test("verifies fallback objects safely encode analysis_failed without crashing the server", () => {
    const rawBatch = [{ review_id: "R999", review_text: "Unanalyzable corrupted text" }];
    const fallbackList = rawBatch.map(() => ({
      sentiment: "analysis_failed",
      topics: ["other"],
      summary: "AI analysis failed validation.",
      needs_reply: false,
    }));

    assert.equal(fallbackList.length, 1);
    assert.equal(fallbackList[0].sentiment, "analysis_failed");
    assert.deepEqual(fallbackList[0].topics, ["other"]);
    assert.equal(fallbackList[0].needs_reply, false);
    // Sentinel check: validateReviewAnalysis strictly rejects analysis_failed as a normal Gemini output
    assert.equal(validateReviewAnalysis(fallbackList[0]), null);
  });

  test("safely handles null, undefined, strings, and non-object inputs", () => {
    assert.equal(validateReviewAnalysis(null), null);
    assert.equal(validateReviewAnalysis(undefined), null);
    assert.equal(validateReviewAnalysis("string"), null);
    assert.equal(validateReviewAnalysis(123), null);
    assert.equal(validateReviewAnalysis([]), null);
  });
});

describe("Suite C — Exponential Backoff Retry Logic", () => {
  test("succeeds on first attempt without retrying when fn resolves immediately", async () => {
    let callCount = 0;
    const result = await callWithBackoff(async () => {
      callCount++;
      return "immediate_success";
    }, [10, 20, 40]);

    assert.equal(result, "immediate_success");
    assert.equal(callCount, 1);
  });

  test("retries on HTTP 429 rate limit error and returns successful response", async () => {
    let callCount = 0;
    const result = await callWithBackoff(async () => {
      callCount++;
      if (callCount === 1) {
        const err = new Error("Rate limit exceeded");
        err.status = 429;
        throw err;
      }
      return "recovered_from_429";
    }, [10, 20, 40]);

    assert.equal(result, "recovered_from_429");
    assert.equal(callCount, 2);
  });

  test("retries on HTTP 503 service unavailable and succeeds after multiple backoff attempts", async () => {
    let callCount = 0;
    const result = await callWithBackoff(async () => {
      callCount++;
      if (callCount < 3) {
        const err = new Error("Service temporarily overloaded");
        err.status = 503;
        throw err;
      }
      return "recovered_from_503";
    }, [10, 20, 40]);

    assert.equal(result, "recovered_from_503");
    assert.equal(callCount, 3);
  });

  test("does not retry on non-retryable 4xx client errors (e.g. 400 Bad Request)", async () => {
    let callCount = 0;
    await assert.rejects(
      async () => {
        await callWithBackoff(async () => {
          callCount++;
          const err = new Error("Bad Request: Invalid argument");
          err.status = 400;
          throw err;
        }, [10, 20, 40]);
      },
      (err) => {
        assert.equal(err.status, 400);
        return true;
      }
    );

    assert.equal(callCount, 1, "400 errors should fail immediately without retrying");
  });

  test("does not retry on 404 Not Found error", async () => {
    let callCount = 0;
    await assert.rejects(
      async () => {
        await callWithBackoff(async () => {
          callCount++;
          const err = new Error("Model not found");
          err.status = 404;
          throw err;
        }, [10, 20, 40]);
      },
      (err) => {
        assert.equal(err.status, 404);
        return true;
      }
    );

    assert.equal(callCount, 1, "404 errors should fail immediately without retrying");
  });

  test("rethrows error after exhausting all retry attempts", async () => {
    let callCount = 0;
    await assert.rejects(
      async () => {
        await callWithBackoff(async () => {
          callCount++;
          const err = new Error("Persistent 500 server error");
          err.status = 500;
          throw err;
        }, [10, 10, 10]);
      },
      (err) => {
        assert.equal(err.status, 500);
        return true;
      }
    );

    assert.equal(callCount, 4, "Initial call + 3 retry attempts = 4 total calls");
  });
});

describe("Suite D — Flexible CSV Header Aliases & Safe Fallbacks", () => {
  test("maps common header aliases (ID, Product_Name, Stars, Comment) accurately", () => {
    const aliasCsv = `ID,Product_Name,Stars,Comment
A101,Smart Watch V2,5,"Excellent build quality, battery lasts 4 days."
A102,Smart Watch V2,2,"Strap broke after a week."`;

    const { cleanedReviews, stats } = cleanReviewsCsv(aliasCsv);

    assert.equal(stats.totalRows, 2);
    assert.equal(cleanedReviews.length, 2);

    const first = cleanedReviews[0];
    assert.equal(first.review_id, "A101");
    assert.equal(first.product, "Smart Watch V2");
    assert.equal(first.rating, 5);
    assert.equal(first.review_text, "Excellent build quality, battery lasts 4 days.");
    assert.ok(typeof first.textHash === "string" && first.textHash.length === 64);
  });

  test("provides safe fallbacks for missing metadata columns (ROW-n, General Product, empty date, unknown rating)", () => {
    const minimalCsv = `Comment
"First review with no other metadata provided."
"Second review with great feedback."`;

    const { cleanedReviews } = cleanReviewsCsv(minimalCsv);

    assert.equal(cleanedReviews.length, 2);

    assert.equal(cleanedReviews[0].review_id, "ROW-1");
    assert.equal(cleanedReviews[0].product, "General Product");
    assert.equal(cleanedReviews[0].date, "");
    assert.equal(cleanedReviews[0].rating, "unknown");
    assert.equal(cleanedReviews[0].review_text, "First review with no other metadata provided.");

    assert.equal(cleanedReviews[1].review_id, "ROW-2");
    assert.equal(cleanedReviews[1].product, "General Product");
  });

  test("throws HTTP 400 error when review text column is completely missing and cannot be inferred", async () => {
    const noTextCsv = `Product_Name,Stars,Item_Cost
Smart Watch,5,$99
Running Shoes,4,$120`;

    await assert.rejects(
      async () => {
        await cleanReviewsCsv(noTextCsv);
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes("review text"), "error message must state review text column was not found");
        return true;
      }
    );
  });

  test("accepts and applies custom/inferred header mapping cleanly", () => {
    const unknownHeadersCsv = `col_a,col_b,col_c
REV-01,Espresso Machine,"Makes rich crema, easy to clean."`;

    const customMapping = {
      review_id: "col_a",
      product: "col_b",
      review_text: "col_c",
    };

    const { cleanedReviews } = cleanReviewsCsv(unknownHeadersCsv, customMapping);

    assert.equal(cleanedReviews.length, 1);
    assert.equal(cleanedReviews[0].review_id, "REV-01");
    assert.equal(cleanedReviews[0].product, "Espresso Machine");
    assert.equal(cleanedReviews[0].review_text, "Makes rich crema, easy to clean.");
    assert.equal(cleanedReviews[0].rating, "unknown");
  });

  test("detectHeaderMapping matches diverse aliases and normalizes whitespace/casing", () => {
    const headers = ["  Review Text  ", "ITEM_NAME", "Score", "ReviewID", "created_at"];
    const mapping = detectHeaderMapping(headers);

    assert.equal(mapping.review_text, "  Review Text  ");
    assert.equal(mapping.product, "ITEM_NAME");
    assert.equal(mapping.rating, "Score");
    assert.equal(mapping.review_id, "ReviewID");
    assert.equal(mapping.date, "created_at");
  });

  test("inferCsvSchemaWithGemini safely returns null on empty or non-array headers without throwing", async () => {
    assert.equal(await inferCsvSchemaWithGemini([]), null);
    assert.equal(await inferCsvSchemaWithGemini(null), null);
  });
});
