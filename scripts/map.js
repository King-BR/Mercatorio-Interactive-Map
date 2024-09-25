var map = null;
var maxZoom = 5;
var mapData = null;

const zoomLevels = { s1: 5, s2: 5 };
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

  L.tileLayer(`./assets/${season}/tiles/{z}/{x}/{y}.png`, {
    tileSize: 256,
    noWrap: true,
    continuousWorld: false,
    errorTileUrl: "assets/error.png",
    bounds: hardBounds,
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
}
