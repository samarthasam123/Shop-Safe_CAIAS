"""
feature_extractor.py
Extracts ML features from a given URL for phishing/fake site detection.
"""

import re
import urllib.parse
import requests
import socket
from datetime import datetime

# Suspicious keywords commonly found in phishing/fake sites
SUSPICIOUS_KEYWORDS = [
    "login", "verify", "secure", "update", "confirm", "account",
    "banking", "paypal", "amazon", "ebay", "signin", "password",
    "credential", "auth", "validate", "checkout", "payment"
]

# Trusted TLDs
TRUSTED_TLDS = {".com", ".org", ".net", ".edu", ".gov", ".in", ".co"}

# Common legitimate domains (whitelist examples)
KNOWN_SAFE_DOMAINS = {
    "amazon.com", "flipkart.com", "myntra.com", "snapdeal.com",
    "ebay.com", "etsy.com", "shopify.com", "walmart.com",
    "bestbuy.com", "target.com", "alibaba.com"
}


def extract_features(url: str) -> dict:
    """
    Extract a comprehensive set of features from a URL.
    Returns a dictionary of feature name → value.
    """
    features = {}
    parsed = _safe_parse(url)

    # --- URL Structure Features ---
    features["url_length"] = len(url)
    features["has_ip_address"] = int(_has_ip_address(url))
    features["subdomain_count"] = _count_subdomains(parsed)
    features["special_char_count"] = _count_special_chars(url)
    features["has_at_symbol"] = int("@" in url)
    features["has_double_slash_redirect"] = int("//" in url[8:])
    features["hyphen_in_domain"] = int("-" in parsed.get("domain", ""))
    features["dot_count"] = url.count(".")
    features["path_depth"] = _path_depth(parsed)
    features["query_param_count"] = len(urllib.parse.parse_qs(parsed.get("query", "")))
    features["url_entropy"] = _calculate_entropy(url)

    # --- Protocol / Security Features ---
    features["has_https"] = int(url.lower().startswith("https://"))
    features["has_valid_ssl"] = _check_ssl(parsed.get("netloc", ""))

    # --- Domain Features ---
    features["domain_age_days"] = _estimate_domain_age(parsed.get("netloc", ""))
    features["tld_is_trusted"] = int(_tld_is_trusted(url))
    features["is_known_safe"] = int(_is_known_safe(parsed.get("netloc", "")))
    features["domain_length"] = len(parsed.get("domain", ""))

    # --- Keyword Features ---
    kw_found = _find_suspicious_keywords(url)
    features["suspicious_keyword_count"] = len(kw_found)
    features["has_suspicious_keywords"] = int(len(kw_found) > 0)

    # --- Brand Spoofing ---
    features["has_brand_spoofing"] = int(_check_brand_spoofing(url, parsed.get("netloc", "")))

    # --- Redirect / Link Features (lightweight) ---
    features["redirect_count"] = _count_redirects(url)

    return features


def get_risk_factors(url: str, features: dict) -> list:
    """Convert feature values into human-readable risk factor strings."""
    risks = []

    if not features.get("has_https"):
        risks.append("No HTTPS — connection is not encrypted")
    if not features.get("has_valid_ssl"):
        risks.append("Invalid or missing SSL certificate")
    if features.get("has_ip_address"):
        risks.append("IP address used instead of domain name")
    if features.get("domain_age_days", 9999) < 30:
        age = features.get("domain_age_days", "?")
        risks.append(f"Very new domain (approximately {age} days old)")
    if features.get("subdomain_count", 0) > 3:
        risks.append(f"Unusually deep subdomain structure ({features['subdomain_count']} levels)")
    if features.get("has_at_symbol"):
        risks.append("'@' symbol in URL — common phishing technique")
    if features.get("has_double_slash_redirect"):
        risks.append("Double-slash redirect pattern detected")
    if features.get("url_length", 0) > 75:
        risks.append(f"Abnormally long URL ({features['url_length']} characters)")
    if features.get("hyphen_in_domain"):
        risks.append("Hyphen in domain name — often used in spoofing")
    if features.get("suspicious_keyword_count", 0) > 0:
        kw = _find_suspicious_keywords(url)
        risks.append(f"Suspicious keywords detected: {', '.join(kw[:3])}")
    if features.get("redirect_count", 0) > 2:
        risks.append(f"Multiple redirects detected ({features['redirect_count']})")
    if features.get("has_brand_spoofing"):
        risks.append("Brand spoofing or typosquatting detected")
    if not features.get("tld_is_trusted"):
        risks.append("Uncommon or suspicious top-level domain (TLD)")

    return risks


def compute_risk_score(features: dict, prediction: int, confidence: float) -> int:
    """
    Compute a 0-100 risk score.
    0 = completely safe, 100 = definitely fake.
    """
    score = 0

    # Base from ML model
    score += int(prediction * confidence * 50)

    # Additive penalties
    if not features.get("has_https"):
        score += 15
    if not features.get("has_valid_ssl"):
        score += 10
    if features.get("has_ip_address"):
        score += 40
    if features.get("domain_age_days", 9999) < 30:
        score += 20
    if features.get("suspicious_keyword_count", 0) >= 1:
        score += 20
    if features.get("url_length", 0) > 75:
        score += 10
    if features.get("subdomain_count", 0) > 2:
        score += 10
    if features.get("redirect_count", 0) > 1:
        score += 10
    if features.get("has_brand_spoofing"):
        score += 40
    if not features.get("tld_is_trusted"):
        score += 20

    # Safe domain bonus
    if features.get("is_known_safe"):
        score = max(0, score - 30)

    return min(100, max(0, score))


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _safe_parse(url: str) -> dict:
    try:
        p = urllib.parse.urlparse(url)
        host = p.netloc or p.path
        # Strip port
        domain = host.split(":")[0]
        return {
            "scheme": p.scheme,
            "netloc": domain,
            "domain": domain,
            "path": p.path,
            "query": p.query,
        }
    except Exception:
        return {"scheme": "", "netloc": "", "domain": "", "path": "", "query": ""}


def _has_ip_address(url: str) -> bool:
    ip_pattern = re.compile(
        r"(\d{1,3}\.){3}\d{1,3}"
    )
    return bool(ip_pattern.search(url))


def _count_subdomains(parsed: dict) -> int:
    domain = parsed.get("domain", "")
    parts = domain.split(".")
    return max(0, len(parts) - 2)


def _count_special_chars(url: str) -> int:
    return sum(1 for c in url if c in "!@#$%^&*()_+=[]{}|;':\"<>?,\\")


def _path_depth(parsed: dict) -> int:
    path = parsed.get("path", "")
    return len([p for p in path.split("/") if p])


def _calculate_entropy(text: str) -> float:
    import math
    if not text:
        return 0.0
    freq = {}
    for c in text:
        freq[c] = freq.get(c, 0) + 1
    total = len(text)
    entropy = -sum((f / total) * math.log2(f / total) for f in freq.values())
    return round(entropy, 3)


def _check_ssl(netloc: str) -> int:
    if not netloc:
        return 0
    try:
        import ssl
        ctx = ssl.create_default_context()
        with ctx.wrap_socket(
            socket.create_connection((netloc, 443), timeout=3),
            server_hostname=netloc
        ):
            return 1
    except Exception:
        return 0


def _estimate_domain_age(netloc: str) -> int:
    """
    Try WHOIS lookup; fall back to a heuristic based on domain length.
    Returns estimated age in days.
    """
    try:
        import whois
        w = whois.whois(netloc)
        creation = w.creation_date
        if isinstance(creation, list):
            creation = creation[0]
        if creation:
            age = (datetime.now() - creation).days
            return max(0, age)
    except Exception:
        pass
    # Heuristic fallback: short, clean domains tend to be older
    domain_len = len(netloc)
    if domain_len < 10:
        return 1000  # likely established
    elif domain_len < 20:
        return 300
    else:
        return 30  # default to "new" for long/suspicious domains


def _tld_is_trusted(url: str) -> bool:
    parsed = _safe_parse(url)
    domain = parsed.get("netloc", "").lower()
    for tld in TRUSTED_TLDS:
        if domain.endswith(tld):
            return True
    return False


def _is_known_safe(netloc: str) -> bool:
    netloc = netloc.lower().replace("www.", "")
    return netloc in KNOWN_SAFE_DOMAINS


def _find_suspicious_keywords(url: str) -> list:
    url_lower = url.lower()
    return [kw for kw in SUSPICIOUS_KEYWORDS if kw in url_lower]


def _count_redirects(url: str) -> int:
    try:
        resp = requests.get(url, allow_redirects=True, timeout=5)
        return len(resp.history)
    except Exception:
        return 0

def _check_brand_spoofing(url: str, netloc: str) -> bool:
    if not netloc:
        return False
        
    netloc_lower = netloc.lower()
    
    # 1. Look for known top brands in the domain, but NOT if it's the official domain
    brands = [
        "amazon", "flipkart", "myntra", "snapdeal", "ebay", 
        "paypal", "netflix", "apple", "google", "facebook", 
        "instagram", "walmart", "target", "microsoft"
    ]
    
    for brand in brands:
        if brand in netloc_lower and not _is_known_safe(netloc):
            return True
            
    # 2. Look for common exact typosquats
    typosquats = ["amaz0n", "paypa1", "netf1ix", "eb@y", "g00gle", "f1ipkart", "paypaI"]
    for ts in typosquats:
        if ts in netloc_lower:
            return True
            
    return False

