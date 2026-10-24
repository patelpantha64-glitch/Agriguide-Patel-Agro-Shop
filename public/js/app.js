const $ = (selector) => document.querySelector(selector);
const state = { products: [], cart: new Map(), search: "", category: "" };
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
let toastTimer;

function toast(message) {
  const node = $("#toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("show"), 2600);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed. Please try again.");
  return data;
}

function filteredProducts() {
  const term = state.search.toLowerCase();
  return state.products.filter(product => {
    const matchesText = !term || `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(term);
    const matchesCategory = !state.category || product.category === state.category;
    return matchesText && matchesCategory;
  });
}

function renderProducts() {
  const products = filteredProducts();
  const target = $("#products");
  if (!products.length) {
    target.innerHTML = '<div class="empty-state">No products match your search. Try another keyword or category.</div>';
    return;
  }
  target.innerHTML = products.map(product => `
    <article class="product-card">
      <div class="product-image">
      <img
  src="${escapeHTML(product.imageUrl)}"
  alt="${escapeHTML(product.name)}"
  loading="lazy"
>
            <img src="${escapeHTML(product.imageUrl)}"
     alt="${escapeHTML(product.name)}"
     loading="lazy"
     onerror="this.onerror=null; this.style.display='none';">
        <span class="product-category">${escapeHTML(product.category)}</span>
      </div>
      <div class="product-content">
        <h3>${escapeHTML(product.name)}</h3>
        <p class="product-description">${escapeHTML(product.description)}</p>
        <div class="product-bottom"><div class="price">${money(product.price)}<div class="unit">${escapeHTML(product.unit)}</div></div>
        <button class="add-button" data-add="${product.id}" ${product.stock < 1 ? "disabled" : ""}>${product.stock < 1 ? "Out of stock" : "＋ Add"}</button></div>
        <p class="stock-note">${product.stock} available in demo inventory</p>
      </div>
    </article>`).join("");
    target.querySelectorAll(".product-image img").forEach(img => {
  img.addEventListener("error", () => {
    console.error("Image failed to load:", img.src);
    img.style.display = "none";
    img.parentElement.style.background = "#e5eee2";
  }, { once: true });
});
}

function cartEntries() {
  return [...state.cart.entries()].map(([id, quantity]) => ({
    product: state.products.find(product => product.id === id), quantity
  })).filter(entry => entry.product);
}
function subtotal() {
  return cartEntries().reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0);
}
function renderCart() {
  const entries = cartEntries();
  const count = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  $("#cart-count").textContent = count;
  $("#cart-subtotal").textContent = money(subtotal());
  $("#cart-items").innerHTML = entries.length ? entries.map(({ product, quantity }) => `
    <div class="cart-line">
      <div><strong>${escapeHTML(product.name)}</strong><small>${money(product.price)} · ${escapeHTML(product.unit)}</small><small>Line total: ${money(product.price * quantity)}</small></div>
      <div class="quantity-controls"><button data-quantity="${product.id}" data-delta="-1" aria-label="Decrease quantity">−</button><span>${quantity}</span><button data-quantity="${product.id}" data-delta="1" aria-label="Increase quantity">+</button></div>
    </div>`).join("") : '<div class="empty-state">Your cart is empty. Add a product to get started.</div>';
  $("#checkout-open").disabled = !entries.length;
}
function openCart() {
  $("#cart-drawer").classList.add("is-open");
  $("#cart-drawer").setAttribute("aria-hidden", "false");
}
function closeCart() {
  $("#cart-drawer").classList.remove("is-open");
  $("#cart-drawer").setAttribute("aria-hidden", "true");
}
function renderReviewProductOptions() {
  $("#review-product").innerHTML = state.products.map(product => `<option value="${product.id}">${escapeHTML(product.name)}</option>`).join("");
  if (state.products[0]) loadReviews(state.products[0].id);
}
async function loadReviews(productId) {
  try {
    const reviews = await api(`/api/reviews?productId=${encodeURIComponent(productId)}`);
    $("#reviews-list").innerHTML = reviews.length ? reviews.map(review => `
      <article class="review-item"><strong>${escapeHTML(review.customerName)}</strong> <span class="stars">${"★".repeat(review.rating)}${"☆".repeat(5-review.rating)}</span>
      <p>${escapeHTML(review.comment)}</p></article>`).join("") : '<p class="muted">No reviews yet for this product. Be the first to share a genuine experience.</p>';
  } catch (error) { $("#reviews-list").textContent = error.message; }
}
async function loadProducts() {
  try {
   const result = await api("/api/products");
state.products = Array.isArray(result) ? result : (result.products || []);
    renderProducts();
    renderCart();
    renderReviewProductOptions();
  } catch (error) {
    $("#products").innerHTML = `<div class="empty-state">${escapeHTML(error.message)}<br>Make sure the Node.js server is running.</div>`;
  }
}

$("#products").addEventListener("click", event => {
  const button = event.target.closest("[data-add]");
  if (!button) return;
  const id = Number(button.dataset.add);
  const product = state.products.find(item => item.id === id);
  const inCart = state.cart.get(id) || 0;
  if (!product || inCart >= product.stock) return toast("The requested quantity is not available.");
  state.cart.set(id, inCart + 1);
  renderCart();
  toast(`${product.name} added to cart.`);
});
$("#cart-items").addEventListener("click", event => {
  const button = event.target.closest("[data-quantity]");
  if (!button) return;
  const id = Number(button.dataset.quantity);
  const next = (state.cart.get(id) || 0) + Number(button.dataset.delta);
  if (next <= 0) state.cart.delete(id);
  else {
    const product = state.products.find(item => item.id === id);
    if (product && next > product.stock) return toast("Not enough stock for that quantity.");
    state.cart.set(id, next);
  }
  renderCart();
});
$("#search").addEventListener("input", event => { state.search = event.target.value; renderProducts(); });
$("#category").addEventListener("change", event => { state.category = event.target.value; renderProducts(); });
$("#cart-open").addEventListener("click", openCart);
$("#cart-close").addEventListener("click", closeCart);
document.querySelector("[data-close-cart]").addEventListener("click", closeCart);
$("#checkout-open").addEventListener("click", () => {
  if (!state.cart.size) return;
  closeCart();
  $("#checkout-message").textContent = "";
  $("#checkout-dialog").showModal();
});
$("#checkout-close").addEventListener("click", () => $("#checkout-dialog").close());

$("#checkout-form").addEventListener("submit", async event => {
  event.preventDefault();
  const message = $("#checkout-message");
  message.textContent = "Submitting your order request…";
  const payload = {
    customerName: $("#customer-name").value.trim(),
    phone: $("#customer-phone").value.trim(),
    email: $("#customer-email").value.trim(),
    address: $("#customer-address").value.trim(),
    deliveryMethod: document.querySelector('input[name="delivery"]:checked').value,
    items: cartEntries().map(({ product, quantity }) => ({ productId: product.id, quantity }))
  };
  try {
    const result = await api("/api/orders", { method: "POST", body: JSON.stringify(payload) });
    message.textContent = `${result.orderId} created. ${result.message}`;
    state.cart.clear();
    renderCart();
    await loadProducts();
    toast(`Order request ${result.orderId} submitted.`);
    setTimeout(() => $("#checkout-dialog").close(), 2400);
  } catch (error) {
    message.textContent = error.message;
  }
});

$("#review-product").addEventListener("change", event => loadReviews(Number(event.target.value)));
$("#review-form").addEventListener("submit", async event => {
  event.preventDefault();
  const message = $("#review-message");
  message.textContent = "Submitting review…";
  const payload = {
    productId: Number($("#review-product").value),
    customerName: $("#review-name").value.trim(),
    rating: Number($("#review-rating").value),
    comment: $("#review-comment").value.trim()
  };
  try {
    await api("/api/reviews", { method: "POST", body: JSON.stringify(payload) });
    message.textContent = "Review saved. The shop should moderate it before public use.";
    $("#review-form").reset();
    $("#review-product").value = String(payload.productId);
    await loadReviews(payload.productId);
  } catch (error) { message.textContent = error.message; }
});

$("#year").textContent = new Date().getFullYear();
loadProducts();
