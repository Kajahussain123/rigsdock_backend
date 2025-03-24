const mongoose = require("mongoose");

const mainCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: ["PC Components", "PC Peripherals"],
      unique: true,
    },
    description: {
      type: String,
    },
    image: {
      type:String
    },
  },
  { timestamps: true }
);

const MainCategory = mongoose.model('MainCategory', mainCategorySchema);
module.exports = MainCategory;