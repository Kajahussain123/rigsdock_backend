require("dotenv").config();
const axios = require("axios");
const qs = require("qs");

// Debugging: Verify environment variables
console.log("Environment Variables Loaded:", {
  ZOHO_CLIENT_ID: process.env.ZOHO_CLIENT_ID ? "✅" : "❌",
  ZOHO_ORG_ID: process.env.ZOHO_ORGANIZATION_ID ? "✅" : "❌",
  ZOHO_API_BASE: process.env.ZOHO_API_BASE_URL ? "✅" : "❌"
});

// Configuration
const ZOHO_API_BASE_URL = process.env.ZOHO_API_BASE_URL || "https://www.zohoapis.in/books/v3";
const ZOHO_ORG_ID = process.env.ZOHO_ORGANIZATION_ID;
const ZOHO_TOKEN_URL = "https://accounts.zoho.in/oauth/v2/token";

// Token caching with expiration
let tokenCache = {
  token: null,
  expiresAt: null,
  refreshInProgress: false
};

const getZohoAccessToken = async () => {
  // Return cached token if valid
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) {
    console.log("♻️ Using cached Zoho token");
    return tokenCache.token;
  }

  // Prevent concurrent refresh requests
  if (tokenCache.refreshInProgress) {
    console.log("⏳ Waiting for token refresh...");
    await new Promise(resolve => setTimeout(resolve, 1000));
    return getZohoAccessToken();
  }

  try {
    tokenCache.refreshInProgress = true;
    console.log("🔐 Refreshing Zoho access token...");

    // Validate environment variables
    const requiredVars = {
      ZOHO_CLIENT_ID: process.env.ZOHO_CLIENT_ID,
      ZOHO_CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET,
      ZOHO_REFRESH_TOKEN: process.env.ZOHO_REFRESH_TOKEN
    };

    for (const [key, value] of Object.entries(requiredVars)) {
      if (!value) throw new Error(`Missing environment variable: ${key}`);
    }

    const response = await axios.post(ZOHO_TOKEN_URL, qs.stringify({
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      refresh_token: process.env.ZOHO_REFRESH_TOKEN,
      grant_type: "refresh_token"
    }), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      timeout: 10000
    });

    if (!response.data.access_token) {
      throw new Error("No access token in response");
    }

    // Cache token with safety margin (55 minutes instead of 1 hour)
    tokenCache = {
      token: response.data.access_token,
      expiresAt: Date.now() + (response.data.expires_in_sec || 3300) * 900,
      refreshInProgress: false
    };

    console.log("✅ New Zoho token cached. Expires:", new Date(tokenCache.expiresAt).toISOString());
    return tokenCache.token;
  } catch (error) {
    tokenCache.refreshInProgress = false;
    console.error("❌ Token refresh failed:", {
      status: error.response?.status,
      code: error.response?.data?.code,
      message: error.response?.data?.message
    });
    throw new Error(`Zoho auth failed: ${error.response?.data?.error || error.message}`);
  }
};

// Enhanced API Request Handler
const zohoApiRequest = async (method, endpoint, data = null) => {
  try {
    const accessToken = await getZohoAccessToken();
    const url = `${ZOHO_API_BASE_URL}/${endpoint}?organization_id=${ZOHO_ORG_ID}`;

    const config = {
      method,
      url,
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json"
      },
      timeout: 15000
    };

    if (data) config.data = data;

    console.log(`🚀 Zoho API Request: ${method} ${endpoint}`);
    const response = await axios(config);
    return response.data;
  } catch (error) {
    const errorDetails = {
      status: error.response?.status,
      code: error.response?.data?.code,
      message: error.response?.data?.message,
      details: error.response?.data?.details,
      endpoint: `${method} ${endpoint}`
    };

    console.error("❌ Zoho API Error:", errorDetails);
    
    // Handle token expiration
    if (error.response?.status === 401 && error.response?.data?.code === 57) {
      console.log("🔄 Attempting token reset after 401 error");
      tokenCache = { token: null, expiresAt: null, refreshInProgress: false };
    }

    throw new Error(`Zoho API failed: ${errorDetails.message}`);
  }
};

// Service Methods
exports.createInvoice = async (invoiceData) => {
  return zohoApiRequest("POST", "invoices", invoiceData);
};

exports.createCustomer = async (customerData) => {
  return zohoApiRequest("POST", "contacts", customerData)
    .then(response => response.contact);
};

// Add a new method to search for existing products
exports.searchProductInZoho = async (product) => {
  try {
    // Search by SKU first
    const skuSearchResponse = await zohoApiRequest("GET", "items", {
      params: { sku: product.sku || `SKU-${product._id}` }
    });

    if (skuSearchResponse.items && skuSearchResponse.items.length > 0) {
      return skuSearchResponse.items[0];
    }

    // If SKU search fails, try searching by name
    const nameSearchResponse = await zohoApiRequest("GET", "items", {
      params: { name: product.name }
    });

    if (nameSearchResponse.items && nameSearchResponse.items.length > 0) {
      return nameSearchResponse.items[0];
    }

    return null;
  } catch (error) {
    console.error("Product search error:", error);
    return null;
  }
};

// Modify the product creation method
exports.createProductInZoho = async (product) => {
  try {
    // First, check if the product already exists
    const existingProduct = await exports.searchProductInZoho(product);
    if (existingProduct) {
      return existingProduct;
    }

    // If product doesn't exist, create it
    const productData = {
      name: `${product.name} (${Date.now()})`,
      rate: product.rate || product.price || 0,
      // description: product.description || "",
      sku: product.sku || `SKU-${product._id}-${Date.now()}`,
      unit: "pcs",
      status: "active"
    };

    return await zohoApiRequest("POST", "items", productData)
      .then(response => response.item);
  } catch (error) {
    // If creation fails, try one more time with a more unique identifier
    if (error.message.includes("already exists")) {
      try {
        const fallbackProductData = {
          name: `${product.name} (Variant-${Date.now()})`,
          rate: product.rate || product.price || 0,
          description: product.description || "",
          sku: `${product.sku || `SKU-${product._id}`}-VARIANT-${Date.now()}`,
          unit: "pcs",
          status: "active"
        };

        return await zohoApiRequest("POST", "items", fallbackProductData)
          .then(response => response.item);
      } catch (retryError) {
        console.error("Product creation failed:", retryError);
        throw retryError;
      }
    }
    throw error;
  }
};

exports.searchCustomerInZoho = async (email) => {
  try {
    const response = await zohoApiRequest("GET", "contacts", {
      params: { email_contains: email }
    });

    return response.contacts.find(c => c.email === email) || null;
  } catch (error) {
    console.error("Customer search error:", error);
    return null;
  }
};