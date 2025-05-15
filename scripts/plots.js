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
  9: { name: "tin", color: "#F64BFFFF" },
  10: { name: "silver", color: "#FF0000FF" },
};

// Function to load resourcePlots and create overlaysResource
async function loadPlots(season) {
  try {
    const resourcePlots = await fetchFromLocal(
      `assets/${season}/resourcePlots.json`
    );
    overlaysResource = {};

    clearResourceCheckboxes(); // Clear existing checkboxes

    Object.values(res_enum).forEach((resource) => {
      overlaysResource[resource.name] = L.layerGroup();
    });

    resourcePlots.forEach((plot) => {
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

        overlaysResource[resource.name].addLayer(circleMarker);
      }
    });

    Object.keys(overlaysResource).forEach((resource) => {
      const resourceDiv = document.getElementById("resourceDiv");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `toggle_${resource}`;
      checkbox.className = "resource-checkbox";
      checkbox.checked = false; // Default to off

      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          map.addLayer(overlaysResource[resource]);
        } else {
          map.removeLayer(overlaysResource[resource]);
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
    console.error("Error loading resourcePlots:", error);
  }
}
