import { useState } from "react";
import { FiSearch, FiDownload, FiStar, FiCopy, FiCheck, FiZap, FiLoader } from "react-icons/fi";
import { ALLOWED_TOPICS, PRODUCTS } from "../data/mockReviews";
import useReviewStore from "../store/useReviewStore";

const SENTIMENT_STYLES = {
  positive: "bg-emerald-100 text-emerald-700",
  neutral: "bg-amber-100 text-amber-700",
  negative: "bg-rose-100 text-rose-700",
  analysis_failed: "bg-slate-100 text-slate-500",
};

function StarRating({ rating }) {
  if (rating === "unknown") {
    return <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Unknown</span>;
  }
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <FiStar key={s} size={12} className={s <= rating ? "text-amber-400 fill-amber-400" : "text-slate-300"} />
      ))}
    </span>
  );
}

function ReviewCard({ review }) {
  const [copied, setCopied] = useState(false);
  const { generateSuggestedReply, replyLoadingId } = useReviewStore();

  const reviewId = review._id || review.review_id;
  const isGenerating = replyLoadingId === reviewId;

  function handleCopy() {
    navigator.clipboard.writeText(review.suggested_reply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-400">{review.review_id}</span>
            <span className="font-semibold text-slate-800 text-sm">{review.product}</span>
            {review.rating_mismatch && (
              <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                ⚠ Rating Mismatch
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400">{review.date}</span>
        </div>
        <div className="flex items-center gap-2">
          <StarRating rating={review.rating} />
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SENTIMENT_STYLES[review.sentiment]}`}>
            {review.sentiment}
          </span>
        </div>
      </div>

      <p className="text-sm font-medium text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 leading-relaxed italic">
        "{review.summary}"
      </p>

      <p className="text-sm text-slate-700 leading-relaxed">{review.review_text}</p>

      <div className="flex flex-wrap gap-2">
        {review.topics.map((t) => (
          <span key={t} className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full font-medium">
            {t.replace("_", " ")}
          </span>
        ))}
      </div>

      {review.needs_reply && !review.suggested_reply && (
        <button
          onClick={() => generateSuggestedReply(reviewId)}
          disabled={isGenerating}
          className="self-start flex items-center gap-2 text-sm font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 px-4 py-2 rounded-lg transition-colors"
        >
          {isGenerating ? <FiLoader size={14} className="animate-spin" /> : <FiZap size={14} />}
          {isGenerating ? "Generating…" : "Generate Suggested Reply"}
        </button>
      )}

      {review.suggested_reply && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col gap-2">
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">AI Suggested Reply</p>
          <p className="text-sm text-slate-700 leading-relaxed">{review.suggested_reply}</p>
          <button
            onClick={handleCopy}
            className="self-end flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            {copied ? <FiCheck size={13} /> : <FiCopy size={13} />}
            {copied ? "Copied!" : "Copy Reply"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ReviewsSection({ activeTopic, onTopicClick }) {
  const reviews = useReviewStore((s) => s.reviews);

  const [product, setProduct] = useState("All Products");
  const [sentiment, setSentiment] = useState("All");
  const [search, setSearch] = useState("");

  const topic = activeTopic || "All Topics";
  const sentiments = ["All", "Positive", "Neutral", "Negative"];

  function countSentiment(s) {
    if (s === "All") return reviews.length;
    return reviews.filter((r) => r.sentiment === s.toLowerCase()).length;
  }

  let filtered = reviews;

  if (product !== "All Products") {
    filtered = filtered.filter((r) => r.product === product);
  }
  if (topic !== "All Topics") {
    filtered = filtered.filter((r) => r.topics.includes(topic));
  }
  if (sentiment !== "All") {
    filtered = filtered.filter((r) => r.sentiment === sentiment.toLowerCase());
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.review_text.toLowerCase().includes(q) ||
        r.product.toLowerCase().includes(q) ||
        r.topics.some((t) => t.includes(q))
    );
  }

  function handleExport() {
    const headers = ["review_id", "product", "rating", "date", "sentiment", "topics", "review_text"];
    const rows = filtered.map((r) =>
      [r.review_id, r.product, r.rating, r.date, r.sentiment, r.topics.join("|"), `"${r.review_text.replace(/"/g, '""')}"`].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reviewlens_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        <select
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option>All Products</option>
          {PRODUCTS.map((p) => <option key={p}>{p}</option>)}
        </select>

        <select
          value={topic}
          onChange={(e) => onTopicClick(e.target.value === "All Topics" ? null : e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option>All Topics</option>
          {ALLOWED_TOPICS.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
        </select>

        <div className="flex gap-1">
          {sentiments.map((s) => (
            <button
              key={s}
              onClick={() => setSentiment(s)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                sentiment === s
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s} ({countSentiment(s)})
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-48">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search reviews, products, topics…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 w-full text-sm border border-slate-200 rounded-lg bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors ml-auto"
        >
          <FiDownload size={14} />
          Export CSV
        </button>
      </div>

      <p className="text-xs text-slate-400 px-1">Showing {filtered.length} of {reviews.length} reviews</p>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-sm">
          No reviews match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map((r) => <ReviewCard key={r._id || r.review_id} review={r} />)}
        </div>
      )}
    </div>
  );
}
