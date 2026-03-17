# 🛡️ ShopSafe: AI-Powered Fake E-Commerce Website Detection

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-2.3-green.svg)](https://flask.palletsprojects.com/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Scikit-learn](https://img.shields.io/badge/Scikit--learn-1.3-orange.svg)](https://scikit-learn.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **ShopSafe** is an AI-powered system that detects fake and fraudulent e-commerce websites in real time, helping users stay safe while shopping online.

---

## 📌 Table of Contents

- [Problem Statement](#problem-statement)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
- [ML Model Details](#ml-model-details)
- [API Reference](#api-reference)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [License](#license)

---

## 🚨 Problem Statement

Fake e-commerce websites are rapidly increasing with the growth of online shopping, posing a serious threat to users. These fraudulent platforms mimic legitimate websites to trick users into making payments or sharing sensitive personal and financial information — resulting in financial losses, identity theft, and data breaches.

Most users lack the tools and technical knowledge to distinguish genuine websites from fraudulent ones. **ShopSafe** solves this with a simple, fast, and reliable AI-powered solution.

---

## ✨ Features

- 🔍 **Real-Time URL Analysis** — Instantly analyze any e-commerce URL
- 🤖 **AI-Based Classification** — Safe / Suspicious / Fake using ML
- 📊 **Risk Score (0–100)** — Clear trust level indicator
- 🌐 **Domain Intelligence** — WHOIS domain age, SSL/HTTPS checks
- 🎨 **Modern UI** — Clean, responsive React frontend
- ⚡ **Fast API Backend** — Flask REST API
- 📈 **Feature Breakdown** — Detailed explanation of risk factors
- 🧪 **Pre-trained Model** — Random Forest trained on phishing datasets

---

## 🛠️ Tech Stack

| Layer       | Technology                    |
|-------------|-------------------------------|
| Frontend    | React 18, Vite, CSS Modules   |
| Backend     | Python 3.9+, Flask 2.3        |
| ML Model    | Scikit-learn (Random Forest)  |
| Data        | UCI Phishing Dataset          |
| API         | Flask-CORS, REST              |
| Deployment  | Docker (optional)             |

---

## 📁 Project Structure

```
shopsafe/
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Page components
│   │   └── App.jsx             # Root component
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── backend/                    # Flask API server
│   ├── app.py                  # Main Flask application
│   ├── model/
│   │   ├── train_model.py      # ML model training script
│   │   ├── predict.py          # Prediction logic
│   │   └── phishing_model.pkl  # Saved model (generated)
│   ├── utils/
│   │   ├── feature_extractor.py # URL feature extraction
│   │   └── whois_helper.py      # Domain age lookup
│   └── requirements.txt
│
├── docs/                       # Documentation & assets
│   └── architecture.md
├── .gitignore
├── docker-compose.yml
└── README.md
```

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/shopsafe.git
cd shopsafe
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate      # Linux/Mac
# OR
venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Train the ML model (generates phishing_model.pkl)
python model/train_model.py

# Start Flask server
python app.py
```

Backend runs at: `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at: `http://localhost:5173`

### 4. (Optional) Docker Setup

```bash
docker-compose up --build
```

---

## 💻 Usage

1. Open the app at `http://localhost:5173`
2. Enter any e-commerce website URL (e.g., `https://example-shop.com`)
3. Click **"Analyze Website"**
4. View the results:
   - **Classification**: Safe ✅ / Suspicious ⚠️ / Fake ❌
   - **Risk Score**: 0 (safest) → 100 (most dangerous)
   - **Feature Analysis**: Detailed breakdown of risk factors

---

## 🧠 ML Model Details

### Algorithm
- **Random Forest Classifier** (100 estimators)
- Trained on the [UCI Phishing Websites Dataset](https://archive.ics.uci.edu/ml/datasets/phishing+websites)
- ~11,000 samples, 30 features

### Features Extracted

| Category        | Features                                                    |
|-----------------|-------------------------------------------------------------|
| URL Structure   | Length, special chars, subdomain depth, IP in URL          |
| Security        | HTTPS presence, SSL certificate validity                    |
| Domain Info     | Domain age, registration length, WHOIS availability        |
| Content Signals | Redirect count, anchor tags ratio, external links ratio    |
| Lexical         | Keywords (login, verify, secure, update), TLD type         |

### Performance

| Metric    | Score   |
|-----------|---------|
| Accuracy  | ~95.8%  |
| Precision | ~96.2%  |
| Recall    | ~95.4%  |
| F1 Score  | ~95.8%  |

---

## 📡 API Reference

### `POST /api/analyze`

Analyzes a given URL and returns classification results.

**Request Body:**
```json
{
  "url": "https://suspicious-shop.com"
}
```

**Response:**
```json
{
  "url": "https://suspicious-shop.com",
  "classification": "Fake",
  "risk_score": 87,
  "confidence": 0.94,
  "features": {
    "has_https": false,
    "domain_age_days": 12,
    "url_length": 34,
    "has_ip_address": false,
    "suspicious_keywords": ["verify", "login"],
    "redirect_count": 3,
    "has_valid_ssl": false
  },
  "risk_factors": [
    "No HTTPS detected",
    "Very new domain (12 days old)",
    "Suspicious keywords found",
    "Multiple redirects detected"
  ]
}
```

### `GET /api/health`

```json
{ "status": "ok", "model_loaded": true }
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add your feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

---

## 👤 Author

Built for AI-ML Project Submission  
**Topic:** ShopSafe: AI-Powered Fake E-Commerce Website Detection

---

*Stay safe. Shop smart. Use ShopSafe.* 🛡️
