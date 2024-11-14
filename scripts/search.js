// Handle search input
document.getElementById("searchBar").addEventListener("input", (event) => {
  const query = event.target.value.toLowerCase();
  const suggestions = document.getElementById("suggestions");
  suggestions.innerHTML = "";

  if (query) {
    const filteredTowns = towns.filter(
      (town) =>
        (town.name.replace("_", " ") || town.altname) &&
        (town.name.replace("_", " ").toLowerCase().includes(query) ||
          town.altname.toLowerCase().includes(query))
    );

    filteredTowns.forEach((town) => {
      const suggestionItem = document.createElement("a");
      suggestionItem.href = "#";
      suggestionItem.className = "w3-bar-item w3-button";
      suggestionItem.textContent = town.name.replace("_", " ");
      suggestionItem.addEventListener("click", () => {
        document.getElementById("searchBar").value = town.name.replace("_", " ");

        // Open the town marker tooltip if it exists
        map.eachLayer((layer) => {
          if (
            layer instanceof L.Marker &&
            layer.getTooltip().getContent() === town.name.replace("_", " ")
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
