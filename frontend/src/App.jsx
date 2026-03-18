import { useState, useRef, useEffect } from 'react'

// ─── Inline styles ────────────────────────────────────────────────────────────
const G = {
  // colours
  bg: '#07090f',
  bgCard: 'rgba(255,255,255,0.03)',
  bgCard2: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.08)',
  border2: 'rgba(255,255,255,0.14)',
  white: '#eef2ff',
  muted: 'rgba(221,227,240,0.45)',
  dimmer: 'rgba(221,227,240,0.28)',
  teal: '#00e5a0',
  tealDim: 'rgba(0,229,160,0.12)',
  blue: '#4d99ff',
  safe: '#00e5a0',
  warn: '#ffc94d',
  danger: '#ff4d6d',
  mono: "'Space Mono', monospace",
  display: "'Outfit', sans-serif",
}

const STATUS = {
  Safe: { color: G.safe, dimColor: 'rgba(0,229,160,0.12)', glow: 'rgba(0,229,160,0.3)', icon: '✓', label: 'SAFE', msg: 'This website appears legitimate and safe for shopping.' },
  Suspicious: { color: G.warn, dimColor: 'rgba(255,201,77,0.12)', glow: 'rgba(255,201,77,0.25)', icon: '⚠', label: 'SUSPICIOUS', msg: 'Proceed with caution. Some risk factors were detected.' },
  Fake: { color: G.danger, dimColor: 'rgba(255,77,109,0.12)', glow: 'rgba(255,77,109,0.3)', icon: '✕', label: 'FAKE / DANGEROUS', msg: 'High risk detected. Avoid entering personal or payment information.' },
}

const fmt = (v, digits = 1) =>
  v != null && !isNaN(v) ? `${(v * 100).toFixed(digits)}%` : '—'

// ─── Gauge component ──────────────────────────────────────────────────────────
function Gauge({ score, color }) {
  const arcRef = useRef(null)
  const R = 40, C = 2 * Math.PI * R  // circumference ≈ 251.2

  useEffect(() => {
    const el = arcRef.current
    if (!el) return
    const offset = C - (C * Math.min(score, 100)) / 100
    el.style.strokeDasharray = C
    el.style.strokeDashoffset = C
    requestAnimationFrame(() => {
      el.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)'
      el.style.strokeDashoffset = offset
    })
  }, [score])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg viewBox="0 0 100 100" style={{ width: 140, height: 140 }}>
        <circle cx="50" cy="50" r={R} fill="none" stroke={G.border} strokeWidth="8" />
        <circle ref={arcRef} cx="50" cy="50" r={R} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
        <text x="50" y="46" textAnchor="middle" fill={color}
          style={{ fontFamily: G.mono, fontSize: '20px', fontWeight: 700 }}>
          {score}
        </text>
        <text x="50" y="60" textAnchor="middle" fill={G.dimmer}
          style={{ fontFamily: G.display, fontSize: '7px', letterSpacing: '0.05em' }}>
          RISK SCORE
        </text>
      </svg>
      <div style={{ display: 'flex', gap: 16, fontFamily: G.mono, fontSize: 10 }}>
        <span style={{ color: G.safe }}>0 Safe</span>
        <span style={{ color: G.danger }}>100 Fake</span>
      </div>
    </div>
  )
}

// ─── StatRow ──────────────────────────────────────────────────────────────────
function StatRow({ label, value, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px',
      background: G.bgCard, border: `1px solid ${G.border}`, borderRadius: 6,
    }}>
      <span style={{ fontFamily: G.mono, fontSize: 11, color: G.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <span style={{ fontFamily: G.mono, fontSize: 13, fontWeight: 700, color: color || G.white }}>
        {value}
      </span>
    </div>
  )
}

// ─── ResultCard ───────────────────────────────────────────────────────────────
function ResultCard({ result }) {
  const classification = result.classification || 'Suspicious'
  const cfg = STATUS[classification] || STATUS.Suspicious
  const risk = result.risk_score ?? 50
  const scoreColor = risk < 40 ? G.safe : risk < 70 ? G.warn : G.danger

  return (
    <div style={{
      background: G.bgCard, borderRadius: 12, overflow: 'hidden',
      border: `1px solid ${cfg.color}`,
      boxShadow: `0 0 40px ${cfg.glow}`,
      animation: 'fadeUp 0.4s ease',
    }}>
      {/* Banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '20px 24px',
        background: cfg.dimColor,
        borderBottom: `1px solid ${cfg.color}`,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: `2px solid ${cfg.color}`,
          background: cfg.dimColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color: cfg.color, flexShrink: 0,
        }}>
          {cfg.icon}
        </div>
        <div>
          <div style={{ fontFamily: G.mono, fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: cfg.color }}>
            {cfg.label}
          </div>
          <div style={{ marginTop: 4, fontSize: 14, color: 'rgba(221,227,240,0.6)', lineHeight: 1.5 }}>
            {cfg.msg}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', gap: 24, padding: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <Gauge score={risk} color={scoreColor} />
        <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <StatRow label="Risk Score" value={`${risk} / 100`} color={scoreColor} />
          <StatRow label="Classification" value={classification} color={cfg.color} />
          <StatRow label="Confidence" value={fmt(result.confidence)} />
          <StatRow label="ML Probability (Phishing)" value={fmt(result.ml_scores?.proba_phishing)} />
          <StatRow label="ML Probability (Legit)" value={fmt(result.ml_scores?.proba_legitimate ?? result.ml_scores?.proba_legit)} />
        </div>
      </div>
    </div>
  )
}

// ─── RiskFactors ──────────────────────────────────────────────────────────────
function RiskFactors({ factors, classification }) {
  if (!factors || factors.length === 0) return null
  const cfg = STATUS[classification] || STATUS.Suspicious

  return (
    <div style={{
      background: G.bgCard, borderRadius: 12, padding: '20px 24px',
      border: `1px solid ${G.border}`,
      borderLeft: `3px solid ${cfg.color}`,
      animation: 'fadeUp 0.5s ease 0.1s both',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        fontFamily: G.mono, fontSize: 11, textTransform: 'uppercase',
        letterSpacing: '0.12em', color: G.muted, marginBottom: 16,
      }}>
        <span style={{ color: cfg.color, fontSize: 14 }}>⚑</span>
        Risk Factors Detected
        <span style={{
          marginLeft: 'auto', background: cfg.color, color: '#000',
          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100,
        }}>
          {factors.length}
        </span>
      </div>
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {factors.map((f, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontFamily: G.mono, color: cfg.color, fontSize: 12, flexShrink: 0, marginTop: 1 }}>→</span>
            <span style={{ fontSize: 14, color: 'rgba(221,227,240,0.6)', lineHeight: 1.5 }}>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── FeatureGrid ──────────────────────────────────────────────────────────────
const FEATURE_META = [
  { key: 'has_https', label: 'HTTPS', type: 'bool', goodWhenTrue: true },
  { key: 'has_valid_ssl', label: 'Valid SSL', type: 'bool', goodWhenTrue: true },
  { key: 'is_known_safe', label: 'Known Safe Domain', type: 'bool', goodWhenTrue: true },
  { key: 'tld_is_trusted', label: 'Trusted TLD', type: 'bool', goodWhenTrue: true },
  { key: 'has_ip_address', label: 'IP in URL', type: 'bool', goodWhenTrue: false },
  { key: 'has_suspicious_keywords', label: 'Suspicious Keywords', type: 'bool', goodWhenTrue: false },
  { key: 'domain_age_days', label: 'Domain Age', type: 'age' },
  { key: 'url_length', label: 'URL Length', type: 'urllen' },
  { key: 'subdomain_count', label: 'Subdomain Depth', type: 'subdomain' },
  { key: 'suspicious_keyword_count', label: 'Keyword Count', type: 'number' },
  { key: 'redirect_count', label: 'Redirects', type: 'number' },
  { key: 'url_entropy', label: 'URL Entropy', type: 'entropy' },
]

function featureStatus(meta, value) {
  switch (meta.type) {
    case 'bool': {
      const bad = meta.goodWhenTrue ? !value : value
      return { display: value ? 'Yes' : 'No', status: bad ? 'bad' : 'good' }
    }
    case 'age':
      if (value < 30) return { display: `${value}d ⚡ New`, status: 'bad' }
      if (value < 365) return { display: `${value}d`, status: 'warn' }
      return { display: `${Math.round(value / 365)}y`, status: 'good' }
    case 'urllen':
      return { display: `${value} chars`, status: value > 75 ? 'bad' : value > 54 ? 'warn' : 'good' }
    case 'subdomain':
      return { display: value === 0 ? 'None' : value, status: value > 3 ? 'bad' : value > 1 ? 'warn' : 'good' }
    case 'entropy':
      return { display: value.toFixed(2), status: value > 4.5 ? 'bad' : 'neutral' }
    default:
      return { display: String(value), status: value > 2 ? 'bad' : value > 0 ? 'warn' : 'good' }
  }
}

const STATUS_COLOR = { good: '#00e5a0', bad: '#ff4d6d', warn: '#ffc94d', neutral: 'rgba(221,227,240,0.6)' }
const STATUS_BORDER = { good: 'rgba(0,229,160,0.15)', bad: 'rgba(255,77,109,0.15)', warn: 'rgba(255,201,77,0.15)', neutral: G.border }

function FeatureGrid({ features }) {
  if (!features) return null
  return (
    <div style={{
      background: G.bgCard, borderRadius: 12, padding: 20,
      border: `1px solid ${G.border}`,
      animation: 'fadeUp 0.5s ease',
    }}>
      <div style={{ fontFamily: G.mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: G.muted, marginBottom: 16 }}>
        Feature Analysis
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FEATURE_META.map(meta => {
          const val = features[meta.key]
          if (val === undefined || val === null) return null
          const { display, status } = featureStatus(meta, val)
          return (
            <div key={meta.key} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 6,
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${STATUS_BORDER[status]}`,
            }}>
              <span style={{ fontFamily: G.mono, fontSize: 11, color: G.muted, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {meta.label}
              </span>
              <span style={{ fontFamily: G.mono, fontSize: 12, fontWeight: 700, color: STATUS_COLOR[status], flexShrink: 0 }}>
                {display}
              </span>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: STATUS_COLOR[status],
                boxShadow: status !== 'neutral' ? `0 0 4px ${STATUS_COLOR[status]}` : 'none',
              }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
const EXAMPLES = [
  { label: 'Trusted Store', url: 'https://www.amazon.com', color: G.safe },
  { label: 'Suspicious', url: 'http://amaz0n-deals.shopLogin', color: G.warn },
  { label: 'Phishing', url: 'http://secure-paypal-verify.xyz', color: G.danger },
]

const STATS = [
  { value: '95.8%', label: 'Model Accuracy' },
  { value: '30+', label: 'Signals' },
  { value: '<2s', label: 'Analysis Time' },
  { value: '11K+', label: 'Training Samples' },
]

export default function App() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const detailRef = useRef(null)

  const scan = async (target) => {
    if (!target.trim()) return
    setResult(null); setError(null); setLoading(true)
    try {
      const res = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Analysis failed.'); return }
      console.log('[ShopSafe]', data)

      const rawType = (data.classification || '').toLowerCase().trim()
      const validType = ['safe', 'suspicious', 'fake'].includes(rawType) ? rawType : 'suspicious'
      const score = data.score ?? (100 - (data.risk_score ?? 50))

      setResult({
        url: target, type: validType, score: Math.round(score),
        classification: data.classification || (validType[0].toUpperCase() + validType.slice(1)),
        risk_score: data.risk_score ?? Math.round(100 - score),
        confidence: data.confidence ?? null,
        ml_scores: data.ml_scores ?? null,
        features: data.features ?? null,
        risk_factors: data.risk_factors ?? null,
      })
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    } catch {
      setError('Cannot reach backend. Make sure it\'s running on port 5000.')
    } finally { setLoading(false) }
  }

  const summaryColor = result ? (STATUS[result.classification]?.color || G.warn) : G.teal
  const summaryBadge = result?.classification || ''
  const summaryEmoji = STATUS[result?.classification]?.icon || ''

  return (
    <>
      {/* Global styles injected once */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,700&family=Outfit:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html { scroll-behavior:smooth; }
        body { background:#07090f; color:#dde3f0; font-family:'Outfit',sans-serif; min-height:100vh; -webkit-font-smoothing:antialiased; overflow-x:hidden; }
        body::before { content:''; position:fixed; inset:0; background-image:linear-gradient(rgba(0,229,160,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,160,0.025) 1px,transparent 1px); background-size:48px 48px; pointer-events:none; z-index:0; }
        #root { position:relative; z-index:1; }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-track { background:#0d1117; }
        ::-webkit-scrollbar-thumb { background:#1e2d3d; border-radius:3px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
        @keyframes spin   { to { transform:rotate(360deg); } }
        @keyframes orbFloat { 0%,100% { transform:translateX(-60%) translateY(0); } 50% { transform:translateX(-60%) translateY(-20px); } }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* Orbs */}
        <div style={{ position: 'fixed', top: -180, left: '50%', width: 700, height: 600, borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(0,229,160,0.07) 0%,transparent 65%)', pointerEvents: 'none', animation: 'orbFloat 8s ease-in-out infinite', zIndex: 0 }} />
        <div style={{ position: 'fixed', bottom: -200, right: -100, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(77,153,255,0.06) 0%,transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />

        {/* ── Nav ── */}
        <nav style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 48px', height: 60,
          borderBottom: `1px solid ${G.border}`,
          backdropFilter: 'blur(12px)',
          background: 'rgba(7,9,15,0.8)',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 17, fontWeight: 600, letterSpacing: '-0.3px', color: G.white }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 6v6c0 5.523 3.477 10.667 8 12 4.523-1.333 8-6.477 8-12V6L12 2z" fill="rgba(0,229,160,0.15)" stroke={G.teal} strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M9 12l2 2 4-4" stroke={G.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            ShopSafe
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            {['How it works', 'GitHub'].map(t => (
              <a key={t} href="#" style={{ color: 'rgba(221,227,240,0.5)', textDecoration: 'none', fontSize: 14, transition: 'color 0.2s' }}
                onMouseOver={e => e.target.style.color = G.white}
                onMouseOut={e => e.target.style.color = 'rgba(221,227,240,0.5)'}>
                {t}
              </a>
            ))}
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.5px', padding: '3px 10px', borderRadius: 99, background: 'rgba(0,229,160,0.1)', color: G.teal, border: '1px solid rgba(0,229,160,0.2)' }}>
              v1.0
            </span>
          </div>
        </nav>

        {/* ── Hero ── */}
        <main style={{ maxWidth: 760, margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center', position: 'relative', zIndex: 1, width: '100%' }}>

          {/* Eyebrow */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 500, letterSpacing: '2px', color: 'rgba(0,229,160,0.75)', marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: G.teal, boxShadow: `0 0 6px ${G.teal}`, animation: 'pulse 2s ease-in-out infinite', display: 'inline-block' }} />
            ML-POWERED URL SCANNER
          </div>

          {/* Headline */}
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 'clamp(44px,7vw,72px)', fontWeight: 600, lineHeight: 1.07, letterSpacing: '-2px', color: G.white, margin: '0 0 24px' }}>
            Is that site<br />
            <em style={{ fontFamily: "'Playfair Display',Georgia,serif", fontStyle: 'italic', fontWeight: 700, background: 'linear-gradient(135deg,#00e5a0 0%,#4d99ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              safe to buy from?
            </em>
          </h1>

          {/* Sub */}
          <p style={{ fontSize: 17, fontWeight: 300, lineHeight: 1.6, color: 'rgba(221,227,240,0.6)', margin: '0 auto 44px', maxWidth: 520 }}>
            Paste any URL. Our model analyzes <strong style={{ color: 'rgba(221,227,240,0.9)', fontWeight: 500 }}>30+ signals</strong> in under 2 seconds to classify it as Safe, Suspicious, or a Phishing attempt.
          </p>

          {/* Search bar */}
          <div style={{ marginBottom: 32 }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${error ? G.danger : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 14, padding: '6px 6px 6px 16px', gap: 8,
              transition: 'border-color 0.2s, box-shadow 0.2s',
              boxShadow: error ? `0 0 0 3px rgba(255,77,109,0.08)` : 'none',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(221,227,240,0.3)" strokeWidth="1.8" style={{ flexShrink: 0 }}>
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
              </svg>
              <input
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 400, color: '#dde3f0', minWidth: 0 }}
                type="url" placeholder="https://example-shop.com"
                value={url} onChange={e => { setUrl(e.target.value); setError(null) }}
                onKeyDown={e => e.key === 'Enter' && scan(url)}
                autoComplete="off" spellCheck="false"
              />
              <button
                onClick={() => scan(url)}
                disabled={loading || !url.trim()}
                style={{
                  flexShrink: 0, background: loading || !url.trim() ? 'rgba(0,229,160,0.4)' : G.teal,
                  color: '#07090f', border: 'none', borderRadius: 9, padding: '12px 26px',
                  fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, letterSpacing: '0.3px',
                  cursor: loading || !url.trim() ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'background 0.2s, transform 0.1s',
                }}
                onMouseOver={e => { if (!loading && url.trim()) e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseOut={e => { e.currentTarget.style.transform = 'none' }}
              >
                {loading
                  ? <span style={{ width: 14, height: 14, border: '2px solid rgba(7,9,15,0.3)', borderTopColor: '#07090f', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  : 'Scan'}
              </button>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(221,227,240,0.28)' }}>
              {error
                ? <span style={{ color: G.danger }}>⚠ {error}</span>
                : 'We normalize any URL format automatically'}
            </div>
          </div>

          {/* ── Summary card ── */}
          {result && (() => {
            const cfg = STATUS[result.classification] || STATUS.Suspicious
            return (
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid rgba(255,255,255,0.08)`,
                borderLeft: `3px solid ${cfg.color}`,
                borderRadius: 14, padding: '20px 24px', textAlign: 'left',
                display: 'grid', gridTemplateColumns: '1fr auto', gridTemplateRows: 'auto auto',
                gap: '12px 16px', marginBottom: 36,
                animation: 'fadeUp 0.3s ease both',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, gridColumn: 1, gridRow: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: cfg.color, flexShrink: 0, marginTop: 2 }}>
                    {cfg.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.5px', color: cfg.color, marginBottom: 3 }}>
                      {result.classification}
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(221,227,240,0.45)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {result.url.length > 48 ? result.url.slice(0, 48) + '…' : result.url}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', gridColumn: 2, gridRow: 1 }}>
                  <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1, letterSpacing: '-1px', color: cfg.color, fontVariantNumeric: 'tabular-nums' }}>
                    {String(result.score).padStart(2, '0')}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(221,227,240,0.35)', letterSpacing: '1px', marginTop: 2 }}>Trust Score</div>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.55, color: 'rgba(221,227,240,0.5)', margin: 0, gridColumn: '1/-1', gridRow: 2 }}>
                  {cfg.msg}
                </p>
              </div>
            )
          })()}

          {/* Examples */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            <span style={{ fontSize: 13, color: 'rgba(221,227,240,0.35)' }}>Try an example:</span>
            {EXAMPLES.map(ex => (
              <button key={ex.url}
                onClick={() => { setUrl(ex.url); scan(ex.url) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px',
                  borderRadius: 99, border: `1px solid ${G.border}`,
                  background: 'rgba(255,255,255,0.03)',
                  color: 'rgba(221,227,240,0.65)', fontFamily: "'Outfit',sans-serif", fontSize: 13,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#dde3f0' }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = G.border; e.currentTarget.style.color = 'rgba(221,227,240,0.65)' }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: ex.color, flexShrink: 0 }} />
                {ex.label}
              </button>
            ))}
          </div>
        </main>

        {/* ── Detail panels ── */}
        {result?.features && (
          <div ref={detailRef} style={{ maxWidth: 760, margin: '0 auto 60px', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 20, width: '100%', position: 'relative', zIndex: 1 }}>
            <ResultCard result={result} />
            <RiskFactors factors={result.risk_factors} classification={result.classification} />
            <FeatureGrid features={result.features} />
          </div>
        )}

        {/* ── Stats strip ── */}
        <div style={{
          display: 'flex', justifyContent: 'center',
          borderTop: `1px solid ${G.border}`,
          marginTop: 'auto', position: 'relative', zIndex: 1,
        }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{
              flex: 1, maxWidth: 200, padding: '32px 20px', textAlign: 'center',
              borderRight: i < STATS.length - 1 ? `1px solid ${G.border}` : 'none',
            }}>
              <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.5px', color: G.teal, marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 11, letterSpacing: '1.5px', color: 'rgba(221,227,240,0.3)', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>

      </div>
    </>
  )
}
