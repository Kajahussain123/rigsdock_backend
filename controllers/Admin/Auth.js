const Admin = require('../../models/admin/AdminModel');
const { generateAccessToken, generateRefreshToken } = require('../../utils/tokenUtils');
const bcrypt = require('bcrypt');

exports.registerAdmin = async (req, res) => {
    const { email, password } = req.body;
    try {
      const existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
        return res.status(409).json({ message: 'Admin already exists' });
      }
    //   const hashedPassword = await bcrypt.hash(password, 10);
      const newAdmin = new Admin({ email, password });
      await newAdmin.save();
      res.status(201).json({ message: 'Admin registered successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const existingAdmin = await Admin.findOne({ email });
        if (!existingAdmin) {
            return res.status(401).json({ message: "Invalid email or password" });
        }
        const isPasswordValid = await bcrypt.compare(password, existingAdmin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const payload = { id: existingAdmin._id, role: existingAdmin.role };
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        return res.status(200).json({
            message: "Admin logged in successfully.",
            admin: {
                email: existingAdmin.email,
                id: existingAdmin._id,
                role: existingAdmin.role
            },
            accessToken,
            refreshToken
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
