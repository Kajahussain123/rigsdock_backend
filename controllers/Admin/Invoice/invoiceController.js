// zoho call back
exports.zohoCallBack = async(req,res) => {
  const authorizationCode = req.query.code;
  console.log('Authorization Code:', authorizationCode);

  // Exchange the authorization code for an access token
  try {
    const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
            params: {
                code: authorizationCode,
                client_id: '1000.JJ6C0VUUDXGCEIWXCDCLNT89Q12CBW',
                client_secret: 'af174ae905352501ef89ad254f4a0e1744010bafcf',
                redirect_uri: 'https://rigsdock-backend.onrender.com/zoho-callback',
                grant_type: 'authorization_code'
            }
        });

        const accessToken = response.data.access_token;
        const refreshToken = response.data.refresh_token;
        console.log('Access Token:', accessToken);
        console.log('Refresh Token:', refreshToken);

        // Save the tokens securely (e.g., in a database)
        res.send('Authorization successful! Tokens received.');
  } catch (error) {
        console.error('Error exchanging code for tokens:', error.response.data);
        res.status(500).send('Error during authorization.');
  }
}