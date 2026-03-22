import { Cart } from "../models/cart.model.js";
import { Coupon } from "../models/coupon.model.js";

// add item to cart
const addToCart = async (req, res) => {
  try {
    const farmerId = req.user._id;
    const { itemId, quantity, expectedPrice } = req.body;

    if (!itemId || !quantity || expectedPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: "Item, quantity and price are required",
      });
    }

    let cart = await Cart.findOne({ farmer: farmerId });

    if (!cart) {
      cart = await Cart.create({
        farmer: farmerId,
        items: [],
      });
    }

    const existingItem = cart.items.find((i) => i.item.toString() === itemId);

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.expectedPrice = expectedPrice; // refresh snapshot
    } else {
      cart.items.push({
        item: itemId,
        quantity,
        expectedPrice,
      });
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Item added to cart",
      data: cart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const farmerId = req.user._id;
    const { itemId, quantity } = req.body;

    const cart = await Cart.findOne({ farmer: farmerId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const cartItem = cart.items.find((i) => i._id.toString() === itemId);

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    if (quantity <= 0) {
      cart.items = cart.items.filter((i) => i._id.toString() !== itemId);
    } else {
      cartItem.quantity = quantity;
    }

    await cart.save();

    const updatedCart = await Cart.findOne({ farmer: farmerId }).populate({
      path: "items.item",
      select: "itemName brand unit",
    });

    res.status(200).json({
      success: true,
      message: "Cart updated",
      data: updatedCart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get user cart
const getMyCart = async (req, res) => {
  try {
    const farmerId = req.user._id;

    const cart = await Cart.findOne({ farmer: farmerId }).populate({
      path: "items.item",
      select: "itemName brand unit sourceRef",
      populate: {
        path: "sourceRef",
        select: "productImages",
      },
    });

    if (!cart) {
      return res.status(200).json({
        success: true,
        data: { items: [] },
      });
    }

    cart.items = cart.items.filter((i) => i.item !== null);

    await cart.save();

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// remove single item
const removeFromCart = async (req, res) => {
  try {
    const farmerId = req.user._id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ farmer: farmerId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    cart.items = cart.items.filter((i) => i._id.toString() !== itemId);

    if (cart.items.length === 0) {
      await Cart.findOneAndDelete({ farmer: farmerId });
      return res.status(200).json({
        success: true,
        message: "Item removed from cart",
        data: { items: [] },
      });
    }

    await cart.save();

    const updatedCart = await Cart.findOne({ farmer: farmerId }).populate({
      path: "items.item",
      select: "itemName brand unit",
    });

    res.status(200).json({
      success: true,
      message: "Item removed from cart",
      data: updatedCart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// clear cart
const clearCart = async (req, res) => {
  try {
    await Cart.findOneAndDelete({ farmer: req.user._id });

    res.status(200).json({
      success: true,
      message: "Cart cleared",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// apply coupon
const applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;
    const farmerId = req.user._id;

    const cart = await Cart.findOne({ farmer: farmerId });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    const coupon = await Coupon.findOne({
      code: couponCode,
      isActive: true,
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Invalid coupon",
      });
    }

    const today = new Date();

    if (today < coupon.validFrom || today > coupon.validUntil) {
      return res.status(400).json({
        success: false,
        message: "Coupon expired",
      });
    }

    const cartTotal = cart.items.reduce(
      (sum, i) => sum + i.quantity * i.expectedPrice,
      0
    );

    if (cartTotal < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount is ${coupon.minOrderAmount}`,
      });
    }

    let discount = 0;

    if (coupon.discountType === "PERCENTAGE") {
      discount = (cartTotal * coupon.discountValue) / 100;

      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    } else {
      discount = coupon.discountValue;
    }

    cart.coupon = coupon._id;
    cart.discountAmount = discount;
    cart.finalAmount = cartTotal - discount;

    await cart.save();

    res.status(200).json({
      success: true,
      cartTotal,
      discount,
      finalAmount: cart.finalAmount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export { addToCart, updateCartItem, getMyCart, removeFromCart, clearCart, applyCoupon };
