# 📚 SRMS — Student Record Management System

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-blue?style=for-the-badge&logo=github)](https://dinesh37518.github.io/SRMS)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)

## 🌐 Live Demo

> **[https://dinesh37518.github.io/SRMS](https://dinesh37518.github.io/SRMS)**

---

## 📖 About

**SRMS (Student Record Management System)** is a web application for managing student data, academic records, and administrative tasks. It features role-based access for both Admins and Students.

---

## ✨ Features

- 🔐 **Authentication** — Login system with role-based access (Admin / Student)
- 🛡️ **Admin Dashboard** — Manage student records, add/edit/delete students
- 🎓 **Student Dashboard** — View personal academic records and placement info
- 📊 **Data Management** — Local storage-based persistent data
- 🔔 **Toast Notifications** — Real-time feedback on actions
- 📱 **Responsive Design** — Works on all screen sizes

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| React 18 | UI Framework |
| Vite 5 | Build Tool & Dev Server |
| Vanilla CSS | Styling & Animations |
| LocalStorage | Data Persistence |
| GitHub Pages | Hosting |

---

## 📁 Project Structure

```
SRMS/
├── src/
│   ├── components/     # Reusable UI components (Header, Sidebar, Modal, Toast)
│   ├── context/        # React Context (AuthContext)
│   ├── pages/          # Page components (Login, AdminDashboard, StudentDashboard)
│   └── utils/          # Helper functions & storage utilities
├── css/                # Global stylesheets
├── js/                 # Vanilla JS modules (admin, student, UI)
├── index.html          # Entry HTML
├── vite.config.js      # Vite configuration
└── package.json        # Project dependencies
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/dinesh37518/SRMS.git

# Navigate to project folder
cd SRMS

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run deploy` | Build & deploy to GitHub Pages |

---

## 🌍 Deployment

This project is deployed on **GitHub Pages**.

To redeploy after changes:

```bash
npm run deploy
```

---

## 👤 Author

**Dinesh Kumar M**
- GitHub: [@dinesh37518](https://github.com/dinesh37518)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
