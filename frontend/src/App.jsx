import React, { useState, useRef } from 'react'
import Header from './components/Header.jsx'
import SearchBar from './components/SearchBar.jsx'
import ResultCard from './components/ResultCard.jsx'
import FeatureGrid from './components/FeatureGrid.jsx'
import RiskFactors from './components/RiskFactors.jsx'
import StatsRow from './components/StatsRow.jsx'
import Footer from './components/Footer.jsx'
import styles from './App.module.css'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export default function App() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const resultRef = useRef(null)

  const handleAnalyze = async (inputUrl) => {
    const trimmed = (inputUrl || url).trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      setResult(data)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.app}>
      <Header />

      <main className={styles.main}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroLabel}>
            <span className={styles.dot} />
            AI-Powered Detection System
          </div>
          <h1 className={styles.heroTitle}>
            Is That Website
            <br />
            <span className={styles.highlight}>Safe to Shop?</span>
          </h1>
          <p className={styles.heroSub}>
            Paste any e-commerce URL below. Our ML model analyzes 30+ signals
            to classify it as <b>Safe</b>, <b>Suspicious</b>, or <b>Fake</b> — instantly.
          </p>

          <SearchBar
            value={url}
            onChange={setUrl}
            onSubmit={handleAnalyze}
            loading={loading}
          />

          {error && (
            <div className={styles.errorBanner}>
              <span className={styles.errorIcon}>⚠</span>
              {error}
            </div>
          )}
        </section>

        {/* Stats row */}
        <StatsRow />

        {/* Results */}
        {result && (
          <section className={styles.results} ref={resultRef}>
            <div className={styles.resultsHeader}>
              <h2 className={styles.resultsTitle}>Analysis Report</h2>
              <span className={styles.resultsUrl}>{result.url}</span>
            </div>

            <div className={styles.resultsGrid}>
              <div className={styles.resultsMain}>
                <ResultCard result={result} />
                {result.risk_factors?.length > 0 && (
                  <RiskFactors factors={result.risk_factors} classification={result.classification} />
                )}
              </div>
              <div className={styles.resultsSide}>
                <FeatureGrid features={result.features} mlScores={result.ml_scores} />
              </div>
            </div>

            <button className={styles.resetBtn} onClick={() => { setResult(null); setUrl(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
              ↑ Analyze Another URL
            </button>
          </section>
        )}

        {/* Example URLs */}
        {!result && !loading && (
          <section className={styles.examples}>
            <p className={styles.examplesLabel}>Try an example:</p>
            <div className={styles.exampleBtns}>
              {[
                { label: '✅ Legit Store', url: 'https://www.amazon.com' },
                { label: '⚠️ Suspicious', url: 'http://amaz0n-deals.shop/login' },
                { label: '❌ Fake Site', url: 'http://secure-paypal-verify.xyz/account' },
              ].map(ex => (
                <button
                  key={ex.url}
                  className={styles.exampleBtn}
                  onClick={() => { setUrl(ex.url); handleAnalyze(ex.url) }}
                >
                  {ex.label}
                  <span className={styles.exampleUrl}>{ex.url}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}
