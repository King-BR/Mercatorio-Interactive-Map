var overlaysResource = {};

const res_enum = {
  1: { name: "fish", color: "#1f77b4" },
  2: { name: "stone", color: "#00FFF7FF" },
  3: { name: "salt", color: "#FFFFFF" },
  4: { name: "copper", color: "#ff6347" },
  5: { name: "iron", color: "#9467bd" },
  6: { name: "gold", color: "#FFFF00" },
  7: { name: "lead", color: "#4B4B4B" },
  8: { name: "whales", color: "#001f3f" },
  9: { name: "silver", color: "#FF0000FF" },
  10: { name: "tin", color: "#F64BFFFF" },
  11: { name: "waterpower", color: "#6AFF9C" },
};

// ============================================================
// CONFIG
// ============================================================

// Viewport padding.
const RESOURCE_VIEWPORT_PADDING = 0.2;

// Size of the grid cells used for spatial indexing of resources.
const RESOURCE_GRID_SIZE = 128;

// Renderer for resource markers. Using a canvas renderer for better performance with many markers.
const resourceRenderer = L.canvas();

// All resources are stored here as data,
// but do NOT have CircleMarkers until needed.
var resourcePlots = [];

// Spatial index:
// {
//   "0,0": [plot, plot, plot],
//   "1,0": [plot, plot],
//   ...
// }
var resourceSpatialIndex = new Map();

// Currently rendered resources:
//
// {
//   fish: Map<plot, circleMarker>,
//   iron: Map<plot, circleMarker>,
//   ...
// }
var visibleResourceMarkers = {};

// ============================================================
// SPATIAL INDEX
// ============================================================

function getResourceCell(x, y) {
  return {
    x: Math.floor(x / RESOURCE_GRID_SIZE),
    y: Math.floor(y / RESOURCE_GRID_SIZE),
  };
}

function getResourceCellKey(x, y) {
  return `${x},${y}`;
}

function buildResourceSpatialIndex() {
  resourceSpatialIndex.clear();

  for (const plot of resourcePlots) {
    const cell = getResourceCell(plot.x, plot.y);
    const key = getResourceCellKey(cell.x, cell.y);

    let cellResources = resourceSpatialIndex.get(key);

    if (!cellResources) {
      cellResources = [];
      resourceSpatialIndex.set(key, cellResources);
    }

    cellResources.push(plot);
  }

  console.log(
    `Resource spatial index criado: ${resourceSpatialIndex.size} células`,
  );
}

// ============================================================
// GET RESOURCES IN VIEWPORT
// ============================================================
function getResourcesInViewport() {
  const bounds = map.getBounds().pad(RESOURCE_VIEWPORT_PADDING);

  /*
   * Conversion between map coordinates and lat/lng:
   *
   * lat = mapHeight - y / 4 - 0.2
   * lng = x / 4 + 0.2
   */

  const minX = Math.floor((bounds.getWest() - 0.2) * 4);
  const maxX = Math.ceil((bounds.getEast() - 0.2) * 4);

  const minY = Math.floor((mapHeight - bounds.getNorth() - 0.2) * 4);
  const maxY = Math.ceil((mapHeight - bounds.getSouth() - 0.2) * 4);

  const minCellX = Math.floor(minX / RESOURCE_GRID_SIZE);
  const maxCellX = Math.floor(maxX / RESOURCE_GRID_SIZE);

  const minCellY = Math.floor(minY / RESOURCE_GRID_SIZE);
  const maxCellY = Math.floor(maxY / RESOURCE_GRID_SIZE);

  const result = [];

  for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
    for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
      const key = getResourceCellKey(cellX, cellY);
      const cellResources = resourceSpatialIndex.get(key);

      if (!cellResources) {
        continue;
      }

      for (const plot of cellResources) {
        const lat = mapHeight - plot.y / 4 - 0.2;
        const lng = plot.x / 4 + 0.2;

        if (bounds.contains([lat, lng])) {
          result.push(plot);
        }
      }
    }
  }

  return result;
}

// ============================================================
// CREATE RESOURCE MARKER
// ============================================================
function createResourceMarker(plot) {
  const resource = res_enum[plot.data.res];

  if (!resource) {
    return null;
  }

  const plotLatLng = L.latLng(mapHeight - plot.y / 4 - 0.2, plot.x / 4 + 0.2);

  const circleMarker = L.circleMarker(plotLatLng, {
    renderer: resourceRenderer,

    radius: 5,

    fillColor: resource.color,
    color: resource.color,

    weight: 1,

    opacity: 1,
    fillOpacity: 1,
  });

  circleMarker.bindTooltip(resource.name);

  return circleMarker;
}

// ============================================================
// UPDATE VISIBLE RESOURCES
// ============================================================
function updateVisibleResources() {
  if (!map) {
    return;
  }

  /*
   * Finds only the existing resources
   * in the cells that intersect the viewport.
   */
  const visiblePlots = getResourcesInViewport();

  /*
   * Groups the visible resources by type.
   */
  const visibleByResource = {};

  for (const plot of visiblePlots) {
    const resource = res_enum[plot.data.res];

    if (!resource) {
      continue;
    }

    if (!visibleByResource[resource.name]) {
      visibleByResource[resource.name] = [];
    }

    visibleByResource[resource.name].push(plot);
  }

  // ==========================================================
  // UPDATE EACH RESOURCE TYPE
  // ==========================================================
  Object.keys(overlaysResource).forEach((resourceName) => {
    /*
     * If the checkbox for this resource is off,
     * we do not create any markers at all.
     */
    if (!map.hasLayer(overlaysResource[resourceName])) {
      return;
    }

    if (!visibleResourceMarkers[resourceName]) {
      visibleResourceMarkers[resourceName] = new Map();
    }

    const markerMap = visibleResourceMarkers[resourceName];

    const plots = visibleByResource[resourceName] || [];

    const visibleSet = new Set(plots);

    // --------------------------------------------------------
    // REMOVE markers that have left the viewport
    // --------------------------------------------------------

    for (const [plot, marker] of markerMap) {
      if (!visibleSet.has(plot)) {
        overlaysResource[resourceName].removeLayer(marker);
        markerMap.delete(plot);
      }
    }

    // --------------------------------------------------------
    // CREATE only new markers
    // --------------------------------------------------------

    for (const plot of plots) {
      if (markerMap.has(plot)) {
        continue;
      }

      const marker = createResourceMarker(plot);

      if (!marker) {
        continue;
      }

      overlaysResource[resourceName].addLayer(marker);

      markerMap.set(plot, marker);
    }
  });
}

// ============================================================
// CLEAR RESOURCES
// ============================================================
function clearVisibleResourceMarkers() {
  Object.keys(visibleResourceMarkers).forEach((resourceName) => {
    const markerMap = visibleResourceMarkers[resourceName];

    if (!markerMap) {
      return;
    }

    markerMap.forEach((marker) => {
      overlaysResource[resourceName].removeLayer(marker);
    });

    markerMap.clear();
  });

  visibleResourceMarkers = {};
}

// ============================================================
// LOAD PLOTS
// ============================================================
async function loadPlots(season) {
  try {
    /*
     * Loads the data, but does NOT create CircleMarkers here.
     */
    resourcePlots = await fetchFromLocal(`assets/${season}/resourcePlots.json`);

    overlaysResource = {};

    visibleResourceMarkers = {};

    resourceSpatialIndex.clear();

    clearResourceCheckboxes();

    // ========================================================
    // CREATE THE LAYER GROUPS
    // ========================================================

    Object.values(res_enum).forEach((resource) => {
      overlaysResource[resource.name] = L.layerGroup();

      visibleResourceMarkers[resource.name] = new Map();
    });

    // ========================================================
    // CREATE SPATIAL INDEX
    // ========================================================

    buildResourceSpatialIndex();

    // ========================================================
    // CREATE CHECKBOXES
    // ========================================================
    Object.keys(overlaysResource).forEach((resourceName) => {
      const resourceDiv = document.getElementById("resourceDiv");

      const checkbox = document.createElement("input");

      checkbox.type = "checkbox";
      checkbox.id = `toggle_${resourceName}`;
      checkbox.className = "resource-checkbox";
      checkbox.checked = false;

      checkbox.addEventListener("change", (e) => {
        const layer = overlaysResource[resourceName];

        if (e.target.checked) {
          map.addLayer(layer);

          /*
           * Creates only the resources that are
           * within the current viewport.
           */
          updateVisibleResources();
        } else {
          /*
           * Removes the entire layer.
           */
          map.removeLayer(layer);

          /*
           * And frees the CircleMarkers that were
           * being kept in memory.
           */
          if (visibleResourceMarkers[resourceName]) {
            visibleResourceMarkers[resourceName].forEach((marker) => {
              layer.removeLayer(marker);
            });

            visibleResourceMarkers[resourceName].clear();
          }
        }
      });

      const label = document.createElement("label");

      label.htmlFor = checkbox.id;

      label.textContent =
        resourceName.charAt(0).toUpperCase() + resourceName.slice(1);

      const resourceId = Object.keys(res_enum).find(
        (key) => res_enum[key].name === resourceName,
      );

      label.style.backgroundColor = res_enum[resourceId].color;

      label.style.padding = "5px";
      label.style.borderRadius = "5px";
      label.style.border = "1px solid black";

      label.style.color = ["gold", "salt", "stone", "waterpower"].includes(
        resourceName,
      )
        ? "black"
        : "white";

      const container = document.createElement("div");

      container.classList.add("sidebar-item");

      container.appendChild(checkbox);
      container.appendChild(label);

      resourceDiv.appendChild(container);
    });

    console.log(`Loaded ${resourcePlots.length} resource plots`);

    // Map events
    map.on("moveend", updateVisibleResources);
    map.on("zoomend", updateVisibleResources);
  } catch (error) {
    console.error("Error loading resourcePlots:", error);
  }
}
