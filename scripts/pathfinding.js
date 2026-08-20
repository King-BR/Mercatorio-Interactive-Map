/*
 * @type {Array<{totalMovementCost:number|null,totalMoneyCost:number|null,path:Array<{type:"water"|"land"|"ferry",x:number,y:number}>,from:string,to:string}>}
 */
var paths = [];
var pathLines = [];
var transports = [];
var selectedTransports = [];

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

  if (selectedTown && selectedTown.id) {
    townPaths = paths.filter((path) => {
      return path.from == selectedTown.id || path.to == selectedTown.id;
    });
  } else {
    townPaths = paths;
  }

  if (debug)
    console.log(
      `Found ${townPaths.length} paths for town ${selectedTown?.id}.`,
    );

  townPaths = townPaths.filter((path) => {
    // Exclude water paths if no water transport is selected
    if (
      path.isWaterPath &&
      !selectedTransports.some((transport) => {
        const transportData = transports.find(
          (t) => t.name.toLowerCase() === transport,
        );
        return transportData && transportData.waterOnly;
      })
    ) {
      return false;
    }

    // Exclude land paths if no land transport is selected
    if (
      !path.isWaterPath &&
      !selectedTransports.some((transport) => {
        const transportData = transports.find(
          (t) => t.name.toLowerCase() === transport,
        );
        return transportData && !transportData.waterOnly;
      })
    ) {
      return false;
    }

    return true;
  });

  if (debug)
    console.log(
      `Filtered down to ${townPaths.length} paths after transport filtering.`,
    );

  townPaths.forEach((pathData) => {
    let bigPath = false;
    let autoTradeRoute = false;

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
      bigPath = true;
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
      autoTradeRoute = true;
    }

    const line = L.polyline(
      pathData.path.map((point) => [mapHeight - point.y / 4, point.x / 4]),
      {
        color: pathData.isWaterPath ? "#0000FF" : "#1EFF00",
        weight: 2.5,
      },
    );
    pathLines.push(line);
  });

  pathLines.forEach((line) => {
    line.addTo(map);
  });
}
