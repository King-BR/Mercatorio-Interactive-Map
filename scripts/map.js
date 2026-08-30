var maxZoom = 5;
var mapData = null;
var grayscale = false;
var mapPath;

const mapWidth = 1024;
const mapHeight = mapWidth;
const padding = 600;
const elasticBounds = [
  [-padding, -padding],
  [mapHeight + padding, mapWidth + padding],
];
const hardBounds = [
  [0, 0],
  [mapHeight, mapWidth],
];

// Function to initialize the map
async function initializeMap(season) {
  if (map) map.remove();

  switch (season) {
    case "s1":
    case "s2":
    case "s3": {
      mapPath = "./assets/map/v1/{z}/{x}/{y}.png";
      break;
    }
    case "s4":
    case "s5": {
      mapPath = "./assets/map/v2/{z}/{x}/{y}.png";
      break;
    }
    case "s6":
    case "s7": {
      mapPath = "./assets/map/v3/{z}/{x}/{y}.png";
      break;
    }
    case "s8": {
      mapPath = "./assets/map/v4/{z}/{x}/{y}.png";
      break;
    }
    default: {
      mapPath = null;
      alert("Invalid season");
      return;
    }
  }

  map = L.map("map", {
    crs: L.CRS.Simple,
    minZoom: 0,
    maxZoom: maxZoom,
    zoom: 0,
    center: [mapHeight / 2, mapWidth / 2],
    maxBoundsViscosity: 1.0,
    preferCanvas: isMobile,
    zoomAnimation: !isMobile,
    fadeAnimation: !isMobile,
    markerZoomAnimation: !isMobile,
  }).fitBounds(hardBounds);

  map.setMaxBounds(elasticBounds);

  var tileLayer = L.tileLayer(mapPath, {
    tileSize: 256,
    noWrap: true,
    continuousWorld: false,
    keepBuffer: isMobile ? 1 : 2, // Adjust buffer based on device type
    updateWhenIdle: isMobile, // Update tiles only when idle on mobile
    updateWhenZooming: !isMobile, // Update tiles while zooming on desktop
    updateInterval: isMobile ? 300 : 100, // Adjust update interval based on device type
    errorTileUrl: "assets/error.png",
    bounds: hardBounds,
    minZoom: 0,
    maxZoom: maxZoom,
    zoom: 0,
  }).addTo(map);

  map.on("mousemove", (event) => {
    const latLng = event.latlng;
    const x = latLng.lng * 4;
    const y = (mapHeight - latLng.lat) * 4;
    const sectionX = Math.floor(x / 32) * 32;
    const sectionY = Math.floor(y / 32) * 32;
    const section = `${sectionX}:${sectionY}`;

    if (x >= 0 && x <= 4096 && y >= 0 && y <= 4096) {
      document.getElementById("coordinateDisplay").textContent =
        `Coordinates: X=${Math.round(x)}, Y=${Math.round(
          y,
        )} | Section: ${section}`;
    }
  });

  tileLayer.on("tileload", function (event) {
    if (grayscale) event.tile.classList.add("grayscale");
  });

  if (debug) {
    map.on("zoomend", function () {
      debugLeafletMap(map);
    });
  }
}

function getMap() {
  return map;
}

// Apply or remove grayscale to the tiles based on the current state
function updateTileGrayscale() {
  var tiles = document.querySelectorAll(".leaflet-tile");
  tiles.forEach(function (tile) {
    tile.classList.toggle("grayscale", grayscale);
  });
}
