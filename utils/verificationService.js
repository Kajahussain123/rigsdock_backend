const axios = require('axios');
const FormData = require('form-data');
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
// Verify PAN number
async function verifyPAN(panNumber) {
  try {
    const accessToken = await getAccessToken();
    const response = await axios.get(
      `https://production.deepvue.tech/v1/verification/panbasic?pan_number=${panNumber}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': process.env.DEEPVUE_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    if (response.data && response.data.data) {
      const panData = response.data.data;
      // Check if all required fields are present for a valid PAN
      const hasName = panData.name || panData.full_name;
      const hasValidStatus = !panData.is_blacklisted;
      // Only verify if we have complete data
      const isValidData = hasName && hasValidStatus;
      if (isValidData) {
        return {
          verified: true,
          details: {
            name: panData.name || panData.full_name,
            panNumber: panData.pan_number || panNumber,
            category: panData.category || panData.pan_type || '',
            status: hasValidStatus ? 'Active' : 'Inactive'
          }
        };
      } else {
        return {
          verified: false,
          message: "PAN number exists but has incomplete or invalid data",
          partialData: {
            name: panData.name || panData.full_name || '',
            status: hasValidStatus ? 'Active' : 'Inactive'
          }
        };
      }
    } else {
      return {
        verified: false,
        message: response.data.message || "PAN validation failed"
      };
    }
  } catch (error) {
    return {
      verified: false,
      error: error.response?.data?.message || error.message
    };
  }
}
// Verify Bank Account - Updated to match exactly with DeepVue documentation
async function verifyBankAccount(accountDetails) {
    try {
      const { accountNumber, ifscCode, accountName } = accountDetails;
      // Validate input parameters
      if (!accountNumber || !ifscCode) {
        return {
          verified: false,
          message: "Account number and IFSC code are required"
        };
      }
      const accessToken = await getAccessToken();
      // Build URL with query parameters exactly as shown in documentation
      let url = `https://production.deepvue.tech/v1/verification/bankaccount?account_number=${accountNumber}&ifsc=${ifscCode}`;
      // Add name parameter if provided
      if (accountName) {
        url += `&name=${encodeURIComponent(accountName)}`;
      }
      console.log("Sending request to:", url);
      // Send GET request as shown in documentation (not POST)
      const response = await axios.get(
        url,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-api-key': process.env.DEEPVUE_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log("Response received:", JSON.stringify(response.data, null, 2));
      if (response.data && response.data.data) {
        const bankData = response.data.data;
        // Check if account exists and is valid
        const accountExists = bankData.account_exists === true;
        const nameMatch = !accountName ||
                          (bankData.name_match && bankData.name_match.toLowerCase() === 'yes');
        if (accountExists) {
          return {
            verified: true,
            details: {
              accountNumber: accountNumber,
              ifscCode: ifscCode,
              bankName: bankData.bank_name || '',
              branchName: bankData.branch_name || '',
              accountHolderName: bankData.account_holder_name || '',
              nameMatch: nameMatch
            }
          };
        } else {
          return {
            verified: false,
            message: "Bank account verification failed",
            partialData: {
              bankName: bankData.bank_name || '',
              branchName: bankData.branch_name || ''
            }
          };
        }
      } else {
        return {
          verified: false,
          message: response.data.message || "Bank account validation failed"
        };
      }
    } catch (error) {
      console.error("Bank verification error:", error.message);
      if (error.response) {
        console.error("Error response:", error.response.data);
      }
      return {
        verified: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
module.exports = { verifyPAN, verifyBankAccount };