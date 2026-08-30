var currentSeason = "s8";
var map = null;
var towns = [];
var debug = false;

const deviceInfo = {
  // General info
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  isMobile: false,

  // CPU
  cores: navigator.hardwareConcurrency,

  // RAM — not all browsers provide this
  memory: {
    GB: navigator.deviceMemory ? navigator.deviceMemory + " GB" : "N/A",
    usedJSHeapSize: performance.memory.usedJSHeapSize
      ? Math.round(performance.memory.usedJSHeapSize / 1048576) + " MB"
      : "N/A", // Convert to MB
    totalJSHeapSize: performance.memory.totalJSHeapSize
      ? Math.round(performance.memory.totalJSHeapSize / 1048576) + " MB"
      : "N/A", // Convert to MB
    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      ? Math.round(performance.memory.jsHeapSizeLimit / 1048576) + " MB"
      : "N/A", // Convert to MB
  },

  // Screen
  screenWidth: screen.width,
  screenHeight: screen.height,
  devicePixelRatio: window.devicePixelRatio,

  // Viewport
  viewportWidth: window.innerWidth,
  viewportHeight: window.innerHeight,

  // Touch
  maxTouchPoints: navigator.maxTouchPoints,
};

async function init(season) {
  debug =
    window.location.host.includes("localhost") ||
    window.location.host.includes("127.0.0.1") ||
    window.location.search.includes("debug=true");

  if (debug) console.log(`Debug mode is ON.`);

  if (debug) console.log(`Initializing map for season ${season}.`);
  await initializeMap(season);

  if (debug) console.log(`Loading towns for season ${season}.`);
  await loadTowns(season);

  if (debug) console.log(`Loading paths for season ${season}.`);
  await loadPaths(season);

  if (debug) console.log(`Loading plots for season ${season}.`);
  await loadPlots(season);

  if (debug) console.log(`Loading market visualizer for season ${season}.`);
  await loadMarketVisualizer(season);

  if (debug) console.log(`Loading fertility overlay for season ${season}.`);
  createFertilityOverlay(season);

  if (debug)
    console.log(`Loading forest overlay checkboxes for season ${season}.`);
  createForestOverlay(season);

  if (debug) {
    debugDeviceInfo();
    debugLeafletMap(map);
  }

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

  document.getElementById("pathfindingAccordionBtn").style.display = [
    "s1",
    "s2",
    "s3",
    "s4",
    "s5",
    "s6",
  ].includes(season)
    ? "none"
    : "block";
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

// Debugging function to log map layers and their types
function debugLeafletMap(map) {
  let layers = 0;
  let markers = 0;
  let circleMarkers = 0;
  let polylines = 0;
  let polygons = 0;
  let circles = 0;

  map.eachLayer((layer) => {
    layers++;

    if (layer instanceof L.Marker) {
      markers++;
    }

    if (layer instanceof L.CircleMarker) {
      circleMarkers++;
    }

    if (layer instanceof L.Polyline) {
      polylines++;
    }

    if (layer instanceof L.Polygon) {
      polygons++;
    }

    if (layer instanceof L.Circle) {
      circles++;
    }
  });

  console.table({
    layers,
    markers,
    circleMarkers,
    polylines,
    polygons,
    circles,
  });
}

function debugDeviceInfo() {
  // Update the isMobile property based on the user agent
  deviceInfo.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Update memory properties if performance.memory is available
  if (performance.memory) {
    deviceInfo.memory.GB = navigator.deviceMemory
      ? navigator.deviceMemory + " GB"
      : "N/A";
    deviceInfo.memory.usedJSHeapSize = performance.memory?.usedJSHeapSize
      ? Math.round(performance.memory.usedJSHeapSize / 1048576) + " MB"
      : "N/A"; // Convert to MB
    deviceInfo.memory.totalJSHeapSize = performance.memory?.totalJSHeapSize
      ? Math.round(performance.memory.totalJSHeapSize / 1048576) + " MB"
      : "N/A"; // Convert to MB
    deviceInfo.memory.jsHeapSizeLimit = performance.memory?.jsHeapSizeLimit
      ? Math.round(performance.memory.jsHeapSizeLimit / 1048576) + " MB"
      : "N/A"; // Convert to MB
  }

  // Update viewport dimensions
  deviceInfo.viewportWidth = window.innerWidth;
  deviceInfo.viewportHeight = window.innerHeight;

  // Log the device information to the console
  console.log("Device Information:");
  console.table(deviceInfo);
}
