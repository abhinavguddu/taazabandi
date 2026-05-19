import React from 'react';
import styles from './loading.module.css';

export default function Loading() {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.animationArea}>
        <div className={styles.van}>🚚</div>
        <div className={styles.vegetables}>
          <div className={`${styles.veg} ${styles.veg1}`}>🥕</div>
          <div className={`${styles.veg} ${styles.veg2}`}>🍅</div>
          <div className={`${styles.veg} ${styles.veg3}`}>🥬</div>
          <div className={`${styles.veg} ${styles.veg4}`}>🥔</div>
        </div>
        <div className={styles.road}></div>
      </div>
      <h2 className={styles.loadingText}>Loading Freshness...</h2>
    </div>
  );
}
