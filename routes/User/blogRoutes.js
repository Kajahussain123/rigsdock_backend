const express = require("express");
const router = express.Router();
const blogController = require("../../controllers/Admin/Blog/blogController")

router.get("/view", blogController.getAllBlogs);
router.get("/view/:id", blogController.getBlogById);


module.exports = router;
