# ShopSafe — System Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                             │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              React Frontend (Vite)                        │  │
│  │                                                           │  │
│  │  SearchBar ──► App.jsx ──► ResultCard                    │  │
│  │                        └──► FeatureGrid                  │  │
│  │                        └──► RiskFactors                  │  │
│  └──────────────────────┬───────────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────────────┘
                          │ POST /api/analyze
                          │ { "url": "..." }
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Flask Backend                               │
│                                                                 │
│  app.py                                                         │
│    │                                                            │
│    ├──► utils/feature_extractor.py                             │
│    │      │  URL parsing & feature computation                 │
│    │      │  • URL structure (length, special chars, IP)      │
│    │      │  • Security (HTTPS, SSL check)                    │
│    │      │  • Domain info (WHOIS age, TLD)                   │
│    │      │  • Lexical (keyword matching, entropy)            │
│    │      └──► Returns: feature dict (20+ features)           │
│    │                                                            │
│    ├──► model/predict.py                                       │
│    │      │  Maps features → 30-feature UCI vector            │
│    │      └──► RandomForest.predict_proba()                   │
│    │            Returns: {prediction, confidence}              │
│    │                                                            │
│    └──► Computes risk_score, classification, risk_factors      │
│         Returns JSON response                                   │
│                                                                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │ (model trained offline)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ML Pipeline                                │
│                                                                 │
│  model/train_model.py                                          │
│    │                                                            │
│    ├──► UCI Phishing Dataset (11,055 samples, 30 features)     │
│    │      OR synthetic data fallback                           │
│    │                                                            │
│    ├──► train_test_split (80/20)                               │
│    │                                                            │
│    ├──► Pipeline:                                              │
│    │      StandardScaler → RandomForestClassifier(n=100)      │
│    │                                                            │
│    └──► Saved: phishing_model.pkl                             │
│          • Accuracy:  ~95.8%                                   │
│          • ROC-AUC:   ~98.4%                                   │
│          • F1 Score:  ~95.8%                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User Input URL
     │
     ▼
URL Normalization (add https:// if missing)
     │
     ▼
Feature Extraction (20+ signals)
     │
     ├─ URL Structure Analysis
     │    • url_length, special_chars, subdomain_count
     │    • has_ip_address, has_at_symbol, hyphen_in_domain
     │
     ├─ Security Analysis
     │    • has_https (protocol check)
     │    • has_valid_ssl (socket TLS handshake)
     │
     ├─ Domain Intelligence
     │    • domain_age_days (WHOIS lookup)
     │    • tld_is_trusted, is_known_safe
     │
     └─ Lexical / Behavioral
          • suspicious_keyword_count
          • redirect_count, url_entropy
     │
     ▼
UCI Feature Vector Mapping (30 features)
     │
     ▼
RandomForest Prediction
     │
     ├─ prediction: 0 (phishing) or 1 (legitimate)
     └─ confidence: probability of predicted class
     │
     ▼
Risk Score Computation (0–100)
     │
     ├─ Base from ML confidence × prediction
     └─ Additive penalties for each risk signal
     │
     ▼
Classification
     ├─ 0–39:   Safe ✅
     ├─ 40–69:  Suspicious ⚠️
     └─ 70–100: Fake ❌
     │
     ▼
JSON Response → React UI
```

## Tech Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| ML Algorithm | Random Forest | High accuracy, interpretable, handles mixed features |
| Feature Encoding | UCI -1/0/1 scheme | Matches training data distribution |
| Backend Framework | Flask | Lightweight, easy ML integration |
| Frontend | React + Vite | Fast HMR, component reuse |
| Styling | CSS Modules | No runtime, scoped, no class conflicts |
| Model Persistence | joblib (pkl) | Fast load, sklearn compatible |
