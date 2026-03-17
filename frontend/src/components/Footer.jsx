import React from 'react'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          🛡️ <strong>ShopSafe</strong>
        </div>
        <p className={styles.copy}>
          AI-ML Project · Built with React + Flask + Scikit-learn
        </p>
        <div className={styles.links}>
          <a href="https://github.com/yourusername/shopsafe" className={styles.link} target="_blank" rel="noreferrer">GitHub</a>
          <span className={styles.sep}>·</span>
          <span className={styles.link}>MIT License</span>
        </div>
      </div>
    </footer>
  )
}
