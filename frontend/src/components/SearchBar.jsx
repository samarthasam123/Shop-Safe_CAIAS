import React, { useRef } from 'react'
import styles from './SearchBar.module.css'

export default function SearchBar({ value, onChange, onSubmit, loading }) {
  const inputRef = useRef(null)

  const handleKey = (e) => {
    if (e.key === 'Enter') onSubmit(value)
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.bar}>
        <div className={styles.protocol}>
          <span>🔗</span>
        </div>
        <input
          ref={inputRef}
          className={styles.input}
          type="url"
          placeholder="https://example-shop.com"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKey}
          disabled={loading}
          autoComplete="off"
          spellCheck="false"
        />
        <button
          className={`${styles.btn} ${loading ? styles.btnLoading : ''}`}
          onClick={() => onSubmit(value)}
          disabled={loading || !value.trim()}
        >
          {loading ? (
            <>
              <span className={styles.spinner} />
              Scanning...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              Analyze
            </>
          )}
        </button>
      </div>
      <p className={styles.hint}>
        Supports any URL format — we normalize it automatically
      </p>
    </div>
  )
}
