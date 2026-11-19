import { useState } from "react";
import { mockReviews, mockPraises, mockComplaints } from "./data/mockReviews";
import NavbarAndUpload from "./components/NavbarAndUpload";
import SummaryAndInsights from "./components/SummaryAndInsights";
import ChartsSection from "./components/ChartsSection";
import ReviewsSection from "./components/ReviewsSection";

export default function App() {
  const [reviews, setReviews] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTopic, setActiveTopic] = useState(null);

  function handleAnalyze() {
    setReviews(mockReviews);
    setIsLoaded(true);
  }

  function handleReset() {
    setReviews([]);
    setIsLoaded(false);
    setActiveTopic(null);
  }

  function handleTopicClick(topic) {
    setActiveTopic(topic);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavbarAndUpload onAnalyze={handleAnalyze} onReset={handleReset} isLoaded={isLoaded} />

      {!isLoaded && (
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <p className="text-slate-400 text-sm">
            Upload a CSV file above or use the{" "}
            <strong className="text-slate-600">Load Sample Data</strong> button to explore the dashboard.
          </p>
          <button
            onClick={handleAnalyze}
            className="mt-4 text-sm font-semibold px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Load Sample Data
          </button>
        </div>
      )}

      {isLoaded && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
          <SummaryAndInsights
            reviews={reviews}
            praises={mockPraises}
            complaints={mockComplaints}
          />

          <ChartsSection
            reviews={reviews}
            onTopicClick={handleTopicClick}
          />

          <div>
            <h2 className="text-lg font-semibold text-slate-700 mb-1">Review Insights</h2>
            <p className="text-xs text-slate-400">
              Filter, search, export, and generate AI replies for individual reviews.
            </p>
          </div>

          <ReviewsSection
            reviews={reviews}
            activeTopic={activeTopic}
            onTopicClick={handleTopicClick}
          />
        </main>
      )}
    </div>
  );
}
