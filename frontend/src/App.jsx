import { useState } from "react";
import NavbarAndUpload from "./components/NavbarAndUpload";
import SummaryAndInsights from "./components/SummaryAndInsights";
import ChartsSection from "./components/ChartsSection";
import ReviewsSection from "./components/ReviewsSection";

export default function App() {
  const [activeTopic, setActiveTopic] = useState(null);

  return (
    <div className="min-h-screen bg-slate-50">
      <NavbarAndUpload />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        <SummaryAndInsights />

        <ChartsSection onTopicClick={setActiveTopic} />

        <div>
          <h2 className="text-lg font-semibold text-slate-700 mb-1">Review Insights</h2>
          <p className="text-xs text-slate-400">
            Filter, search, export, and generate AI replies for individual reviews.
          </p>
        </div>

        <ReviewsSection activeTopic={activeTopic} onTopicClick={setActiveTopic} />
      </main>
    </div>
  );
}
