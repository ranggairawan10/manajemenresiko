import styles from './page.module.css';

export default function HomePage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Manajemen Resiko</h1>
      <p className={styles.subtitle}>
        Platform pembekalan sertifikasi &amp; pengelolaan SMR perbankan Indonesia. Kerangka aplikasi
        (T-001) siap. Design system &amp; theming menyusul di T-002.
      </p>
    </main>
  );
}
