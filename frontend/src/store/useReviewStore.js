import { create } from "zustand";
import { mockReviews } from "../data/mockReviews";
import api from "../api/axios";

const useReviewStore = create((set, get) => ({
  reviews: [],
  stats: null,
  isLoading: false,
  error: null,
  replyLoadingId: null,

  uploadReviewsCsv: async (file) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post("/reviews/upload", formData);
      set({
        reviews: response.data.reviews || [],
        stats: response.data.stats || null,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err.response?.data?.message || err.message || "Failed to upload reviews.",
        isLoading: false,
      });
    }
  },

  generateSuggestedReply: async (reviewId) => {
    set({ replyLoadingId: reviewId });
    try {
      const response = await api.post(`/reviews/${reviewId}/reply`);
      const updatedReviews = get().reviews.map((r) => {
        const id = r._id || r.review_id;
        if (id === reviewId) {
          return { ...r, suggested_reply: response.data.suggested_reply };
        }
        return r;
      });
      set({ reviews: updatedReviews, replyLoadingId: null });
    } catch (err) {
      set({
        error: err.response?.data?.message || err.message,
        replyLoadingId: null,
      });
    }
  },

  loadDemoData: () => {
    set({
      reviews: mockReviews,
      error: null,
      stats: {
        totalRows: 12,
        validCount: 12,
        skippedEmpty: 0,
        skippedDuplicates: 0,
        cacheHits: 0,
        aiBatchesCalled: 0,
        processingTime: "0.00s (Demo)",
      },
    });
  },

  clearData: () => {
    set({ reviews: [], stats: null, error: null });
  },
}));

export default useReviewStore;
