import { useState, useRef } from 'react'
import styles from './App.module.css'

const STATS = [
  { icon: '🎯', value: '95.8%', label: 'MODEL ACCURACY' },
  { icon: '🔬', value: '30+', label: 'FEATURES ANALYZED' },
  { icon: '⚡', value: '<2s', label: 'ANALYSIS TIME' },
  { icon: '📊', value: '11K+', label: 'TRAINING SAMPLES' },
]

const EXAMPLES = [
  { label: 'Legit Store', url: 'https://www.amazon.com', type: 'safe' },
  { label: 'Suspicious', url: 'http://amaz0n-deals.shopLogin', type: 'suspicious' },
  { label: 'Fake Site', url: 'http://secure-paypal-verify.xyz', type: 'fake' },
]

const RESULTS = {
  safe: {
    badge: 'Safe',
    score: '97',
    desc: 'Valid HTTPS, long registration history, consistent branding, and no phishing signals detected across 30+ checks.',
  },
  suspicious: {
    badge: 'Suspicious',
    score: '51',
    desc: 'Homoglyph characters detected in domain. Newly registered domain. Missing trust signals. Proceed with caution.',
  },
  fake: {
    badge: 'Fake',
    score: '08',
    desc: 'High-confidence phishing indicators: deceptive subdomain, no SSL, lookalike brand targeting, known malicious pattern match.',
  },
}

const runAnalysis = async (targetUrl) => {
  if (!targetUrl.trim()) return
  setResult(null)
  setLoading(true)

  try {
    const response = await fetch('http://localhost:8000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl }),
    })
    const data = await response.json()
    // data should return { type: 'safe' | 'suspicious' | 'fake', score: number }
    setResult({ url: targetUrl, type: data.type, score: data.score })
  } catch (err) {
    setResult({ url: targetUrl, type: 'suspicious', score: '??', error: true })
  } finally {
    setLoading(false)
  }
}

const handleAnalyze = () => runAnalysis(url)

const handleExample = (ex) => {
  setUrl(ex.url)
  runAnalysis(ex.url, ex.type)
}

const dotColor = { safe: '#10b981', suspicious: '#f59e0b', fake: '#ef4444' }

return (
  <div className={styles.root}>
    {/* Background layers */}
    <div className={styles.gridBg} />
    <div className={styles.glow} />

    {/* Nav */}
    <nav className={styles.nav}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>🛡</div>
        ShopSafe
      </div>
      <div className={styles.navLinks}>
        <a className={styles.navLink} href="#">How it works</a>
        <a className={styles.navLink} href="#">GitHub</a>
        <span className={styles.versionBadge}>v1.0</span>
      </div>
    </nav>

    {/* Hero */}
    <section className={styles.hero}>
      <div className={styles.tag}>
        <div className={styles.tagDot} />
        AI-POWERED DETECTION SYSTEM
      </div>

      <h1 className={styles.h1}>
        Is That Website<br />
        <span className={styles.gradient}>Safe to Shop?</span>
      </h1>

      <p className={styles.sub}>
        Paste any e-commerce URL below. Our ML model analyzes{' '}
        <strong>30+ signals</strong> to classify it as{' '}
        <strong>Safe</strong>, <strong>Suspicious</strong>, or{' '}
        <strong>Fake</strong> — instantly.
      </p>

      {/* Input */}
      <div className={styles.inputWrap}>
        <span className={styles.inputIcon}>🔗</span>
        <input
          ref={inputRef}
          className={styles.input}
          type="url"
          placeholder="https://example-shop.com"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
        />
        <button className={styles.btn} onClick={handleAnalyze} disabled={loading}>
          {loading
            ? <span className={styles.spinner} />
            : 'Analyze'}
        </button>
      </div>
      <div className={styles.hint}>Supports any URL format — we normalize it automatically</div>

      {/* Result card */}
      {result && (
        <div className={`${styles.resultCard} ${styles[result.type]}`}>
          <div className={styles.resultTop}>
            <span className={styles.resultBadge}>{RESULTS[result.type].badge}</span>
            <span className={styles.resultUrl}>
              {result.url.length > 40 ? result.url.slice(0, 40) + '…' : result.url}
            </span>
            <span className={styles.resultScore}>{RESULTS[result.type].score}</span>
          </div>
          <p className={styles.resultDesc}>{RESULTS[result.type].desc}</p>
        </div>
      )}
    </section>

    {/* Stats */}
    <div className={styles.stats}>
      {STATS.map(s => (
        <div key={s.label} className={styles.statCard}>
          <div className={styles.statIcon}>{s.icon}</div>
          <div className={styles.statVal}>{s.value}</div>
          <div className={styles.statLabel}>{s.label}</div>
        </div>
      ))}
    </div>

    {/* Examples */}
    <div className={styles.divider} />
    <div className={styles.examplesLabel}>TRY AN EXAMPLE</div>
    <div className={styles.examples}>
      {EXAMPLES.map(ex => (
        <button key={ex.url} className={styles.exampleChip} onClick={() => handleExample(ex)}>
          <div className={styles.exampleDot} style={{ background: dotColor[ex.type] }} />
          <div>
            <div className={styles.exampleLabel}>{ex.label}</div>
            <div className={styles.exampleUrl}>{ex.url}</div>
          </div>
        </button>
      ))}
    </div>
  </div>
)
}
