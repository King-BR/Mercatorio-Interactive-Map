var fertilityOverlay = null;

const fertilityBounds = [
  [0, 0],
  [mapHeight, mapWidth],
];

// Function to create fertility overlay
function createFertilityOverlay(season) {
  let fertilityPath;

  switch (season) {
    case "s1":
    case "s2":
    case "s3": {
      fertilityPath = "./assets/fertility/v1/{z}/{x}/{y}.png";
      break;
    }
    /*case "s4": {
      fertilityPath = "./assets/fertility/v2/{z}/{x}/{y}.png";
      break;
    }*/
    default: {
      fertilityPath = null;
      alert("Invalid season");
      return;
    }
  }

  // Initialize the fertility overlay layer
  fertilityOverlay = L.tileLayer(fertilityPath, {
    attribution: "Fertility Overlay",
    opacity: 1, // Adjust opacity as needed
    minZoom: 0,
    maxZoom: zoomLevels[season],
    noWrap: true,
    errorTileUrl: "assets/error.png",
    bounds: fertilityBounds,
  });
}

function updateFertilityOverlayOpacity(season, event) {
  if (!fertilityOverlay) createFertilityOverlay(season);

  const newOpacity = parseFloat(event.value);
  fertilityOverlay.setOpacity(newOpacity);
}

// Toggle fertility overlay visibility
document
  .getElementById("toggleFertility")
  .addEventListener("change", (event) => {
    let fertilityOpacityLabel = document.getElementById(
      "fertilityOpacityLabel"
    );
    let fertilityOpacitySlider = document.getElementById(
      "fertilityOpacitySlider"
    );
    if (event.target.checked) {
      if (!fertilityOverlay) createFertilityOverlay();
      fertilityOverlay.addTo(map);

      fertilityOpacityLabel.style.display = "block";
      fertilityOpacitySlider.style.display = "block";

      fertilityOpacitySlider.removeEventListener("input", function () {
        updateFertilityOverlayOpacity(currentSeason, this);
      });
      fertilityOpacitySlider.addEventListener("input", function () {
        updateFertilityOverlayOpacity(currentSeason, this);
      });
    } else {
      map.removeLayer(fertilityOverlay);
      fertilityOpacityLabel.style.display = "none";
      fertilityOpacitySlider.style.display = "none";

      fertilityOpacitySlider.removeEventListener("input", function () {
        updateFertilityOverlayOpacity(currentSeason, this);
      });
    }
  });
