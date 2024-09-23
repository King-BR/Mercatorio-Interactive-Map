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
  return response.json();
}
