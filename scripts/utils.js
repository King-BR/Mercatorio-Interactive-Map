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

function convertArrayToTile(arr) {
  return {
    x: arr[0],
    y: arr[1],
    data: {
      alt: arr[2] !== null ? arr[2] : undefined,
      fertility: arr[3] !== null ? arr[3] : undefined,
      forest: arr[4] !== null ? arr[4] : undefined,
      res: arr[5] !== null ? arr[5] : undefined,
      resAmount: arr[6] !== null ? arr[6] : undefined,
      region: arr[7] !== null ? arr[7] : undefined,
      area: arr[8] !== null ? arr[8] : undefined,
      type: arr[9] !== null ? arr[9] : undefined,
    },
  };
}

async function fetchAndDecompress(path) {
  const response = await fetchFromLocal(path);
  const arrayBuffer = await response.arrayBuffer();
  const decompressed = pako.inflate(new Uint8Array(arrayBuffer), {
    to: "string",
  });
  const parsed = JSON.parse(decompressed);
  return parsed.map(convertArrayToTile);
}
