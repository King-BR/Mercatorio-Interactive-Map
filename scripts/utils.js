// Function to fetch JSON data from local server
async function fetchFromLocal(path) {
  const url = `./${path}`; // Fetch directly from the local path
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
  }
  return response.json().catch((error) => {
    console.error(`Error parsing JSON from ${path}:`, error);
    throw error;
  });
}

async function getPathData(season, pathID) {
  return (
    await fetch(`https://api.mercatorio-tools.tech/${season}/paths/${pathID}`)
  ).json();
}

async function getFerryData(season, ferryID) {
  return (
    await fetch(
      `https://api.mercatorio-tools.tech/${season}/ferries/${ferryID}`,
    )
  ).json();
}

async function getMarketData() {
  return (
    await fetch("https://api.mercatorio-tools.tech/data/marketdata")
  ).json();
}

async function getHouseholdData() {
  return (
    await fetch("https://api.mercatorio-tools.tech/data/households")
  ).json();
}

// Format milliseconds to time string (format DD:MM:YY HH:MM:SS)
function formatTime(milliseconds) {
  const date = new Date(milliseconds);
  return date.toUTCString();
}

async function RESTRequest(
  url,
  { method = "GET", body = null, apiKey = null, mercUser = null },
) {
  const options = {
    method: method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Merc-User": mercUser,
    },
  };

  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(
      `Failed to ${method} ${url}: ${response.status} ${response.statusText}`,
    );
  }
  return response.json().catch((error) => {
    console.error(`Error parsing JSON from ${url}:`, error);
    throw error;
  });
}

async function getUserData(apiKey, mercUser) {}

async function executePath(apiKey, mercUser, transportID, pathID) {}
