// Generates an animated "wave" contribution graph:
// each week-column of squares floats up gently, left to right, on a loop.
// Usage: node generate-wave.js <github_username> <output_dir>

const fs = require("fs");
const path = require("path");

const username = process.argv[2];
const outDir = process.argv[3] || "dist";

if (!username) {
  console.error("Usage: node generate-wave.js <github_username> <output_dir>");
  process.exit(1);
}

const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP;
const MARGIN = 4;

const PALETTES = {
  light: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  dark: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
};

async function fetchContributions(user) {
  const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${user}?y=last`);
  if (!res.ok) throw new Error(`Failed to fetch contributions: ${res.status}`);
  const data = await res.json();
  return data.contributions; // [{ date, count, level }]
}

function groupByWeek(days) {
  // Align to weeks starting Sunday, like GitHub's calendar.
  const weeks = [];
  let currentWeek = [];

  const firstDate = new Date(days[0].date + "T00:00:00Z");
  const firstDow = firstDate.getUTCDay(); // 0 = Sunday
  for (let i = 0; i < firstDow; i++) currentWeek.push(null);

  for (const day of days) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }
  return weeks;
}

function buildSvg(weeks, palette) {
  const width = weeks.length * STEP + MARGIN * 2;
  const height = 7 * STEP + MARGIN * 2;

  let rects = "";
  weeks.forEach((week, weekIndex) => {
    const delay = (weekIndex * 0.07).toFixed(3);
    week.forEach((day, dayIndex) => {
      if (!day) return;
      const x = MARGIN + weekIndex * STEP;
      const y = MARGIN + dayIndex * STEP;
      const color = palette[day.level] || palette[0];
      rects += `<rect class="cell" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" ry="2" fill="${color}" style="animation-delay:${delay}s"><title>${day.date}: ${day.count} contributions</title></rect>\n`;
    });
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .cell {
      animation: floatWave 3.2s ease-in-out infinite;
      transform-box: fill-box;
      transform-origin: center;
    }
    @keyframes floatWave {
      0%, 100% { transform: scale(0.35); opacity: 0.35; filter: brightness(0.7); }
      50%      { transform: scale(1.55); opacity: 1; filter: brightness(1.25) drop-shadow(0 0 3px rgba(0,0,0,0.35)); }
    }
  </style>
  ${rects}
</svg>`;
}

async function main() {
  const days = await fetchContributions(username);
  const weeks = groupByWeek(days);

  fs.mkdirSync(outDir, { recursive: true });

  const lightSvg = buildSvg(weeks, PALETTES.light);
  const darkSvg = buildSvg(weeks, PALETTES.dark);

  fs.writeFileSync(path.join(outDir, "contribution-wave.svg"), lightSvg);
  fs.writeFileSync(path.join(outDir, "contribution-wave-dark.svg"), darkSvg);

  console.log("Generated contribution-wave.svg and contribution-wave-dark.svg");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
