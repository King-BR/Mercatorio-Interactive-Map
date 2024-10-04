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
      resources: [], // Will store resource names
      fertility: [], // Will store fertility types
    },
    outpost1Range: {
      resources: [], // Will store resource names
      fertility: [], // Will store fertility types
    },
    outpost2Range: {
      resources: [], // Will store resource names
      fertility: [], // Will store fertility types
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
  extractResourceValues(
    "filterNormalResourceInput",
    filterValues.normalRange.resources
  );
  extractResourceValues(
    "filterOutpost1ResourceInput",
    filterValues.outpost1Range.resources
  );
  extractResourceValues(
    "filterOutpost2ResourceInput",
    filterValues.outpost2Range.resources
  );

  // Get fertility values
  const fertilityInputs = document.querySelectorAll(
    ".filterNormalFertilityInput"
  );
  fertilityInputs.forEach((input) => {
    if (input.checked) {
      filterValues.normalRange.fertility.push(input.value);
    }
  });

  const fertilityInputsOutpost1 = document.querySelectorAll(
    ".filterOutpost1FertilityInput"
  );
  fertilityInputsOutpost1.forEach((input) => {
    if (input.checked) {
      filterValues.outpost1Range.fertility.push(input.value);
    }
  });

  const fertilityInputsOutpost2 = document.querySelectorAll(
    ".filterOutpost2FertilityInput"
  );
  fertilityInputsOutpost2.forEach((input) => {
    if (input.checked) {
      filterValues.outpost2Range.fertility.push(input.value);
    }
  });

  // Filter the towns based on the filter values
  var items = 0;
  towns.forEach((town) => {
    const townStats = stats[town.name];

    if (townStats) {
      if (
        (filterValues.capital &&
          !townsJson.find((t) => t.name === town.name).capital) ||
        (filterValues.landlocked && !townStats.landlocked) ||
        (filterValues.seaAccess && townStats.landlocked)
      ) {
        return;
      }

      let valid = false;

      if (
        filterValues.normalRange.resources.length === 0 &&
        filterValues.normalRange.fertility.length === 0 &&
        filterValues.outpost1Range.resources.length === 0 &&
        filterValues.outpost1Range.fertility.length === 0 &&
        filterValues.outpost2Range.resources.length === 0 &&
        filterValues.outpost2Range.fertility.length === 0
      ) {
        valid = true;
      }

      let previousRange = true;
      Object.keys(filterValues).forEach((range) => {
        if (
          range !== "capital" &&
          range !== "landlocked" &&
          range !== "seaAccess"
        ) {
          const resources = filterValues[range].resources || [];
          const fertility = filterValues[range].fertility || [];

          if (resources.length > 0 || fertility.length > 0) {
            const townRangeData = townStats[range];

            // Resource match check
            const resourceMatch = resources.every(
              ({ name, minQuantity }) =>
                townRangeData.resources[name] >= minQuantity
            );

            // Fertility match check
            const fertilityMatch = fertility.every(
              (fert) => townRangeData.fertility[fert] > 0
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
          selectedTown.name = town.name;
          selectedTown.x = town.location.x;
          selectedTown.y = town.location.y;
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
              selectedTown.marker = layer;
            }
          });

          updateSelectedTownDisplay();
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
