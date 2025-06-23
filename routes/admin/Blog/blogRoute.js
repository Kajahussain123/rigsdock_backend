const express = require("express");
const router = express.Router();
const blogController = require("../../../controllers/Admin/Blog/blogController")
const verifyToken = require("../../../middleware/jwt");
const multerConfig = require("../../../middleware/multer");



router.post("/create", verifyToken(["Admin"]), multerConfig.single("image"), blogController.createBlog);

router.get("/view", blogController.getAllBlogs);

router.get("/view/:id", blogController.getBlogById);

router.patch("/update/:id", verifyToken(["Admin"]), multerConfig.single("image"), blogController.updateBlog);

router.delete("/delete/:id", verifyToken(["Admin"]), blogController.deleteBlog);

module.exports = router;