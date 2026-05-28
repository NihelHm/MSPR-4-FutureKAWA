// ==========================================================
// COMPOSANT MESURECHART
// ==========================================================

import { useEffect, useRef } from "react";
import styles from "./MesureChart.module.css";

export default function MesureChart({ data, label, unit, color, seuilMin, seuilMax }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;

    const loadChart = async () => {
      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);

      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const sorted = [...data].sort(
        (a, b) => new Date(a.date_mesure) - new Date(b.date_mesure)
      );

      const labels = sorted.map((d) =>
        new Date(d.date_mesure).toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      const values = sorted.map((d) => d.valeur);

      const ctx = canvasRef.current.getContext("2d");

      // Gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, 200);
      gradient.addColorStop(0, color + "40");
      gradient.addColorStop(1, color + "00");

      chartRef.current = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label,
              data: values,
              borderColor: color,
              backgroundColor: gradient,
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: color,
              tension: 0.4,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#1A1A1A",
              borderColor: "#333",
              borderWidth: 1,
              titleColor: "#aaa",
              bodyColor: "#fff",
              callbacks: {
                label: (ctx) => ` ${ctx.parsed.y} ${unit}`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: "#1E1E1E" },
              ticks: {
                color: "#666",
                font: { size: 10 },
                maxTicksLimit: 8,
              },
            },
            y: {
              grid: { color: "#1E1E1E" },
              ticks: {
                color: "#666",
                font: { size: 11 },
                callback: (v) => `${v}${unit}`,
              },
            },
          },
        },
      });
    };

    loadChart();

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [data, label, unit, color, seuilMin, seuilMax]);

  if (!data || data.length === 0) {
    return (
      <div className={styles.empty}>
        <span>Aucune mesure disponible</span>
      </div>
    );
  }

  const lastVal = data[0]?.valeur;
  const isAlert =
    lastVal !== undefined &&
    seuilMin !== undefined &&
    seuilMax !== undefined &&
    (lastVal < seuilMin || lastVal > seuilMax);

  return (
    <div className={`${styles.wrapper} ${isAlert ? styles.alert : ""}`}>
      <div className={styles.header}>
        <div className={styles.info}>
          <span className={styles.chartLabel}>{label}</span>
          {seuilMin !== undefined && (
            <span className={styles.seuil}>
              Plage idéale : {seuilMin}–{seuilMax}{unit}
            </span>
          )}
        </div>
        <div className={`${styles.lastVal} ${isAlert ? styles.alertVal : ""}`}>
          {lastVal ?? "—"}<span className={styles.lastUnit}>{unit}</span>
        </div>
      </div>
      <div className={styles.chartArea}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
