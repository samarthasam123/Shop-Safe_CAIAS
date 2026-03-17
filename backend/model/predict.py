"""
predict.py
Loads the trained model and maps extracted URL features
to the 30-feature UCI format for prediction.
"""

import os
import joblib
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(__file__), "phishing_model.pkl")

_artifact = None


def _load_model():
    global _artifact
    if _artifact is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"Model not found at {MODEL_PATH}. "
                "Run: python model/train_model.py"
            )
        _artifact = joblib.load(MODEL_PATH)
    return _artifact


def is_model_loaded() -> bool:
    try:
        _load_model()
        return True
    except Exception:
        return False


def predict_url(features: dict) -> dict:
    """
    Given the feature dict from feature_extractor.py,
    return prediction + confidence.
    """
    artifact = _load_model()
    model = artifact["model"]
    feature_names = artifact["feature_names"]

    # Map our extracted features → UCI 30-feature vector
    vec = _map_to_uci_vector(features)
    X = np.array([vec])

    prediction = model.predict(X)[0]          # 1=legit, 0=phishing
    proba = model.predict_proba(X)[0]         # [P(phishing), P(legit)]
    confidence = float(max(proba))

    return {
        "prediction": int(prediction),
        "confidence": round(confidence, 4),
        "proba_legit": round(float(proba[1]), 4),
        "proba_phishing": round(float(proba[0]), 4),
    }


def _map_to_uci_vector(f: dict) -> list:
    """
    Map our feature dict to the 30-feature UCI vector.
    UCI encoding: -1 = bad/suspicious, 0 = neutral, 1 = good/safe
    """
    def yesno(val):   return 1 if val else -1
    def inv(val):     return -1 if val else 1  # inverse (bad=high)

    # Clamp helpers
    url_len = f.get("url_length", 50)
    url_len_feat = 1 if url_len < 54 else (0 if url_len <= 75 else -1)

    subdomain = f.get("subdomain_count", 0)
    subdomain_feat = 1 if subdomain <= 1 else (0 if subdomain == 2 else -1)

    redirect_count = f.get("redirect_count", 0)

    return [
        inv(f.get("has_ip_address", 0)),          # having_IP_Address
        url_len_feat,                              # URL_Length
        1,                                         # Shortining_Service (not detected)
        inv(f.get("has_at_symbol", 0)),            # having_At_Symbol
        inv(f.get("has_double_slash_redirect", 0)), # double_slash_redirecting
        inv(f.get("hyphen_in_domain", 0)),         # Prefix_Suffix
        subdomain_feat,                            # having_Sub_Domain
        yesno(f.get("has_valid_ssl", 0)),          # SSLfinal_State
        1 if f.get("domain_age_days", 0) > 365 else -1, # Domain_registeration_length
        1,                                         # Favicon (assume ok)
        1,                                         # port (assume standard)
        yesno(f.get("has_https", 0)),              # HTTPS_token
        1,                                         # Request_URL
        1,                                         # URL_of_Anchor
        1,                                         # Links_in_tags
        1,                                         # SFH
        1,                                         # Submitting_to_email
        1 if f.get("is_known_safe", 0) else -1,   # Abnormal_URL
        0 if redirect_count > 1 else 1,            # Redirect
        1,                                         # on_mouseover
        1,                                         # RightClick
        1,                                         # popUpWidnow
        1,                                         # Iframe
        1 if f.get("domain_age_days", 0) > 180 else -1, # age_of_domain
        1,                                         # DNSRecord
        1 if f.get("is_known_safe", 0) else 0,    # web_traffic
        1 if f.get("tld_is_trusted", 0) else -1,  # Page_Rank
        1,                                         # Google_Index
        0,                                         # Links_pointing_to_page
        1 if f.get("is_known_safe", 0) else 0,    # Statistical_report
    ]
