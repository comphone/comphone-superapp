// COMPHONE POS - JavaScript Logic
// Version: v5.9.0-phase2d (Phase 30)

// Global variables
let cart = [];
let products = [];

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
  loadProducts();
  setupSearch();
});

// Load products from inventory
async function loadProducts() {
  try {
    const res = await callGas('listInventoryItems');
    if (res && res.success && res.items) {
      products = res.items;
      renderProducts(products);
    } else {
      showToast('ไม่สามารถโหลดรายการสินค้าได้', 'error');
    }
  } catch (error) {
    console.error('Error loading products:', error);
    showToast('เกิดข้อผิดพลาดในการโหลดสินค้า', 'error');
  }
}

// Render products to grid
function renderProducts(items) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  if (!items || items.length === 0) {
    grid.innerHTML = '<p class="text-muted">ไม่พบสินค้า</p>';
    return;
  }
  
  items.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.onclick = () => addToCart(product);
    
    const price = product.sell_price || product.price || 0;
    const stock = product.current_stock || product.stock || 0;
    
    card.innerHTML = `
      <h5>${product.name || product.item_name || 'สินค้า'}</h5>
      <p class="text-primary fw-bold">฿${price.toLocaleString()}</p>
      <small class="text-muted">คงเหลือ: ${stock} ${product.unit || 'ชิ้น'}</small>
    `;
    
    grid.appendChild(card);
  });
}

// Setup search functionality
function setupSearch() {
  const searchInput = document.getElementById('searchProduct');
  if (searchInput) {
    searchInput.addEventListener('input', function(e) {
      const query = e.target.value.toLowerCase();
      const filtered = products.filter(p => 
        (p.name || p.item_name || '').toLowerCase().includes(query)
      );
      renderProducts(filtered);
    });
  }
}

// Add product to cart
function addToCart(product) {
  const existing = cart.find(item => 
    (item.code || item.item_code) === (product.code || product.item_code)
  );
  
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      item_code: product.code || product.item_code,
      name: product.name || product.item_name,
      price: product.sell_price || product.price || 0,
      qty: 1,
      unit: product.unit || 'ชิ้น'
    });
  }
  
  renderCart();
  showToast(`เพิ่ม ${product.name || product.item_name} แล้ว`, 'success');
}

// Render shopping cart
function renderCart() {
  const cartDiv = document.getElementById('cartItems');
  const totalEl = document.getElementById('totalAmount');
  const vatEl = document.getElementById('vatAmount');
  const grandEl = document.getElementById('grandTotal');
  
  if (!cartDiv) return;
  
  if (cart.length === 0) {
    cartDiv.innerHTML = '<p class="text-muted">ยังไม่มีสินค้าในตะกร้า</p>';
    updateTotals(0, 0, 0);
    return;
  }
  
  cartDiv.innerHTML = '';
  let subtotal = 0;
  
  cart.forEach((item, index) => {
    const itemTotal = item.price * item.qty;
    subtotal += itemTotal;
    
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h6 class="mb-0">${item.name}</h6>
          <small class="text-muted">฿${item.price.toLocaleString()} x ${item.qty}</small>
        </div>
        <div>
          <button class="btn btn-sm btn-outline-secondary" onclick="updateQty(${index}, -1)">-</button>
          <span class="mx-2">${item.qty}</span>
          <button class="btn btn-sm btn-outline-primary" onclick="updateQty(${index}, 1)">+</button>
          <button class="btn btn-sm btn-outline-danger ms-2" onclick="removeFromCart(${index})">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
      <div class="text-end mt-1">
        <strong>฿${itemTotal.toLocaleString()}</strong>
      </div>
    `;
    cartDiv.appendChild(div);
  });
  
  const vat = Math.round(subtotal * 0.07);
  const grandTotal = subtotal + vat;
  updateTotals(subtotal, vat, grandTotal);
}

// Update quantity
function updateQty(index, change) {
  if (cart[index]) {
    cart[index].qty += change;
    if (cart[index].qty <= 0) {
      cart.splice(index, 1);
    }
    renderCart();
  }
}

// Remove from cart
function removeFromCart(index) {
  if (cart[index]) {
    const name = cart[index].name;
    cart.splice(index, 1);
    renderCart();
    showToast(`ลบ ${name} แล้ว`, 'info');
  }
}

// Update total displays
function updateTotals(subtotal, vat, grandTotal) {
  const totalEl = document.getElementById('totalAmount');
  const vatEl = document.getElementById('vatAmount');
  const grandEl = document.getElementById('grandTotal');
  
  if (totalEl) totalEl.textContent = subtotal.toLocaleString();
  if (vatEl) vatEl.textContent = vat.toLocaleString();
  if (grandEl) grandEl.textContent = grandTotal.toLocaleString();
}

// Process sale
async function processSale() {
  if (cart.length === 0) {
    showToast('กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ', 'warning');
    return;
  }
  
  const paymentMethod = document.getElementById('paymentMethod')?.value || 'cash';
  const customerName = document.getElementById('customerName')?.value || '';
  
  const items = cart.map(item => ({
    item_code: item.item_code,
    name: item.name,
    price: item.price,
    qty: item.qty
  }));
  
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const vat = Math.round(subtotal * 0.07);
  const total = subtotal + vat;
  
  // Show confirmation
  if (!confirm(`ยืนยันการขาย?\nยอดรวม: ฿${total.toLocaleString()}\nวิธีชำระ: ${paymentMethod}`)) {
    return;
  }
  
  try {
    showToast('กำลังบันทึกการขาย...', 'info');
    
    const payload = {
      items: items,
      payment_method: paymentMethod,
      customer_name: customerName,
      cashier: 'POS_USER', // Should get from login session
      vat_rate: 0.07
    };
    
    const res = await callGas('createSale', payload);
    
    if (res && res.success) {
      showToast(`บันทึกการขายสำเร็จ! เลขที่: ${res.sale_id}`, 'success');
      // Clear cart
      cart = [];
      renderCart();
      document.getElementById('customerName').value = '';
    } else {
      showToast(res?.error || 'เกิดข้อผิดพลาด', 'error');
    }
  } catch (error) {
    console.error('Error processing sale:', error);
    showToast('เกิดข้อผิดพลาดในการบันทึกการขาย', 'error');
  }
}

// Toast notification (reuse from main app)
function showToast(message, type = 'info') {
  // Create toast container if not exists
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999;';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible`;
  toast.innerHTML = `
    ${message}
    <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 3000);
}

// GAS API call helper - Use callApi() as per Rule 1 in api_client.js
async function callGas(action, payload = {}) {
  // callApi() handles authentication token automatically
  if (typeof callApi === 'function') {
    return callApi(action, payload);
  }
  // Fallback if callApi not available
  return new Promise((resolve, reject) => {
    const url = window.GAS_CONFIG?.url || window.COMPHONE_GAS_URL || '';
    if (!url) {
      reject(new Error('GAS URL not configured'));
      return;
    }
    const token = (typeof getAuthToken === 'function') ? getAuthToken() : '';
    const qs = new URLSearchParams(Object.assign({}, payload, { action, token })).toString();
    fetch(url + '?' + qs, { redirect: 'follow' })
      .then(r => r.json())
      .then(resolve)
      .catch(reject);
  });
}
