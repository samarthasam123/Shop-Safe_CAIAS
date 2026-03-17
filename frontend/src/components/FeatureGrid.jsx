import React from 'react'
import styles from './FeatureGrid.module.css'

const FEATURE_META = [
  { key: 'has_https',              label: 'HTTPS',            type: 'bool', goodWhenTrue: true },
  { key: 'has_valid_ssl',          label: 'Valid SSL',        type: 'bool', goodWhenTrue: true },
  { key: 'is_known_safe',          label: 'Known Safe Domain',type: 'bool', goodWhenTrue: true },
  { key: 'tld_is_trusted',         label: 'Trusted TLD',      type: 'bool', goodWhenTrue: true },
  { key: 'has_ip_address',         label: 'IP in URL',        type: 'bool', goodWhenTrue: false },
  { key: 'has_suspicious_keywords',label: 'Suspicious Keywords', type: 'bool', goodWhenTrue: false },
  { key: 'domain_age_days',        label: 'Domain Age',       type: 'age' },
  { key: 'url_length',             label: 'URL Length',       type: 'urllen' },
  { key: 'subdomain_count',        label: 'Subdomain Depth',  type: 'subdomain' },
  { key: 'suspicious_keyword_count', label: 'Keyword Count', type: 'number' },
  { key: 'redirect_count',         label: 'Redirects',        type: 'number' },
  { key: 'url_entropy',            label: 'URL Entropy',      type: 'entropy' },
]

export default function FeatureGrid({ features, mlScores }) {
  if (!features) return null

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Feature Analysis</h3>
      <div className={styles.grid}>
        {FEATURE_META.map(meta => {
          const val = features[meta.key]
          if (val === undefined || val === null) return null
          return <FeatureItem key={meta.key} meta={meta} value={val} />
        })}
      </div>
    </div>
  )
}

function FeatureItem({ meta, value }) {
  const { label, type, goodWhenTrue } = meta
  let display = ''
  let statusColor = 'neutral'

  switch (type) {
    case 'bool': {
      const isBad = goodWhenTrue ? !value : value
      display = value ? 'Yes' : 'No'
      statusColor = isBad ? 'bad' : 'good'
      break
    }
    case 'age': {
      if (value < 30)        { display = `${value}d ⚡ New`; statusColor = 'bad' }
      else if (value < 365)  { display = `${value}d`; statusColor = 'warn' }
      else                   { display = `${Math.round(value/365)}y`; statusColor = 'good' }
      break
    }
    case 'urllen': {
      display = `${value} chars`
      statusColor = value > 75 ? 'bad' : value > 54 ? 'warn' : 'good'
      break
    }
    case 'subdomain': {
      display = value === 0 ? 'None' : value
      statusColor = value > 3 ? 'bad' : value > 1 ? 'warn' : 'good'
      break
    }
    case 'entropy': {
      display = value.toFixed(2)
      statusColor = value > 4.5 ? 'bad' : 'neutral'
      break
    }
    default: {
      display = String(value)
      statusColor = value > 2 ? 'bad' : value > 0 ? 'warn' : 'good'
    }
  }

  return (
    <div className={`${styles.item} ${styles[statusColor]}`}>
      <span className={styles.itemLabel}>{label}</span>
      <span className={styles.itemValue}>{display}</span>
      <span className={styles.dot} />
    </div>
  )
}
