const Product = require("../../models/admin/ProductModel");
const Review = require("../../models/User/ReviesModel");

// Get all products
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("maincategory category subcategory brand")
      .lean(); // Convert Mongoose documents to plain objects

    if (products.length === 0) {
      return res.status(400).json({ message: "No products found" });
    }

    // Fetch ratings for all products
    const productsWithRatings = await Promise.all(
      products.map(async (product) => {
        const reviews = await Review.find({ product: product._id });

        let totalRating = 0;
        reviews.forEach((review) => {
          totalRating += review.rating;
        });

        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : 0;

        return {
          ...product,
          averageRating,
          totalReviews,
        };
      })
    );

    res.status(200).json({ message: "Products fetched successfully", products: productsWithRatings });
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error: error.message });
  }
};


exports.getProductsByCategoryHierarchy = async (req, res) => {
  try {
    const { mainCategoryId, categoryId, subCategoryId } = req.params;

    const query = {
      maincategory: mainCategoryId,
      category: categoryId
    };

    // Only include subcategory in query if it's not "null" or undefined
    if (subCategoryId && subCategoryId !== "null") {
      query.subcategory = subCategoryId;
    }

    const products = await Product.find(query)
      .populate('maincategory')
      .populate('category')
      .populate('subcategory');

    if (products.length === 0) {
      return res.status(404).json({ message: "No products found for the given category hierarchy" });
    }

    res.status(200).json({ message: "Products fetched successfully", products });
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error: error.message });
  }
};


exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the product and populate related fields
    const product = await Product.findOne({ _id: id })
      .populate("maincategory category subcategory owner offer")
      .lean(); // Convert to a plain object

    if (!product) {
      return res.status(404).json({ message: "No product found" });
    }

    // Convert attributes Map to an object
    if (product.attributes instanceof Map) {
      product.attributes = Object.fromEntries(product.attributes);
    }

    // Fetch reviews
    const reviews = await Review.find({ product: id })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    // Calculate overall rating and count of each rating (1⭐ to 5⭐)
    let totalRating = 0;
    let ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    reviews.forEach((review) => {
      totalRating += review.rating;
      ratingCounts[review.rating] = (ratingCounts[review.rating] || 0) + 1;
    });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : 0;

    res.status(200).json({
      message: "Product fetched successfully",
      product: {
        ...product,
        reviews,
        totalReviews,
        averageRating,
        ratingCounts, // Object { 1⭐: count, 2⭐: count, ..., 5⭐: count }
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching product",
      error: error.message,
    });
  }
};

exports.getSimilarProducts = async (req, res) => {
  try {
    const { id } = req.params; // ID of the current product

    // Fetch the current product to get its category, subcategory, etc.
    const currentProduct = await Product.findById(id);

    if (!currentProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Find similar products based on shared category, subcategory, or other attributes
    const similarProducts = await Product.find({
      $or: [
        { category: currentProduct.category }, // Same category
        { subcategory: currentProduct.subcategory }, // Same subcategory
        { maincategory: currentProduct.maincategory }, // Same main category
      ],
      _id: { $ne: id }, // Exclude the current product
    })
      .populate('maincategory')
      .populate('category')
      .populate('subcategory')
      .limit(10); // Limit the number of similar products returned

    if (similarProducts.length === 0) {
      return res.status(404).json({ message: "No similar products found" });
    }

    res.status(200).json({
      message: "Similar products fetched successfully",
      similarProducts,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching similar products",
      error: error.message,
    });
  }
};

exports.searchProductsByName = async (req, res) => {
  try {
    const { query } = req.params; // Get the search query from URL parameters

    // Use regex for case-insensitive partial matching
    const products = await Product.find({
      name: { $regex: query, $options: "i" } // "i" makes it case-insensitive
    })
      .populate("maincategory category subcategory");

    if (products.length === 0) {
      return res.status(404).json({ message: "No products found for the given search term" });
    }

    res.status(200).json({ message: "Products fetched successfully", products });
  } catch (error) {
    res.status(500).json({ message: "Error searching for products", error: error.message });
  }
};

exports.getProductByCategory = async(req,res) => {
  try {
    const { categoryId } = req.params;
    console.log(categoryId);
    const product = await Product.find({ category: categoryId });
    console.log(product)
    if(product.length === 0) {
      return res.status(404).json({ message: "no product founded" })
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error: error.message });
  }
}