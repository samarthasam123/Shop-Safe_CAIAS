import React from 'react'
import styles from './Header.module.css'

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M16 2L4 7v9c0 6.627 5.373 12 12 12s12-5.373 12-12V7L16 2z"
                fill="rgba(0,212,255,0.15)"
                stroke="#00d4ff"
                strokeWidth="1.5"
              />
              <path
                d="M11 16l3 3 7-7"
                stroke="#00d4ff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className={styles.logoText}>Shop<span>Safe</span></span>
        </div>

        <nav className={styles.nav}>
          <a href="#how" className={styles.navLink}>How it works</a>
          <a href="https://github.com/yourusername/shopsafe" target="_blank" rel="noreferrer" className={styles.navLink}>
            GitHub
          </a>
          <span className={styles.badge}>v1.0</span>
        </nav>
      </div>
    </header>
  )
}
