const { verifyGST } = require('../../../utils/GSTVerify');
class GstVerificationController {
  // Handler for POST request
  async verifyGSTPost(req, res) {
    try {
      // Get GST number from request body
      const { gstNumber } = req.body;
      if (!gstNumber) {
        return res.status(400).json({
          success: false,
          message: 'GST number is required'
        });
      }
      // Verify GST number
      const verificationResult = await verifyGST(gstNumber);
      return res.status(verificationResult.verified ? 200 : 400).json({
        success: verificationResult.verified,
        data: verificationResult
      });
    } catch (error) {
      console.error('Error verifying GST number:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
  // Handler for GET request
  async verifyGSTGet(req, res) {
    try {
      // Get GST number from query params
      const { gstNumber } = req.query;
      if (!gstNumber) {
        return res.status(400).json({
          success: false,
          message: 'GST number is required as a query parameter'
        });
      }
      // Verify GST number
      const verificationResult = await verifyGST(gstNumber);
      return res.status(verificationResult.verified ? 200 : 400).json({
        success: verificationResult.verified,
        data: verificationResult
      });
    } catch (error) {
      console.error('Error verifying GST number:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}
module.exports = new GstVerificationController();