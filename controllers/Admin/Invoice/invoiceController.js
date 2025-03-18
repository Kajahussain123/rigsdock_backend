const axios = require('axios');
const Token = require('../../../models/admin/ZohoTokenModel');

// zoho call back
exports.zohoCallBack = async(req,res) => {
  const authorizationCode = req.query.code;
  if (!authorizationCode) {
    return res.status(400).json({ error: 'Authorization code is missing' });
  }
  console.log('Authorization Code:', authorizationCode);

  // Exchange the authorization code for an access token
  try {
    const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
            params: {
                code: authorizationCode,
                client_id: '1000.2D0GSSBGVDS0V53RJPLO39ME6YZ2FG',
                client_secret: '753147cab29243d518c57a95afe031459104c3bb25',
                redirect_uri: 'https://rigsdock-backend.onrender.com/admin/invoice/zoho-callback',
                grant_type: 'authorization_code'
            }
        });
        console.log('Response :', response.data);


        const accessToken = response.data.access_token;
        const refreshToken = response.data.refresh_token;
        console.log('Access Token:', accessToken);
        console.log('Refresh Token:', refreshToken);

        // Save tokens to the database
        const newToken = new Token({ accessToken, refreshToken });
        await newToken.save();

        res.status(200).json({ message: 'Authorization successful! Tokens received.', accessToken, refreshToken });
  } catch (error) {
    console.error('Error exchanging code for tokens:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Error during authorization.', details: error.response ? error.response.data : error.message });
  }
}

const getTokens = async () => {
    const tokens = await Token.findOne().sort({ createdAt: -1 }); // Get the latest tokens
    return tokens;
};

exports.createInvoice = async (req, res) => {
  let tokens = await getTokens();
  if (!tokens) {
      return res.status(401).json({ error: 'No tokens found' });
  }

  try {
      // Attempt to create an invoice
      const response = await axios.post(
          'https://invoice.zoho.com/api/v3/invoices',
          {
              customer_id: '123456789',
              line_items: [
                  {
                      name: 'Product Name',
                      quantity: 1,
                      rate: 100
                  }
              ]
          },
          {
              headers: {
                  Authorization: `Zoho-oauthtoken ${tokens.accessToken}`,
                  'Content-Type': 'application/json'
              }
          }
      );
      res.status(201).json({ message: 'Invoice created successfully', data: response.data });
  } catch (error) {
      // // Check if the error is due to an expired token
      // if (error.response?.status === 401 && error.response?.data?.code === 9027) {
      //     console.log('Access token expired. Refreshing token...');
      //     await refreshTokens(); // Refresh the token
      //     tokens = await getTokens(); // Get the updated tokens

      //     // Retry the invoice creation with the new access token
      //     try {
      //         const retryResponse = await axios.post(
      //             'https://invoice.zoho.com/api/v3/invoices',
      //             {
      //                 customer_id: '123456789',
      //                 line_items: [
      //                     {
      //                         name: 'Product Name',
      //                         quantity: 1,
      //                         rate: 100
      //                     }
      //                 ]
      //             },
      //             {
      //                 headers: {
      //                     Authorization: `Zoho-oauthtoken ${tokens.accessToken}`,
      //                     'Content-Type': 'application/json'
      //                 }
      //             }
      //         );
      //         res.status(201).json({ message: 'Invoice created successfully', data: retryResponse.data });
      //     } catch (retryError) {
      //         console.error('Error creating invoice after token refresh:', retryError.response?.data || retryError.message);
      //         res.status(500).json({ error: 'Failed to create invoice after token refresh', details: retryError.response?.data || retryError.message });
      //     }
      // } else {
      //     console.error('Error creating invoice:', error.response?.data || error.message);
      //     res.status(500).json({ error: 'Failed to create invoice', details: error.response?.data || error.message });
      // }
  }
};

// const refreshTokens = async () => {
//   const tokens = await getTokens();
//   if (!tokens || !tokens.refreshToken) {
//       throw new Error('No refresh token found');
//   }

//   try {
//       const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
//           params: {
//               refresh_token: tokens.refreshToken,
//               client_id: '1000.JJ6C0VUUDXGCEIWXCDCLNT89Q12CBW',
//               client_secret: 'af174ae905352501ef89ad254f4a0e1744010bafcf',
//               grant_type: 'refresh_token'
//           }
//       });

//       const newAccessToken = response.data.access_token;
//       console.log('New Access Token:', newAccessToken);

//       // Update the access token in the database
//       await Token.findOneAndUpdate({}, { accessToken: newAccessToken }, { new: true });
//   } catch (error) {
//       console.error('Error refreshing tokens:', error.response?.data || error.message);
//       throw new Error('Failed to refresh tokens');
//   }
// };