const axios = require('axios');
const Token = require('../../../models/admin/ZohoTokenModel');

// zoho call back
exports.zohoCallBack = async(req, res) => {
  const authorizationCode = req.query.code;
  if (!authorizationCode) {
    return res.status(400).json({ error: 'Authorization code is missing' });
  }
  console.log('Authorization Code:', authorizationCode);

  // Exchange the authorization code for an access token
  try {
    const response = await axios.post('https://accounts.zoho.in/oauth/v2/token', null, {
      params: {
        code: authorizationCode,
        client_id: '1000.2D0GSSBGVDS0V53RJPLO39ME6YZ2FG',
        client_secret: '753147cab29243d518c57a95afe031459104c3bb25',
        redirect_uri: 'https://rigsdock-backend.onrender.com/admin/invoice/zoho-callback',
        grant_type: 'authorization_code'
      }
    });
    console.log('Full Response: ', response.data);

    const accessToken = response.data.access_token;
    const refreshToken = response.data.refresh_token;
    console.log('Access Token:', accessToken);
    console.log('Refresh Token:', refreshToken);

    // Save tokens to the database
    const newToken = new Token({ 
      accessToken, 
      refreshToken,
      // Store expiry time - this is crucial for proper token management
      expiresAt: new Date(Date.now() + (response.data.expires_in * 1000))
    });
    await newToken.save();

    res.status(200).json({ message: 'Authorization successful! Tokens received.', accessToken, refreshToken });
  } catch (error) {
    console.error('Error exchanging code for tokens:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Error during authorization.', details: error.response ? error.response.data : error.message });
  }
};

const getTokens = async () => {
  const tokens = await Token.findOne().sort({ createdAt: -1 }); // Get the latest tokens
  return tokens;
};

exports.createInvoice = async (req, res) => {
  try {
    // Get the latest token
    const token = await getTokens();
    if (!token) {
      return res.status(401).json({ error: 'No tokens found' });
    }

    // Check if we need to refresh the token before making the request
    const now = new Date();
    if (token.expiresAt && now >= token.expiresAt) {
      console.log('Token expired, refreshing first...');
      await exports.refreshTokens();
      // Get the updated token after refresh
      const refreshedToken = await getTokens();
      if (!refreshedToken) {
        return res.status(401).json({ error: 'Failed to refresh token' });
      }
      token.accessToken = refreshedToken.accessToken;
    }

    // Get customer_id and line_items from request body or use defaults
    const {
      customer_id = req.body.customer_id || "1234567890",
    //   invoice_number = req.body.invoice_number || `INV-${Date.now()}`,
      line_items = req.body.line_items || [
        {
          name: 'Product A',
          quantity: 2,
          rate: 1000.0
        }
      ]
    } = req.body;

    // Prepare invoice data with minimal required fields
    const invoiceData = {
      customer_id,
    //   invoice_number,
      date: new Date().toISOString().split('T')[0], // Today's date
      line_items
    };

    console.log('Sending invoice data:', JSON.stringify(invoiceData));
    console.log('Using authorization token:', token.accessToken);

    // Make the API request to create invoice
    const response = await axios.post(
      'https://invoice.zoho.in/api/v3/invoices',
      invoiceData,
      {
        headers: {
          'X-com-zoho-invoice-organizationid': '60038864380',
          'Authorization': `Zoho-oauthtoken ${token.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(201).json({ 
      message: 'Invoice created successfully', 
      data: response.data 
    });
  } catch (error) {
    // Check if the error is due to an expired token
    if (error.response?.status === 401) {
      try {
        console.log('Access token expired. Refreshing token...');
        await exports.refreshTokens();
        
        // Get the updated token
        const refreshedToken = await getTokens();
        if (!refreshedToken) {
          return res.status(401).json({ error: 'Failed to refresh token' });
        }

        // Retry the invoice creation with the new access token
        // Use the original request body or minimal data if body is empty
        const invoiceData = req.body.customer_id ? req.body : {
          customer_id: "1234567890",
          invoice_number: `INV-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          line_items: [
            {
              name: 'Product A',
              quantity: 1,
              rate: 1000
            }
          ]
        };

        const retryResponse = await axios.post(
          'https://invoice.zoho.in/api/v3/invoices',
          invoiceData,
          {
            headers: {
              'X-com-zoho-invoice-organizationid': '60038864380',
              'Authorization': `Zoho-oauthtoken ${refreshedToken.accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        res.status(201).json({ 
          message: 'Invoice created successfully after token refresh', 
          data: retryResponse.data 
        });
      } catch (retryError) {
        console.error('Error creating invoice after token refresh:', 
          retryError.response?.data || retryError.message);
        
        res.status(500).json({ 
          error: 'Failed to create invoice after token refresh', 
          details: retryError.response?.data || retryError.message 
        });
      }
    } else {
      console.error('Error creating invoice:', 
        error.response?.data || error.message);
      
      res.status(500).json({ 
        error: 'Failed to create invoice', 
        details: error.response?.data || error.message 
      });
    }
  }
};

exports.refreshTokens = async () => {
  try {
    const tokens = await getTokens();
    if (!tokens || !tokens.refreshToken) {
      throw new Error('No refresh token found');
    }

    const response = await axios.post('https://accounts.zoho.in/oauth/v2/token', null, {
      params: {
        refresh_token: tokens.refreshToken,
        client_id: '1000.2D0GSSBGVDS0V53RJPLO39ME6YZ2FG',
        client_secret: '753147cab29243d518c57a95afe031459104c3bb25',
        grant_type: 'refresh_token'
      }
    });

    const newAccessToken = response.data.access_token;
    console.log('New Access Token:', newAccessToken);

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + (response.data.expires_in * 1000));

    // Update the access token in the database
    await Token.findOneAndUpdate(
      { _id: tokens._id }, 
      { 
        accessToken: newAccessToken,
        expiresAt: expiresAt
      }, 
      { new: true }
    );

    return true;
  } catch (error) {
    console.error('Error refreshing tokens:', error.response?.data || error.message);
    throw new Error('Failed to refresh tokens');
  }
};

// Function to request proper scopes during initial authentication
exports.initiateZohoAuth = (req, res) => {
  const clientId = '1000.2D0GSSBGVDS0V53RJPLO39ME6YZ2FG';
  const redirectUri = 'https://rigsdock-backend.onrender.com/admin/invoice/zoho-callback';
  // Request all necessary scopes for Zoho Invoice 
  const scopes = 'ZohoInvoice.invoices.CREATE,ZohoInvoice.invoices.READ,ZohoInvoice.contacts.READ,ZohoInvoice.settings.READ';
  
  const authUrl = `https://accounts.zoho.in/oauth/v2/auth?scope=${scopes}&client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&access_type=offline`;
  
  res.redirect(authUrl);
};

exports.getAllTokens = async(req, res) => {
  try {
    const tokens = await Token.find();
    res.status(200).json(tokens);
  } catch (error) {
    res.status(500).json({ 
      error: 'Error retrieving tokens', 
      details: error.message 
    });
  }
};

exports.revokeToken = async (req, res) => {
  try {
    const { refreshToken } = req.body; // Get token from request body

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    await axios.post(
      `https://accounts.zoho.in/oauth/v2/token/revoke`,
      null,
      {
        params: { token: refreshToken },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    // Also remove from database
    await Token.findOneAndDelete({ refreshToken });

    return res.status(200).json({ message: 'Token revoked successfully' });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to revoke token',
      details: error.response?.data || error.message
    });
  }
};

// Add a function to test customer list retrieval
// This can help verify if your authentication is working
exports.getCustomers = async (req, res) => {
  try {
    const token = await getTokens();
    if (!token) {
      return res.status(401).json({ error: 'No tokens found' });
    }

    // Check if token needs refreshing
    const now = new Date();
    if (token.expiresAt && now >= token.expiresAt) {
      await exports.refreshTokens();
      token.accessToken = (await getTokens()).accessToken;
    }

    const response = await axios.get(
      'https://invoice.zoho.in/api/v3/contacts',
      {
        headers: {
          'X-com-zoho-invoice-organizationid': '60038864380',
          'Authorization': `Zoho-oauthtoken ${token.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json({
      message: 'Customers retrieved successfully',
      data: response.data
    });
  } catch (error) {
    console.error('Error fetching customers:', 
      error.response?.data || error.message);
    
    res.status(500).json({
      error: 'Failed to fetch customers',
      details: error.response?.data || error.message
    });
  }
};

exports.getInvoicePDF = async (req, res) => {
  try {
    const { invoice_id } = req.params;
    if (!invoice_id) {
      return res.status(400).json({ error: 'Invoice ID is required' });
    }

    // Get the latest token
    const token = await getTokens();
    if (!token) {
      return res.status(401).json({ error: 'No tokens found' });
    }

    // Check if token needs refreshing
    const now = new Date();
    if (token.expiresAt && now >= token.expiresAt) {
      await exports.refreshTokens();
      token.accessToken = (await getTokens()).accessToken;
    }

    // Get the PDF - Use the correct API endpoint format
    const response = await axios({
      method: 'get',
      url: `https://invoice.zoho.in/api/v3/invoices/${invoice_id}?accept=pdf`,
      headers: {
        'X-com-zoho-invoice-organizationid': '60038864380',
        'Authorization': `Zoho-oauthtoken ${token.accessToken}`
      },
      responseType: 'arraybuffer'
    });

    // Check if the response is actually a PDF
    const contentType = response.headers['content-type'];
    if (contentType && contentType.includes('application/pdf')) {
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice_id}.pdf"`);
      
      // Send the PDF data
      res.send(Buffer.from(response.data));
    } else {
      // If it's not a PDF, try to decode and return any error message
      let errorMessage = 'Unknown error';
      try {
        errorMessage = JSON.parse(Buffer.from(response.data).toString());
      } catch (e) {
        errorMessage = Buffer.from(response.data).toString();
      }
      
      res.status(500).json({
        error: 'Response was not a PDF',
        details: errorMessage
      });
    }
  } catch (error) {
    console.error('Error getting invoice PDF:', error.message);
    
    // Try to parse the error data if it's a buffer
    let errorDetails = error.response?.data;
    if (errorDetails && Buffer.isBuffer(errorDetails)) {
      try {
        errorDetails = JSON.parse(Buffer.from(errorDetails).toString());
      } catch (e) {
        errorDetails = Buffer.from(errorDetails).toString();
      }
    }
    
    res.status(500).json({
      error: 'Failed to get invoice PDF',
      details: errorDetails || error.message
    });
  }
};