/**
 * LuxeCart — Premium Mini Store
 * app.js  |  Application Logic
 *
 * Features:
 *  - Product catalog with category filtering
 *  - Search / real-time filter
 *  - Sort by price (low→high, high→low)
 *  - Add to cart with per-card quantity selector
 *  - Cart drawer with quantity adjustments & item removal
 *  - Live total calculation
 *  - localStorage persistence
 *  - Toast notifications
 *  - Checkout flow
 */

"use strict";

/* ============================================================
   1. PRODUCT DATA
   ============================================================ */

const PRODUCTS = [
    { id: 1, name: "Wireless Earbuds", category: "electronics", price: 3500, emoji: "🎧" },
    { id: 2, name: "Smart Watch", category: "electronics", price: 8900, emoji: "⌚" },
    { id: 3, name: "USB-C Hub", category: "electronics", price: 2200, emoji: "🔌" },
    { id: 4, name: "Laptop Stand", category: "electronics", price: 1800, emoji: "💻" },
    { id: 5, name: "Casual T-Shirt", category: "clothing", price: 950, emoji: "👕" },
    { id: 6, name: "Denim Jacket", category: "clothing", price: 3200, emoji: "🧥" },
    { id: 7, name: "Sneakers", category: "clothing", price: 5500, emoji: "👟" },
    { id: 8, name: "Woolen Cap", category: "clothing", price: 600, emoji: "🧢" },
    { id: 9, name: "Green Tea Box", category: "food", price: 420, emoji: "🍵" },
    { id: 10, name: "Honey Jar", category: "food", price: 780, emoji: "🍯" },
    { id: 11, name: "Almonds Pack", category: "food", price: 1100, emoji: "🌰" },
    { id: 12, name: "Dark Chocolate", category: "food", price: 350, emoji: "🍫" },
    { id: 13, name: "Scented Candle", category: "home", price: 890, emoji: "🕯️" },
    { id: 14, name: "Throw Pillow", category: "home", price: 1400, emoji: "🛋️" },
    { id: 15, name: "Desk Plant", category: "home", price: 750, emoji: "🪴" },
    { id: 16, name: "Ceramic Mug", category: "home", price: 480, emoji: "☕" },
];

/* ============================================================
   2. APPLICATION STATE
   ============================================================ */

const state = {
    cart: loadCart(),
    activeFilter: "all",
    activeSort: "default",
    searchQuery: "",
    cardQty: {}, // per-product-card quantity before adding to cart
};

// Initialise per-card quantities to 1
PRODUCTS.forEach(p => (state.cardQty[p.id] = 1));

/* ============================================================
   3. LOCAL STORAGE HELPERS
   ============================================================ */

const STORAGE_KEY = "luxecart_v1";

function loadCart() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
        return [];
    }
}

function saveCart() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cart));
    } catch (e) {
        console.warn("Could not save cart:", e);
    }
}

/* ============================================================
   4. FILTER / SORT / SEARCH HELPERS
   ============================================================ */

function getVisibleProducts() {
    let list = PRODUCTS;

    // Category filter
    if (state.activeFilter !== "all") {
        list = list.filter(p => p.category === state.activeFilter);
    }

    // Search
    if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        list = list.filter(
            p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
        );
    }

    // Sort
    if (state.activeSort === "low") {
        list = [...list].sort((a, b) => a.price - b.price);
    } else if (state.activeSort === "high") {
        list = [...list].sort((a, b) => b.price - a.price);
    }

    return list;
}

/* ============================================================
   5. RENDER PRODUCTS
   ============================================================ */

function renderProducts() {
    const grid = document.getElementById("productsGrid");
    const label = document.getElementById("productCountLabel");
    const list = getVisibleProducts();

    label.textContent = `Showing ${list.length} product${list.length !== 1 ? "s" : ""}`;

    if (!list.length) {
        grid.innerHTML = `
      <div class="no-results">
        <span class="no-results-emoji">🔍</span>
        <h3>No products found</h3>
        <p>Try adjusting your search or filter.</p>
      </div>`;
        return;
    }

    grid.innerHTML = list.map((p, i) => `
    <div class="product-card" style="animation-delay:${i * 0.04}s">
      <div class="product-thumb">
        ${p.emoji}
        <span class="product-category-badge">${categoryLabel(p.category)}</span>
      </div>
      <div class="product-body">
        <div class="product-name">${p.name}</div>
        <div class="product-price">Rs. ${p.price.toLocaleString()}</div>
      </div>
      <div class="product-foot">
        <div class="qty-stepper">
          <button class="qty-step-btn" onclick="changeCardQty(${p.id}, -1)" aria-label="Decrease quantity">−</button>
          <span class="qty-value" id="qty_${p.id}">${state.cardQty[p.id]}</span>
          <button class="qty-step-btn" onclick="changeCardQty(${p.id}, 1)" aria-label="Increase quantity">+</button>
        </div>
        <button class="add-to-cart" id="addbtn_${p.id}" onclick="addToCart(${p.id})">
          Add to Cart
        </button>
      </div>
    </div>
  `).join("");
}

function categoryLabel(cat) {
    const labels = {
        electronics: "Electronics",
        clothing: "Clothing",
        food: "Food",
        home: "Home",
    };
    return labels[cat] || cat;
}

/* ============================================================
   6. CARD QUANTITY CONTROLS
   ============================================================ */

function changeCardQty(id, delta) {
    state.cardQty[id] = Math.max(1, (state.cardQty[id] || 1) + delta);
    const el = document.getElementById("qty_" + id);
    if (el) el.textContent = state.cardQty[id];
}

/* ============================================================
   7. ADD TO CART
   ============================================================ */

function addToCart(id) {
    const product = PRODUCTS.find(p => p.id === id);
    if (!product) return;

    const qty = state.cardQty[id] || 1;
    const existing = state.cart.find(c => c.id === id);

    if (existing) {
        existing.qty += qty;
    } else {
        state.cart.push({...product, qty });
    }

    saveCart();
    updateCartBadge();
    renderCartItems();
    showToast(`${product.emoji} "${product.name}" added to cart`);

    // Visual feedback on button
    const btn = document.getElementById("addbtn_" + id);
    if (btn) {
        btn.classList.add("added");
        btn.textContent = "✓ Added";
        setTimeout(() => {
            btn.classList.remove("added");
            btn.textContent = "Add to Cart";
        }, 1200);
    }

    // Bump cart badge animation
    const badge = document.getElementById("cartCount");
    badge.classList.add("bump");
    setTimeout(() => badge.classList.remove("bump"), 300);
}

/* ============================================================
   8. CART BADGE
   ============================================================ */

function updateCartBadge() {
    const total = state.cart.reduce((s, c) => s + c.qty, 0);
    document.getElementById("cartCount").textContent = total;
}

/* ============================================================
   9. RENDER CART ITEMS
   ============================================================ */

function renderCartItems() {
    const container = document.getElementById("cartItems");
    const footer = document.getElementById("cartFooter");

    if (!state.cart.length) {
        container.innerHTML = `
      <div class="empty-cart-msg">
        <span class="empty-cart-icon">🛍️</span>
        <h3>Your cart is empty</h3>
        <p>Add some products to get started.</p>
      </div>`;
        footer.classList.remove("visible");
        return;
    }

    container.innerHTML = state.cart.map(item => `
    <div class="cart-item" id="ci_${item.id}">
      <div class="ci-thumb">${item.emoji}</div>
      <div class="ci-details">
        <div class="ci-name">${item.name}</div>
        <div class="ci-pricing">
          <span class="ci-total">Rs. ${(item.price * item.qty).toLocaleString()}</span>
          <span class="ci-unit">${item.qty} × Rs. ${item.price.toLocaleString()}</span>
        </div>
      </div>
      <div class="ci-controls">
        <div class="ci-stepper">
          <button class="ci-step-btn" onclick="changeCartQty(${item.id}, -1)" aria-label="Decrease">−</button>
          <span class="ci-qty-val">${item.qty}</span>
          <button class="ci-step-btn" onclick="changeCartQty(${item.id}, 1)" aria-label="Increase">+</button>
        </div>
        <button class="ci-remove" onclick="removeFromCart(${item.id})" aria-label="Remove item">🗑</button>
      </div>
    </div>
  `).join("");

    // Update totals
    const subtotal = state.cart.reduce((s, c) => s + c.price * c.qty, 0);
    document.getElementById("subtotalAmount").textContent = "Rs. " + subtotal.toLocaleString();
    document.getElementById("totalAmount").textContent = "Rs. " + subtotal.toLocaleString();
    document.getElementById("shippingNote").textContent =
        subtotal >= 5000 ? "Free 🎉" : "Calculated at checkout";

    footer.classList.add("visible");
}

/* ============================================================
   10. CART QUANTITY ADJUSTMENTS
   ============================================================ */

function changeCartQty(id, delta) {
    const item = state.cart.find(c => c.id === id);
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    saveCart();
    updateCartBadge();
    renderCartItems();
}

/* ============================================================
   11. REMOVE FROM CART
   ============================================================ */

function removeFromCart(id) {
    const item = state.cart.find(c => c.id === id);
    state.cart = state.cart.filter(c => c.id !== id);
    saveCart();
    updateCartBadge();
    renderCartItems();
    if (item) showToast(`"${item.name}" removed from cart`);
}

/* ============================================================
   12. CART DRAWER OPEN / CLOSE
   ============================================================ */

function openCart() {
    document.getElementById("cartDrawer").classList.add("open");
    document.getElementById("cartOverlay").classList.add("open");
    renderCartItems();
    document.body.style.overflow = "hidden";
}

function closeCart() {
    document.getElementById("cartDrawer").classList.remove("open");
    document.getElementById("cartOverlay").classList.remove("open");
    document.body.style.overflow = "";
}

/* ============================================================
   13. CHECKOUT
   ============================================================ */

function checkout() {
    if (!state.cart.length) return;
    showToast("🎉 Order placed successfully! Thank you for shopping.");
    state.cart = [];
    saveCart();
    updateCartBadge();
    renderCartItems();
    setTimeout(closeCart, 1600);
}

/* ============================================================
   14. TOAST NOTIFICATION
   ============================================================ */

let toastTimer = null;

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

/* ============================================================
   15. FILTERS
   ============================================================ */

function setupFilters() {
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.activeFilter = btn.dataset.cat;
            renderProducts();
        });
    });
}

/* ============================================================
   16. SORT
   ============================================================ */

function setupSort() {
    document.querySelectorAll(".sort-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".sort-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.activeSort = btn.dataset.sort;
            renderProducts();
        });
    });
}

/* ============================================================
   17. SEARCH
   ============================================================ */

function setupSearch() {
    const input = document.getElementById("searchInput");
    const clearBtn = document.getElementById("searchClear");

    input.addEventListener("input", () => {
        state.searchQuery = input.value.trim();
        clearBtn.classList.toggle("visible", state.searchQuery.length > 0);
        renderProducts();
    });

    clearBtn.addEventListener("click", () => {
        input.value = "";
        state.searchQuery = "";
        clearBtn.classList.remove("visible");
        input.focus();
        renderProducts();
    });
}

/* ============================================================
   18. EVENT LISTENERS
   ============================================================ */

function setupEventListeners() {
    document.getElementById("cartBtn").addEventListener("click", openCart);
    document.getElementById("closeCart").addEventListener("click", closeCart);
    document.getElementById("cartOverlay").addEventListener("click", closeCart);
    document.getElementById("checkoutBtn").addEventListener("click", checkout);
    document.getElementById("continueBtn").addEventListener("click", closeCart);

    // Close drawer with Escape key
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") closeCart();
    });
}

/* ============================================================
   19. INITIALISE
   ============================================================ */

function init() {
    setupFilters();
    setupSort();
    setupSearch();
    setupEventListeners();
    renderProducts();
    updateCartBadge();
    console.log("LuxeCart initialised ✓");
}

document.addEventListener("DOMContentLoaded", init);