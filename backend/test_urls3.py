import sys
import os
import json
sys.path.insert(0, os.path.dirname(__file__))

from utils.feature_extractor import extract_features, compute_risk_score, get_risk_factors
from model.predict import predict_url, is_model_loaded

urls = [
    "http://amaz0n-deals.shop",
    "http://amaz0n-deals.shop/login",
    "https://amaz0n-deals.shop",
    "http://flipkart-offer.net/verify"
]

results = []
for url in urls:
    features = extract_features(url)
    pred_result = predict_url(features) if is_model_loaded() else {"prediction": 0, "confidence": 0.9, "proba_legit": 0.1, "proba_phishing": 0.9}
    
    is_phishing = pred_result["prediction"] == 0
    risk_score = compute_risk_score(
        features,
        prediction=1 if is_phishing else 0,
        confidence=pred_result["confidence"]
    )
    
    classification = "Fake" if risk_score >= 70 else "Suspicious" if risk_score >= 40 else "Safe"
    results.append(f"URL: {url}\nClassification: {classification} (Score: {risk_score})\nFactors: {get_risk_factors(url, features)}\n")

with open("test_results2.log", "w", encoding="utf-8") as f:
    f.write("\n".join(results))
