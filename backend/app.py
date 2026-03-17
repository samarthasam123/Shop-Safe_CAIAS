"""
app.py — ShopSafe Flask Backend
Run: python app.py
"""

import os
import re
from flask import Flask, request, jsonify
from flask_cors import CORS

# Ensure backend root is in path
import sys
sys.path.insert(0, os.path.dirname(__file__))

from utils.feature_extractor import (
    extract_features, get_risk_factors, compute_risk_score
)
from model.predict import predict_url, is_model_loaded

app = Flask(__name__)
CORS(app)  # Allow React frontend to call the API


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model_loaded": is_model_loaded(),
        "version": "1.0.0"
    })


@app.route("/api/analyze", methods=["POST"])
def analyze():
    data = request.get_json(silent=True) or {}
    url = (data.get("url") or "").strip()

    if not url:
        return jsonify({"error": "URL is required"}), 400

    # Normalize URL
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    if not _is_valid_url(url):
        return jsonify({"error": "Invalid URL format"}), 400

    try:
        # 1. Extract features
        features = extract_features(url)

        # 2. Run ML prediction
        pred_result = predict_url(features)

        # 3. Compute risk score (0–100)
        is_phishing = pred_result["prediction"] == 0  # 0 = phishing, 1 = legit
        risk_score = compute_risk_score(
            features,
            prediction=1 if is_phishing else 0,
            confidence=pred_result["confidence"]
        )

        # 4. Classify
        if risk_score >= 70:
            classification = "Fake"
        elif risk_score >= 40:
            classification = "Suspicious"
        else:
            classification = "Safe"

        # 5. Risk factors
        risk_factors = get_risk_factors(url, features)

        return jsonify({
            "url": url,
            "classification": classification,
            "risk_score": risk_score,
            "confidence": pred_result["confidence"],
            "features": {
                "has_https": bool(features.get("has_https")),
                "has_valid_ssl": bool(features.get("has_valid_ssl")),
                "has_ip_address": bool(features.get("has_ip_address")),
                "domain_age_days": features.get("domain_age_days"),
                "url_length": features.get("url_length"),
                "subdomain_count": features.get("subdomain_count"),
                "suspicious_keyword_count": features.get("suspicious_keyword_count"),
                "redirect_count": features.get("redirect_count"),
                "is_known_safe": bool(features.get("is_known_safe")),
                "tld_is_trusted": bool(features.get("tld_is_trusted")),
                "url_entropy": features.get("url_entropy"),
            },
            "risk_factors": risk_factors,
            "ml_scores": {
                "proba_legitimate": pred_result["proba_legit"],
                "proba_phishing": pred_result["proba_phishing"],
            }
        })

    except Exception as e:
        print(f"[ERROR] analyze: {e}")
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500


@app.route("/api/examples", methods=["GET"])
def examples():
    """Return example URLs for testing."""
    return jsonify({
        "safe": [
            "https://www.amazon.com",
            "https://www.flipkart.com",
            "https://www.myntra.com",
        ],
        "suspicious": [
            "http://amaz0n-deals.shop/login",
            "http://flipkart-offer.net/verify",
        ],
        "fake": [
            "http://192.168.1.1/ebay-login",
            "http://secure-paypal-verify.xyz/account",
        ]
    })


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _is_valid_url(url: str) -> bool:
    pattern = re.compile(
        r"^https?://"
        r"(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|"
        r"localhost|"
        r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})"
        r"(?::\d+)?"
        r"(?:/?|[/?]\S+)$", re.IGNORECASE
    )
    return bool(pattern.match(url))


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("🛡️  ShopSafe Backend starting...")
    if not is_model_loaded():
        print("⚠️  Model not found. Run: python model/train_model.py")
    else:
        print("✅ ML model loaded.")
    app.run(debug=True, host="0.0.0.0", port=5000)
