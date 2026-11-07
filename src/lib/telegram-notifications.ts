type InlineKeyboard = {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
};

export async function sendTelegramNotification(
  text: string,
  replyMarkup?: InlineKeyboard,
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return false;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    const result = (await response.json()) as { ok?: boolean; description?: string };
    if (!response.ok || result.ok !== true) {
      console.error("Telegram notification failed:", result.description || response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Telegram notification could not be delivered:", error);
    return false;
  }
}

export async function notifyProductionBatchCompleted(data: {
  batchNumber: string;
  productName: string;
  acceptedQuantity: number;
  rejectedQuantity: number;
  responsibleStaff: string;
}) {
  const message = `🏭 <b>Milano Foods — Production Batch Completed</b>\n\n` +
    `📦 <b>Batch:</b> ${data.batchNumber}\n` +
    `🍹 <b>Product:</b> ${data.productName}\n` +
    `✅ <b>Accepted Output:</b> ${data.acceptedQuantity} units (now in stock)\n` +
    (data.rejectedQuantity > 0 ? `⚠️ <b>Rejected / Waste:</b> ${data.rejectedQuantity} units\n` : "") +
    `👤 <b>Staff:</b> ${data.responsibleStaff}\n` +
    `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;

  return sendTelegramNotification(message);
}

export async function notifyNewOrder(data: {
  orderNumber: string;
  customerName: string;
  phone: string;
  total: number;
  itemCount: number;
  fulfillment: string;
  city: string;
}) {
  const message = `🛒 <b>NEW ORDER — Milano Foods</b>\n\n` +
    `🆔 <b>Order:</b> ${data.orderNumber}\n` +
    `👤 <b>Customer:</b> ${data.customerName}\n` +
    `📞 <b>Phone:</b> ${data.phone}\n` +
    `📦 <b>Items:</b> ${data.itemCount}\n` +
    `💵 <b>Total:</b> ETB ${data.total.toLocaleString()}\n` +
    `🚚 <b>Fulfillment:</b> ${data.fulfillment}\n` +
    `🏙️ <b>City:</b> ${data.city}\n` +
    `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;

  return sendTelegramNotification(message);
}

export async function notifyOrderConfirmed(data: {
  orderNumber: string;
  customerName: string;
  total: number;
  confirmedBy: string;
}) {
  const message = `✅ <b>ORDER CONFIRMED — Milano Foods</b>\n\n` +
    `🆔 <b>Order:</b> ${data.orderNumber}\n` +
    `👤 <b>Customer:</b> ${data.customerName}\n` +
    `💵 <b>Total:</b> ETB ${data.total.toLocaleString()}\n` +
    `👨‍💼 <b>Confirmed by:</b> ${data.confirmedBy}\n` +
    `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;

  return sendTelegramNotification(message);
}

export async function notifyOrderRejected(data: {
  orderNumber: string;
  customerName: string;
  reason?: string;
}) {
  const message = `❌ <b>ORDER REJECTED — Milano Foods</b>\n\n` +
    `🆔 <b>Order:</b> ${data.orderNumber}\n` +
    `👤 <b>Customer:</b> ${data.customerName}\n` +
    (data.reason ? `📝 <b>Reason:</b> ${data.reason}\n` : ``) +
    `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;

  return sendTelegramNotification(message);
}

export async function notifyOrderCompleted(data: {
  orderNumber: string;
  customerName: string;
  total: number;
}) {
  const message = `🎉 <b>ORDER COMPLETED — Milano Foods</b>\n\n` +
    `🆔 <b>Order:</b> ${data.orderNumber}\n` +
    `👤 <b>Customer:</b> ${data.customerName}\n` +
    `💵 <b>Total:</b> ETB ${data.total.toLocaleString()}\n` +
    `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;

  return sendTelegramNotification(message);
}

export async function notifyPaymentReceived(data: {
  orderNumber: string;
  amount: number;
  paymentMethod: string;
}) {
  const message = `💳 <b>PAYMENT RECEIVED — Milano Foods</b>\n\n` +
    `🆔 <b>Order:</b> ${data.orderNumber}\n` +
    `💵 <b>Amount:</b> ETB ${data.amount.toLocaleString()}\n` +
    `🏦 <b>Payment Method:</b> ${data.paymentMethod}\n` +
    `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;

  return sendTelegramNotification(message);
}

export async function notifyStockRestock(data: {
  productName: string;
  quantityAdded: number;
  newTotalStock: number;
  restockedBy: string;
}) {
  const message = `📦 <b>STOCK RESTOCKED — Milano Foods</b>\n\n` +
    `🍹 <b>Product:</b> ${data.productName}\n` +
    `➕ <b>Quantity Added:</b> ${data.quantityAdded} units\n` +
    `📊 <b>New Total Stock:</b> ${data.newTotalStock} units\n` +
    `👤 <b>Restocked by:</b> ${data.restockedBy}\n` +
    `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;

  return sendTelegramNotification(message);
}

export async function notifyPriceChanged(data: {
  productName: string;
  oldPrice: number;
  newPrice: number;
  changedBy: string;
}) {
  const message = `💰 <b>PRICE CHANGED — Milano Foods</b>\n\n` +
    `🍹 <b>Product:</b> ${data.productName}\n` +
    `📉 <b>Old Price:</b> ETB ${data.oldPrice.toLocaleString()}\n` +
    `📈 <b>New Price:</b> ETB ${data.newPrice.toLocaleString()}\n` +
    `👤 <b>Changed by:</b> ${data.changedBy}\n` +
    `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;

  return sendTelegramNotification(message);
}

export async function notifyNewReview(data: {
  customerName: string;
  productName: string;
  rating: number;
  orderNumber: string;
}) {
  const stars = "⭐".repeat(data.rating);
  const message = `📝 <b>NEW REVIEW — Milano Foods</b>\n\n` +
    `👤 <b>Customer:</b> ${data.customerName}\n` +
    `🍹 <b>Product:</b> ${data.productName}\n` +
    `${stars} <b>Rating:</b> ${data.rating}/5\n` +
    `🆔 <b>Order:</b> ${data.orderNumber}\n` +
    `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;

  return sendTelegramNotification(message);
}

export async function notifyReviewModerated(data: {
  productName: string;
  customerName: string;
  action: "approved" | "rejected";
}) {
  const emoji = data.action === "approved" ? "✅" : "❌";
  const message = `${emoji} <b>REVIEW ${data.action.toUpperCase()} — Milano Foods</b>\n\n` +
    `🍹 <b>Product:</b> ${data.productName}\n` +
    `👤 <b>Customer:</b> ${data.customerName}\n` +
    `📋 <b>Action:</b> ${data.action}\n` +
    `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;

  return sendTelegramNotification(message);
}

export async function notifyDailySummary(data: {
  totalOrdersToday: number;
  revenue: number;
  pendingOrders: number;
  lowStockItemsCount: number;
}) {
  const message = `📊 <b>DAILY SUMMARY — Milano Foods</b>\n\n` +
    `🛒 <b>Total Orders Today:</b> ${data.totalOrdersToday}\n` +
    `💵 <b>Revenue:</b> ETB ${data.revenue.toLocaleString()}\n` +
    `⏳ <b>Pending Orders:</b> ${data.pendingOrders}\n` +
    `⚠️ <b>Low Stock Items:</b> ${data.lowStockItemsCount}\n` +
    `📅 <b>Date:</b> ${new Date().toLocaleDateString()}`;

  return sendTelegramNotification(message);
}

export async function notifyAdminLogin(data: {
  name: string;
  method: string;
  time: string;
}) {
  const message = `🔐 <b>ADMIN LOGIN — Milano Foods</b>\n\n` +
    `👤 <b>Name:</b> ${data.name}\n` +
    `🔑 <b>Method:</b> ${data.method}\n` +
    `🕒 <b>Time:</b> ${data.time}`;

  return sendTelegramNotification(message);
}

export async function notifyOrderStatusChanged(data: {
  orderNumber: string;
  previousStatus: string;
  newStatus: string;
  customerName: string;
  total: number;
  changedBy: string;
}) {
  const message = `📋 <b>Order Status Updated</b>\n\n` +
    `🆔 <b>Order:</b> ${data.orderNumber}\n` +
    `👤 <b>Customer:</b> ${data.customerName}\n` +
    `💵 <b>Total:</b> ETB ${data.total.toLocaleString()}\n` +
    `🔄 <b>Status:</b> ${data.previousStatus} ➡️ <b>${data.newStatus}</b>\n` +
    `👨‍💼 <b>Updated by:</b> ${data.changedBy}`;

  return sendTelegramNotification(message);
}

export async function notifyLowStockAlert(data: {
  itemName: string;
  currentStock: number;
  threshold: number;
  unit: string;
  type: string;
}) {
  const message = `🚨 <b>LOW STOCK ALERT — Milano Foods Factory</b>\n\n` +
    `⚠️ <b>Item:</b> ${data.itemName} (${data.type})\n` +
    `📊 <b>Available:</b> ${data.currentStock} ${data.unit}\n` +
    `🛑 <b>Reorder Level:</b> ${data.threshold} ${data.unit}\n` +
    `Please schedule production or raw material purchasing.`;

  return sendTelegramNotification(message);
}
