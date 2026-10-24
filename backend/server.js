require("dotenv").config();
const express = require("express");
const path = require("node:path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const db = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "..", "public");

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false })); // CSP should be tightened after final asset/domain choices.
app.use(express.json({ limit: "30kb" }));
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 180, standardHeaders: "draft-7", legacyHeaders: false }));

const orderLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 12, message: { error: "Too many order attempts. Please try again later." } });
const reviewLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, message: { error: "Too many review attempts. Please try again later." } });


const productView = (p) => ({
  id: p.id,
  name: p.name,
  category: p.category,
  description: p.description,
  price: p.price_paise / 100,
  unit: p.unit,
  stock: p.stock,
  imageUrl: p.image_url
});


app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "AgriGuide API" }));

app.get("/api/products", (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 80);
  const category = String(req.query.category || "").trim().slice(0, 60);
  const rows = db.prepare(`
    SELECT * FROM products WHERE active = 1
    AND (? = '' OR name LIKE ? OR description LIKE ?)
    AND (? = '' OR category = ?)
    ORDER BY id
  `).all(q, `%${q}%`, `%${q}%`, category, category);
  res.json(rows.map(productView));
});

app.get("/api/products/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid product ID." });
  const p = db.prepare("SELECT * FROM products WHERE id = ? AND active = 1").get(id);
  if (!p) return res.status(404).json({ error: "Product not found." });
  res.json(productView(p));
});

app.get("/api/reviews", (req, res) => {
  const productId = Number(req.query.productId);
  if (!Number.isInteger(productId) || productId < 1) return res.status(400).json({ error: "A valid productId is required." });
  const reviews = db.prepare("SELECT id, product_id AS productId, customer_name AS customerName, rating, comment, created_at AS createdAt FROM reviews WHERE product_id = ? ORDER BY id DESC LIMIT 100").all(productId);
  res.json(reviews);
});

app.post("/api/reviews", reviewLimiter, (req, res) => {
  const schema = z.object({
    productId: z.number().int().positive(),
    customerName: z.string().trim().min(2).max(60),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().min(5).max(800)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please provide a name, rating from 1–5, and a comment of 5–800 characters." });
  const product = db.prepare("SELECT id FROM products WHERE id = ? AND active = 1").get(parsed.data.productId);
  if (!product) return res.status(404).json({ error: "Product not found." });
  const result = db.prepare("INSERT INTO reviews (product_id, customer_name, rating, comment) VALUES (?, ?, ?, ?)").run(
    parsed.data.productId, parsed.data.customerName, parsed.data.rating, parsed.data.comment
  );
  res.status(201).json({ id: result.lastInsertRowid, message: "Review received. Store owner should moderate reviews before publishing." });
});

app.post("/api/orders", orderLimiter, (req, res) => {
  const schema = z.object({
    customerName: z.string().trim().min(2).max(80),
    phone: z.string().trim().regex(/^[+0-9 ()-]{8,20}$/),
    email: z.string().trim().max(120).optional().default(""),
    address: z.string().trim().min(8).max(500),
    deliveryMethod: z.enum(["home", "farm", "pickup"]),
    items: z.array(z.object({
      productId: z.number().int().positive(),
      quantity: z.number().int().min(1).max(100)
    })).min(1).max(50)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please check your contact details, delivery option and cart items." });

  const itemDetails = [];
  let subtotal = 0;
  for (const item of parsed.data.items) {
    const product = db.prepare("SELECT * FROM products WHERE id = ? AND active = 1").get(item.productId);
    if (!product) return res.status(400).json({ error: "A product in your cart is no longer available. Refresh the shop and try again." });
    if (product.stock < item.quantity) return res.status(409).json({ error: `${product.name} does not have enough stock for this quantity.` });
    subtotal += product.price_paise * item.quantity;
    itemDetails.push({ product, quantity: item.quantity });
  }

  // Policy is validated on the server, never trusted from the browser.
  if (parsed.data.deliveryMethod === "farm" && subtotal >= 1000000) {
    return res.status(400).json({ error: "Direct farm delivery is available only for orders below ₹10,000. Choose home delivery or shop pickup." });
  }

  const createOrder = db.transaction(() => {
    const order = db.prepare(`INSERT INTO orders (customer_name, phone, email, address, delivery_method, subtotal_paise)
      VALUES (?, ?, ?, ?, ?, ?)`).run(
      parsed.data.customerName, parsed.data.phone, parsed.data.email || "", parsed.data.address,
      parsed.data.deliveryMethod, subtotal
    );
    const orderId = Number(order.lastInsertRowid);
    const insertItem = db.prepare("INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price_paise) VALUES (?, ?, ?, ?, ?)");
    const decrement = db.prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?");
    for (const item of itemDetails) {
      insertItem.run(orderId, item.product.id, item.product.name, item.quantity, item.product.price_paise);
      const changed = decrement.run(item.quantity, item.product.id, item.quantity);
      if (changed.changes !== 1) throw new Error("Stock changed while placing the order. Please retry.");
    }
    return orderId;
  });

  try {
    const orderId = createOrder();
    res.status(201).json({
      orderId: `AG-${String(orderId).padStart(6, "0")}`,
      status: "received",
      subtotal: subtotal / 100,
      message: "Order request saved. The shop must confirm availability and delivery."
    });
  } catch (err) {
    console.error("Order creation failed:", err.message);
    res.status(409).json({ error: "We couldn't complete the order. Please refresh your cart and try again." });
  }
});

app.use(express.static(publicDir));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Unexpected server error." });
});

app.listen(PORT, () => console.log(`AgriGuide running at http://localhost:${PORT}`));
