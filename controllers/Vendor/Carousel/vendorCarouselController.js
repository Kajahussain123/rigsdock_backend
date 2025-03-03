const Carousel = require("../../../models/admin/carouselModel");
const fs = require("fs");
const path = require("path");

// Create a carousel item
exports.createCarousel = async (req, res) => {
  const { title, link } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: "Carousel image is required" });
  }
  if (!link) {
    return res.status(400).json({ message: "Carousel link is required" });
  }

  try { 
    const newCarousel = new Carousel({
      image: req.file.filename,
      title,
      link,
      ownerrole: req.user.role,
      ownerId: req.user.id
    });

    await newCarousel.save();
    res.status(201).json({ message: "Carousel added successfully", carousel: newCarousel });
  } catch (err) {
    res.status(500).json({ message: "Error adding carousel", error: err.message });
  }
};

// Get all active carousel items (Sorted by `createdAt` automatically)
exports.getCarousel = async (req, res) => {
  try {
    const carousel = await Carousel.find({ownerId: req.user.id}).populate('ownerId').sort({ createdAt: -1 }); // Newest first
    res.status(200).json(carousel);
  } catch (err) {
    res.status(500).json({ message: "Error fetching carousel", error: err.message });
  }
};

// Update carousel item
exports.updateCarousel = async (req, res) => {
  const { id } = req.params;
  const { title, link, status } = req.body;

  try {
    const carousel = await Carousel.findById(id);
    if (!carousel) {
      return res.status(404).json({ message: "Carousel item not found" });
    }

    if (title) carousel.title = title;
    if (link) carousel.link = link;
    if (status) carousel.status = status;

    // Update image if provided
    if (req.file) {
      const oldImagePath = path.join(__dirname, `../uploads/${carousel.image}`);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
      carousel.image = req.file.filename;
    }

    await carousel.save();
    res.status(200).json({ message: "Carousel updated successfully", carousel });
  } catch (err) {
    res.status(500).json({ message: "Error updating carousel", error: err.message });
  }
};

// Delete carousel item
exports.deleteCarousel = async (req, res) => {
  try {
    const carousel = await Carousel.findById(req.params.id);
    if (!carousel) {
      return res.status(404).json({ message: "Carousel item not found" });
    }

    const imagePath = `./uploads/${carousel.image}`;
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    await Carousel.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Carousel deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting carousel", error: err.message });
  }
};
