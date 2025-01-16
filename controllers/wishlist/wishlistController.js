// controllers/User/wishlistController.js
const Wishlist = require('../../models/wishlist/wishlistModel');
const Product = require('../../models/Products/productModel');

const wishlistController = {
  // Get wishlist items
  getWishlist: async (req, res) => {
    try {
      const { userId } = req.params;
      
      let wishlist = await Wishlist.findOne({ userId })
        .populate({
          path: 'products',
          match: { isDeleted: false, isBlocked: false }, // Only get active products
          populate: [
            { path: 'variants' },
            { path: 'offer' }
          ]
        });

      if (!wishlist) {
        wishlist = await Wishlist.create({ userId, products: [] });
      }

      // Filter out any null products (products that didn't match our criteria)
      const activeProducts = wishlist.products.filter(product => product != null);
      
      res.status(200).json(activeProducts);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      res.status(500).json({ message: 'Failed to fetch wishlist' });
    }
  },

  // Add to wishlist
  addToWishlist: async (req, res) => {
    try {
      const { userId, productId } = req.body;

      if (!userId || !productId) {
        return res.status(400).json({ 
          message: 'Both userId and productId are required' 
        });
      }

      // Check if product exists
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ 
          message: 'Product not found' 
        });
      }

      // Find or create wishlist
      let wishlist = await Wishlist.findOne({ userId });
      
      if (!wishlist) {
        wishlist = new Wishlist({ 
          userId, 
          products: [productId] 
        });
      } else if (!wishlist.products.includes(productId)) {
        wishlist.products.push(productId);
      }

      await wishlist.save();

      // Populate the product details
      const populatedWishlist = await Wishlist.findById(wishlist._id)
        .populate({
          path: 'products',
          match: { isDeleted: false, isBlocked: false },
          populate: [
            { path: 'variants' },
            { path: 'offer' }
          ]
        });

      res.status(200).json({
        message: 'Product added to wishlist',
        products: populatedWishlist.products.filter(product => product != null)
      });
    } catch (error) {
      console.error('Error in addToWishlist:', error);
      res.status(500).json({ 
        message: 'Internal server error',
        error: error.message 
      });
    }
  },
  // Remove from wishlist
  removeFromWishlist: async (req, res) => {
    try {
      const { productId } = req.params;
      const { userId } = req.body;

      const wishlist = await Wishlist.findOne({ userId });
      
      if (!wishlist) {
        return res.status(404).json({ message: 'Wishlist not found' });
      }

      wishlist.products = wishlist.products.filter(
        product => product.toString() !== productId
      );
      
      await wishlist.save();

      res.status(200).json({
        message: 'Product removed from wishlist',
        productId
      });
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      res.status(500).json({ message: 'Failed to remove product from wishlist' });
    }
  }
};

module.exports = wishlistController;