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
  let tokens = await Token.find();
  if (tokens.length === 0) {
      return res.status(401).json({ error: 'No tokens found' });
  }

  try {
      // Attempt to create an invoice
      const response = await axios.post(
          'https://invoice.zoho.in/api/v3/invoices',
          {
            "customer_id": 982000000567001,
            "contact_persons": [
                "982000000870911",
                "982000000870915"
            ],
            "invoice_number": "INV-00003",
            "reference_number": " ",
            "place_of_supply": "TN",
            "vat_treatment": "string",
            "gst_treatment": "business_gst",
            "tax_treatment": "vat_registered",
            "cfdi_usage": "acquisition_of_merchandise",
            "gst_no": "22AAAAA0000A1Z5",
            "template_id": 982000000000143,
            "date": "2013-11-17",
            "payment_terms": 15,
            "payment_terms_label": "Net 15",
            "due_date": "2013-12-03",
            "discount": 0,
            "is_discount_before_tax": true,
            "discount_type": "item_level",
            "is_inclusive_tax": false,
            "exchange_rate": 1,
            "recurring_invoice_id": " ",
            "invoiced_estimate_id": " ",
            "salesperson_name": " ",
            "custom_fields": [
                {
                    "label": "Record Number",
                    "value": 23
                }
            ],
            "project_id": 90300000087378,
            "line_items": [
                {
                    "item_id": 982000000030049,
                    "project_id": 90300000087378,
                    "time_entry_ids": [],
                    "expense_id": " ",
                    "name": "Hard Drive",
                    "product_type": "goods",
                    "hsn_or_sac": 80540,
                    "sat_item_key_code": 71121206,
                    "unitkey_code": "E48",
                    "description": "500GB, USB 2.0 interface 1400 rpm, protective hard case.",
                    "item_order": 1,
                    "rate": 120,
                    "quantity": 1,
                    "unit": " ",
                    "discount": 0,
                    "tax_id": 982000000557028,
                    "tds_tax_id": "982000000557012",
                    "tax_exemption_id": 11149000000061054,
                    "avatax_use_code": "string",
                    "avatax_exempt_no": "string",
                    "tax_name": "VAT",
                    "tax_type": "tax",
                    "tax_percentage": 12.5,
                    "item_total": 120
                }
            ],
            "payment_options": {
                "payment_gateways": [
                    {
                        "configured": true,
                        "additional_field1": "standard",
                        "gateway_name": "paypal"
                    }
                ]
            },
            "allow_partial_payments": true,
            "custom_body": " ",
            "custom_subject": " ",
            "notes": "Looking forward for your business.",
            "terms": "Terms & Conditions apply",
            "shipping_charge": 0,
            "adjustment": 0,
            "adjustment_description": " ",
            "reason": " ",
            "tax_authority_id": 11149000000061052,
            "tax_exemption_id": 11149000000061054,
            "avatax_use_code": "string",
            "avatax_tax_code": "string",
            "avatax_exempt_no": "string"
        },
          {
            headers: {
                'X-com-zoho-invoice-organizationid': '60038864380',
                'Authorization': `Zoho-oauthtoken ${tokens[0].accessToken}`,
                'Content-Type': 'application/json'
            }
          }
      );
      res.status(201).json({ message: 'Invoice created successfully', data: response.data });
  } catch (error) {
      // Check if the error is due to an expired token
      if (error.response?.status === 401 && error.response?.data?.code === 9027) {
          console.log('Access token expired. Refreshing token...');
          await refreshTokens(); // Refresh the token
          tokens = await getTokens(); // Get the updated tokens

          // Retry the invoice creation with the new access token
          try {
              const retryResponse = await axios.post(
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
                        'X-com-zoho-invoice-organizationid': '60038864380',
                        'Authorization': `Zoho-oauthtoken ${tokens.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                  }
              );
              res.status(201).json({ message: 'Invoice created successfully', data: retryResponse.data });
          } catch (retryError) {
              console.error('Error creating invoice after token refresh:', retryError.response?.data || retryError.message);
              res.status(500).json({ error: 'Failed to create invoice after token refresh', details: retryError.response?.data || retryError.message });
          }
      } else {
          console.error('Error creating invoice:', error.response?.data || error.message);
          res.status(500).json({ error: 'Failed to create invoice', details: error.response?.data || error.message });
      }
  }
};

exports.refreshTokens = async () => {
  const tokens = await getTokens();
  if (!tokens || !tokens.refreshToken) {
      throw new Error('No refresh token found');
  }

  try {
      const response = await axios.post('https://accounts.zoho.in/oauth/v2/token', null, {
          params: {
              refresh_token: tokens.refreshToken,
              client_id: '1000.2D0GSSBGVDS0V53RJPLO39ME6YZ2FG',
              client_secret: '753147cab29243d518c57a95afe031459104c3bb25',
              redirect_uri: 'https://rigsdock-backend.onrender.com/admin/invoice/zoho-callback',
              grant_type: 'refresh_token'
          }
      });

      const newAccessToken = response.data.access_token;
      console.log('New Access Token:', newAccessToken);

      // Update the access token in the database
      await Token.findOneAndUpdate({}, { accessToken: newAccessToken }, { new: true });
  } catch (error) {
      console.error('Error refreshing tokens:', error.response?.data || error.message);
      throw new Error('Failed to refresh tokens');
  }
};

exports.getAllTokens = async(req,res) => {
    try {
        const tokens = await Token.find();
        res.status(200).json(tokens)
    } catch (error) {
        res.status(500).json({ error: 'Error during authorization.', details: error.response ? error.response.data : error.message });
    }
}