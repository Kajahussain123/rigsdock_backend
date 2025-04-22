const axios = require('axios');
const FormData = require('form-data');
// Get access token from DeepVue API
async function getAccessToken() {
  try {
    const formData = new FormData();
    formData.append("client_id", process.env.DEEPVUE_CLIENT_ID);
    formData.append("client_secret", process.env.DEEPVUE_CLIENT_SECRET);
    const response = await axios.post(
      "https://production.deepvue.tech/v1/authorize",
      formData,
      { headers: { ...formData.getHeaders() } }
    );
    if (response.data && response.data.access_token) {
      return response.data.access_token;
    } else {
      throw new Error("No access token returned");
    }
  } catch (error) {
    console.error("Access token error:", error.message);
    throw new Error("Unable to get access token");
  }
}
// Verify GST number
async function verifyGST(gstNumber) {
  try {
    const accessToken = await getAccessToken();
    const response = await axios.get(
      `https://production.deepvue.tech/v1/verification/gstinlite?gstin_number=${gstNumber}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': process.env.DEEPVUE_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    if (response.data && response.data.data) {
      const gstData = response.data.data;
      // Check if all required fields are present for a valid GST
      const hasAddress = gstData.pradr?.addr || gstData.address;
      const hasLegalName = gstData.lgnm || gstData.legal_name;
      const hasValidStatus = gstData.sts === 'Active' || gstData.status === 'Active';
      // Only verify if we have complete data with a valid address
      const isValidData = hasAddress && hasLegalName && hasValidStatus;
      // Check if address has meaningful content
      const addressFields = ['bno', 'st', 'city', 'stcd', 'pncd'].some(field =>
        gstData.pradr?.addr?.[field]) ||
        ['building', 'street', 'city', 'state_code', 'pincode'].some(field =>
          gstData.address?.[field]);
      if (isValidData && addressFields) {
        return {
          verified: true,
          details: {
            legalName: gstData.lgnm || gstData.legal_name,
            tradeName: gstData.tradeNam || gstData.trade_name,
            status: gstData.sts || gstData.status,
            address: {
              building: gstData.pradr?.addr?.bno || gstData.address?.building || '',
              street: gstData.pradr?.addr?.st || gstData.address?.street || '',
              city: gstData.pradr?.addr?.city || gstData.address?.city || '',
              state: gstData.pradr?.addr?.stcd || gstData.address?.state_code || '',
              pincode: gstData.pradr?.addr?.pncd || gstData.address?.pincode || ''
            }
          }
        };
      } else {
        return {
          verified: false,
          message: "GST number exists but has incomplete or invalid data",
          partialData: {
            legalName: gstData.lgnm || gstData.legal_name,
            status: gstData.sts || gstData.status
          }
        };
      }
    } else {
      return {
        verified: false,
        message: response.data.message || "GST validation failed"
      };
    }
  } catch (error) {
    return {
      verified: false,
      error: error.response?.data?.message || error.message
    };
  }
}
module.exports = { verifyGST };