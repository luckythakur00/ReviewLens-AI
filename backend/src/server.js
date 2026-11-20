// import express from "express";
// import cors from "cors";
// // import dotenv from "dotenv";
// import mongoose from "mongoose";
// import reviewRoutes from "./routes/reviewRoutes.js";

// // dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 5000;

// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// mongoose
//   .connect(process.env.MONGODB_URI)
//   .then(() => console.log("Connected to MongoDB"))
//   .catch((err) => console.error("MongoDB connection error:", err.message));

// app.get("/health", (req, res) => {
//   res.status(200).json({
//     status: "ok",
//     message: "ReviewLens API is running",
//     timestamp: new Date().toISOString(),
//   });
// });

// app.use("/api/reviews", reviewRoutes);

// app.use((req, res) => {
//   res.status(404).json({ error: "Route not found" });
// });

// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({ error: "Internal Server Error" });
// });

// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
//   // console.log(`🏥 Health check: http://localhost:${PORT}/health`);
// });

// export default app;











import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import reviewRoutes from "./routes/reviewRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "ReviewLens API is running" });
});

app.use("/api/reviews", reviewRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

