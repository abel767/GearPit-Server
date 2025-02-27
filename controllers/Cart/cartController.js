const Cart = require('../../models/ShoppingCart/cartModel')
const Product = require('../../models/Products/productModel')

const addToCart = async (req, res) => {
    try {
      const { userId, productId, variantId, quantity } = req.body;
  
      // Check if product and variant exist
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
  
      const variant = product.variants.id(variantId);
      if (!variant) {
        return res.status(404).json({ message: 'Variant not found' });
      }
  
      // Check stock
      if (variant.stock < quantity) {
        return res.status(400).json({ message: 'Not enough stock available' });
      }
  
      // Find or create cart
      let cart = await Cart.findOne({ userId });
      if (!cart) {
        cart = new Cart({ userId, items: [] });
      }
  
      // Check if item already exists in cart
      const existingItemIndex = cart.items.findIndex(
        item => item.productId.toString() === productId && item.variantId.toString() === variantId
      );
  
      if (existingItemIndex > -1) {
        // Update quantity if item exists
        cart.items[existingItemIndex].quantity += quantity;
      } else {
        // Add new item if it doesn't exist
        cart.items.push({ productId, variantId, quantity });
      }
  
      await cart.save();
  
      // Populate cart items with product details
      const populatedCart = await Cart.findById(cart._id)
        .populate({
          path: 'items.productId',
          select: 'productName images variants'
        });
  
      res.status(200).json(populatedCart);
    } catch (error) {
      console.error('Add to cart error:', error);
      res.status(500).json({ message: 'Error adding item to cart' });
    }
  };
  
  // Get cart
  const getCart = async (req, res) => {
    try {
      const { userId } = req.params;
      console.log('Fetching cart for userId:', userId);
  
      const cart = await Cart.findOne({ userId })
        .populate({
          path: 'items.productId',
          select: 'productName images variants isBlocked',
          model: 'Product'
        });
  
      console.log('Initial cart data:', JSON.stringify(cart, null, 2));
  
      if (!cart) {
        return res.status(200).json({ userId, items: [] });
      }
  
      // Debug each item's validity
      const validItems = cart.items.filter(item => {
        console.log('Checking item:', JSON.stringify(item, null, 2));
        
        if (!item.productId) {
          console.log('Product not found for item:', item);
          return false;
        }
  
        const variant = item.productId.variants.find(
          v => v._id.toString() === item.variantId.toString()
        );
        
        console.log('Found variant:', variant, 'for variantId:', item.variantId);
        
        // Keep the item if variant exists (regardless of stock)
        return !!variant;
      });
  
      // Update cart if items were filtered out
      if (validItems.length !== cart.items.length) {
        console.log('Filtered items:', validItems);
        cart.items = validItems;
        await cart.save();
      }
  
      console.log('Final cart data:', JSON.stringify(cart, null, 2));
      res.status(200).json(cart);
    } catch (error) {
      console.error('Get cart error:', error);
      res.status(500).json({ message: 'Error fetching cart' });
    }
  };

  
  // Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const { userId, productId, variantId, quantity } = req.body;

    // Find cart and validate it exists
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Get product and validate it exists and isn't blocked
    const product = await Product.findById(productId);
    if (!product || product.isBlocked) {
      return res.status(400).json({ 
        message: product ? 'Product is no longer available' : 'Product not found'
      });
    }

    // Find variant and validate stock
    const variant = product.variants.find(v => v._id.toString() === variantId);
    if (!variant) {
      return res.status(404).json({ message: 'Product variant not found' });
    }

    // Check if requested quantity is valid
    if (quantity > variant.stock) {
      return res.status(400).json({ 
        message: 'Not enough stock available',
        availableStock: variant.stock
      });
    }

    // Find current cart item
    const itemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId && 
              item.variantId.toString() === variantId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    // Update or remove item based on quantity
    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = Math.min(quantity, variant.stock);
    }

    await cart.save();

    // Return populated cart with additional stock info
    const populatedCart = await Cart.findById(cart._id)
      .populate({
        path: 'items.productId',
        select: 'productName images variants isBlocked'
      });

    // Add stock info to response
    const responseData = {
      cart: populatedCart,
      stockInfo: {
        availableStock: variant.stock,
        requestedQuantity: quantity,
        actualQuantity: Math.min(quantity, variant.stock)
      }
    };

    res.status(200).json(responseData);

  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ message: 'Error updating cart item' });
  }
};
  
  // Remove item from cart
  const removeFromCart = async (req, res) => {
    try {
      const { userId, productId, variantId } = req.params;
  
      const cart = await Cart.findOne({ userId });
      if (!cart) {
        return res.status(404).json({ message: 'Cart not found' });
      }
  
      cart.items = cart.items.filter(
        item => !(item.productId.toString() === productId && item.variantId.toString() === variantId)
      );
  
      await cart.save();
  
      const populatedCart = await Cart.findById(cart._id)
        .populate({
          path: 'items.productId',
          select: 'productName images variants'
        });
  
      res.status(200).json(populatedCart);
    } catch (error) {
      console.error('Remove from cart error:', error);
      res.status(500).json({ message: 'Error removing item from cart' });
    }
  };


  const clearCart = async (req, res) => {
    try {
      const { userId } = req.params;
      console.log('Attempting to clear cart for userId:', userId);
  
      const result = await Cart.findOneAndDelete({ userId });
      console.log('Cart deletion result:', result);
      
      if (!result) {
        console.log('No cart found to clear for userId:', userId);
        return res.status(404).json({ message: 'Cart not found' });
      }
  
      console.log('Successfully cleared cart for userId:', userId);
      res.status(200).json({ message: 'Cart cleared successfully' });
    } catch (error) {
      console.error('Clear cart error:', error);
      res.status(500).json({ message: 'Error clearing cart' });
    }
  };
  


module.exports = {addToCart,getCart,updateCartItem, removeFromCart, clearCart}