// Initialize map variables
let currentSeason = "s2";
let map;
let towns = []; // Store towns globally for search functionality
let resourceLayers = {};
let overlaysTransport = {};
let fertilityOverlay; // Variable for fertility overlay
let selectedTown = null;

// Define bounds for the map
const mapWidth = 256 * 4;
const mapHeight = 256 * 4;

const padding = 600; // Padding for the map bounds
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
  const resCheckboxes = sidebar.querySelectorAll(".resource-checkbox");
  resCheckboxes.forEach((checkbox) => checkbox.parentElement.remove());
}

// Function to clear trade checkboxes
function clearTradeCheckboxes() {
  const sidebar = document.getElementById("mySidebar");
  const transportCheckboxes = sidebar.querySelectorAll(".trade-checkbox");
  transportCheckboxes.forEach((checkbox) => checkbox.parentElement.remove());
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

  selectedTown = null;
  towns = [];

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
    .addEventListener("change", () => updateRangeCircles(season));
  document
    .getElementById("toggleRange2")
    .addEventListener("change", () => updateRangeCircles(season));
  document
    .getElementById("toggleRange3")
    .addEventListener("change", () => updateRangeCircles(season));

  // Load fertility overlay after initializing the map
  loadFertilityOverlay(season);
}

// Function to update range circles
async function updateRangeCircles(season) {
  const tradeData = await fetchFromLocal(`assets/${season}/trade_ranges.json`);
  var townsJson = await fetchFromLocal(`assets/${season}/towns.json`);

  Object.keys(overlaysTransport).forEach((range) => {
    map.removeLayer(overlaysTransport[range]);
    overlaysTransport[range].clearLayers();
  });

  map.eachLayer((layer) => {
    if (layer instanceof L.Circle) {
      map.removeLayer(layer);
    }
  });

  townsJson.forEach((town) => {
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

    if (selectedTown == null || selectedTown == town.name) {
      tradeData.transports.forEach((transport) => {
        // Manual
        if (transport.moves > 0) {
          const manualMarker = L.circle([markerY, markerX], {
            radius: transport.moves / 4,
            fill: false,
            color: "#00FF00",
            weight: 1,
            opacity: 1,
          });
          overlaysTransport[`${transport.name} manual`].addLayer(manualMarker);
        }
        // Autotrade
        if (transport.autotrade > 0) {
          const autoMarker = L.circle([markerY, markerX], {
            radius: transport.autotrade / 4,
            fill: false,
            color: "#FF0000",
            weight: 1,
            opacity: 1,
          });
          overlaysTransport[`${transport.name} autotrade`].addLayer(autoMarker);
        }

        // Fishing
        if (transport.fishRange > 0) {
          const fishingMarker = L.circle([markerY, markerX], {
            radius: transport.fishRange / 4,
            fill: false,
            color: "#0000FF",
            weight: 1,
            opacity: 1,
          });
          overlaysTransport[`${transport.name} fishing`].addLayer(
            fishingMarker
          );
        }
      });
    }

    Object.keys(overlaysTransport).forEach((range) => {
      if (
        document.getElementById(`toggle_${range.replace(" ", "_")}`).checked
      ) {
        map.addLayer(overlaysTransport[range]);
      }
    });
  });
}

// Function to load towns and add markers
async function loadTowns(season) {
  try {
    towns = []; // Clear existing towns
    var townsJson = await fetchFromLocal(`assets/${season}/towns.json`);
    var tradeData = await fetchFromLocal(`assets/${season}/trade_ranges.json`);
    var plots = await fetchFromLocal(`assets/${season}/plots.json`);
    var stats = await fetchFromLocal(`assets/${season}/stats.json`);
    var fishingRange = 220;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });

    tradeData.transports.forEach((transport) => {
      overlaysTransport[`${transport.name} manual`] = L.layerGroup();
      overlaysTransport[`${transport.name} autotrade`] = L.layerGroup();
      if (transport.fishRange > 0)
        overlaysTransport[`${transport.name} fishing`] = L.layerGroup();
    });

    townsJson.forEach((town, index) => {
      clearTradeCheckboxes(); // Clear existing checkboxes

      const iconUrl = town.capital ? "capital_marker.png" : "town_marker.png";
      const marker = L.icon({
        iconUrl: iconUrl,
        iconSize: [25, 25],
        iconAnchor: [12.5, 25],
        tooltipAnchor: [12.5, -12.5],
        popupAnchor: [0, -20],
      });

      const markerY = mapHeight - town.location.y / 4;
      const markerX = town.location.x / 4;

      const tooltipText = town.name || `Town ${index + 1}`;
      towns.push({
        name: tooltipText,
        altname: `Town ${index + 1}`,
        location: town.location,
      });
      const townData = stats[tooltipText] || null;

      let statsStr = "";

      const townName = tooltipText;
      const location = `X=${town.location.x}, Y=${town.location.y}`;
      const section = `Section ${Math.floor(town.location.x / 32) * 32}:${
        Math.floor(town.location.y / 32) * 32
      }`;

      if (townData) {
        // Display town name as title and location/section below it
        statsStr += `
        <div style="display: flex; align-items: center;">
          <h3 style="margin: 0;">${townName}</h3>
          <button id="pinButton" style="background: none; border: none; cursor: pointer; margin-left: 10px;">
            <i class="fa fa-thumbtack"></i>
          </button>
        </div>`;
        statsStr += `<p>${location} | ${section}</p>`;

        // Fish/Whales plots at 220 or less of distance
        const fishPlots = plots.filter(
          (plot) =>
            plot.data.res === 1 &&
            Math.sqrt(
              Math.pow(plot.realX - town.location.x, 2) +
                Math.pow(plot.realY - town.location.y, 2)
            ) <= fishingRange
        );
        const whalePlots = plots.filter(
          (plot) =>
            plot.data.res === 8 &&
            Math.sqrt(
              Math.pow(plot.realX - town.location.x, 2) +
                Math.pow(plot.realY - town.location.y, 2)
            ) <= fishingRange
        );

        if (!townData.landlocked) {
          if (fishPlots.length > 0 || whalePlots.length > 0) {
            statsStr += `<h7><b>Sea Resources:</b></h7><br>`;
            statsStr += `<b>Fishing Range: ${fishingRange} tiles</b><br>`;
          }

          if (fishPlots.length > 0) {
            statsStr += `Fish Plots: ${fishPlots.length}<br>`;
          }

          if (whalePlots.length > 0) {
            statsStr += `Whale Plots: ${whalePlots.length}<br>`;
          }

          if (fishPlots.length > 0 || whalePlots.length > 0) statsStr += `<br>`;
        } else {
          statsStr += `<h7><b>Landlocked</b></h7><br><br>`;
        }

        //statsStr += `<h6><b>Land Plots:</b></h6>`

        // Define the desired order for fertility categories
        const fertilityOrder = [
          "clay",
          "fertile",
          "grazing",
          "arid",
          "forest",
          "water",
        ];

        // Iterate through each range and display resources and fertility in two columns
        Object.keys(townData).forEach((range) => {
          if (range.includes("Range")) {
            var resources = Object.entries(townData[range].resources).filter(
              ([, value]) => value > 0
            );

            resources = resources.filter(
              ([key]) => !["fish", "whales"].includes(key)
            );

            const fertility = Object.entries(townData[range].fertility)
              .filter(([key, value]) => value > 0)
              .sort(
                (a, b) =>
                  fertilityOrder.indexOf(a[0]) - fertilityOrder.indexOf(b[0])
              ); // Sort fertility based on the defined order

            // Only show the range title if there's something to display
            if (resources.length || fertility.length) {
              let title = "";
              switch (range) {
                case "normalRange":
                  title = "Normal Range";
                  break;
                case "outpost1Range":
                  title = "Outpost 1 Range";
                  break;
                case "outpost2Range":
                  title = "Outpost 2 Range";
                  break;
                default:
                  title = range.replace(/Range$/, " Range");
                  break;
              }

              statsStr += `<b>${title}:</b><br>`;
              statsStr += `<div style="display: flex;">`;

              // Resources column
              if (resources.length) {
                statsStr += `<div style="flex: 1; padding-right: 10px;"><b>Resources:</b><br>`;
                resources.forEach(([res, amount]) => {
                  statsStr += `${
                    res.charAt(0).toUpperCase() + res.slice(1)
                  }: ${amount}<br>`;
                });
                statsStr += `</div>`;
              }

              // Fertility column
              if (fertility.length) {
                statsStr += `<div style="flex: 1; padding-left: 10px;"><b>Fertility:</b><br>`;
                fertility.forEach(([res, amount]) => {
                  statsStr += `${
                    res.charAt(0).toUpperCase() + res.slice(1)
                  }: ${amount}<br>`;
                });
                statsStr += `</div>`;
              }

              statsStr += `</div><br>`; // Close the flex container
            }
          }
        });
      }

      var tmpmarker = L.marker([markerY, markerX], { icon: marker })
        .addTo(map)
        .bindTooltip(tooltipText)
        .bindPopup(statsStr, {
          minWidth: 200, // Minimum width of the popup
          maxWidth: 400, // Maximum width of the popup
        })
        .on("popupopen", function () {
          // Add event listener to the pin button when the popup is opened
          const pinButton = document.getElementById("pinButton");
          if (pinButton) {
            pinButton.addEventListener("click", function () {
              pinButtonClicked(tmpmarker);
            });
          }
        })
        .on("popupclose", function () {
          // Remove event listener from the pin button when the popup is closed
          const pinButton = document.getElementById("pinButton");
          if (pinButton) {
            pinButton.removeEventListener("click", function () {
              pinButtonClicked(tmpmarker);
            });
          }
        });

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

      if (selectedTown == null || selectedTown == town.name) {
        tradeData.transports.forEach((transport) => {
          // Manual
          if (transport.moves > 0) {
            const manualMarker = L.circle([markerY, markerX], {
              radius: transport.moves / 4,
              fill: false,
              color: "#00FF00",
              weight: 1,
              opacity: 1,
            });
            overlaysTransport[`${transport.name} manual`].addLayer(
              manualMarker
            );
          }
          // Autotrade
          if (transport.autotrade > 0) {
            const autoMarker = L.circle([markerY, markerX], {
              radius: transport.autotrade / 4,
              fill: false,
              color: "#FF0000",
              weight: 1,
              opacity: 1,
            });
            overlaysTransport[`${transport.name} autotrade`].addLayer(
              autoMarker
            );
          }

          // Fishing
          if (transport.fishRange > 0) {
            const fishingMarker = L.circle([markerY, markerX], {
              radius: transport.fishRange / 4,
              fill: false,
              color: "#0000FF",
              weight: 1,
              opacity: 1,
            });
            overlaysTransport[`${transport.name} fishing`].addLayer(
              fishingMarker
            );
          }
        });
      }
    });

    Object.keys(overlaysTransport).forEach((range) => {
      const transportDiv = document.getElementById("transportDiv");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `toggle_${range.replace(" ", "_")}`;
      checkbox.className = "trade-checkbox";
      checkbox.checked = false; // Default to off

      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          map.addLayer(overlaysTransport[range]);
        } else {
          map.removeLayer(overlaysTransport[range]);
        }
      });

      const label = document.createElement("label");
      label.htmlFor = checkbox.id;
      label.textContent = range.charAt(0).toUpperCase() + range.slice(1);
      label.style.color = "black";

      const container = document.createElement("div");
      container.classList.add("sidebar-item");
      container.appendChild(checkbox);
      container.appendChild(label);
      transportDiv.appendChild(container);
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
      (town) =>
        (town.name || town.altname) &&
        (town.name.toLowerCase().includes(query) ||
          town.altname.toLowerCase().includes(query))
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
  var element = document.getElementById(`${id}Div`);
  var icon = document.getElementById(`${id}Icon`);

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

// Get the popup and button elements
const popup = document.getElementById("advancedFilterPopup");
const showPopupButton = document.getElementById("showAdvancedFilterButton");
const closePopupButton = document.getElementById("closeAdvancedFilterButton");
const applyFilterButton = document.getElementById("applyFilterButton");

// Show the popup when the button is clicked
showPopupButton.addEventListener("click", function () {
  popup.style.display = "flex";
});

// Hide the popup when the close button is clicked
closePopupButton.addEventListener("click", function () {
  popup.style.display = "none";
});

// Optionally close the popup when clicking outside of the content
window.addEventListener("click", function (event) {
  if (event.target.matches("#map") && popup.style.display == "flex") {
    popup.style.display = "none";
  }
});

// Function to apply the filter when the button is clicked
applyFilterButton.addEventListener("click", async function () {
  var stats = await fetchFromLocal(`assets/${currentSeason}/stats.json`);
  var townsJson = await fetchFromLocal(`assets/${currentSeason}/towns.json`);

  // Make the towns list that the filter applies to
  const townsList = document.getElementById("townsList");

  // Clear the existing list
  townsList.innerHTML = "";

  // Get the filter values
  const filterValues = {
    capital: document.getElementById("capitalCheckbox").checked,
    landlocked: document.getElementById("landlockedCheckbox").checked,
    seaAccess: document.getElementById("seaAccessCheckbox").checked,
    normalRange: {
      resources: [],  // Will store resource names
      fertility: [],   // Will store fertility types
    },
    outpost1Range: {
      resources: [],  // Will store resource names
      fertility: [],   // Will store fertility types
    },
    outpost2Range: {
      resources: [],  // Will store resource names
      fertility: [],   // Will store fertility types
    },
  };

  // Function to extract resources based on quantity requirements
  function extractResourceValues(className, filterObj) {
    const resourceInputs = document.querySelectorAll(`.${className}`);
    resourceInputs.forEach((input) => {
      const resourceName = input.getAttribute("data-resource");
      const resourceValue = parseInt(input.value, 10) || 0;
      if (resourceValue > 0) {
        filterObj.push({ name: resourceName, minQuantity: resourceValue });
      }
    });
  }

  // Get the resources and fertility input values
  extractResourceValues("filterNormalResourceInput", filterValues.normalRange.resources);
  extractResourceValues("filterOutpost1ResourceInput", filterValues.outpost1Range.resources);
  extractResourceValues("filterOutpost2ResourceInput", filterValues.outpost2Range.resources);

  // Get fertility values similarly
  const fertilityInputs = document.querySelectorAll(".filterNormalFertilityInput");
  fertilityInputs.forEach((input) => {
    if (input.checked) {
      filterValues.normalRange.fertility.push(input.value);
    }
  });

  // Implement similar extraction for outpost ranges if necessary
  // (The code for outpost1FertilityInput and outpost2FertilityInput should follow the same pattern)

  // Filter the towns based on the filter values
  var items = 0;
  towns.forEach((town) => {
    const townData = stats[town.name];

    if (townData) {
      if (
        (filterValues.capital && !townsJson.find(t => t.name === town.name).capital) ||
        (filterValues.landlocked && !townData.landlocked) ||
        (filterValues.seaAccess && townData.landlocked)
      ) {
        return;
      }

      let valid = false;

      // Check resources and fertility for normal range
      if (
        filterValues.normalRange.resources.length === 0 &&
        filterValues.normalRange.fertility.length === 0 &&
        filterValues.outpost1Range.resources.length === 0 &&
        filterValues.outpost1Range.fertility.length === 0 &&
        filterValues.outpost2Range.resources.length === 0
      ) {
        valid = true;
      }

      let previousRange = true;
      Object.keys(filterValues).forEach((range) => {
        if (range !== "capital" && range !== "landlocked" && range !== "seaAccess") {
          const resources = filterValues[range].resources || [];
          const fertility = filterValues[range].fertility || [];

          if (resources.length > 0 || fertility.length > 0) {
            const townRangeData = townData[range];

            // Resource match check
            const resourceMatch = resources.every(({ name, minQuantity }) =>
              townRangeData.resources[name] >= minQuantity
            );

            // Fertility match check
            const fertilityMatch = fertility.every((fert) =>
              townRangeData.fertility[fert] > 0
            );

            if (resourceMatch && fertilityMatch) {
              if (previousRange) { 
                valid = true;
              } else valid = false;
            } else {
              if (previousRange) valid = false;
              previousRange = false;
            }
          }
        }
      });

      if (valid) {
        const listItem = document.createElement("li");
        listItem.textContent = town.name;

        const listItemButton = document.createElement("button");
        listItemButton.classList.add("w3-button", "w3-hover-light-grey");

        const icon = document.createElement("i");
        icon.classList.add("fa", "fa-location");

        listItemButton.appendChild(icon);
        listItemButton.addEventListener("click", () => {
          selectedTown = town.name;
          updateSelectedTownDisplay();
          updateRangeCircles(currentSeason);
          popup.style.display = "none";

          // Go to town marker
          map.eachLayer((layer) => {
            if (
              layer instanceof L.Marker &&
              layer.getTooltip().getContent() === town.name
            ) {
              map.flyTo(layer.getLatLng(), 3);
              layer.openTooltip();
            }
          });
        });

        listItem.appendChild(listItemButton);
        townsList.appendChild(listItem);
        items++;
      }
    }
  });

  if (items === 0) {
    const listItem = document.createElement("li");
    listItem.textContent = "No towns found";
    townsList.appendChild(listItem);
  }
});


// Example function to be called when the button is clicked
function pinButtonClicked(tmarker) {
  selectedTown = tmarker.getTooltip().getContent();
  updateSelectedTownDisplay();
  updateRangeCircles(currentSeason);
}

// Function to update the display of the selected town
function updateSelectedTownDisplay() {
  const displayElement = document.getElementById("selectedTownName");
  const displayDiv = document.getElementById("selectedTownDisplay");
  if (selectedTown) {
    displayElement.textContent = selectedTown;
    displayDiv.style.display = "block";
  } else {
    displayElement.textContent = "None";
    displayDiv.style.display = "none";
  }
}

// Function to clear the selected town
function clearSelectedTown() {
  selectedTown = null;
  updateSelectedTownDisplay(); // Clear the selected town display
  updateRangeCircles(currentSeason); // Update the range circles
}

// Add event listener to the clear selection button
document
  .getElementById("clearSelectionButton")
  .addEventListener("click", clearSelectedTown);

// Initialize the map for the first time
initializeMap(currentSeason);
