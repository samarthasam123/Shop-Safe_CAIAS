import React from 'react'
import styles from './StatsRow.module.css'

const STATS = [
  { value: '95.8%',   label: 'Model Accuracy',     icon: '🎯' },
  { value: '30+',     label: 'Features Analyzed',  icon: '🔬' },
  { value: '<2s',     label: 'Analysis Time',       icon: '⚡' },
  { value: '11,000+', label: 'Training Samples',    icon: '📊' },
]

export default function StatsRow() {
  return (
    <div className={styles.row}>
      {STATS.map(s => (
        <div key={s.label} className={styles.stat}>
          <span className={styles.icon}>{s.icon}</span>
          <span className={styles.value}>{s.value}</span>
          <span className={styles.label}>{s.label}</span>
        </div>
      ))}
    </div>
  )
}
