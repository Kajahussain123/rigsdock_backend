const Blog = require("../../../models/admin/blogModel");

const createBlog = async (req, res) => {
  try {
    const { image, title, description, ownerrole, ownerId, status } = req.body;

    if (!image || !description || !ownerrole || !ownerId) {
      return res.status(400).json({
        success: false,
        message: "Image, description, owner role, and owner ID are required",
      });
    }

    const newBlog = new Blog({
      image,
      title,
      description,
      ownerrole,
      ownerId,
      status: status || "active",
    });

    const savedBlog = await newBlog.save();

    res.status(201).json({
      success: true,
      message: "Blog created successfully",
      data: savedBlog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating blog",
      error: error.message,
    });
  }
};


const getAllBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, ownerrole, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (ownerrole) filter.ownerrole = ownerrole;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const blogs = await Blog.find(filter)
      .populate("ownerId")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Blog.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Blogs retrieved successfully",
      data: blogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalBlogs: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving blogs",
      error: error.message,
    });
  }
};

const getBlogById = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id).populate("ownerId");

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Blog retrieved successfully",
      data: blog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving blog",
      error: error.message,
    });
  }
};

// Update blog
const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const updatedBlog = await Blog.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate("ownerId");

    if (!updatedBlog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: updatedBlog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating blog",
      error: error.message,
    });
  }
};

const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedBlog = await Blog.findByIdAndDelete(id);

    if (!deletedBlog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
      data: deletedBlog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting blog",
      error: error.message,
    });
  }
};


module.exports = {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
};