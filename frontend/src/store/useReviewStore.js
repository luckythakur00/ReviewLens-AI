import { create } from "zustand";
import { mockReviews } from "../data/mockReviews";
import api from "../api/axios";

const useReviewStore = create((set, get) => ({
  reviews: mockReviews,
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
        reviews: response.data.reviews,
        stats: response.data.stats,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err.response?.data?.message || "Upload failed. Please try again.",
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
      set({ replyLoadingId: null });
    }
  },

  resetDemo: () => {
    set({ reviews: mockReviews, stats: null, error: null });
  },
}));

export default useReviewStore;
