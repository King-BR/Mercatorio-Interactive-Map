var forestOverlay = null;

const forestBounds = [
  [0, 0],
  [mapHeight, mapWidth],
];

// Function to create forest overlay
function createForestOverlay(season) {
  if (season == "s3") return alert("not ready yet")
  // Initialize the forest overlay layer
  forestOverlay = L.tileLayer(`assets/${season}/forest_tiles/{z}/{x}/{y}.png`, {
    attribution: "Forest Overlay",
    opacity: 1, // Adjust opacity as needed
    minZoom: 0,
    maxZoom: zoomLevels[season],
    noWrap: true,
    errorTileUrl: "assets/error.png",
    bounds: forestBounds,
  });
}

function updateForestOverlayOpacity(season, event) {
  if (!forestOverlay) createForestOverlay(season);

  const newOpacity = parseFloat(event.value);
  forestOverlay.setOpacity(newOpacity);
}

// Toggle forest overlay visibility
document
  .getElementById("toggleForest")
  .addEventListener("change", (event) => {
    let forestOpacityLabel = document.getElementById(
      "forestOpacityLabel"
    );
    let forestOpacitySlider = document.getElementById(
      "forestOpacitySlider"
    );
    if (event.target.checked) {
      if (!forestOverlay) createForestOverlay();
      forestOverlay.addTo(map);

      forestOpacityLabel.style.display = "block";
      forestOpacitySlider.style.display = "block";

      forestOpacitySlider.removeEventListener("input", function () {
        updateForestOverlayOpacity(currentSeason, this);
      });
      forestOpacitySlider.addEventListener("input", function () {
        updateForestOverlayOpacity(currentSeason, this);
      });
    } else {
      map.removeLayer(forestOverlay);
      forestOpacityLabel.style.display = "none";
      forestOpacitySlider.style.display = "none";

      forestOpacitySlider.removeEventListener("input", function () {
        updateForestOverlayOpacity(currentSeason, this);
      });
    }
  });
