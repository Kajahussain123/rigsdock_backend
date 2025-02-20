const { generateAccessToken } = require('../../utils/tokenUtils');
const jwt = require('jsonwebtoken');
const Admin = require('../../models/admin/AdminModel');

exports.refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);    
    const accessToken = generateAccessToken({ id: Admin._id, role: Admin.role });

    res.status(200).json({ accessToken });
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired refresh token.' });
  }
};
