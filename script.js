// Initialize map variables
let currentSeason = "s1";
let map;
let towns = []; // Store towns globally for search functionality
let resourceLayers = {};
let fertilityOverlay; // Variable for fertility overlay

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
  2: { name: "stone", color: "#00FFF7FF" },
  3: { name: "salt", color: "#FFFFFF" },
  4: { name: "copper", color: "#ff6347" },
  5: { name: "iron", color: "#9467bd" },
  6: { name: "gold", color: "#FFFF00" },
  7: { name: "lead", color: "#4B4B4B" },
  8: { name: "whales", color: "#001f3f" },
};

// Function to clear resource checkboxes
function clearResourceCheckboxes() {
  const sidebar = document.getElementById("mySidebar");
  const checkboxes = sidebar.querySelectorAll(".resource-checkbox");
  checkboxes.forEach((checkbox) => checkbox.parentElement.remove());
}

// Function to fetch JSON data from local server
async function fetchFromLocal(path) {
  const url = `./${path}`; // Fetch directly from the local path
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
  }
  return response.json();
}

// Function to initialize the map
async function initializeMap(season) {
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

  await loadTowns(season);
  await loadPlots(season);

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

  document
    .getElementById("toggleRange1")
    .addEventListener("change", () => updateRangeCircles());
  document
    .getElementById("toggleRange2")
    .addEventListener("change", () => updateRangeCircles());
  document
    .getElementById("toggleRange3")
    .addEventListener("change", () => updateRangeCircles());

  // Load fertility overlay after initializing the map
  loadFertilityOverlay(season);
}

// Function to update range circles
function updateRangeCircles() {
  map.eachLayer((layer) => {
    if (layer instanceof L.Circle) {
      map.removeLayer(layer);
    }
  });

  towns.forEach((town) => {
    const markerY = mapHeight - town.location.y / 4;
    const markerX = town.location.x / 4;

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
}

// Function to load towns and add markers
async function loadTowns(season) {
  try {
    towns = []; // Clear existing towns
    towns = await fetchFromLocal(`assets/${season}/towns.json`);

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });

    towns.forEach((town, index) => {
      const iconUrl = town.capital ? "capital_marker.png" : "town_marker.png";
      const marker = L.icon({
        iconUrl: iconUrl,
        iconSize: [25, 25],
        iconAnchor: [12.5, 25],
        tooltipAnchor: [12.5, -12.5],
      });

      const markerY = mapHeight - town.location.y / 4;
      const markerX = town.location.x / 4;

      const tooltipText = town.name || `Town ${index + 1}`;
      towns.push({ name: tooltipText, location: town.location });

      L.marker([markerY, markerX], { icon: marker })
        .addTo(map)
        .bindTooltip(tooltipText);

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
    const plots = await fetchFromLocal(`assets/${season}/plots.json`);
    const overlays = {};

    clearResourceCheckboxes(); // Clear existing checkboxes

    Object.values(res_enum).forEach((resource) => {
      overlays[resource.name] = L.layerGroup();
    });

    plots.forEach((plot) => {
      const resource = res_enum[plot.data.res];
      if (resource) {
        const plotLatLng = L.latLng(
          mapHeight - plot.realY / 4 - 0.2,
          plot.realX / 4 + 0.2
        );

        const circleMarker = L.circleMarker(plotLatLng, {
          radius: 5,
          fillColor: resource.color,
          color: resource.color,
          weight: 1,
          opacity: 1,
          fillOpacity: 1,
        }).bindTooltip(`${resource.name}`);

        overlays[resource.name].addLayer(circleMarker);
      }
    });

    Object.keys(overlays).forEach((resource) => {
      const resourceDiv = document.getElementById("resourceDiv");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `toggle_${resource}`;
      checkbox.className = "resource-checkbox";
      checkbox.checked = false; // Default to off

      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          map.addLayer(overlays[resource]);
        } else {
          map.removeLayer(overlays[resource]);
        }
      });

      const label = document.createElement("label");
      label.htmlFor = checkbox.id;
      label.textContent = resource.charAt(0).toUpperCase() + resource.slice(1);
      label.style.backgroundColor =
        res_enum[
          Object.keys(res_enum).find((key) => res_enum[key].name === resource)
        ].color;
      label.style.padding = "5px";
      label.style.borderRadius = "5px";
      label.style.border = "1px solid black";
      label.style.color = ["gold", "salt", "stone"].includes(resource)
        ? "black"
        : "white";
      
      const container = document.createElement("div");
      container.classList.add("sidebar-item");
      container.appendChild(checkbox);
      container.appendChild(label);
      resourceDiv.appendChild(container);
    });
  } catch (error) {
    console.error("Error loading plots:", error);
  }
}

// Function to load fertility overlay as a single image
function loadFertilityOverlay(season) {
  if (fertilityOverlay) {
    map.removeLayer(fertilityOverlay);
  }

  const imageUrl = `./assets/${season}/fertility_overlay.png`;
  const bounds = [
    [-1, 0],
    [mapHeight - 1, mapWidth],
  ];

  fertilityOverlay = L.imageOverlay(imageUrl, bounds, {
    opacity: 1, // Set the desired opacity for the overlay
  });

  // Default to off
  if (document.getElementById("toggleFertility").checked) {
    fertilityOverlay.addTo(map);
  }
}

// Toggle fertility overlay visibility
document
  .getElementById("toggleFertility")
  .addEventListener("change", (event) => {
    if (event.target.checked) {
      fertilityOverlay.addTo(map);
    } else {
      map.removeLayer(fertilityOverlay);
    }
  });

// Event listeners for season change
document.getElementById("seasonSelect").addEventListener("change", (event) => {
  currentSeason = event.target.value;
  initializeMap(currentSeason);
});

// Handle search input
document.getElementById("searchBar").addEventListener("input", (event) => {
  const query = event.target.value.toLowerCase();
  const suggestions = document.getElementById("suggestions");
  suggestions.innerHTML = "";

  if (query) {
    const filteredTowns = towns.filter(
      (town) => town.name && town.name.toLowerCase().includes(query)
    );

    filteredTowns.forEach((town) => {
      const suggestionItem = document.createElement("a");
      suggestionItem.href = "#";
      suggestionItem.className = "w3-bar-item w3-button";
      suggestionItem.textContent = town.name;
      suggestionItem.addEventListener("click", () => {
        document.getElementById("searchBar").value = town.name;

        // Open the town marker tooltip if it exists
        map.eachLayer((layer) => {
          if (
            layer instanceof L.Marker &&
            layer.getTooltip().getContent() === town.name
          ) {
            layer.openTooltip();
            map.flyTo(layer.getLatLng(), 3);
          }
        });
      });
      suggestions.appendChild(suggestionItem);
    });

    if (filteredTowns.length > 0) {
      suggestions.style.display = "block";
    } else {
      suggestions.style.display = "none";
    }
  } else {
    suggestions.style.display = "none";
  }
});

// Handle closing of suggestions box when clicking outside
document.addEventListener("click", (event) => {
  if (!event.target.matches("#searchBar")) {
    const suggestions = document.getElementById("suggestions");
    if (suggestions.style.display === "block") {
      suggestions.style.display = "none";
    }
  }
});

function toggleAccordion(id) {
  var element = document.getElementById(id);
  var icon = document.getElementById('accordionIcon');

  if (element.classList.contains("w3-show")) {
    element.classList.remove("w3-show");
    icon.classList.remove("fa-chevron-up");
    icon.classList.add("fa-chevron-down");
  } else {
    element.classList.add("w3-show");
    icon.classList.remove("fa-chevron-down");
    icon.classList.add("fa-chevron-up");
  }
}


function w3_open() {
  document.getElementById("mySidebar").style.display = "block";
}

function w3_close() {
  document.getElementById("mySidebar").style.display = "none";
}

// Initialize the map for the first time
initializeMap(currentSeason);
