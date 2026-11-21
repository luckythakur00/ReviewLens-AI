import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
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
