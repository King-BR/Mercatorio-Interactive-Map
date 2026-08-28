var paths = [];
var townPaths = [];
var pathLines = [];
var ferryLines = [];
var transports = [];
var selectedTransports = [];
var selectedTownPathfinding = null;
var selectedTownPathfindingDest = null;

/*
 * Deploy transport POST "base_transport_url"
 * payload:
 * {
 *  autoset_inventory: true,
 *  location: { x: 0, y: 0 },
 *  name: "string",
 *  operation_target: "0",
 *  owner_id: "string",
 *  type: "string"
 * }
 *
 * Travel with transport POST "travel_url"
 * payload:
 * {
 *  end_town_id: ${townID}, // only included if there is a town on the destination tile
 *  location: { x: 2466, y: 878 }, // destination tile, limit around 130-140 steps, needs more testing/confirmation
 *  use_ferry: true, // only included if path used ferry, when used it needs to be a separate request with only the ferry tiles and no movement cost, path is [ferry boarding tile, ...ferry path, ferry unboarding tile]
 *  path: [
 *    { // starting tile
 *      x: 2467,
 *      y: 879
 *    },
 *    { // each step needs movement cost included (c), except the starting tile
 *      x: 2466,
 *      y: 878,
 *      c: 1.41421
 *    }
 *    // etc...
 *  ]
 * }
 */
var base_url = "https://play.mercatorio.io/api";
var base_transport_url = `${base_url}/transports`;
var travel_url = `${base_transport_url}/{transportID}/travel`;
var player_url = `${base_url}/player`;

var playerData = null;
var selectedTransportID = null;
var selectedTransportType = null;

var pathTypeFilters = [
  /*
  {
    id: "landPath",
    label: "Land Path",
    filter: (path) => path.isWaterPath === undefined || !path.isWaterPath,
  },
  {
    id: "waterPath",
    label: "Water Path",
    filter: (path) => path.isWaterPath !== undefined && path.isWaterPath,
  },
  */
  {
    id: "bigPath",
    label: "Big Manual Path",
    filter: (path) => path.bigPath,
  },
  {
    id: "smallPath",
    label: "Small Manual Path",
    filter: (path) => !path.bigPath && !path.autoTradeRoute,
  },
  {
    id: "autoTradeRoute",
    label: "Auto Trade Route",
    filter: (path) => path.autoTradeRoute,
  },
  { id: "useFerry", label: "Use Ferry", filter: (path) => path.useFerry },
];

async function createPathfindingCheckboxes(season) {
  // create checkboxes for each transport type, being possible to select multiple transports at once
  var pathfindingCheckboxes = document.getElementById("pathfindingDiv");
  var masterLabel = document.createElement("label");
  var masterCheckbox = document.createElement("input");

  pathfindingCheckboxes.innerHTML = "";

  masterCheckbox.type = "checkbox";
  masterCheckbox.id = "pathfindingCheckbox_master";
  masterCheckbox.addEventListener("change", () => {
    grayscale = masterCheckbox.checked;
    updateTileGrayscale();
    updatePathlines(season);
  });

  masterLabel.appendChild(masterCheckbox);
  masterLabel.htmlFor = "pathfindingCheckbox_master";
  masterLabel.appendChild(document.createTextNode("Show Trade Routes"));

  pathfindingCheckboxes.appendChild(masterLabel);

  // create town origin selection dropdown
  var townSelect = document.createElement("select");
  townSelect.id = "pathfindingTownSelect";
  townSelect.classList.add("w3-select");

  townSelect.options.add(new Option("All towns", "all"));

  towns.forEach((town) => {
    townSelect.options.add(new Option(town.name, town.id));
  });

  townSelect.addEventListener("change", () => {
    selectedTownPathfinding =
      townSelect.value === "all" ? null : townSelect.value;
    updateDestinationSelectOptions();
    updatePathlines(season);
  });

  // create label for town origin selection dropdown
  var townSelectLabel = document.createElement("label");
  townSelectLabel.htmlFor = "pathfindingTownSelect";
  townSelectLabel.appendChild(document.createTextNode("Origin:"));

  // create town destination selection dropdown
  var townSelectDest = document.createElement("select");
  townSelectDest.id = "pathfindingTownSelectDest";
  townSelectDest.classList.add("w3-select");

  // create disabled option "select origin town first" for town destination selection dropdown
  var disabledOption = document.createElement("option");
  disabledOption.value = "disabled";

  disabledOption.text = "Select origin town first";
  disabledOption.disabled = true;
  disabledOption.defaultSelected = true;
  townSelectDest.appendChild(disabledOption);

  // create label for town destination selection dropdown
  var townSelectDestLabel = document.createElement("label");
  townSelectDestLabel.htmlFor = "pathfindingTownSelectDest";
  townSelectDestLabel.appendChild(document.createTextNode("Destination:"));

  townSelectDest.addEventListener("change", () => {
    selectedTownPathfindingDest =
      townSelectDest.value === "all" ? null : townSelectDest.value;
    updatePathlines(season);
  });

  pathfindingCheckboxes.appendChild(townSelectLabel);
  pathfindingCheckboxes.appendChild(townSelect);
  pathfindingCheckboxes.appendChild(townSelectDestLabel);
  pathfindingCheckboxes.appendChild(townSelectDest);
  pathfindingCheckboxes.appendChild(document.createElement("br"));
  pathfindingCheckboxes.appendChild(document.createElement("br"));

  // Add transport type checkboxes
  pathfindingCheckboxes.appendChild(
    document.createTextNode("Select transport types:"),
  );

  transports.forEach((transport) => {
    var checkbox = document.createElement("input");
    var label = document.createElement("label");

    checkbox.type = "checkbox";
    checkbox.id = `pathfindingCheckbox_${transport.type}`;
    checkbox.value = transport.name.toLowerCase();
    checkbox.checked = false;
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedTransports.push(transport.name.toLowerCase());
      } else {
        selectedTransports = selectedTransports.filter(
          (name) => name.toLowerCase() !== transport.name.toLowerCase(),
        );
      }

      updatePathlines(season);
    });

    label.appendChild(checkbox);
    label.htmlFor = `pathfindingCheckbox_${transport.type}`;
    label.appendChild(document.createTextNode(transport.name));
    pathfindingCheckboxes.appendChild(label);
  });

  pathfindingCheckboxes.appendChild(document.createElement("br"));

  // Add path type checkboxes (manual path, auto trade route, useFerry)
  pathfindingCheckboxes.appendChild(
    document.createTextNode("Path type filters:"),
  );

  pathTypeFilters.forEach((filter) => {
    var checkbox = document.createElement("input");
    var label = document.createElement("label");

    checkbox.type = "checkbox";
    checkbox.id = `pathfindingCheckbox_PathType_${filter.id}`;
    checkbox.checked = true; // default to checked
    checkbox.addEventListener("change", () => {
      updatePathlines(season);
    });

    label.appendChild(checkbox);
    label.htmlFor = `pathfindingCheckbox_PathType_${filter.id}`;
    label.appendChild(document.createTextNode(filter.label));
    pathfindingCheckboxes.appendChild(label);
  });

  // Add button to open popup for pathfinding use in-game
  var pathfindingPopupButton = document.createElement("button");
  var pathfindingPopupButtonDiv = document.createElement("div");
  pathfindingPopupButton.textContent = "Use Pathfinding In-Game";
  pathfindingPopupButton.id = "pathfindingPopupButton";
  pathfindingPopupButton.addEventListener("click", () => {
    pathfindingPopup.style.display = "flex";
  });

  pathfindingPopupButtonDiv.classList.add("sidebar-item", "button-container");

  pathfindingPopupButtonDiv.appendChild(pathfindingPopupButton);
  pathfindingCheckboxes.appendChild(pathfindingPopupButtonDiv);

  // populate pathfinding popup
  populatePathfindingPopup(season);
}

async function loadPaths(season) {
  if (["s1", "s2", "s3", "s4", "s5", "s6"].includes(season)) {
    return alert(`Trade Routes is only available for seasons 7 and later.`);
  }

  if (season === "s8")
    alert(
      "Trade routes for season 8 are still being generated and are not yet available. Please check back later.",
    );

  paths = [];
  transports = [];
  selectedTransports = [];

  paths = await fetchFromLocal(`assets/${season}/paths.json`).catch(
    console.error,
  );

  transports = (
    await fetchFromLocal(`assets/${season}/trade_ranges.json`).catch(
      console.error,
    )
  )?.transports;

  if (!paths || paths.length === 0)
    return alert(`No pathfinding data found for season ${season}.`);

  if (!transports || transports.length === 0)
    return alert(`No transport data found for season ${season}.`);

  await createPathfindingCheckboxes(season);

  if (
    selectedTransports.length > 0 &&
    document.getElementById("pathfindingCheckbox_master")?.checked
  )
    updatePathlines(season);
}

async function updatePathlines(season) {
  pathLines.forEach((line) => {
    map.removeLayer(line);
  });

  pathLines = []; // Clear the pathLines array
  townPaths = [];

  if (debug)
    console.log(
      `Updating pathlines for season ${season} with selected transports:`,
      selectedTransports,
    );

  if (selectedTownPathfinding && selectedTownPathfindingDest) {
    townPaths = paths.filter((path) => {
      return (
        path.from === selectedTownPathfinding &&
        path.to === selectedTownPathfindingDest
      );
    });
  } else if (selectedTownPathfinding) {
    townPaths = paths.filter((path) => {
      return path.from === selectedTownPathfinding;
    });
  } else if (selectedTownPathfindingDest) {
    townPaths = paths.filter((path) => {
      return path.to === selectedTownPathfindingDest;
    });
  } else {
    townPaths = paths;
  }

  if (debug)
    console.log(
      `Found ${townPaths.length} paths for town ${selectedTownPathfinding}.`,
    );

  townPaths = townPaths.filter((path) => {
    if (selectedTransports.length === 0) return false;

    if (
      path.isWaterPath &&
      selectedTransports.some((transportName) => {
        const transport = transports.find(
          (t) => t.name.toLowerCase() === transportName && t.waterOnly,
        );
        return transport != null;
      })
    )
      return true;

    if (
      !path.isWaterPath &&
      selectedTransports.some((transportName) => {
        const transport = transports.find(
          (t) => t.name.toLowerCase() === transportName && !t.waterOnly,
        );
        return transport != null;
      })
    )
      return true;

    return false;
  });

  if (debug)
    console.log(
      `Filtered down to ${townPaths.length} paths after transport filtering.`,
    );

  // Categorize paths as bigPath or autoTradeRoute based on the selected transports and their movement costs
  townPaths = townPaths.map((pathData) => {
    pathData.bigPath = false;
    pathData.autoTradeRoute = false;
    pathData.useFerry = pathData.path.some(
      (point) => point[2] && point[2] === "ferry",
    );

    // check if the path's totalMovementCost is less than or equal to the maximum moves of compatible selected transports
    if (
      pathData.totalMovementCost != null &&
      pathData.totalMovementCost >=
        Math.max(
          ...selectedTransports.map((transportName) => {
            const transport = transports.find(
              (t) =>
                t.name.toLowerCase() === transportName &&
                pathData.isWaterPath === t.waterOnly,
            );
            return transport ? transport.moves : 0;
          }),
        )
    ) {
      pathData.bigPath = true;
    }

    // check if the path's totalMovementCost is less than or equal to the maximum autotrade of compatible selected transports
    if (
      pathData.totalMovementCost != null &&
      pathData.totalMovementCost <=
        Math.max(
          ...selectedTransports.map((transportName) => {
            const transport = transports.find(
              (t) =>
                t.name.toLowerCase() === transportName &&
                pathData.isWaterPath === t.waterOnly,
            );
            return transport ? transport.autotrade : 0;
          }),
        )
    ) {
      pathData.autoTradeRoute = true;
    }

    var pathColor = pathData.isWaterPath ? "#0000FF" : "#1EFF00"; // Default color, green for land trade routes, blue for water trade routes
    // Red for big paths, yellow for small paths (reachable in 1 turn but not able to autotrade)
    pathColor = pathData.bigPath
      ? "#FF0000"
      : pathData.autoTradeRoute
        ? pathColor
        : "#F1FF00";

    pathData.color = pathColor;

    return pathData;
  });

  // Filter paths based on the path type checkboxes
  townPaths = townPaths.filter((pathData) => {
    return pathTypeFilters.every((filter) => {
      const checkbox = document.getElementById(
        `pathfindingCheckbox_PathType_${filter.id}`,
      );
      if (checkbox && !checkbox.checked) {
        return filter.filter(pathData) === false;
      }
      return true;
    });
  });

  if (debug)
    console.log(
      `Filtered down to ${townPaths.length} paths after path type filtering.`,
    );

  // sort paths by totalMovementCost, with null values at the end, decreasing order (highest cost first)
  townPaths = townPaths.sort(
    (a, b) => b.totalMovementCost - a.totalMovementCost,
  );

  if (!document.getElementById("pathfindingCheckbox_master")?.checked) return;

  // Create polylines for each path and add them to the map
  townPaths.forEach((pathData) => {
    if (pathData.totalMoneyCost != null && pathData.totalMoneyCost > 0) {
      const ferrySections = [];
      const normalSections = [];
      var normalSectionIndex = 0;

      pathData.path.forEach((point, index) => {
        if (point[2] && point[2] === "ferry") {
          ferrySections.push([pathData.path[index - 1], point]);
          normalSectionIndex++;
        } else {
          if (!normalSections[normalSectionIndex]) {
            normalSections[normalSectionIndex] = [];
            if (pathData.path[index - 1])
              normalSections[normalSectionIndex].push(pathData.path[index - 1]);
          }

          normalSections[normalSectionIndex].push(point);
        }
      });

      if (normalSections.length > 0) {
        normalSections.forEach((section) => {
          const line = L.polyline(
            section.map((point) => [mapHeight - point[1] / 4, point[0] / 4]),
            {
              color: pathData.color,
              weight: pathData.bigPath ? 8 : pathData.autoTradeRoute ? 2 : 6,
            },
          );
          pathLines.push(line);
        });
      }

      if (ferrySections.length > 0) {
        ferrySections.forEach((section) => {
          const line = L.polyline(
            section.map((point) => [mapHeight - point[1] / 4, point[0] / 4]),
            {
              color: "#FF00FF", // Magenta for ferry sections
              weight: 4,
            },
          );
          pathLines.push(line);
        });
      }
    } else {
      const line = L.polyline(
        pathData.path.map((point) => [mapHeight - point[1] / 4, point[0] / 4]),
        {
          color: pathData.color,
          weight: pathData.bigPath ? 8 : pathData.autoTradeRoute ? 2 : 6,
        },
      );

      pathLines.push(line);
    }
  });

  pathLines.forEach((line) => {
    line.addTo(map);
  });
}

function updateDestinationSelectOptions() {
  const selectedOrigin = selectedTownPathfinding;

  /**
   * @type {HTMLSelectElement}
   */
  const townSelectDest = document.getElementById("pathfindingTownSelectDest");

  if (selectedOrigin && selectedOrigin !== "all") {
    // Clear existing options
    townSelectDest.innerHTML = "";

    // Add "All towns" option
    townSelectDest.options.add(new Option("All towns", "all"));

    /**
     * @type {Array<{id:string,name:string,location:{x:number,y:number}}>}
     */
    var tmpTowns = towns;

    // sort by distance from selected origin town, closest first
    const originTown = towns.find((t) => t.id === selectedOrigin);
    if (originTown) {
      tmpTowns.sort((a, b) => {
        const distanceA = Math.sqrt(
          Math.pow(a.location.x - originTown.location.x, 2) +
            Math.pow(a.location.y - originTown.location.y, 2),
        );
        const distanceB = Math.sqrt(
          Math.pow(b.location.x - originTown.location.x, 2) +
            Math.pow(b.location.y - originTown.location.y, 2),
        );
        return distanceA - distanceB;
      });
    }

    // Add options for towns that have paths from the selected origin
    towns.forEach((town) => {
      if (
        !selectedOrigin ||
        paths.some(
          (path) => path.from === selectedOrigin && path.to === town.id,
        )
      ) {
        townSelectDest.options.add(new Option(town.name, town.id));
      }
    });
  } else {
    // If no origin is selected, disable the destination select
    townSelectDest.innerHTML = "";
    const disabledOption = document.createElement("option");
    disabledOption.value = "disabled";
    disabledOption.text = "Select origin town first";
    disabledOption.disabled = true;
    disabledOption.defaultSelected = true;
    townSelectDest.appendChild(disabledOption);
  }
}

function clearPathfindingSelect(type) {
  switch (type) {
    case "origin": {
      selectedTownPathfinding = null;
      document.getElementById("pathfindingTownSelect").value = "all";
      break;
    }
    case "destination": {
      selectedTownPathfindingDest = null;
      document.getElementById("pathfindingTownSelectDest").value = "all";
      break;
    }
    case "both": {
      selectedTownPathfinding = null;
      selectedTownPathfindingDest = null;
      document.getElementById("pathfindingTownSelect").value = "all";
      document.getElementById("pathfindingTownSelectDest").value = "all";
      break;
    }
    default: {
      console.error(`Invalid type for clearing pathfinding select: ${type}`);
      return;
    }
  }

  updatePathlines(currentSeason);
}

function populatePathfindingPopup(season) {
  playerData = null;
  selectedTransportID = null;
  selectedTransportType = null;

  const pathfindingPopupForm = document.getElementById("pathfindingPopupForm");
  pathfindingPopupForm.innerHTML = "";

  const pathfindingPopupPaths = document.getElementById(
    "pathfindingPopupPaths",
  );
  pathfindingPopupPaths.innerHTML = "";

  const keyLabel = document.createElement("label");
  keyLabel.htmlFor = "pathfindingPopupKeyInput";
  keyLabel.appendChild(document.createTextNode("API Key:"));

  const keyInput = document.createElement("input");
  keyInput.type = "text";
  keyInput.id = "pathfindingPopupKeyInput";
  keyInput.placeholder = "Enter your API key here";

  keyLabel.appendChild(keyInput);
  pathfindingPopupForm.appendChild(keyLabel);

  const mercUserLabel = document.createElement("label");
  mercUserLabel.htmlFor = "pathfindingPopupMercUserInput";
  mercUserLabel.appendChild(document.createTextNode("X-Merc-User:"));

  const mercUserInput = document.createElement("input");
  mercUserInput.type = "text";
  mercUserInput.id = "pathfindingPopupMercUserInput";
  mercUserInput.placeholder = "Enter your X-Merc-User here";

  mercUserLabel.appendChild(mercUserInput);
  pathfindingPopupForm.appendChild(mercUserLabel);

  pathfindingPopupForm.appendChild(document.createElement("br"));
  pathfindingPopupForm.appendChild(document.createElement("br"));

  const connectButton = document.createElement("button");
  connectButton.textContent = "Connect";
  connectButton.classList.add("w3-button", "w3-green", "w3-round");
  connectButton.addEventListener("click", async () => {
    var apiKey =
      keyInput.value
        .trim()
        .replace(/Bearer\s+/i, "")
        .replace(/Authorization:\s+/i, "") || null;
    var mercUser =
      mercUserInput.value.trim().replace(/X-Merc-User:\s+/i, "") || null;

    if (!apiKey || !mercUser) {
      alert("Please enter both API key and MercUser.");
      return;
    }

    try {
      playerData = await RESTRequest(player_url, {
        method: "GET",
        apiKey: apiKey,
        mercUser: mercUser,
      });
    } catch (error) {
      console.error("Error connecting:", error);
      alert(
        `Failed to connect. Please check your API key and X-Merc-User.\n\nMessage: ${error.message}\nError: ${JSON.stringify(error, null, 2)}`,
      );
      return;
    }
  });
  pathfindingPopupForm.appendChild(connectButton);
}
