/**
 * CoinMarketCap API proxy
 * Routes CoinMarketCap API requests through the server to keep API key secure
 */

import { Request, Response } from "express";

const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;
const COINMARKETCAP_BASE_URL = "https://pro-api.coinmarketcap.com/v1";

export async function getGlobalMetrics(req: Request, res: Response) {
  if (!COINMARKETCAP_API_KEY) {
    console.error("[CoinMarketCap] API key not found in environment variables");
    return res.status(500).json({ error: "CoinMarketCap API key not configured" });
  }

  console.log(`[CoinMarketCap] Fetching global metrics, API key present: ${COINMARKETCAP_API_KEY ? 'YES' : 'NO'}`);

  try {
    const url = `${COINMARKETCAP_BASE_URL}/global-metrics/quotes/latest`;
    console.log(`[CoinMarketCap] Requesting: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY,
        "Accept": "application/json",
      },
    });

    console.log(`[CoinMarketCap] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[CoinMarketCap] API error response:", errorText);
      throw new Error(`CoinMarketCap API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Always log the response for debugging
    console.log("[CoinMarketCap] Response status code:", data.status?.error_code || 0);
    if (data.status?.error_code && data.status.error_code !== 0) {
      console.error("[CoinMarketCap] API error:", JSON.stringify(data.status, null, 2));
      console.error("[CoinMarketCap] Full response:", JSON.stringify(data, null, 2));
      return res.status(400).json({ 
        error: data.status.error_message || "CoinMarketCap API error",
        status: data.status 
      });
    }
    
    console.log("[CoinMarketCap] Global metrics fetched successfully");
    res.json(data);
  } catch (error: any) {
    console.error("[CoinMarketCap] Error fetching global metrics:", error);
    res.status(500).json({ error: error.message || "Failed to fetch global metrics" });
  }
}

export async function getFearAndGreedIndex(req: Request, res: Response) {
  if (!COINMARKETCAP_API_KEY) {
    console.error("[CoinMarketCap] API key not found in environment variables");
    return res.status(500).json({ error: "CoinMarketCap API key not configured" });
  }

  console.log(`[CoinMarketCap] Fetching Fear & Greed Index, API key present: ${COINMARKETCAP_API_KEY ? 'YES' : 'NO'}`);

  try {
    // CoinMarketCap API v3 endpoint for Fear & Greed Index
    // Endpoint: /v3/fear-and-greed/latest
    // Note: v3 uses a different base URL structure
    const url = "https://pro-api.coinmarketcap.com/v3/fear-and-greed/latest";
    console.log(`[CoinMarketCap] Requesting: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY,
        "Accept": "application/json",
      },
    });

    console.log(`[CoinMarketCap] Response status: ${response.status} ${response.statusText}`);

    // Get response text first to check if it's JSON
    const responseText = await response.text();
    
    // Check if response is HTML (error page)
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      console.error("[CoinMarketCap] API returned HTML instead of JSON:", responseText.substring(0, 500));
      return res.status(400).json({ 
        error: "CoinMarketCap API returned HTML error page. The v3/fear-and-greed endpoint may not be available with your API plan. Falling back to alternative.me API."
      });
    }

    if (!response.ok) {
      console.error("[CoinMarketCap] API error response:", responseText);
      throw new Error(`CoinMarketCap API error: ${response.status} ${response.statusText}`);
    }

    // Parse JSON response
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("[CoinMarketCap] Failed to parse JSON response:", responseText.substring(0, 500));
      throw new Error(`Invalid JSON response from CoinMarketCap API`);
    }
    
    // Log the response structure for debugging
    console.log("[CoinMarketCap] Response structure:", JSON.stringify(data, null, 2));
    console.log("[CoinMarketCap] Response status code:", data.status?.error_code || 0);
    
    if (data.status?.error_code && data.status.error_code !== 0) {
      console.error("[CoinMarketCap] API error:", JSON.stringify(data.status, null, 2));
      return res.status(400).json({ 
        error: data.status.error_message || "CoinMarketCap API error",
        status: data.status 
      });
    }
    
    console.log("[CoinMarketCap] Fear & Greed Index fetched successfully");
    res.json(data);
  } catch (error: any) {
    console.error("[CoinMarketCap] Error fetching Fear & Greed Index:", error);
    res.status(500).json({ error: error.message || "Failed to fetch Fear & Greed Index" });
  }
}

export async function getCryptoQuotes(req: Request, res: Response) {
  const { symbol } = req.query;
  if (!symbol || typeof symbol !== "string") {
    return res.status(400).json({ error: "Symbol parameter required" });
  }

  // Log API key status (without exposing the actual key)
  if (!COINMARKETCAP_API_KEY) {
    console.error("[CoinMarketCap] API key not found in environment variables");
    return res.status(500).json({ error: "CoinMarketCap API key not configured" });
  }
  
  console.log(`[CoinMarketCap] Fetching quotes for ${symbol}, API key present: ${COINMARKETCAP_API_KEY ? 'YES' : 'NO'}`);

  try {
    // According to CoinMarketCap API docs: https://coinmarketcap.com/api/documentation/v1/#
    // Endpoint: /v1/cryptocurrency/quotes/latest
    // Parameters: symbol (required) - one or more comma-separated cryptocurrency symbols
    // convert parameter specifies the currency to convert to (default is USD)
    const url = `${COINMARKETCAP_BASE_URL}/cryptocurrency/quotes/latest?symbol=${symbol.toUpperCase()}&convert=USD`;
    console.log(`[CoinMarketCap] Requesting: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY,
        "Accept": "application/json",
      },
    });

    console.log(`[CoinMarketCap] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[CoinMarketCap] API error response:", errorText);
      throw new Error(`CoinMarketCap API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Always log the response for debugging
    console.log("[CoinMarketCap] Response status code:", data.status?.error_code || 0);
    if (data.status?.error_code && data.status.error_code !== 0) {
      console.error("[CoinMarketCap] API error:", JSON.stringify(data.status, null, 2));
      console.error("[CoinMarketCap] Full response:", JSON.stringify(data, null, 2));
      return res.status(400).json({ 
        error: data.status.error_message || "CoinMarketCap API error",
        status: data.status 
      });
    }
    
    // Log the response structure for debugging
    console.log("[CoinMarketCap] Success! Response keys:", Object.keys(data));
    if (data.data) {
      console.log("[CoinMarketCap] Data keys:", Object.keys(data.data));
    }
    
    res.json(data);
  } catch (error: any) {
    console.error("[CoinMarketCap] Error fetching crypto quotes:", error);
    res.status(500).json({ error: error.message || "Failed to fetch crypto quotes" });
  }
}

