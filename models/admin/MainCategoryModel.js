const mongoose = require("mongoose");

const mainCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: ["PC Components", "PC Peripherals"], // Fixed main categories
      unique: true,
    },
    description: {
      type: String,
    },
  },
  { timestamps: true }
);

const MainCategory = mongoose.model('MainCategory', mainCategorySchema);
module.exports = MainCategory;