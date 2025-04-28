const { verifyPAN, verifyBankAccount } = require('../../../utils/verificationService');

class PANVerificationController {
  async verifyPANPost(req, res) {
    try {
      // Get PAN number from request body
      const { panNumber } = req.body;
      
      if (!panNumber) {
        return res.status(400).json({
          success: false,
          message: 'PAN number is required'
        });
      }
      
      // Verify PAN number
      const verificationResult = await verifyPAN(panNumber);
      
      return res.status(verificationResult.verified ? 200 : 400).json({
        success: verificationResult.verified,
        data: verificationResult
      });
    } catch (error) {
      console.error('Error verifying PAN number:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
  
  // Handler for GET request
  async verifyPANGet(req, res) {
    try {
      // Get PAN number from query params
      const { panNumber } = req.query;
      
      if (!panNumber) {
        return res.status(400).json({
          success: false,
          message: 'PAN number is required as a query parameter'
        });
      }
      
      // Verify PAN number
      const verificationResult = await verifyPAN(panNumber);
      
      return res.status(verificationResult.verified ? 200 : 400).json({
        success: verificationResult.verified,
        data: verificationResult
      });
    } catch (error) {
      console.error('Error verifying PAN number:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

class BankAccountVerificationController {
  // Handler for POST request
  async verifyBankAccountPost(req, res) {
    try {
      // Get bank account details from request body
      const { accountNumber, ifscCode, accountName } = req.body;
      
      if (!accountNumber || !ifscCode) {
        return res.status(400).json({
          success: false,
          message: 'Account number and IFSC code are required'
        });
      }
      
      // Verify bank account
      const verificationResult = await verifyBankAccount({
        accountNumber,
        ifscCode,
        accountName
      });
      
      return res.status(verificationResult.verified ? 200 : 400).json({
        success: verificationResult.verified,
        data: verificationResult
      });
    } catch (error) {
      console.error('Error verifying bank account:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
  
  // Handler for GET request
  async verifyBankAccountGet(req, res) {
    try {
      // Get bank account details from query params
      const { accountNumber, ifscCode, accountName } = req.query;
      
      if (!accountNumber || !ifscCode) {
        return res.status(400).json({
          success: false,
          message: 'Account number and IFSC code are required as query parameters'
        });
      }
      
      // Verify bank account
      const verificationResult = await verifyBankAccount({
        accountNumber,
        ifscCode,
        accountName
      });
      
      return res.status(verificationResult.verified ? 200 : 400).json({
        success: verificationResult.verified,
        data: verificationResult
      });
    } catch (error) {
      console.error('Error verifying bank account:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = {
  panController: new PANVerificationController(),
  bankController: new BankAccountVerificationController()
};