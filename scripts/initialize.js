var currentSeason = "s4";

async function init(season) {
  await initializeMap(season);
  await loadTowns(season);
  await loadPlots(season);
  await loadMarketVisualizer(season);
  createFertilityOverlay(season);
  createForestOverlay(season);

  document
    .getElementById("toggleRange1")
    .addEventListener("change", () => updateRangeCircles(season));
  document
    .getElementById("toggleRange2")
    .addEventListener("change", () => updateRangeCircles(season));
  document
    .getElementById("toggleRange3")
    .addEventListener("change", () => updateRangeCircles(season));

  if (document.getElementById("toggleFertility").checked) {
    fertilityOverlay.addTo(map);
  }
}

// Event listeners for season change
document.getElementById("seasonSelect").addEventListener("change", (event) => {
  currentSeason = event.target.value;
  init(currentSeason);
});

// Wait for the DOM to be loaded before initializing the map
document.addEventListener("DOMContentLoaded", () => {
  init(currentSeason);
});
