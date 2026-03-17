import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from utils.feature_extractor import extract_features, compute_risk_score, get_risk_factors
from model.predict import predict_url, is_model_loaded

urls = [
    "http://192.168.1.1/ebay-login",
    "http://secure-paypal-verify.xyz/account",
    "http://amazon.com.fake.site/login",
    "https://www.amazon.com",
    "http://myfake-amazon.com/login"
]

print("Model Loaded:", is_model_loaded())

for url in urls:
    print(f"\nTesting URL: {url}")
    features = extract_features(url)
    pred_result = predict_url(features) if is_model_loaded() else {"prediction": 0, "confidence": 0.9, "proba_legit": 0.1, "proba_phishing": 0.9}
    
    is_phishing = pred_result["prediction"] == 0
    risk_score = compute_risk_score(
        features,
        prediction=1 if is_phishing else 0,
        confidence=pred_result["confidence"]
    )
    
    if risk_score >= 70:
        classification = "Fake"
    elif risk_score >= 40:
        classification = "Suspicious"
    else:
        classification = "Safe"
        
    print(f"Classification: {classification} (Score: {risk_score})")
    print(f"Factors: {get_risk_factors(url, features)}")
