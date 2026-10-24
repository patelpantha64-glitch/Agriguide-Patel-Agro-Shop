require("dotenv").config();
const db = require("./db");

const count = db.prepare("SELECT COUNT(*) AS count FROM products").get().count;
if (count === 0) {
  const products = [
    ["Urea 46% Fertilizer","Fertilizers","Nitrogen fertilizer. Always follow the product label and local agricultural guidance.",42000,"50 kg bag",100,"https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=900&q=80"],
    ["NPK 19:19:19","Fertilizers","Water-soluble NPK fertilizer. Confirm crop suitability on the label.",78000,"25 kg bag",60,"https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=900&q=80"],
    ["Neem Oil Concentrate","Organic & Natural","Neem-based garden and crop-care product. Use only as directed on the label.",26000,"1 litre",80,"https://images.unsplash.com/photo-1615485500704-8e990f9900f5?auto=format&fit=crop&w=900&q=80"],
    ["Imidacloprid 17.8% SL","Crop Protection","Crop-protection product. Check registration, crop and pest directions before use.",39000,"250 ml",40,"https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=900&q=80"],
    ["Mancozeb 75% WP","Crop Protection","Fungicide product. Read label directions and applicable safety precautions.",34000,"500 g",50,"https://images.unsplash.com/photo-1592982537447-6f2a6a0f4c56?auto=format&fit=crop&w=900&q=80"],
    ["Micronutrient Mix","Plant Nutrition","Micronutrient blend. Confirm suitability for your crop and soil conditions.",31000,"1 kg",90,"https://images.unsplash.com/photo-1599685315640-3f5e3e3d5cbe?auto=format&fit=crop&w=900&q=80"]
  ];
  const insert = db.prepare("INSERT INTO products (name,category,description,price_paise,unit,stock,image_url) VALUES (?,?,?,?,?,?,?)");
  const seed = db.transaction((rows) => rows.forEach(row => insert.run(...row)));
  seed(products);
  console.log("Demo products added.");
} else {
  console.log("Products already exist; no seed changes made.");
}
console.log("Database initialized.");
db.close();
