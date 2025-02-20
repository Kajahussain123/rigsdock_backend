const jwt = require('jsonwebtoken');

const verifyAdminToken = (allowedRoles = []) => {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(403).json({ message: "Access denied. No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

        if (allowedRoles.length && !allowedRoles.includes(decodedToken.role)) {
            return res.status(401).json({ message: "Unauthorized. Access denied." });
        }

        req.user = decodedToken;
        next();

    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token." });
    }
  };
};

module.exports = verifyAdminToken;
