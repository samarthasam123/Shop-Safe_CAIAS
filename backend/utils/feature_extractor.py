"""
feature_extractor.py
Extracts ML features from a URL — URL analysis + live page scraping.
"""

import re
import math
import socket
import urllib.parse
from datetime import datetime

import requests
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Only phishing-specific terms — NO brand names here
SUSPICIOUS_KEYWORDS = [
    "login", "verify", "secure", "update", "confirm", "account",
    "banking", "signin", "password", "credential", "auth",
    "validate", "checkout", "payment", "webscr", "cmd=_"
]

# Trusted brand roots — just the name, no TLD
TRUSTED_BRAND_ROOTS = {
    # Indian e-commerce
    "flipkart", "myntra", "snapdeal", "meesho", "ajio", "nykaa",
    "tatacliq", "jiomart", "bigbasket", "blinkit", "zepto",
    "swiggy", "zomato", "bookmyshow", "naukri", "makemytrip",
    "goibibo", "irctc", "reliancedigital", "croma",
    # Global e-commerce
    "amazon", "ebay", "etsy", "shopify", "walmart", "bestbuy",
    "target", "alibaba", "aliexpress",
    # Payments
    "paypal", "razorpay", "stripe", "paytm", "phonepe",
    # Tech
    "apple", "samsung", "microsoft", "google", "youtube",
    "linkedin", "facebook", "instagram", "twitter",
}

# All trusted TLDs including compound ones
TRUSTED_TLDS = {
    "com", "in", "org", "net", "edu", "gov", "co",
    "uk", "au", "de", "ca", "fr", "jp", "us", "io",
    "co.in", "co.uk", "com.au", "co.jp",
}

TYPOSQUATS = [
    "amaz0n", "paypa1", "netfl1x", "g00gle", "f1ipkart",
    "microsofl", "appl3", "ebay1", "walmart0", "paypa1",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def extract_features(url: str) -> dict:
    features = {}
    parsed  = _safe_parse(url)
    netloc  = parsed.get("netloc", "")

    # ── 1. URL-level features ─────────────────────────────────────────────
    features["url_length"]                = len(url)
    features["has_ip_address"]            = int(_has_ip_address(url))
    features["subdomain_count"]           = _count_subdomains(parsed)
    features["special_char_count"]        = _count_special_chars(url)
    features["has_at_symbol"]             = int("@" in url)
    features["has_double_slash_redirect"] = int("//" in url[8:])
    features["hyphen_in_domain"]          = int("-" in parsed.get("domain", ""))
    features["dot_count"]                 = url.count(".")
    features["path_depth"]                = _path_depth(parsed)
    features["query_param_count"]         = len(urllib.parse.parse_qs(parsed.get("query", "")))
    features["url_entropy"]               = _calculate_entropy(url)
    features["has_https"]                 = int(url.lower().startswith("https://"))
    features["tld_is_trusted"]            = int(_tld_is_trusted(netloc))
    features["is_known_safe"]             = int(_is_known_safe(netloc))
    features["domain_length"]             = len(parsed.get("domain", ""))

    kw = _find_suspicious_keywords(url)
    features["suspicious_keyword_count"]  = len(kw)
    features["has_suspicious_keywords"]   = int(len(kw) > 0)
    features["has_brand_spoofing"]        = int(_is_brand_spoofing(netloc))

    # ── 2. Light network checks ───────────────────────────────────────────
    features["has_valid_ssl"]    = _check_ssl(netloc)
    features["domain_age_days"]  = _estimate_domain_age(netloc)

    # ── 3. Live page scraping ─────────────────────────────────────────────
    features.update(_scrape_page(url, parsed))

    return features


# ---------------------------------------------------------------------------
# Live page scraping
# ---------------------------------------------------------------------------

def _scrape_page(url: str, parsed: dict) -> dict:
    defaults = {
        "page_has_password_field":      0,
        "page_has_login_form":          0,
        "page_has_card_fields":         0,
        "page_title_matches_domain":    1,
        "page_external_resource_ratio": 0.0,
        "page_has_iframe":              0,
        "page_has_obfuscated_js":       0,
        "page_link_to_external_ratio":  0.0,
        "page_has_favicon":             1,
        "page_favicon_external":        0,
        "page_copyright_year_recent":   1,
        "page_form_action_external":    0,
        "page_has_popup_script":        0,
        "page_right_click_disabled":    0,
        "page_redirect_meta":           0,
        "redirect_count":               0,
    }

    try:
        resp = requests.get(url, headers=HEADERS, timeout=8,
                            allow_redirects=True, verify=False)
        defaults["redirect_count"] = len(resp.history)

        if "html" not in resp.headers.get("Content-Type", ""):
            return defaults

        soup = BeautifulSoup(resp.text, "html.parser")
        base = parsed.get("netloc", "").lower().replace("www.", "")

        # Forms & inputs
        forms  = soup.find_all("form")
        inputs = soup.find_all("input")
        input_types = [i.get("type", "").lower() for i in inputs]
        input_attrs = " ".join(input_types +
                               [i.get("name", "").lower() for i in inputs] +
                               [i.get("id",   "").lower() for i in inputs])

        defaults["page_has_password_field"] = int("password" in input_types)
        defaults["page_has_login_form"]     = int(
            "password" in input_types or
            any(w in input_attrs for w in ["username", "email", "login", "user"])
        )
        defaults["page_has_card_fields"]    = int(
            any(w in input_attrs for w in ["card", "cvv", "cvc", "expiry", "ccnum", "pan"])
        )

        for form in forms:
            action = form.get("action", "")
            if action and action.startswith("http"):
                action_host = urllib.parse.urlparse(action).netloc.lower().replace("www.", "")
                if action_host and action_host != base:
                    defaults["page_form_action_external"] = 1
                    break

        # Title vs domain
        title_tag = soup.find("title")
        if title_tag and base:
            domain_root = base.split(".")[0]
            defaults["page_title_matches_domain"] = int(
                domain_root in title_tag.get_text().lower()
            )

        # External resources
        total = ext = 0
        for tag, attr in [("img", "src"), ("script", "src"), ("link", "href")]:
            for el in soup.find_all(tag):
                src = el.get(attr, "")
                if src:
                    total += 1
                    if src.startswith("http"):
                        src_host = urllib.parse.urlparse(src).netloc.lower().replace("www.", "")
                        if src_host and src_host != base:
                            ext += 1
        if total:
            defaults["page_external_resource_ratio"] = round(ext / total, 3)

        # iframes
        defaults["page_has_iframe"] = int(bool(soup.find_all("iframe")))

        # Obfuscated JS
        script_text = " ".join(s.get_text() for s in soup.find_all("script"))
        defaults["page_has_obfuscated_js"] = int(
            any(p in script_text for p in ["eval(", "unescape(", "fromCharCode(", "atob("])
        )
        defaults["page_has_popup_script"]      = int("window.open(" in script_text)
        defaults["page_right_click_disabled"]  = int(
            "contextmenu" in script_text and "return false" in script_text
        )

        # Meta refresh
        defaults["page_redirect_meta"] = int(bool(
            soup.find("meta", attrs={"http-equiv": re.compile("refresh", re.I)})
        ))

        # External links ratio
        links = soup.find_all("a", href=True)
        ext_links = sum(
            1 for a in links
            if a["href"].startswith("http") and
            urllib.parse.urlparse(a["href"]).netloc.lower().replace("www.", "") != base
        )
        if links:
            defaults["page_link_to_external_ratio"] = round(ext_links / len(links), 3)

        # Favicon
        favicon = soup.find("link", rel=lambda r: r and "icon" in " ".join(r).lower())
        if favicon:
            fhref = favicon.get("href", "")
            if fhref.startswith("http"):
                fhost = urllib.parse.urlparse(fhref).netloc.lower().replace("www.", "")
                defaults["page_favicon_external"] = int(bool(fhost) and fhost != base)
        else:
            defaults["page_has_favicon"] = 0

        # Copyright year
        text = soup.get_text()
        m = re.search(r"©|copyright|&copy;", text, re.I)
        if m:
            nearby = text[m.start():m.start() + 30]
            current = datetime.now().year
            defaults["page_copyright_year_recent"] = int(
                any(str(y) in nearby for y in [current - 1, current])
            )

    except Exception as e:
        print(f"[SCRAPER] {url}: {e}")

    return defaults


# ---------------------------------------------------------------------------
# Risk factors
# ---------------------------------------------------------------------------

def get_risk_factors(url: str, features: dict) -> list:
    risks = []
    if not features.get("has_https"):
        risks.append("No HTTPS — connection is not encrypted")
    if not features.get("has_valid_ssl"):
        risks.append("Invalid or missing SSL certificate")
    if features.get("has_ip_address"):
        risks.append("IP address used instead of domain name")
    if features.get("domain_age_days", 9999) < 30:
        risks.append(f"Very new domain (~{features.get('domain_age_days','?')} days old)")
    if features.get("subdomain_count", 0) > 3:
        risks.append(f"Unusually deep subdomain structure ({features['subdomain_count']} levels)")
    if features.get("has_at_symbol"):
        risks.append("'@' symbol in URL — common phishing technique")
    if features.get("url_length", 0) > 75:
        risks.append(f"Abnormally long URL ({features['url_length']} chars)")
    if features.get("hyphen_in_domain"):
        risks.append("Hyphen in domain — often used in spoofing")
    if features.get("suspicious_keyword_count", 0) > 0:
        kw = _find_suspicious_keywords(url)
        risks.append(f"Suspicious keywords in URL: {', '.join(kw[:3])}")
    if features.get("has_brand_spoofing"):
        risks.append("Brand spoofing or typosquatting detected")
    if not features.get("tld_is_trusted"):
        risks.append("Uncommon or high-risk top-level domain")
    if features.get("page_form_action_external"):
        risks.append("Form submits data to a different domain")
    if features.get("page_has_obfuscated_js"):
        risks.append("Obfuscated JavaScript detected")
    if features.get("page_has_card_fields"):
        risks.append("Page contains credit/debit card input fields")
    if features.get("page_right_click_disabled"):
        risks.append("Right-click is disabled on this page")
    if features.get("page_redirect_meta"):
        risks.append("Page uses meta-refresh redirect")
    if features.get("page_has_iframe"):
        risks.append("Hidden iframes detected")
    if features.get("page_favicon_external"):
        risks.append("Favicon loaded from a different domain")
    if not features.get("page_title_matches_domain", 1):
        risks.append("Page title does not match the domain")
    if features.get("page_external_resource_ratio", 0) > 0.7:
        risks.append(f"{int(features['page_external_resource_ratio']*100)}% of resources loaded externally")
    if features.get("redirect_count", 0) > 2:
        risks.append(f"Multiple HTTP redirects ({features['redirect_count']})")
    return risks


# ---------------------------------------------------------------------------
# Risk score
# ---------------------------------------------------------------------------

def compute_risk_score(features: dict, prediction: int, confidence: float) -> int:
    score = 0

    # ML base
    score += int(prediction * confidence * 50)

    # URL penalties
    if not features.get("has_https"):                          score += 15
    if not features.get("has_valid_ssl"):                      score += 10
    if features.get("has_ip_address"):                         score += 40
    if features.get("domain_age_days", 9999) < 30:            score += 20
    if features.get("suspicious_keyword_count", 0) >= 1:      score += 15
    if features.get("url_length", 0) > 75:                    score += 10
    if features.get("subdomain_count", 0) > 2:                score += 10
    if features.get("has_brand_spoofing"):                     score += 40
    if not features.get("tld_is_trusted"):                     score += 20

    # Page penalties
    if features.get("page_form_action_external"):              score += 30
    if features.get("page_has_obfuscated_js"):                 score += 20
    if features.get("page_has_card_fields"):                   score += 15
    if features.get("page_right_click_disabled"):              score += 15
    if features.get("page_redirect_meta"):                     score += 10
    if features.get("page_has_iframe"):                        score += 10
    if features.get("page_favicon_external"):                  score += 10
    if not features.get("page_title_matches_domain", 1):      score += 10
    if features.get("page_external_resource_ratio", 0) > 0.7: score += 15
    if features.get("redirect_count", 0) > 1:                 score += 10

    # Known safe — overrides almost everything
    if features.get("is_known_safe"):
        score = max(0, score - 60)

    return min(100, max(0, score))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _safe_parse(url: str) -> dict:
    try:
        p = urllib.parse.urlparse(url)
        host = p.netloc or p.path
        domain = host.split(":")[0]
        return {"scheme": p.scheme, "netloc": domain, "domain": domain,
                "path": p.path, "query": p.query}
    except Exception:
        return {"scheme": "", "netloc": "", "domain": "", "path": "", "query": ""}

def _get_root_and_tld(netloc: str):
    """Returns (root, tld, subdomains) for a netloc with www already stripped."""
    parts = netloc.split(".")
    if len(parts) >= 3 and ".".join(parts[-2:]) in TRUSTED_TLDS:
        return parts[-3], ".".join(parts[-2:]), parts[:-3]
    elif len(parts) >= 2:
        return parts[-2], parts[-1], parts[:-2]
    return netloc, "", []

def _is_known_safe(netloc: str) -> bool:
    netloc = netloc.lower().replace("www.", "")
    root, tld, _ = _get_root_and_tld(netloc)
    # Trusted brand on a trusted TLD (with or without subdomains = both official & subdomains)
    return root in TRUSTED_BRAND_ROOTS and tld in TRUSTED_TLDS

def _is_brand_spoofing(netloc: str) -> bool:
    netloc = netloc.lower().replace("www.", "")
    if _is_known_safe(netloc):
        return False
    # Typosquats
    if any(ts in netloc for ts in TYPOSQUATS):
        return True
    # Brand name in domain but it's not the official brand domain
    root, tld, _ = _get_root_and_tld(netloc)
    for brand in TRUSTED_BRAND_ROOTS:
        if brand in netloc and root != brand:
            return True
    return False

def _has_ip_address(url: str) -> bool:
    return bool(re.compile(r"(\d{1,3}\.){3}\d{1,3}").search(url))

def _count_subdomains(parsed: dict) -> int:
    return max(0, len(parsed.get("domain", "").split(".")) - 2)

def _count_special_chars(url: str) -> int:
    return sum(1 for c in url if c in "!@#$%^&*()_+=[]{}|;':\"<>?,\\")

def _path_depth(parsed: dict) -> int:
    return len([p for p in parsed.get("path", "").split("/") if p])

def _calculate_entropy(text: str) -> float:
    if not text:
        return 0.0
    freq = {}
    for c in text:
        freq[c] = freq.get(c, 0) + 1
    total = len(text)
    return round(-sum((f/total) * math.log2(f/total) for f in freq.values()), 3)

def _check_ssl(netloc: str) -> int:
    if not netloc:
        return 0
    try:
        import ssl
        ctx = ssl.create_default_context()
        with ctx.wrap_socket(socket.create_connection((netloc, 443), timeout=3),
                             server_hostname=netloc):
            return 1
    except Exception:
        return 0

def _estimate_domain_age(netloc: str) -> int:
    try:
        import whois
        w = whois.whois(netloc)
        creation = w.creation_date
        if isinstance(creation, list):
            creation = creation[0]
        if creation:
            return max(0, (datetime.now() - creation).days)
    except Exception:
        pass
    length = len(netloc)
    if length < 10:   return 1000
    elif length < 20: return 300
    else:             return 30

def _tld_is_trusted(netloc: str) -> bool:
    parts = netloc.lower().split(".")
    if len(parts) >= 2 and ".".join(parts[-2:]) in TRUSTED_TLDS:
        return True
    return len(parts) >= 1 and parts[-1] in TRUSTED_TLDS

def _find_suspicious_keywords(url: str) -> list:
    return [kw for kw in SUSPICIOUS_KEYWORDS if kw in url.lower()]
