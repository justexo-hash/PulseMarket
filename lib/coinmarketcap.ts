const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;
const COINMARKETCAP_BASE_URL = "https://pro-api.coinmarketcap.com/v1";

function ensureApiKey() {
  if (!COINMARKETCAP_API_KEY) {
    throw new Error("CoinMarketCap API key not configured");
  }
}

async function fetchJson(url: string) {
  ensureApiKey();

  const response = await fetch(url, {
    headers: {
      "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY!,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `CoinMarketCap API error: ${response.status} ${response.statusText} :: ${errorText}`
    );
  }

  const data = await response.json();
  if (data?.status?.error_code && data.status.error_code !== 0) {
    throw new Error(
      data.status.error_message || "CoinMarketCap API returned an error"
    );
  }

  return data;
}

export async function fetchGlobalMetrics() {
  const url = `${COINMARKETCAP_BASE_URL}/global-metrics/quotes/latest`;
  return fetchJson(url);
}

export async function fetchCryptoQuotes(symbol: string) {
  if (!symbol) {
    throw new Error("Symbol parameter required");
  }
  const url = `${COINMARKETCAP_BASE_URL}/cryptocurrency/quotes/latest?symbol=${symbol.toUpperCase()}&convert=USD`;
  return fetchJson(url);
}

export async function fetchFearAndGreed() {
  ensureApiKey();
  const url = "https://pro-api.coinmarketcap.com/v3/fear-and-greed/latest";
  const response = await fetch(url, {
    headers: {
      "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY!,
      Accept: "application/json",
    },
  });

  const text = await response.text();

  if (text.trim().startsWith("<")) {
    throw new Error(
      "CoinMarketCap API returned HTML response. Endpoint may not be available for this plan."
    );
  }

  if (!response.ok) {
    throw new Error(
      `CoinMarketCap API error: ${response.status} ${response.statusText} :: ${text}`
    );
  }

  const data = JSON.parse(text);
  if (data?.status?.error_code && data.status.error_code !== 0) {
    throw new Error(
      data.status.error_message || "CoinMarketCap API returned an error"
    );
  }

  return data;
}

