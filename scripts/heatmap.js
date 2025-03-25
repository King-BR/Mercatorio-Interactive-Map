var townsHouseholds = null;
var heatmapLayer = null;
var classes = [
  "nutrition",
  "textile",
  "crafting",
  "forging",
  "weaponry",
  "maritime",
  "mercantile",
];

function getHeatmapLayer() {
  return heatmapLayer;
}

async function loadHeatmap(type) {
  map = await getMap();
  townsHouseholds = await getHouseholdData();
  towns = getTowns();
  heatmapLayer = null;
  let heatData = [];

  switch (type) {
    case "players": {
      for (let townID in Object.keys(townsHouseholds)) {
        let players = townsHouseholds[townID].filter(
          (h) => h.player && !h.inactive
        );
        heatData.push([
          towns[townID].location.x / 4,
          mapHeight - towns[townID].location.y / 4,
          players.length,
        ]);
      }
      break;
    }
    case "playersByMainClass": {
      for (let town in towns) {
        let players = townsHouseholds[town.id].filter(
          (h) => h.player && !h.inactive
        );
      }
      break;
    }
    case "avgPrestige": {
      for (let town in towns) {
        let players = townsHouseholds[town.id].filter(
          (h) => h.player && !h.inactive
        );
        let prestige = players.reduce((acc, p) => acc + p.prestige, 0);
        heatData.push([
          town.location.x / 4,
          mapHeight - town.location.y / 4,
          prestige / players.length,
        ]);
      }
      break;
    }
  }

  heatmapLayer = L.heatLayer(heatData, {
    radius: 2000,
    blur: 1,
    maxZoom: 5,
  });
}

document.getElementById("toggleHeatmap").addEventListener("change", (event) => {
  loadHeatmap("players");

  if (event.target.checked) {
    map.removeLayer(townsLayer);
    heatmapLayer.addTo(map);

    grayscale = true;
  } else {
    map.removeLayer(heatmapLayer);
    townsLayer.addTo(map);

    grayscale = false;
  }

  updateTileGrayscale();
});

document
  .getElementById("heatmapTypeSelect")
  .addEventListener("change", (event) => loadHeatmap(event.target.value));
