/*
 * @type {Array<{totalMovementCost:number|null,totalMoneyCost:number|null,path:Array<{type:"water"|"land"|"ferry",x:number,y:number}>,from:string,to:string}>}
 */
var paths = [];
var pathLines = [];
var transports = [];
var selectedTransports = [];
var selectedTownPathfinding = null;
var selectedTownPathfindingDest = null;

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
}

async function loadPaths(season) {
  if (["s1", "s2", "s3", "s4", "s5", "s6"].includes(season)) {
    return alert(`Trade Routes is only available for seasons 7 and later.`);
  }

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
  var townPaths = [];

  if (debug)
    console.log(
      `Updating pathlines for season ${season} with selected transports:`,
      selectedTransports,
    );

  if (!document.getElementById("pathfindingCheckbox_master")?.checked) return;

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

  // sort paths by totalMovementCost, with null values at the end, decreasing order (highest cost first)
  townPaths = townPaths.sort(
    (a, b) => b.totalMovementCost - a.totalMovementCost,
  );

  townPaths.forEach((pathData) => {
    const line = L.polyline(
      pathData.path.map((point) => [mapHeight - point[1] / 4, point[0] / 4]),
      {
        color: pathData.color,
        weight: pathData.bigPath ? 8 : pathData.autoTradeRoute ? 2 : 6,
      },
    );

    pathLines.push(line);
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
