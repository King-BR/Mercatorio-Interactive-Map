// Initialize map variables
let currentSeason = "s1";
let map;
let towns = []; // Store towns globally for search functionality
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
  2: { name: "stone", color: "#00FFF7FF" }, //  #046E00FF
  3: { name: "salt", color: "#FFFFFF" },
  4: { name: "copper", color: "#ff6347" },
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

  // Add mouse move event listener to display coordinates
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

  // Add event listeners for range toggle checkboxes
  document
    .getElementById("toggleRange1")
    .addEventListener("change", () => updateRangeCircles());
  document
    .getElementById("toggleRange2")
    .addEventListener("change", () => updateRangeCircles());
  document
    .getElementById("toggleRange3")
    .addEventListener("change", () => updateRangeCircles());
}

// Function to update range circles
function updateRangeCircles() {
  map.eachLayer((layer) => {
    if (layer instanceof L.Circle) {
      map.removeLayer(layer);
    }
  });

  towns.forEach((town, index) => {
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
    towns = await fetchFromGitHub(`assets/${season}/towns.json`);

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

      const tooltipText = town.name || `Town ${index + 1}`; // Use name or index if name is missing

      L.marker([markerY, markerX], { icon: marker })
        .addTo(map)
        .bindTooltip(tooltipText);

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
      label.htmlFor = `toggle_${resource}`;

      // Get the resource color from res_enum
      const resourceDetails = Object.values(res_enum).find(
        (r) => r.name === resource
      );
      if (resourceDetails) {
        label.style.backgroundColor = resourceDetails.color; // Set background color
      }

      // Additional styling for readability
      if (!["salt", "gold", "stone"].includes(resource))
        label.style.color = "#FFFFFF"; // Ensure text is readable on colored backgrounds
      label.style.padding = "5px";
      label.style.borderRadius = "3px";
      label.style.display = "inline-block"; // Make the label wrap around content
      label.style.border = "1px solid #000"; // Add border line (1px solid black)

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

// Handle season change
document.getElementById("seasonSelect").addEventListener("change", (event) => {
  currentSeason = event.target.value;
  initializeMap(currentSeason);
});

// Handle search input
document.getElementById("townSearch").addEventListener("input", (event) => {
  const query = event.target.value.toLowerCase();
  const suggestions = document.getElementById("suggestions");
  suggestions.innerHTML = "";

  if (query) {
    const filteredTowns = towns.filter(
      (town, index) =>
        (town.name && town.name.toLowerCase().includes(query)) ||
        (!town.name && `Town ${index + 1}`.toLowerCase().includes(query))
    );

    filteredTowns.forEach((town, index) => {
      const suggestionItem = document.createElement("a");
      suggestionItem.href = "#";
      suggestionItem.className = "w3-bar-item w3-button";
      suggestionItem.textContent = town.name || `Town ${index + 1}`;
      suggestionItem.addEventListener("click", () => {
        document.getElementById("townSearch").value =
          town.name || `Town ${index + 1}`;
        const markerLatLng = L.latLng(
          mapHeight - town.location.y / 4,
          town.location.x / 4
        );
        map.setView(markerLatLng, 1);

        // Open the marker tooltip if it exists
        const marker = map.eachLayer((layer) => {
          if (
            layer instanceof L.Marker &&
            layer.getTooltip().getContent() ===
              (town.name || `Town ${index + 1}`)
          ) {
            layer.openTooltip();
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
  if (!event.target.matches("#townSearch")) {
    const suggestions = document.getElementById("suggestions");
    if (suggestions.style.display === "block") {
      suggestions.style.display = "none";
    }
  }
});

// Initialize map on page load
document.addEventListener("DOMContentLoaded", () => {
  initializeMap(currentSeason);
});
