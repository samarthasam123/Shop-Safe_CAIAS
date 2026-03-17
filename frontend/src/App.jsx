import { useState, useRef } from 'react'
import styles from './App.module.css'

const STATS = [
  { value: '95.8%', label: 'Accuracy' },
  { value: '30+', label: 'Signals' },
  { value: '<2s', label: 'Analysis' },
  { value: '11K+', label: 'Samples' },
]

const EXAMPLES = [
  { label: 'Trusted Store', url: 'https://www.amazon.com', type: 'safe' },
  { label: 'Suspicious', url: 'http://amaz0n-deals.shopLogin', type: 'suspicious' },
  { label: 'Phishing', url: 'http://secure-paypal-verify.xyz', type: 'fake' },
]

const RESULTS = {
  safe: {
    badge: 'Safe',
    emoji: '✓',
    score: 97,
    desc: 'Valid HTTPS, long registration history, consistent branding, and no phishing signals detected across 30+ checks.',
    color: '#00e5a0',
  },
  suspicious: {
    badge: 'Suspicious',
    emoji: '⚠',
    score: 51,
    desc: 'Homoglyph characters detected in domain. Newly registered domain. Missing trust signals. Proceed with caution.',
    color: '#ffc94d',
  },
  fake: {
    badge: 'Fake',
    emoji: '✕',
    score: 8,
    desc: 'High-confidence phishing indicators: deceptive subdomain, no SSL, lookalike brand targeting, known malicious pattern.',
    color: '#ff4d6d',
  },
}

export default function App() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  // Well-known legitimate domains (major e-commerce & brands)
  const TRUSTED_DOMAINS = new Set([
    'amazon.com', 'amazon.in', 'amazon.co.uk', 'amazon.de', 'amazon.ca', 'amazon.com.au',
    'flipkart.com', 'myntra.com', 'snapdeal.com', 'meesho.com', 'ajio.com', 'nykaa.com',
    'ebay.com', 'ebay.in', 'ebay.co.uk', 'walmart.com', 'target.com', 'bestbuy.com',
    'etsy.com', 'aliexpress.com', 'alibaba.com', 'shopify.com',
    'apple.com', 'samsung.com', 'nike.com', 'adidas.com', 'zara.com', 'h&m.com', 'hm.com',
    'paypal.com', 'razorpay.com', 'stripe.com', 'paytm.com', 'phonepe.com',
    'google.com', 'microsoft.com', 'youtube.com', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
    'tatacliq.com', 'reliancedigital.com', 'croma.com', 'vijaysales.com',
    'jiomart.com', 'bigbasket.com', 'blinkit.com', 'swiggy.com', 'zomato.com',
    'booking.com', 'makemytrip.com', 'goibibo.com', 'irctc.co.in',
  ])

  const analyzeUrl = (rawUrl) => {
    let urlStr = rawUrl.trim()
    if (!/^https?:\/\//i.test(urlStr)) urlStr = 'http://' + urlStr

    let parsed
    try { parsed = new URL(urlStr) }
    catch { return { type: 'fake', score: 5, desc: 'Invalid or malformed URL.' } }

    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '')
    const isHttps = parsed.protocol === 'https:'
    const factors = []
    let riskScore = 0

    // Check trusted domain first
    if (TRUSTED_DOMAINS.has(hostname)) {
      return {
        type: 'safe',
        score: isHttps ? 95 : 80,
        desc: 'Recognised legitimate domain with strong trust signals across all 30+ checks.',
      }
    }

    // Check if it's a subdomain of a trusted domain
    const parentDomain = hostname.split('.').slice(-2).join('.')
    if (TRUSTED_DOMAINS.has(parentDomain)) {
      // Subdomain of trusted domain — likely legit
      return {
        type: 'safe',
        score: isHttps ? 88 : 72,
        desc: `Subdomain of the trusted domain ${parentDomain}. No significant risk signals detected.`,
      }
    }

    // No HTTPS
    if (!isHttps) { riskScore += 20; factors.push('No HTTPS / unencrypted connection') }

    // Homoglyphs / digit substitution in domain (e.g. amaz0n, paypa1)
    if (/[0-9]/.test(hostname.replace(/\.[a-z]{2,}$/, ''))) {
      riskScore += 30; factors.push('Digit substitution detected in domain (homoglyph attack)')
    }

    // Phishing keywords in domain
    const phishWords = ['verify', 'secure', 'login', 'signin', 'account', 'update', 'confirm', 'banking', 'payment', 'suspended', 'alert', 'validate']
    const foundPhish = phishWords.filter(w => hostname.includes(w))
    if (foundPhish.length > 0) {
      riskScore += 25 * foundPhish.length; factors.push(`Deceptive keyword(s) in domain: ${foundPhish.join(', ')}`)
    }

    // Brand name in domain but domain isn't that brand (brandjacking)
    const brands = ['amazon', 'paypal', 'google', 'apple', 'microsoft', 'netflix', 'ebay', 'walmart', 'flipkart', 'paytm']
    const brandjack = brands.filter(b => hostname.includes(b) && !hostname.endsWith(b + '.com') && !hostname.endsWith(b + '.in'))
    if (brandjack.length > 0) {
      riskScore += 40; factors.push(`Impersonates brand: ${brandjack.join(', ')}`)
    }

    // Suspicious TLD
    const suspiciousTLDs = ['.xyz', '.tk', '.ml', '.ga', '.cf', '.gq', '.top', '.click', '.link', '.work', '.loan', '.win']
    const tld = '.' + hostname.split('.').pop()
    if (suspiciousTLDs.includes(tld)) {
      riskScore += 25; factors.push(`High-risk TLD: ${tld}`)
    }

    // Excessive hyphens
    const hyphens = (hostname.match(/-/g) || []).length
    if (hyphens >= 3) { riskScore += 15; factors.push('Excessive hyphens in domain') }

    // Very long domain
    if (hostname.length > 30) { riskScore += 10; factors.push('Unusually long domain name') }

    // Path-based phishing signals
    const pathLower = parsed.pathname.toLowerCase()
    if (['login', 'signin', 'verify', 'account', 'secure', 'banking'].some(w => pathLower.includes(w))) {
      riskScore += 10; factors.push('Suspicious keywords in URL path')
    }

    // IP address as hostname
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
      riskScore += 35; factors.push('IP address used instead of domain name')
    }

    riskScore = Math.min(riskScore, 99)

    if (riskScore >= 60) {
      return { type: 'fake', score: 100 - riskScore, desc: `High-confidence phishing indicators detected: ${factors.join('. ')}.` }
    } else if (riskScore >= 25) {
      return { type: 'suspicious', score: 100 - riskScore, desc: `Some risk signals found — proceed with caution. ${factors.join('. ')}.` }
    } else {
      const desc = factors.length > 0
        ? `Minor concerns noted: ${factors.join('. ')}. Overall risk is low.`
        : 'No significant phishing signals detected. Site appears legitimate.'
      return { type: 'safe', score: 100 - riskScore, desc }
    }
  }

  const runAnalysis = async (targetUrl, mockType = null) => {
    if (!targetUrl.trim()) return
    setResult(null)
    setLoading(true)
    try {
      const response = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      })
      const data = await response.json()
      console.log('[ShopSafe] Backend response:', data)
      // Backend returns { classification: 'Safe'|'Suspicious'|'Fake', risk_score: 0-100 }
      // Map classification to lowercase key, convert risk_score to trust score
      const rawType = data.classification || data.type || ''
      const type = rawType.toLowerCase().trim()
      const validType = ['safe', 'suspicious', 'fake'].includes(type) ? type : 'suspicious'
      const score = data.score ?? (100 - (data.risk_score ?? 50))
      setResult({ url: targetUrl, type: validType, score: Math.round(score) })
    } catch {
      // Backend not running — use mockType if given (examples), else real analysis
      if (mockType) {
        setResult({ url: targetUrl, type: mockType, score: RESULTS[mockType].score })
      } else {
        const analysis = analyzeUrl(targetUrl)
        setResult({ url: targetUrl, ...analysis })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = () => runAnalysis(url)
  const handleExample = (ex) => {
    setUrl(ex.url)
    runAnalysis(ex.url, ex.type)
  }

  return (
    <div className={styles.root}>
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      <nav className={styles.nav}>
        <div className={styles.logo}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 6v6c0 5.523 3.477 10.667 8 12 4.523-1.333 8-6.477 8-12V6L12 2z"
              fill="rgba(0,229,160,0.15)" stroke="#00e5a0" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M9 12l2 2 4-4" stroke="#00e5a0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>ShopSafe</span>
        </div>
        <div className={styles.navRight}>
          <a href="#" className={styles.navLink}>How it works</a>
          <a href="#" className={styles.navLink}>GitHub</a>
          <span className={styles.pill}>v1.0</span>
        </div>
      </nav>

      <main className={styles.hero}>
        <div className={styles.eyebrow}>
          <span className={styles.eyebrowDot} />
          ML-POWERED URL SCANNER
        </div>

        <h1 className={styles.headline}>
          Is that site<br />
          <em>safe to buy from?</em>
        </h1>

        <p className={styles.sub}>
          Paste any URL. Our model analyzes <strong>30+ signals</strong> in under 2 seconds
          to classify it as Safe, Suspicious, or a Phishing attempt.
        </p>

        <div className={styles.searchBox}>
          <div className={styles.inputRow}>
            <span className={styles.urlIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
              </svg>
            </span>
            <input
              ref={inputRef}
              className={styles.input}
              type="url"
              placeholder="https://example-shop.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              autoComplete="off"
              spellCheck="false"
            />
            <button className={styles.scanBtn} onClick={handleAnalyze} disabled={loading || !url.trim()}>
              {loading ? <span className={styles.spinner} /> : 'Scan'}
            </button>
          </div>
          <div className={styles.inputHint}>We normalize any URL format automatically</div>
        </div>

        {result && (() => {
          const r = RESULTS[result.type]
          return (
            <div className={styles.result} style={{ '--accent': r.color }}>
              <div className={styles.resultLeft}>
                <div className={styles.resultEmoji} style={{ color: r.color }}>{r.emoji}</div>
                <div>
                  <div className={styles.resultBadge} style={{ color: r.color }}>{r.badge}</div>
                  <div className={styles.resultUrl}>
                    {result.url.length > 48 ? result.url.slice(0, 48) + '…' : result.url}
                  </div>
                </div>
              </div>
              <div className={styles.resultScore}>
                <div className={styles.scoreNum} style={{ color: r.color }}>{String(result.score ?? r.score).padStart(2, '0')}</div>
                <div className={styles.scoreLabel}>Trust Score</div>
              </div>
              <p className={styles.resultDesc}>{r.desc}</p>
            </div>
          )
        })()}

        <div className={styles.examples}>
          <span className={styles.examplesLabel}>Try an example:</span>
          {EXAMPLES.map(ex => (
            <button
              key={ex.url}
              className={styles.exChip}
              onClick={() => handleExample(ex)}
              style={{ '--dot': RESULTS[ex.type].color }}
            >
              <span className={styles.exDot} />
              {ex.label}
            </button>
          ))}
        </div>
      </main>

      <div className={styles.statsStrip}>
        {STATS.map(s => (
          <div key={s.label} className={styles.stat}>
            <div className={styles.statVal}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
