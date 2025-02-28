const express = require("express");
const { addToWishlist, removeFromWishlist, getWishlist } = require("../../controllers/User/WishlistController");

const router = express.Router();

router.post("/add", addToWishlist);
router.post("/remove", removeFromWishlist);
router.get("/:userId", getWishlist);

module.exports = router;
