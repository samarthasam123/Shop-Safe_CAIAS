import React, { useEffect, useRef } from 'react'
import styles from './ResultCard.module.css'

const CLASS_CONFIG = {
  Safe: {
    color: 'var(--safe)',
    dim: 'var(--safe-dim)',
    glow: 'var(--safe-glow)',
    icon: '✓',
    label: 'SAFE',
    message: 'This website appears legitimate and safe for shopping.',
  },
  Suspicious: {
    color: 'var(--warn)',
    dim: 'var(--warn-dim)',
    glow: 'var(--warn-glow)',
    icon: '⚠',
    label: 'SUSPICIOUS',
    message: 'Proceed with caution. Some risk factors were detected.',
  },
  Fake: {
    color: 'var(--danger)',
    dim: 'var(--danger-dim)',
    glow: 'var(--danger-glow)',
    icon: '✕',
    label: 'FAKE / DANGEROUS',
    message: 'High risk detected. Avoid entering personal or payment information.',
  },
}

export default function ResultCard({ result }) {
  const { classification, risk_score, confidence } = result
  const cfg = CLASS_CONFIG[classification] || CLASS_CONFIG.Suspicious
  const arcRef = useRef(null)

  // Animate the SVG arc for risk score gauge
  useEffect(() => {
    const arc = arcRef.current
    if (!arc) return
    const total = 251.2  // circumference of r=40
    const offset = total - (total * risk_score) / 100
    arc.style.strokeDasharray = total
    arc.style.strokeDashoffset = total
    requestAnimationFrame(() => {
      arc.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
      arc.style.strokeDashoffset = offset
    })
  }, [risk_score])

  const scoreColor =
    risk_score < 40 ? 'var(--safe)' :
    risk_score < 70 ? 'var(--warn)' :
    'var(--danger)'

  return (
    <div
      className={styles.card}
      style={{
        '--cls-color': cfg.color,
        '--cls-dim': cfg.dim,
        '--cls-glow': cfg.glow,
      }}
    >
      {/* Classification banner */}
      <div className={styles.banner}>
        <div className={styles.iconWrap}>
          <span className={styles.icon}>{cfg.icon}</span>
        </div>
        <div className={styles.bannerText}>
          <span className={styles.label}>{cfg.label}</span>
          <p className={styles.message}>{cfg.message}</p>
        </div>
      </div>

      {/* Score gauge + details */}
      <div className={styles.body}>
        {/* Gauge */}
        <div className={styles.gauge}>
          <svg viewBox="0 0 100 100" className={styles.gaugeSvg}>
            {/* Track */}
            <circle
              cx="50" cy="50" r="40"
              fill="none"
              stroke="var(--border)"
              strokeWidth="8"
            />
            {/* Arc */}
            <circle
              ref={arcRef}
              cx="50" cy="50" r="40"
              fill="none"
              stroke={scoreColor}
              strokeWidth="8"
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ filter: `drop-shadow(0 0 6px ${scoreColor})` }}
            />
            {/* Score text */}
            <text x="50" y="46" textAnchor="middle" className={styles.gaugeNumber}
              fill={scoreColor} style={{ fontFamily: 'Space Mono', fontSize: '20px', fontWeight: 700 }}>
              {risk_score}
            </text>
            <text x="50" y="60" textAnchor="middle"
              fill="var(--text-muted)" style={{ fontFamily: 'Syne', fontSize: '7px', letterSpacing: '0.05em' }}>
              RISK SCORE
            </text>
          </svg>
          <div className={styles.gaugeScale}>
            <span style={{ color: 'var(--safe)' }}>0 Safe</span>
            <span style={{ color: 'var(--danger)' }}>100 Fake</span>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <Stat label="Risk Score" value={`${risk_score} / 100`} color={scoreColor} />
          <Stat label="Classification" value={classification} color={cfg.color} />
          <Stat label="Confidence" value={`${(confidence * 100).toFixed(1)}%`} />
          <Stat label="ML Probability (Phishing)" value={`${(result.ml_scores?.proba_phishing * 100).toFixed(1)}%`} />
          <Stat label="ML Probability (Legit)" value={`${(result.ml_scores?.proba_legit * 100).toFixed(1)}%`} />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue} style={color ? { color } : {}}>
        {value}
      </span>
    </div>
  )
}
