# Your Bunk Buddy 🎓

> An AI-powered college attendance and bunk planner designed for Indian university students.

## ✨ Features

- **Timetable AI Vision Analyzer**: Upload a photo or PDF of your college timetable to automatically extract weekly periods, lab sessions, and subject frequencies using OpenAI Vision (GPT-4o).
- **Accurate College Days Calculation**: Calculates the exact minimum number of days a student actually needs to attend college to meet their criteria (e.g. 75%), and how many whole days can be safely bunked.
- **Indian Academic Calendar Engine**: Built-in Gazetted, National, and major Indian festival holidays with intelligent weekend de-duplication and custom college vacation support.
- **Dual Criteria Policies**:
  - *Overall Aggregate Attendance*: Optimizes for the minimum days on campus across all courses.
  - *Strict Subject-Wise Attendance*: Ensures every single subject independently maintains $\ge \text{Criteria}\%$ to prevent course detention.
- **Interactive Attendance Trajectory**: Visual progression graph with a real-time "What-If" bunk simulator.
- **Neumorphic (Soft UI) Design**: Tactile, warm off-white and earth-toned palette with soft shadows and inset controls.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Chart.js, Lucide Icons
- **AI Vision**: Google Gen AI SDK (`@google/genai`)
- **Styling**: Pure Neumorphic CSS

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/pranay-vrs/attendance-checking-app.git
cd attendance-checking-app
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure OpenAI API Key
Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
```
*(On Vercel, add `OPENAI_API_KEY` under Project Settings -> Environment Variables)*

### 4. Run Development Server
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
```

## 📄 License
MIT
