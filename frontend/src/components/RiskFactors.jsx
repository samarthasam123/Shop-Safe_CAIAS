import React from 'react'
import styles from './RiskFactors.module.css'

export default function RiskFactors({ factors, classification }) {
  if (!factors || factors.length === 0) return null

  const color =
    classification === 'Safe' ? 'var(--safe)' :
    classification === 'Suspicious' ? 'var(--warn)' :
    'var(--danger)'

  return (
    <div className={styles.card} style={{ '--rf-color': color }}>
      <h3 className={styles.title}>
        <span className={styles.titleIcon}>⚑</span>
        Risk Factors Detected
        <span className={styles.count}>{factors.length}</span>
      </h3>
      <ul className={styles.list}>
        {factors.map((f, i) => (
          <li key={i} className={styles.item}>
            <span className={styles.bullet}>→</span>
            <span className={styles.text}>{f}</span>
          </li>
        ))}
      </ul>
      {classification === 'Safe' && (
        <p className={styles.note}>
          ✓ No significant risk factors detected. This site appears legitimate.
        </p>
      )}
    </div>
  )
}
