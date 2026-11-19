import { useState } from "react";
import { FiInbox } from "react-icons/fi";
import NavbarAndUpload from "./components/NavbarAndUpload";
import SummaryAndInsights from "./components/SummaryAndInsights";
import ChartsSection from "./components/ChartsSection";
import ReviewsSection from "./components/ReviewsSection";
import useReviewStore from "./store/useReviewStore";

export default function App() {
  const [activeTopic, setActiveTopic] = useState(null);
  const reviews = useReviewStore((s) => s.reviews);
  const isLoading = useReviewStore((s) => s.isLoading);

  return (
    <div className="min-h-screen bg-slate-50">
      <NavbarAndUpload />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        {reviews.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-2xl py-20 px-8 shadow-sm text-center gap-4">
            <div className="bg-slate-100 text-slate-400 p-5 rounded-2xl">
              <FiInbox size={40} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-700">No reviews analyzed yet</h2>
              <p className="text-sm text-slate-400 mt-1 max-w-md">
                Upload a product reviews CSV file above, or click{" "}
                <span className="font-medium text-indigo-600">'Load Demo Data'</span>{" "}
                in the top right to preview sample insights.
              </p>
            </div>
          </div>
        )}

        {reviews.length > 0 && (
          <>
            <SummaryAndInsights />
            <ChartsSection onTopicClick={setActiveTopic} />
            <div>
              <h2 className="text-lg font-semibold text-slate-700 mb-1">Review Insights</h2>
              <p className="text-xs text-slate-400">
                Filter, search, export, and generate AI replies for individual reviews.
              </p>
            </div>
            <ReviewsSection activeTopic={activeTopic} onTopicClick={setActiveTopic} />
          </>
        )}
      </main>
    </div>
  );
}
