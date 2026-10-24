
require("dotenv").config();
const db = require("./db");

const products = [
  ["DAP Fertilizer", "Fertilizers", "Nitrogen and phosphorus fertilizer. Follow crop-specific guidance.", 135000, "50 kg bag", 50, "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80"],
  ["Potash Fertilizer (MOP)", "Fertilizers", "Potassium fertilizer for suitable crops.", 95000, "50 kg bag", 35, "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=800&q=80"],
  ["NPK 19:19:19", "Fertilizers", "Water-soluble plant nutrient blend. Check the label.", 78000, "1 kg pack", 60, "https://images.unsplash.com/photo-1592982537447-6f2a6a0f4c56?auto=format&fit=crop&w=800&q=80"],
  ["Imidacloprid 17.8% SL", "Pesticides", "Crop-protection product. Follow registered label directions.", 39000, "250 ml bottle", 40, "https://images.unsplash.com/photo-1615485500704-8e990f9900f5?auto=format&fit=crop&w=800&q=80"],
  ["Mancozeb 75% WP", "Pesticides", "Fungicide product. Check approved crop and label directions.", 34000, "500 g pack", 50, "https://images.unsplash.com/photo-1599685315640-3f5e3e3d5cbe?auto=format&fit=crop&w=800&q=80"],
  ["Neem Oil Concentrate", "Organic Products", "Neem-based plant-care product. Use as directed on the label.", 26000, "1 litre bottle", 80, "https://images.unsplash.com/photo-1615485500704-8e990f9900f5?auto=format&fit=crop&w=800&q=80"],
  ["Vermicompost", "Organic Products", "Organic compost for soil improvement.", 25000, "5 kg bag", 70, "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80"],
  ["Hybrid Vegetable Seeds", "Seeds", "Vegetable seeds. Check variety and sowing instructions.", 12000, "packet", 100, "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80"],
  ["Micronutrient Mix", "Plant Care", "Micronutrient blend. Check suitability for your crop.", 31000, "1 kg pack", 90, "https://images.unsplash.com/photo-1592982537447-6f2a6a0f4c56?auto=format&fit=crop&w=800&q=80"],
  ["Drip Irrigation Kit", "Irrigation", "Basic irrigation kit for suitable growing areas.", 125000, "1 kit", 20, "https://images.unsplash.com/photo-1492496913980-501348b61469?auto=format&fit=crop&w=800&q=80"],
  ["Watering Hose", "Irrigation", "Watering hose for garden and farm use.", 65000, "15 metre roll", 30, "https://images.unsplash.com/photo-1492496913980-501348b61469?auto=format&fit=crop&w=800&q=80"],
  ["Garden Soil Mix", "Soil Care", "Growing medium for pots and planting beds.", 18000, "5 kg bag", 60, "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80"]
];

const insert = db.prepare(`
  INSERT INTO products
    (name, category, description, price_paise, unit, stock, image_url)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const addProducts = db.transaction(() => {
  let added = 0;

  for (const p of products) {
    const exists = db.prepare(
      "SELECT id FROM products WHERE name = ? COLLATE NOCASE"
    ).get(p[0]);

    if (!exists) {
      insert.run(...p);
      added++;
    }
  }

  return added;
});


const imageUpdates = [
  [
    "DAP Fertilizer",
    "https://kissanemart.com/storage/iffco-dap-major-nutrient-800x800.jpg"
  ],
  [
    "Potash Fertilizer (MOP)",
    "https://s.alicdn.com/@sc04/kf/H9f28cb8959194f2292bc4670baf41a28Z/60-Muriate-of-Potash-MOP-Red-Granular-Manufacturer-Supply-and-Distribution-Potash-Fertilizer.png"
  ],
  [
    "NPK 19:19:19",
    "https://cdn.shopify.com/s/files/1/0722/2059/files/mahadhan-npk-191919-fertilizer-file-21346.png?format=webp&v=1747136413&width=750"
  ],
  [
    "Imidacloprid 17.8% SL",
    "https://agribegri.com/_next/image?q=85&url=https%3A%2F%2Fdujjhct8zer0r.cloudfront.net%2Fmedia%2Fprod_image%2F13934541501739504433.webp&w=1920"
  ],
  [
    "Mancozeb 75% WP",
    "https://tiimg.tistatic.com/fm/23847716/Chem-45..jpg"
  ],
  
  [
    "Vermicompost",
    "https://cdn.grofers.com/da/cms-assets/cms/product/80105d02-02a6-4594-86e3-815796eea5a3.jpg"
  ],
  [
    "Hybrid Vegetable Seeds",
    "https://greendhariseeds.com/cdn/shop/files/iiio.png?v=1769082680&width=533"
  ],
 
  [
    "Drip Irrigation Kit",
    "https://shop.jains.com/cdn/shop/products/1000meter-500x500_6ca812b3-7d08-4832-8f28-6035a31aca8a_1400x.jpg?v=1687519407"
  ],
  [
    "Garden Soil Mix",
    "https://cdn11.bigcommerce.com/s-q5kvnwnjhv/images/stencil/1000x1000/products/3950/5774/Premium_Garden_Soil_Mix__12731.1677555106.jpg?c=1"
  ],
  

["Neem Oil Concentrate", "/images/neem-oil.jpg"],
["Micronutrient Mix", "/images/micronutrient-mix.jpg"],
["Watering Hose", "/images/watering-hose.jpg"],


];

const updateImage = db.prepare(
  "UPDATE products SET image_url = ? WHERE name = ? COLLATE NOCASE"
);

for (const [name, imageUrl] of imageUpdates) {
  const result = updateImage.run(imageUrl, name);
  console.log(
    result.changes > 0
      ? `Image updated: ${name}`
      : `Product not found: ${name}`
  );
}





try {
  console.log(`Added ${addProducts()} new products.`);
} catch (error) {
  console.error("Product insertion failed:", error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
