const express = require("express") 
const router = express.Router();
const { cancelOrder } = require("../../controllers/User/ordercancelController");

// cancel route
router.patch("/cancel/:orderId", cancelOrder);

module.exports = router;
