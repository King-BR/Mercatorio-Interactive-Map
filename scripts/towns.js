var towns = [];
var overlaysTransport = {};
var selectedTown = {};
var townsData = null;
var townsLayer = null;

// Function to load towns and add markers
async function loadTowns(season) {
  try {
    towns = [];
    townsLayer = L.layerGroup();
    const townsJson = await fetchFromLocal(`assets/${season}/towns.json`);
    const tradeData = await fetchFromLocal(
      `assets/${season}/trade_ranges.json`
    );
    const resourcePlots = await fetchFromLocal(
      `assets/${season}/resourcePlots.json`
    );
    const stats = await fetchFromLocal(`assets/${season}/stats.json`);
    const fishingRange = 220;

    if (season != "s1")
      townsData = await fetchFromLocal(`assets/${season}/townsData.json`);

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

      const iconUrl = town.capital
        ? "assets/capital_marker.png"
        : town.name.includes("tradepost")
        ? "assets/tradepost_marker.png"
        : "assets/town_marker.png";
      const marker = L.icon({
        iconUrl: iconUrl,
        iconSize: [25, 25],
        iconAnchor: [12.5, 25],
        tooltipAnchor: [12.5, -12.5],
        popupAnchor: [0, -20],
      });

      const markerY = mapHeight - town.location.y / 4;
      const markerX = town.location.x / 4;

      const tooltipText = town.name.replace("_", " ") || `Town ${index + 1}`;
      towns.push({
        id: town.id,
        name: tooltipText,
        altname: `Town ${index + 1}`,
        location: town.location,
      });
      const townStats =
        stats[
          tooltipText.includes("tradepost")
            ? tooltipText.replace(" ", "_")
            : tooltipText
        ] || null;
      var townData = null;

      if (townsData) townData = townsData.find((t) => t.id === town.id);

      let statsStr = "";

      const townName = tooltipText;
      const location = `X=${town.location.x}, Y=${town.location.y}`;
      const section = `Section ${Math.floor(town.location.x / 32) * 32}:${
        Math.floor(town.location.y / 32) * 32
      }`;

      if (townStats) {
        // Display town name as title and location/section below it
        statsStr += `
        <div style="display: flex; align-items: center;">
          <h3 style="margin: 0;">${townName}</h3>
          <button id="pinButton" style="background: none; border: none; cursor: pointer; margin-left: 10px;">
            <i class="fa fa-thumbtack"></i>
          </button>
        </div>`;
        statsStr += `<p>${location} | ${section}</p>`;

        if (townData) {
        }

        // Fish/Whales resourcePlots at 220 or less of distance
        const fishPlots = resourcePlots.filter(
          (plot) =>
            plot.data.res === 1 &&
            Math.sqrt(
              Math.pow(plot.realX - town.location.x, 2) +
                Math.pow(plot.realY - town.location.y, 2)
            ) <= fishingRange
        );
        const whalePlots = resourcePlots.filter(
          (plot) =>
            plot.data.res === 8 &&
            Math.sqrt(
              Math.pow(plot.realX - town.location.x, 2) +
                Math.pow(plot.realY - town.location.y, 2)
            ) <= fishingRange
        );

        if (!townStats.landlocked) {
          if (fishPlots.length > 0 || whalePlots.length > 0) {
            statsStr += `<h7><b>Sea Resources:</b></h7><br>`;
            statsStr += `<b>Fishing Range: ${fishingRange} tiles</b><br>`;
          }

          if (fishPlots.length > 0) {
            statsStr += `Fish resourcePlots: ${fishPlots.length}<br>`;
          }

          if (whalePlots.length > 0) {
            statsStr += `Whale resourcePlots: ${whalePlots.length}<br>`;
          }

          if (fishPlots.length > 0 || whalePlots.length > 0) statsStr += `<br>`;
        } else {
          statsStr += `<h7><b>Landlocked</b></h7><br><br>`;
        }

        //statsStr += `<h6><b>Land resourcePlots:</b></h6>`

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
        Object.keys(townStats).forEach((range) => {
          if (range.includes("Range")) {
            var resources = Object.entries(townStats[range].resources).filter(
              ([, value]) => value > 0
            );

            resources = resources.filter(
              ([key]) => !["fish", "whales"].includes(key)
            );

            const fertility = Object.entries(townStats[range].fertility)
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

      var tmpmarker = L.marker([markerY, markerX], {
        icon: marker,
      })
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

      townsLayer.addLayer(tmpmarker);

      if (!document.getElementById("toggleMarket").checked)
        map.addLayer(townsLayer);

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

      if (
        selectedTown.name == null ||
        selectedTown.name == town.name.replace("_", " ")
      ) {
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

function getTowns() {
  return towns;
}

function getTownByName(name) {
  return towns.find((town) => town.name === name);
}

// Function to update range circles
async function updateRangeCircles(season) {
  const tradeData = await fetchFromLocal(`assets/${season}/trade_ranges.json`);
  const townsJson = await fetchFromLocal(`assets/${season}/towns.json`);

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

    if (
      selectedTown.name == null ||
      selectedTown.name == town.name.replace("_", " ")
    ) {
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

// Example function to be called when the button is clicked
function pinButtonClicked(tmarker) {
  selectedTown.name = tmarker.getTooltip().getContent();
  selectedTown.x = tmarker.getLatLng().lng * 4;
  selectedTown.y = tmarker.getLatLng().lat * 4;
  selectedTown.marker = tmarker;
  updateSelectedTownDisplay();
  updateRangeCircles(currentSeason);
}

// Function to update the display of the selected town
function updateSelectedTownDisplay() {
  const displayElement = document.getElementById("selectedTownName");
  const displayDiv = document.getElementById("selectedTownDisplay");
  if (selectedTown.name) {
    displayElement.textContent = selectedTown.name;
    displayDiv.style.display = "block";
  } else {
    displayElement.textContent = "None";
    displayDiv.style.display = "none";
  }
}

// Function to clear the selected town
function clearSelectedTown() {
  selectedTown = {};
  updateSelectedTownDisplay(); // Clear the selected town display
  updateRangeCircles(currentSeason); // Update the range circles
}

// Add event listener to the clear selection button
document
  .getElementById("clearSelectionButton")
  .addEventListener("click", clearSelectedTown);
