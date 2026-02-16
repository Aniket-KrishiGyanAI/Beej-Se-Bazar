import { Cart } from "../models/cart.model.js";
import { Order } from "../models/order.model.js";
import { User } from "../models/user.model.js";
import { sendToTokens } from "../utils/notificationService.js";

const placeOrder = async (req, res) => {
  try {
    const farmerId = req.user._id;

    const cart = await Cart.findOne({ farmer: farmerId }).populate({
      path: "items.item",
      select: "itemName brand unit price",
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    const orderItems = cart.items.map((item) => ({
      item: item.item._id,
      quantity: item.quantity,
      expectedPrice: item.expectedPrice,
    }));

    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.expectedPrice * item.quantity,
      0,
    );

    const newOrder = new Order({
      farmer: farmerId,
      items: orderItems,
      totalAmount,
      status: "PENDING",
      placedAt: new Date(),
      approvedBy: farmerId,
    });

    await newOrder.save();

    // send notification to admins
    try {
      const admins = await User.find({ role: "FPO" });

      const adminTokens = admins.flatMap(
        (admin) => admin.fcmTokens || []
      );

      if (adminTokens.length > 0) {
        await sendToTokens(adminTokens, {
          title: "New Order",
          body: `A new order has been placed by a farmer`,
          data: {
            type: "NEW_ORDER",
            orderId: newOrder._id.toString(),
          },
        });
      }
    } catch (notifyError) {
      console.error("FCM error:", notifyError);
    }

    await Cart.findOneAndDelete({ farmer: farmerId });

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: newOrder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllOrders = async (req, res) => {
  try {
    // Only FPO / Staff allowed
    if (req.user.role !== "FPO" && req.user.role !== "Staff") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { status } = req.query;
    // optional: ?status=PENDING / APPROVED / REJECTED

    const filter = {};
    if (status) {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate("farmer", "firstName lastName phone")
      .populate({
        path: "items.item",
        select: "itemName brand unit",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    if (req.user.role !== "FPO") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const farmerId = updatedOrder.farmer;
    const user = await User.findById(farmerId);

    if (user?.fcmTokens?.length > 0) {
      sendToTokens(user.fcmTokens, {
        title: `Order ${status}`,
        body: `Your order has been ${status.toLowerCase()}`,
        data: {
          type: "ORDER_STATUS_UPDATE",
          orderId: updatedOrder._id.toString(),
          status,
        },
      }).catch(console.error);
    }

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export { placeOrder, getAllOrders, updateOrderStatus };