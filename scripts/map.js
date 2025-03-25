var map = null;
var maxZoom = 5;
var mapData = null;
var grayscale = false;
var mapPath;

const zoomLevels = { s1: 5, s2: 5, s3: 5 };
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
    default: {
      mapPath = null;
      alert("Invalid season");
      return;
    }
  }

  maxZoom = zoomLevels[season];

  map = L.map("map", {
    crs: L.CRS.Simple,
    minZoom: 0,
    maxZoom: maxZoom,
    zoom: 0,
    center: [mapHeight / 2, mapWidth / 2],
    maxBoundsViscosity: 1.0,
  }).fitBounds(hardBounds);

  map.setMaxBounds(elasticBounds);

  var tileLayer = L.tileLayer(mapPath, {
    tileSize: 256,
    noWrap: true,
    continuousWorld: false,
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
      document.getElementById(
        "coordinateDisplay"
      ).textContent = `Coordinates: X=${Math.round(x)}, Y=${Math.round(
        y
      )} | Section: ${section}`;
    }
  });

  tileLayer.on("tileload", function () {
    if (grayscale) updateTileGrayscale();
  });
}

function getMap() {
  return map;
}

// Apply or remove grayscale to the tiles based on the current state
function updateTileGrayscale() {
  var tiles = document.querySelectorAll(".leaflet-tile");
  tiles.forEach(function (tile) {
    if (grayscale) {
      tile.classList.add("grayscale");
    } else {
      tile.classList.remove("grayscale");
    }
  });
}
