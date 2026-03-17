"""
predict.py — maps extracted features to UCI 30-feature vector and runs the model.
"""

import os
import joblib
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(__file__),  "phishing_model.pkl")

_artifact = None

def _load_model():
    global _artifact
    if _artifact is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model not found at {MODEL_PATH}. Run: python model/train_model.py")
        _artifact = joblib.load(MODEL_PATH)
    return _artifact

def is_model_loaded() -> bool:
    try:
        _load_model()
        return True
    except Exception:
        return False

def predict_url(features: dict) -> dict:
    artifact = _load_model()
    model    = artifact["model"]

    vec = _map_to_uci_vector(features)
    X   = np.array([vec])

    prediction = model.predict(X)[0]
    proba      = model.predict_proba(X)[0]
    confidence = float(max(proba))

    return {
        "prediction":      int(prediction),
        "confidence":      round(confidence, 4),
        "proba_legit":     round(float(proba[1]), 4),
        "proba_phishing":  round(float(proba[0]), 4),
    }

def _map_to_uci_vector(f: dict) -> list:
    """
    Map our feature dict to the 30-feature UCI vector.
    UCI encoding: -1 = bad/suspicious, 0 = neutral, 1 = good/safe
    Now includes scraped page signals mapped into the relevant UCI slots.
    """
    def yesno(val): return 1 if val else -1
    def inv(val):   return -1 if val else 1

    url_len      = f.get("url_length", 50)
    url_len_feat = 1 if url_len < 54 else (0 if url_len <= 75 else -1)

    subdomain    = f.get("subdomain_count", 0)
    sub_feat     = 1 if subdomain <= 1 else (0 if subdomain == 2 else -1)

    redirect     = f.get("redirect_count", 0)

    # Page-level signals mapped to UCI slots
    # SSLfinal_State: use both SSL cert + HTTPS
    ssl_state    = 1 if (f.get("has_valid_ssl") and f.get("has_https")) else (
                   0 if f.get("has_https") else -1)

    # SFH (Server Form Handler): external form action = bad
    sfh          = -1 if f.get("page_form_action_external") else 1

    # Iframe
    iframe       = -1 if f.get("page_has_iframe") else 1

    # on_mouseover / RightClick: right-click disabled = suspicious
    right_click  = -1 if f.get("page_right_click_disabled") else 1

    # popUpWindow
    popup        = -1 if f.get("page_has_popup_script") else 1

    # Redirect (meta refresh OR http redirects)
    redirect_feat = 0 if (redirect > 1 or f.get("page_redirect_meta")) else 1

    # web_traffic proxy: known safe OR title matches domain
    traffic      = 1 if f.get("is_known_safe") else (
                   0 if f.get("page_title_matches_domain", 1) else -1)

    # Statistical_report: obfuscated JS or card fields = suspicious
    stat_report  = -1 if (f.get("page_has_obfuscated_js") or f.get("page_has_card_fields")) else (
                    1 if f.get("is_known_safe") else 0)

    return [
        inv(f.get("has_ip_address", 0)),             # having_IP_Address
        url_len_feat,                                 # URL_Length
        1,                                            # Shortining_Service
        inv(f.get("has_at_symbol", 0)),               # having_At_Symbol
        inv(f.get("has_double_slash_redirect", 0)),   # double_slash_redirecting
        inv(f.get("hyphen_in_domain", 0)),            # Prefix_Suffix
        sub_feat,                                     # having_Sub_Domain
        ssl_state,                                    # SSLfinal_State
        1 if f.get("domain_age_days", 0) > 365 else -1, # Domain_registeration_length
        inv(f.get("page_favicon_external", 0)),       # Favicon
        1,                                            # port
        yesno(f.get("has_https", 0)),                 # HTTPS_token
        1,                                            # Request_URL
        inv(min(f.get("page_link_to_external_ratio", 0), 1) > 0.5), # URL_of_Anchor
        1,                                            # Links_in_tags
        sfh,                                          # SFH
        1,                                            # Submitting_to_email
        1 if f.get("is_known_safe") else -1,         # Abnormal_URL
        redirect_feat,                                # Redirect
        1,                                            # on_mouseover
        right_click,                                  # RightClick
        popup,                                        # popUpWidnow
        iframe,                                       # Iframe
        1 if f.get("domain_age_days", 0) > 180 else -1, # age_of_domain
        1,                                            # DNSRecord
        traffic,                                      # web_traffic
        yesno(f.get("tld_is_trusted", 0)),            # Page_Rank
        1,                                            # Google_Index
        0,                                            # Links_pointing_to_page
        stat_report,                                  # Statistical_report
    ]
