var townsHouseholds = null;
var heatmapLayer = null;
var heatData = [];
var classes = [
  "nutrition",
  "textile",
  "crafting",
  "forging",
  "weaponry",
  "maritime",
  "mercantile",
];

async function loadHeatmap(type) {
  townsHouseholds = await getHouseholdData();
  heatmapLayer = null;
  heatData = [];
  let max = 0;

  if (season !== "s")
    return alert(`Heatmap data for ${season} is not available right now`);

  switch (type) {
    case "players": {
      for (let townID in townsHouseholds) {
        let players = townsHouseholds[townID].filter(
          (h) => h.player && !h.inactive
        );
        if (players.length > max) max = players.length;
        let town = towns.find((t) => t.id == townID);
        heatData.push([
          mapHeight - town.location.y / 4,
          town.location.x / 4,
          players.length,
        ]);
      }
      break;
    }
    case "playersByMainClass": {
      for (let townID in townsHouseholds) {
        let players = townsHouseholds[townID].filter(
          (h) => h.player && !h.inactive
        );

        let mainClass = document.getElementById("heatmapClassSelect").value;

        players = players.filter((p) => {
          let highestSkill = null;
          Object.keys(p.skills).forEach((skill) => {
            if (
              !highestSkill ||
              parseFloat(p.skills[skill]) > parseFloat(p.skills[highestSkill])
            ) {
              highestSkill = skill;
            }
          });

          return highestSkill === mainClass;
        });

        if (players.length > max) max = players.length;

        let town = towns.find((t) => t.id == townID);

        heatData.push([
          mapHeight - town.location.y / 4,
          town.location.x / 4,
          players.length,
        ]);
      }
      break;
    }
    case "avgPrestige": {
      for (let townID in townsHouseholds) {
        let households = townsHouseholds[townID];
        let prestige = households.reduce((a, b) => a + b.prestige, 0);
        let avgPrestige = prestige / households.length;

        if (avgPrestige > max) max = avgPrestige;

        let town = towns.find((t) => t.id == townID);

        heatData.push([
          mapHeight - town.location.y / 4,
          town.location.x / 4,
          avgPrestige,
        ]);
      }
      break;
    }
    default: {
      console.error("Invalid heatmap type: " + type);
      break;
    }
  }

  heatmapLayer = L.heatLayer(heatData, {
    radius: 50,
    maxZoom: 0,
    max: max,
    gradient: {
      0.0: "blue",
      0.25: "cyan",
      0.5: "lime",
      0.75: "yellow",
      1.0: "red",
    },
  });
}

document
  .getElementById("toggleHeatmap")
  .addEventListener("change", async (event) => {
    if (event.target.checked) {
      await loadHeatmap(
        document.getElementById("heatmapTypeSelect").value,
        document.getElementById("seasonSelect").value
      );
      heatmapLayer.addTo(map);
      grayscale = true;
    } else {
      map.removeLayer(heatmapLayer);
      grayscale = false;
    }

    updateTileGrayscale();
  });

document
  .getElementById("heatmapTypeSelect")
  .addEventListener("change", async (event) => {
    if (document.getElementById("toggleHeatmap").checked) {
      map.removeLayer(heatmapLayer);
      heatmapLayer = null;

      if (event.target.value === "playersByMainClass") {
        document.getElementById("heatmapClassDiv").style.display = "block";
      } else {
        document.getElementById("heatmapClassDiv").style.display = "none";
      }

      await loadHeatmap(event.target.value);
      heatmapLayer.addTo(map);
    }
  });

document
  .getElementById("heatmapClassSelect")
  .addEventListener("change", async (event) => {
    if (
      document.getElementById("toggleHeatmap").checked &&
      document.getElementById("heatmapTypeSelect").value ===
        "playersByMainClass"
    ) {
      map.removeLayer(heatmapLayer);
      heatmapLayer = null;

      await loadHeatmap("playersByMainClass");
      heatmapLayer.addTo(map);
    }
  });
