# 🎨 AI-SDLC Platform — Frontend (Prodapt Edition)

The user interface for the AI-Augmented SDLC Platform. Built with React and Vite, featuring a modern glassmorphism design system and smooth AI-driven workflows.

---

## ✨ Features
- **Modern UI/UX**: Dark-themed, responsive dashboard with glassmorphism effects.
- **Micro-Animations**: Smooth page transitions and skeleton loaders for AI processing states.
- **Persistence**: LocalStorage integration to save your analysis results across sessions.
- **Dynamic Routing**: Built with `react-router-dom` for seamless module navigation.
- **Export System**: One-click JSON export and clipboard copying for all AI reports.

---

## 🛠️ Architecture
- **Framework**: [React 18](https://reactjs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: Vanilla CSS (Custom Variable-based Design System)
- **API Client**: [Axios](https://axios-http.com/)
- **Routing**: [React Router v6](https://reactrouter.com/)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation
```bash
# 1. Install dependencies
npm install

# 2. Configure API
# Ensure the backend is running at http://localhost:8000
# or update d:\project\PRODAPT\project-5\frontend\src\api.js

# 3. Start development server
npm run dev
```

---

## 📂 Project Structure
```
frontend/
├── src/
│   ├── components/    # Reusable UI (ExportBar, SkeletonLoader)
│   ├── pages/         # Module Views (Requirements, CodeReview, etc.)
│   ├── api.js         # Axios configuration
│   ├── utils.js       # Persistence and Export logic
│   ├── index.css      # Global Design System
│   └── App.jsx        # Routing and Sidebar layout
├── public/            # Static assets
└── index.html         # Entry point
```

---

## 🎨 Design Tokens (`index.css`)
We use a custom CSS variable system for consistent branding:
- `--bg-base`: `#080b14` (Deep Space Dark)
- `--accent-blue`: `#3b82f6` (Prodapt Blue)
- `--glass`: `rgba(19, 25, 41, 0.7)` (Translucent Panels)

---

*Developed for the Prodapt Internship Final Presentation.*
