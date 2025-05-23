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

async function getMarketData() {
  return (
    await fetch("https://api.mercatorio-tools.tech/tmp/marketdata")
  ).json();
}

async function getHouseholdData() {
  return (
    await fetch("https://api.mercatorio-tools.tech/tmp/households")
  ).json();
}

// Format milliseconds to time string (format DD:MM:YY HH:MM:SS)
function formatTime(milliseconds) {
  const date = new Date(milliseconds);
  return date.toUTCString();
}
