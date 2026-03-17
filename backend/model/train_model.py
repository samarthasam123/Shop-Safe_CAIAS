"""
train_model.py
Trains a Random Forest classifier on the UCI Phishing Dataset
and saves the model to phishing_model.pkl.

Run:
    python model/train_model.py
"""

import os
import sys
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    classification_report, confusion_matrix,
    accuracy_score, roc_auc_score
)
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
MODEL_PATH = os.path.join(os.path.dirname(__file__), "phishing_model.pkl")
DATA_URL = (
    "https://archive.ics.uci.edu/ml/machine-learning-databases/"
    "00327/Training%20Dataset.arff"
)

# Feature column names (UCI Phishing Dataset — 30 features + 1 label)
FEATURE_NAMES = [
    "having_IP_Address", "URL_Length", "Shortining_Service", "having_At_Symbol",
    "double_slash_redirecting", "Prefix_Suffix", "having_Sub_Domain",
    "SSLfinal_State", "Domain_registeration_length", "Favicon",
    "port", "HTTPS_token", "Request_URL", "URL_of_Anchor",
    "Links_in_tags", "SFH", "Submitting_to_email", "Abnormal_URL",
    "Redirect", "on_mouseover", "RightClick", "popUpWidnow",
    "Iframe", "age_of_domain", "DNSRecord", "web_traffic",
    "Page_Rank", "Google_Index", "Links_pointing_to_page",
    "Statistical_report", "Result"
]


def load_dataset():
    """
    Load the UCI Phishing Websites Dataset.
    Falls back to synthetic data if download fails.
    """
    try:
        print("📥 Attempting to load UCI Phishing Dataset...")
        import urllib.request
        lines = []
        with urllib.request.urlopen(DATA_URL, timeout=15) as resp:
            for line in resp:
                decoded = line.decode("utf-8").strip()
                if decoded and not decoded.startswith("%") and not decoded.startswith("@"):
                    lines.append(decoded)

        data = []
        for line in lines:
            vals = [v.strip() for v in line.split(",")]
            if len(vals) == 31:
                try:
                    data.append([int(v) for v in vals])
                except ValueError:
                    continue

        df = pd.DataFrame(data, columns=FEATURE_NAMES)
        print(f"✅ Loaded {len(df)} samples from UCI dataset.")
        return df

    except Exception as e:
        print(f"⚠️  Could not download dataset ({e}). Generating synthetic data...")
        return _generate_synthetic_data()


def _generate_synthetic_data(n_samples=10000):
    """
    Generate realistic synthetic phishing dataset when UCI data is unavailable.
    Features use -1, 0, 1 encoding as in UCI dataset.
    """
    np.random.seed(42)
    n_legit = n_samples // 2
    n_phish = n_samples - n_legit

    def make_legit(n):
        return {
            "having_IP_Address":           np.random.choice([-1, 1], n, p=[0.05, 0.95]),
            "URL_Length":                  np.random.choice([-1, 0, 1], n, p=[0.6, 0.25, 0.15]),
            "Shortining_Service":          np.random.choice([-1, 1], n, p=[0.1, 0.9]),
            "having_At_Symbol":            np.random.choice([-1, 1], n, p=[0.02, 0.98]),
            "double_slash_redirecting":    np.random.choice([-1, 1], n, p=[0.05, 0.95]),
            "Prefix_Suffix":               np.random.choice([-1, 1], n, p=[0.1, 0.9]),
            "having_Sub_Domain":           np.random.choice([-1, 0, 1], n, p=[0.1, 0.3, 0.6]),
            "SSLfinal_State":              np.random.choice([-1, 0, 1], n, p=[0.05, 0.1, 0.85]),
            "Domain_registeration_length": np.random.choice([-1, 1], n, p=[0.1, 0.9]),
            "Favicon":                     np.random.choice([-1, 1], n, p=[0.05, 0.95]),
            "port":                        np.random.choice([-1, 1], n, p=[0.05, 0.95]),
            "HTTPS_token":                 np.random.choice([-1, 1], n, p=[0.05, 0.95]),
            "Request_URL":                 np.random.choice([-1, 0, 1], n, p=[0.05, 0.2, 0.75]),
            "URL_of_Anchor":               np.random.choice([-1, 0, 1], n, p=[0.05, 0.2, 0.75]),
            "Links_in_tags":               np.random.choice([-1, 0, 1], n, p=[0.05, 0.2, 0.75]),
            "SFH":                         np.random.choice([-1, 0, 1], n, p=[0.05, 0.1, 0.85]),
            "Submitting_to_email":         np.random.choice([-1, 1], n, p=[0.05, 0.95]),
            "Abnormal_URL":                np.random.choice([-1, 1], n, p=[0.1, 0.9]),
            "Redirect":                    np.random.choice([0, 1], n, p=[0.8, 0.2]),
            "on_mouseover":                np.random.choice([-1, 1], n, p=[0.05, 0.95]),
            "RightClick":                  np.random.choice([-1, 1], n, p=[0.05, 0.95]),
            "popUpWidnow":                 np.random.choice([-1, 1], n, p=[0.1, 0.9]),
            "Iframe":                      np.random.choice([-1, 1], n, p=[0.05, 0.95]),
            "age_of_domain":               np.random.choice([-1, 1], n, p=[0.1, 0.9]),
            "DNSRecord":                   np.random.choice([-1, 1], n, p=[0.05, 0.95]),
            "web_traffic":                 np.random.choice([-1, 0, 1], n, p=[0.1, 0.2, 0.7]),
            "Page_Rank":                   np.random.choice([-1, 1], n, p=[0.1, 0.9]),
            "Google_Index":                np.random.choice([-1, 1], n, p=[0.05, 0.95]),
            "Links_pointing_to_page":      np.random.choice([-1, 0, 1], n, p=[0.05, 0.2, 0.75]),
            "Statistical_report":          np.random.choice([-1, 1], n, p=[0.1, 0.9]),
            "Result":                      np.ones(n, dtype=int),
        }

    def make_phish(n):
        return {
            "having_IP_Address":           np.random.choice([-1, 1], n, p=[0.6, 0.4]),
            "URL_Length":                  np.random.choice([-1, 0, 1], n, p=[0.1, 0.2, 0.7]),
            "Shortining_Service":          np.random.choice([-1, 1], n, p=[0.6, 0.4]),
            "having_At_Symbol":            np.random.choice([-1, 1], n, p=[0.5, 0.5]),
            "double_slash_redirecting":    np.random.choice([-1, 1], n, p=[0.6, 0.4]),
            "Prefix_Suffix":               np.random.choice([-1, 1], n, p=[0.7, 0.3]),
            "having_Sub_Domain":           np.random.choice([-1, 0, 1], n, p=[0.6, 0.2, 0.2]),
            "SSLfinal_State":              np.random.choice([-1, 0, 1], n, p=[0.5, 0.3, 0.2]),
            "Domain_registeration_length": np.random.choice([-1, 1], n, p=[0.7, 0.3]),
            "Favicon":                     np.random.choice([-1, 1], n, p=[0.4, 0.6]),
            "port":                        np.random.choice([-1, 1], n, p=[0.3, 0.7]),
            "HTTPS_token":                 np.random.choice([-1, 1], n, p=[0.4, 0.6]),
            "Request_URL":                 np.random.choice([-1, 0, 1], n, p=[0.5, 0.3, 0.2]),
            "URL_of_Anchor":               np.random.choice([-1, 0, 1], n, p=[0.5, 0.3, 0.2]),
            "Links_in_tags":               np.random.choice([-1, 0, 1], n, p=[0.4, 0.3, 0.3]),
            "SFH":                         np.random.choice([-1, 0, 1], n, p=[0.5, 0.3, 0.2]),
            "Submitting_to_email":         np.random.choice([-1, 1], n, p=[0.4, 0.6]),
            "Abnormal_URL":                np.random.choice([-1, 1], n, p=[0.6, 0.4]),
            "Redirect":                    np.random.choice([0, 1], n, p=[0.3, 0.7]),
            "on_mouseover":                np.random.choice([-1, 1], n, p=[0.4, 0.6]),
            "RightClick":                  np.random.choice([-1, 1], n, p=[0.4, 0.6]),
            "popUpWidnow":                 np.random.choice([-1, 1], n, p=[0.4, 0.6]),
            "Iframe":                      np.random.choice([-1, 1], n, p=[0.4, 0.6]),
            "age_of_domain":               np.random.choice([-1, 1], n, p=[0.7, 0.3]),
            "DNSRecord":                   np.random.choice([-1, 1], n, p=[0.5, 0.5]),
            "web_traffic":                 np.random.choice([-1, 0, 1], n, p=[0.6, 0.2, 0.2]),
            "Page_Rank":                   np.random.choice([-1, 1], n, p=[0.6, 0.4]),
            "Google_Index":                np.random.choice([-1, 1], n, p=[0.5, 0.5]),
            "Links_pointing_to_page":      np.random.choice([-1, 0, 1], n, p=[0.5, 0.3, 0.2]),
            "Statistical_report":          np.random.choice([-1, 1], n, p=[0.5, 0.5]),
            "Result":                      -np.ones(n, dtype=int),
        }

    legit_df = pd.DataFrame(make_legit(n_legit))
    phish_df = pd.DataFrame(make_phish(n_phish))
    df = pd.concat([legit_df, phish_df], ignore_index=True)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    print(f"✅ Generated {len(df)} synthetic samples.")
    return df


def train_and_save():
    """Main training pipeline."""
    df = load_dataset()

    feature_cols = [c for c in FEATURE_NAMES if c != "Result"]
    X = df[feature_cols].values
    y = df["Result"].values
    # Convert -1 → 0 (phishing), 1 → 1 (legitimate)
    y = (y == 1).astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print("\n🤖 Training Random Forest Classifier...")
    model = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", RandomForestClassifier(
            n_estimators=100,
            max_depth=None,
            min_samples_split=2,
            random_state=42,
            n_jobs=-1
        ))
    ])
    model.fit(X_train, y_train)

    # Evaluation
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    print("\n📊 Model Performance:")
    print(f"   Accuracy : {accuracy_score(y_test, y_pred):.4f}")
    print(f"   ROC-AUC  : {roc_auc_score(y_test, y_prob):.4f}")
    print("\n" + classification_report(y_test, y_pred, target_names=["Phishing", "Legitimate"]))

    # Save model + feature names
    artifact = {
        "model": model,
        "feature_names": feature_cols,
        "trained_at": str(pd.Timestamp.now()),
    }
    joblib.dump(artifact, MODEL_PATH)
    print(f"\n✅ Model saved to: {MODEL_PATH}")

    return model, feature_cols


if __name__ == "__main__":
    train_and_save()
