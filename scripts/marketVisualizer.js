var colormap = [];
var marketData = null;
var marketLayer = null;
var items = [];

async function loadMarketVisualizer(season) {
  colormap = await fetchFromLocal("colormap.json"); // Load colormap
  marketData = await fetchFromLocal(`assets/${season}/marketData.json`); // Load market data
  marketLayer = L.layerGroup();
  items = [];

  // Populate items
  marketData.forEach((data) => {
    Object.keys(data.markets).forEach((item) => {
      if (!items.includes(item)) {
        items.push(item);
      }
    });
  });

  items.sort();

  // Create market visualizer for the first item
  createMarketVisualizer("bread");

  // Populate the market visualizer dropdown
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    if (item === "bread") option.selected = true;
    document.getElementById("marketSelect").appendChild(option);
  });
}

// Event listener for market visualizer dropdown
document
  .getElementById("marketSelect")
  .addEventListener("change", (event) =>
    createMarketVisualizer(event.target.value)
  );

// Event listener for market visualizer toggle
document.getElementById("toggleMarket").addEventListener("change", (event) => {
  if (event.target.checked) {
    // Hide towns and show market visualizer
    map.removeLayer(townsLayer);
    marketLayer.addTo(map);

    // Show the market visualizer dropdown
    document.getElementById("labelToggleMarketTooltip").style.display = "flex";
    document.getElementById("toggleMarketTooltip").style.display = "flex";
    document.getElementById("marketLabel").style.display = "flex";
    document.getElementById("marketSelect").style.display = "flex";
  } else {
    // Show towns and hide market visualizer
    map.removeLayer(marketLayer);
    townsLayer.addTo(map);

    // Hide the market visualizer dropdown
    document.getElementById("labelToggleMarketTooltip").style.display = "none";
    document.getElementById("toggleMarketTooltip").style.display = "none";
    document.getElementById("marketLabel").style.display = "none";
    document.getElementById("marketSelect").style.display = "none";
  }
});

// Event listener for market visualizer tooltip toggle
document
  .getElementById("toggleMarketTooltip")
  .addEventListener("change", (event) => {
    createMarketVisualizer(document.getElementById("marketSelect").value);
  });

// Function to create the market visualizer layer
function createMarketVisualizer(item) {
  const prices = marketData.map((data) => {
    if (data.markets[item]) return data.markets[item].last_price || 0;
  });
  const volumes = marketData.map((data) => {
    if (data.markets[item]) return data.markets[item].volume || 0;
  });

  const pricesFinal = processPrices(prices).map((p) =>
    parseFloat(p.toFixed(3))
  );
  const volumesFinal = normalize(volumes);

  map.removeLayer(marketLayer);
  marketLayer = L.layerGroup();
  marketData.forEach((data, i) => {
    var color = getColor(pricesFinal, colormap, i);
    const markerSize = getMarkerSize(volumesFinal, i);
    if (!isNaN(markerSize)) {
      // Parse color to rgb
      color = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;

      var tmp = L.circle(
        [mapHeight - data.location.y / 4, data.location.x / 4],
        {
          radius: markerSize,
          color: color,
          fillColor: color,
          fillOpacity: 1,
        }
      ).bindTooltip(
        `Town: ${data.name}<br>Price: ${prices[i]}<br>Volume: ${volumes[i]}`,
        {
          permanent: document.getElementById("toggleMarketTooltip").checked,
        }
      );

      marketLayer.addLayer(tmp);
    } else {
      console.log(
        `Invalid marker size on town ${data.name} for item ${item} - Marker Size: ${markerSize} | Volume final ${volumesFinal[i]} | Index: ${i}`
      );
    }
  });

  if (document.getElementById("toggleMarket").checked) marketLayer.addTo(map);
}

// Function to calculate the 10th and 90th percentile of prices
function percentile(arr, perc) {
  const sortedArr = arr.slice().sort((a, b) => a - b);
  const index = Math.floor((perc / 100) * sortedArr.length);
  return sortedArr[index];
}

// Function for tanh4param
function tanh4param(x, l, lv, h, hv) {
  const z = (h - (l * hv) / lv) / (1 - hv / lv);
  return (Math.tanh((x / lv) * (l - z) + z) + 1) * 0.5;
}

// Normalize array values by dividing by the max value
function normalize(arr) {
  const maxVal = Math.max(...arr);
  return arr.map((val) => val / maxVal);
}

// Main process
function processPrices(prices) {
  const low = percentile(prices, 10);
  const high = percentile(prices, 90);

  // Applying tanh4param to the prices
  const tan_h = prices.map((price) => tanh4param(price, -1, low, 1, high));

  // Normalize prices
  const l = normalize(prices);

  // Calculate temp and normalize it, integrating tan_h into the formula
  let temp = prices.map((price, index) => (2 * tan_h[index] + l[index]) / 3);
  // You can skip the next line for volume optionally
  temp = temp.map((val) => val - Math.min(...temp));
  const prices_final = normalize(temp);

  return prices_final;
}

// Get color for price at index i
function getColor(pricesFinal, colormap, i) {
  const index = Math.floor(pricesFinal[i] * 255) || 0;
  return colormap[index].map((val) => Math.floor(val * 255));
}

// Get marker size for price at index i
function getMarkerSize(volumesFinal, i, minSize = 7, maxIncrease = 15) {
  return minSize + volumesFinal[i] * maxIncrease;
}
