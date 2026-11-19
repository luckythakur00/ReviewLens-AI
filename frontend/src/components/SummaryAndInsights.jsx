import { FiList, FiPieChart, FiMessageCircle, FiAlertTriangle } from "react-icons/fi";
import useReviewStore from "../store/useReviewStore";
import { mockPraises, mockComplaints } from "../data/mockReviews";

export default function SummaryAndInsights() {
  const reviews = useReviewStore((s) => s.reviews);

  const total = reviews.length;
  const positiveCount = reviews.filter((r) => r.sentiment === "positive").length;
  const neutralCount = reviews.filter((r) => r.sentiment === "neutral").length;
  const negativeCount = reviews.filter((r) => r.sentiment === "negative").length;
  const needsReplyCount = reviews.filter((r) => r.needs_reply).length;
  const mismatchCount = reviews.filter((r) => r.rating_mismatch).length;

  const positivePct = total > 0 ? Math.round((positiveCount / total) * 100) : 0;
  const neutralPct = total > 0 ? Math.round((neutralCount / total) * 100) : 0;
  const negativePct = total > 0 ? Math.round((negativeCount / total) * 100) : 0;
  const agreementPct = total > 0 ? Math.round(((total - mismatchCount) / total) * 100) : 0;

  const cards = [
    {
      icon: <FiList size={22} className="text-indigo-600" />,
      iconBg: "bg-indigo-100",
      label: "Total Reviews Analysed",
      value: total,
      sub: <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Deduplicated</span>,
    },
    {
      icon: <FiPieChart size={22} className="text-emerald-600" />,
      iconBg: "bg-emerald-100",
      label: "Sentiment Split",
      value: `${positivePct}% Positive`,
      sub: <span className="text-xs text-slate-500">{neutralPct}% Neutral · {negativePct}% Negative</span>,
    },
    {
      icon: <FiMessageCircle size={22} className="text-sky-600" />,
      iconBg: "bg-sky-100",
      label: "Reviews Needing Reply",
      value: needsReplyCount,
      sub: <span className="text-xs text-slate-500">Flagged for follow-up</span>,
    },
    {
      icon: <FiAlertTriangle size={22} className="text-amber-500" />,
      iconBg: "bg-amber-100",
      label: "Rating–Sentiment Agreement",
      value: `${agreementPct}% Agreement`,
      sub: <span className="text-xs text-slate-500">{mismatchCount} mismatch{mismatchCount !== 1 ? "es" : ""} flagged</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
            <div className={`${c.iconBg} w-10 h-10 rounded-xl flex items-center justify-center`}>{c.icon}</div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{c.label}</p>
              <p className="text-2xl font-bold text-slate-800 leading-snug">{c.value}</p>
            </div>
            <div>{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-emerald-700 mb-3">🏆 Top 3 Praises</p>
          <div className="flex flex-col gap-3">
            {mockPraises.map((p, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-0.5 text-xs font-bold bg-emerald-100 text-emerald-700 w-5 h-5 rounded-full flex items-center justify-center shrink-0">{i + 1}</span>
                <div>
                  <p className="text-sm text-slate-700">{p.point}</p>
                  <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full mt-1 inline-block">{p.product}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-rose-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-rose-700 mb-3">⚠️ Top 3 Complaints</p>
          <div className="flex flex-col gap-3">
            {mockComplaints.map((c, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-0.5 text-xs font-bold bg-rose-100 text-rose-700 w-5 h-5 rounded-full flex items-center justify-center shrink-0">{i + 1}</span>
                <div>
                  <p className="text-sm text-slate-700">{c.point}</p>
                  <span className="text-xs bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded-full mt-1 inline-block">{c.product}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
