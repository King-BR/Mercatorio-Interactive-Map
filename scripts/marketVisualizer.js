var colormap = [];
var marketData = null;
var marketLayer = null;
var lastUpdate = null;
var items = [];

async function loadMarketVisualizer(season) {
  marketData = null;
  marketLayer = null;
  lastUpdate = null;
  document.getElementById("marketLastUpdate").innerHTML =
    "<b>Last Update:</b> N/A";
  if (season !== "s2") return;
  colormap = await fetchFromLocal("colormap.json"); // Load colormap
  marketData = await fetchFromLocal(`assets/${season}/marketData.json`); // Load market data
  marketLayer = L.layerGroup();
  items = [];

  lastUpdate = formatTime(marketData[0].last_update);
  document.getElementById(
    "marketLastUpdate"
  ).innerHTML = `<b>Last Update:</b> ${lastUpdate}`;

  // Populate items
  marketData.forEach((town) => {
    Object.keys(town.markets).forEach((item) => {
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

// Event listener for market visualizer toggle
document.getElementById("toggleMarket").addEventListener("change", (event) => {
  if (event.target.checked) {
    // Hide towns and show market visualizer
    map.removeLayer(townsLayer);
    marketLayer.addTo(map);

    // Add grayscale
    grayscale = true;
  } else {
    // Show towns and hide market visualizer
    map.removeLayer(marketLayer);
    townsLayer.addTo(map);

    // Remove grayscale
    grayscale = false;
  }

  updateTileGrayscale();
});

// Event listener for market visualizer dropdown
document
  .getElementById("marketSelect")
  .addEventListener("change", (event) =>
    createMarketVisualizer(event.target.value)
  );

// Event listener for market visualizer tooltip toggle
document
  .getElementById("toggleMarketTooltip")
  .addEventListener("change", (event) => {
    createMarketVisualizer(document.getElementById("marketSelect").value);
  });

// Event listener for market visualizer price select
document
  .getElementById("marketPriceSelect")
  .addEventListener("change", (event) => {
    createMarketVisualizer(document.getElementById("marketSelect").value);
  });

// Function to create the market visualizer layer
function createMarketVisualizer(item) {
  if (!marketData) return;
  const towns = marketData.map((town) => {
    if (town.markets[item]) {
      let mdata = {
        price: 0,
        volume: town.markets[item].volume || 0,
        name: town.name,
      };

      priceOrder = document.getElementById("marketPriceSelect").value;

      switch (priceOrder) {
        default:
        case "bid": {
          mdata.price =
            town.markets[item].highest_bid ||
            town.markets[item].last_price ||
            0;
          break;
        }
        case "ask": {
          mdata.price =
            town.markets[item].lowest_ask || town.markets[item].last_price || 0;
          break;
        }
        case "average": {
          mdata.price = town.markets[item].average_price || 0;
          break;
        }
        case "moving": {
          mdata.price = town.markets[item].moving_average || 0;
          break;
        }
      }

      if (typeof mdata.price === "string")
        mdata.price = parseFloat(mdata.price);

      return mdata;
    }
  });

  var filteredTowns = towns.filter(
    (town) => town != undefined && town.price != undefined && town.price != 0
  );
  var prices = towns
    .filter(
      (town) => town != undefined && town.price != undefined && town.price != 0
    )
    .map((town) => town.price);
  var volumes = towns
    .filter(
      (town) => town != undefined && town.price != undefined && town.price != 0
    )
    .map((town) => town.volume);

  const pricesFinal = processPrices(prices).map((p) =>
    parseFloat(p.toFixed(3))
  );
  const volumesFinal = normalize(volumes);

  map.removeLayer(marketLayer);
  marketLayer = L.layerGroup();
  marketData.forEach((town) => {
    const i = filteredTowns.findIndex((t) => t.name === town.name);
    var color;
    var markerSize;

    if (i === -1) {
      color = [0.18995, 0.07176, 0.23217].map((val) => Math.floor(val * 255));
      markerSize = 3;
    } else {
      color = getColor(pricesFinal, colormap, i);
      markerSize = getMarkerSize(volumesFinal, i);
    }

    if (!isNaN(markerSize) && town.markets[item]) {
      // Parse color to rgb
      color = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;

      var tmp = L.circle(
        [mapHeight - town.location.y / 4, town.location.x / 4],
        {
          radius: markerSize,
          color: color,
          fillColor: color,
          fillOpacity: 1,
        }
      ).bindTooltip(
        `Town: ${town.name}<br>Price: ${formatPrice(prices[i])}<br>Volume: ${
          volumes[i] || 0
        }`,
        {
          permanent: document.getElementById("toggleMarketTooltip").checked,
        }
      ).bindPopup(`
        <b>${town.name}</b><br>
        <b>Open Price:</b> ${formatPrice(town.markets[item].open_price)}<br>
        <b>Last Price:</b> ${formatPrice(town.markets[item].last_price)}<br>
        <b>Average Price:</b> ${formatPrice(
          town.markets[item].average_price
        )}<br>
        <b>Moving Average:</b> ${formatPrice(
          town.markets[item].moving_average
        )}<br>
        <b>Highest Bid:</b> ${formatPrice(town.markets[item].highest_bid)}<br>
        <b>Lowest Ask:</b> ${formatPrice(town.markets[item].lowest_ask)}<br>
        <b>High Price:</b> ${formatPrice(town.markets[item].high_price)}<br>
        <b>Low Price:</b> ${formatPrice(town.markets[item].low_price)}<br>
        <b>Volume:</b> ${volumes[i] || 0}<br>
        <b>Volume 12 Turns:</b> ${town.markets[item].volume_prev_12 || 0}<br>
        <b>Bid Volume 10%:</b> ${town.markets[item].bid_volume_10 || 0}<br>
        <b>Ask Volume 10%:</b> ${town.markets[item].ask_volume_10 || 0}
        `);

      marketLayer.addLayer(tmp);
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
  const index = Math.floor(pricesFinal[i] * 245) + 10 || 0;
  return colormap[index].map((val) => Math.floor(val * 255));
}

// Get marker size for price at index i
function getMarkerSize(volumesFinal, i, minSize = 3, maxIncrease = 15) {
  return minSize + volumesFinal[i] * maxIncrease || minSize;
}

// Format price to 2 decimals places, return 0 if price is NaN
function formatPrice(price) {
  if (price === undefined) return 0;
  return isNaN(parseFloat(price)) ? 0 : parseFloat(price).toFixed(2);
}
