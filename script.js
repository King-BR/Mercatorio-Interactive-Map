// Initialize map variables
let currentSeason = "s1";
let map;
let resourceLayers = {};

// Define bounds for the map
const mapWidth = 256 * 4;
const mapHeight = 256 * 4;

const padding = 256;
const elasticBounds = [
  [-padding, -padding],
  [mapHeight + padding, mapWidth + padding],
];
const hardBounds = [
  [0, 0],
  [mapHeight, mapWidth],
];

// Resource enumeration with unique colors
const res_enum = {
  1: { name: "fish", color: "#1f77b4" },
  2: { name: "stone", color: "#ff6347" },
  3: { name: "salt", color: "#FFFFFF" },
  4: { name: "copper", color: "#FF4500" },
  5: { name: "iron", color: "#9467bd" },
  6: { name: "gold", color: "#FFFF00" },
  7: { name: "lead", color: "#4B4B4B" },
  8: { name: "whales", color: "#001f3f" },
};

function clearResourceCheckboxes() {
  const sidebar = document.getElementById("mySidebar");
  const checkboxes = sidebar.querySelectorAll(".resource-checkbox");
  checkboxes.forEach((checkbox) => checkbox.parentElement.remove());
}

// Function to fetch JSON data from GitHub API
async function fetchFromGitHub(path) {
  const url = `https://api.github.com/repos/King-BR/Mercatorio-Interactive-Map/contents/${path}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.v3.raw",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
  }
  return response.json();
}

// Function to initialize the map
async function initializeMap(season) {
  // Remove existing map if it exists
  if (map) {
    map.remove();
  }

  const zoomLevels = { s1: 5, s2: 6 };
  const maxZoom = zoomLevels[season];

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
    errorTileUrl: "error.png",
    bounds: hardBounds,
  }).addTo(map);

  // Load data for towns and plots
  await loadTowns(season);
  await loadPlots(season);
}

// Function to load towns and add markers
async function loadTowns(season) {
  try {
    const towns = await fetchFromGitHub(`assets/${season}/towns.json`);

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });

    towns.forEach((town) => {
      const iconUrl = town.capital ? "capital_marker.png" : "town_marker.png";
      const marker = L.icon({
        iconUrl: iconUrl,
        iconSize: [25, 25],
        iconAnchor: [12.5, 25],
        tooltipAnchor: [12.5, -12.5],
      });

      const markerY = mapHeight - town.location.y / 4;
      const markerX = town.location.x / 4;

      L.marker([markerY, markerX], { icon: marker })
        .addTo(map)
        .bindTooltip(town.name);

      // Add range circles based on checkbox states
      if (document.getElementById("toggleRange1").checked) {
        L.circle([markerY, markerX], {
          radius: 50 / 4,
          fill: false,
          color: "#00DDFFFF",
          weight: 1,
          opacity: 0.5,
        }).addTo(map);
      }
      if (document.getElementById("toggleRange2").checked) {
        L.circle([markerY, markerX], {
          radius: 80 / 4,
          fill: false,
          color: "#FFF200FF",
          weight: 1,
          opacity: 0.5,
        }).addTo(map);
      }
      if (document.getElementById("toggleRange3").checked) {
        L.circle([markerY, markerX], {
          radius: 110 / 4,
          fill: false,
          color: "#FF0000",
          weight: 1,
          opacity: 0.5,
        }).addTo(map);
      }
    });
  } catch (error) {
    console.error("Error loading towns:", error);
  }
}

// Function to load plots and create overlays
async function loadPlots(season) {
  try {
    const plots = await fetchFromGitHub(`assets/${season}/plots.json`);
    const towns = await fetchFromGitHub(`assets/${season}/towns.json`);
    const overlays = {};

    clearResourceCheckboxes(); // Clear existing checkboxes

    Object.values(res_enum).forEach((resource) => {
      overlays[resource.name] = L.layerGroup();
    });

    plots.forEach((plot) => {
      const resource = res_enum[plot.data.res];
      if (resource) {
        const plotLatLng = L.latLng(mapHeight - plot.realY / 4 - 0.2, plot.realX / 4 + 0.2);

        // Create a circle marker for the resource
        const circleMarker = L.circleMarker(plotLatLng, {
          radius: 5,
          fillColor: resource.color,
          color: resource.color,
          weight: 1,
          opacity: 1,
          fillOpacity: 1,
        }).bindTooltip(`${resource.name}`); // (${plot.data.resAmount})

        overlays[resource.name].addLayer(circleMarker);
      }
    });

    Object.keys(overlays).forEach((resource) => {
      const sidebar = document.getElementById("mySidebar");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `toggle_${resource}`;
      checkbox.className = "resource-checkbox"; // Add class for easy selection
      checkbox.checked = false; // Default to off

      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          map.addLayer(overlays[resource]);
        } else {
          map.removeLayer(overlays[resource]);
        }
      });

      const label = document.createElement("label");
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(resource));

      const div = document.createElement("div");
      div.classList.add("sidebar-item");
      div.appendChild(label);
      sidebar.appendChild(div);
    });
  } catch (error) {
    console.error("Error loading plots:", error);
  }
}

// Toggle sidebar visibility
function w3_open() {
  document.getElementById("mySidebar").style.display = "block";
}

function w3_close() {
  document.getElementById("mySidebar").style.display = "none";
}

// Event listener for season change
document
  .getElementById("seasonSelect")
  .addEventListener("change", async function (e) {
    currentSeason = e.target.value;
    await initializeMap(currentSeason);
  });

// Event listeners for toggles
document
  .getElementById("toggleMarkers")
  .addEventListener("change", function (e) {
    const showMarkers = e.target.checked;
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        if (showMarkers) {
          map.addLayer(layer);
        } else {
          map.removeLayer(layer);
        }
      }
    });
  });

document
  .getElementById("toggleRange1")
  .addEventListener("change", async function () {
    await loadTowns(currentSeason);
  });

document
  .getElementById("toggleRange2")
  .addEventListener("change", async function () {
    await loadTowns(currentSeason);
  });

document
  .getElementById("toggleRange3")
  .addEventListener("change", async function () {
    await loadTowns(currentSeason);
  });

// Initialize the map on page load
initializeMap(currentSeason);
