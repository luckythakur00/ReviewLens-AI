# ReviewLens — AI Review Insights

A full-stack AI-powered review analysis platform built with React + Vite (frontend) and Node.js + Express (backend), leveraging Google Gemini for intelligent review insights.

## Project Structure

```
ReviewLens/
├── frontend/        # React + Vite + Tailwind CSS
└── backend/         # Node.js + Express + MongoDB
```

## Getting Started

### Backend
```bash
cd backend
cp .env.example .env   # fill in your credentials
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Tech Stack

| Layer    | Stack                                      |
|----------|--------------------------------------------|
| Frontend | React, Vite, Tailwind CSS v4, Axios, Lucide |
| Backend  | Node.js, Express, MongoDB, Mongoose, Zod   |
| AI       | Google Gemini (`@google/genai`)            |
| Testing  | Vitest                                     |
