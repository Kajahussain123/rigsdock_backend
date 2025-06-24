const express = require("express");
const router = express.Router();
const homeCategoryController = require("../../../controllers/Admin/HomeCategory/homeCategoryController");
const verifyToken = require("../../../middleware/jwt");
const multerConfig = require("../../../middleware/multer");

// Create a new home category
router.post("/create", 
  verifyToken(["Admin"]), 
  multerConfig.single("image"), 
  homeCategoryController.createHomeCategory
);

// Get all home categories
router.get("/", 
  verifyToken(["Admin"]), 
  homeCategoryController.getAllHomeCategories
);

// Get single home category by ID
router.get("/:id", 
  verifyToken(["Admin"]), 
  homeCategoryController.getHomeCategoryById
);

// Update home category
router.put("/:id", 
  verifyToken(["Admin"]), 
  multerConfig.single("image"), 
  homeCategoryController.updateHomeCategory
);

// Delete home category
router.delete("/:id", 
  verifyToken(["Admin"]), 
  homeCategoryController.deleteHomeCategory
);

module.exports = router;