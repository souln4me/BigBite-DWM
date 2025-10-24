// ==============
// 1. NAVBAR Y FOOTER
// ==============
function updateCartBadge() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;

    const cart = JSON.parse(localStorage.getItem('carrito')) || [];
    const totalItems = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);

    badge.textContent = totalItems;
}

// Cargar navbar
fetch("components/navbar.html")
    .then(response => response.text())
    .then(data => {
        const navbarPlaceholder = document.getElementById("navbar-placeholder");
        navbarPlaceholder.innerHTML = data;

        const currentPage = window.location.pathname.split("/").pop();
        const links = navbarPlaceholder.querySelectorAll("nav a");
        links.forEach(link => {
            const href = link.getAttribute("href");
            if (href && currentPage.includes(href.replace('./', ''))) {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });

        updateCartBadge();

        const perfilLink = document.getElementById('perfil-link');
        if (perfilLink) {
            perfilLink.addEventListener('click', (e) => {
                const usuarioLogueado = localStorage.getItem('usuarioLogueado');
                if (!usuarioLogueado) {
                    e.preventDefault();
                    window.location.href = 'login.html';
                }
            });
        }
    });

// Cargar footer
fetch("components/footer.html")
    .then(response => response.text())
    .then(data => {
        document.getElementById("footer-placeholder").innerHTML = data;
    });

// Actualizar badge si se modifica localStorage o cambia visibilidad
window.addEventListener('storage', updateCartBadge);
window.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateCartBadge();
});

// ==============
// 2. PRODUCTOS, MODAL Y CARRITO
// ==============
document.addEventListener('DOMContentLoaded', () => {
    const modalElement = document.getElementById('productModal');
    const bsModal = new bootstrap.Modal(modalElement);
    const goToCartBtn = document.getElementById('go-to-cart-btn');
    const productCards = document.querySelectorAll('.product-card');
    const orderBar = document.getElementById('order-summary-bar');
    const leftColumn = document.getElementById('order-summary-left');
    const noProductsMessage = document.getElementById('no-products-message');

    // ========== CART FUNCTIONS ==========
    function loadCart() {
        try {
            return JSON.parse(localStorage.getItem('carrito')) || [];
        } catch (e) {
            return [];
        }
    }

    function saveCart(cart) {
        localStorage.setItem('carrito', JSON.stringify(cart));
        window.dispatchEvent(new Event('cart-updated'));
        updateCartBadge();
    }

    function animateAddButton() {
        const btn = document.querySelector('#productModal .cart-btn');
        if (!btn) return;

        btn.classList.remove('animate');   // Limpiar animación previa
        btn.getBoundingClientRect();       // Forzar repaint
        btn.classList.add('animate');      // Agregar animación


        setTimeout(() => {
            btn.blur();
        }, 0);

        btn.addEventListener('animationend', function handler() {
            btn.classList.remove('animate'); // Quitar clase al terminar animación
            btn.removeEventListener('animationend', handler);
        });
    }

    function addToCart(productName, productPrice, productImage) {
        const cart = loadCart();
        const existing = cart.find(i => i.name === productName);
        if (existing) {
            existing.quantity = (existing.quantity || 1) + 1;
        } else {
            cart.push({ name: productName, price: productPrice, quantity: 1, image: productImage });
        }
        saveCart(cart);
        updateOrderSummary();
        animateAddButton();  // animación del botón solo al hacer click
    }

    function updateOrderSummary() {
        const cart = loadCart();
        if (!cart || cart.length === 0) {
            orderBar.classList.add('d-none');
            return;
        }

        const agg = {};
        let subtotal = 0;
        cart.forEach(it => {
            const qty = it.quantity || 1;
            if (!agg[it.name]) agg[it.name] = { ...it };
            else agg[it.name].quantity = (agg[it.name].quantity || 0) + qty;
            subtotal += (it.price || 0) * qty;
        });

        let text = '';
        for (const [name, item] of Object.entries(agg)) {
            text += `${item.quantity}x ${name}, `;
        }
        text = text.replace(/, $/, '');

        leftColumn.innerHTML = `
            <strong>${text}</strong> |
            <span class="order-total">Subtotal: ${formatPrice(subtotal)}</span>
        `;
        orderBar.classList.remove('d-none');
    }

    function parsePriceString(s) { return parseInt((s || '').replace(/\D/g, ''), 10) || 0; }
    function formatPrice(n) { return '$' + n.toLocaleString('es-CL'); }

    // ========== PRODUCT FILTERS ==========
    const filterButtons = document.querySelectorAll('.filter-btn');
    const productCardsArr = Array.from(productCards);
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const cat = btn.dataset.category;
            let visible = 0;

            productCardsArr.forEach(card => {
                if (cat === 'todos' || card.classList.contains(cat)) {
                    card.classList.remove('d-none');
                    visible++;
                } else {
                    card.classList.add('d-none');
                }
            });

            if (visible === 0) noProductsMessage.classList.remove('hidden');
            else noProductsMessage.classList.add('hidden');
        });
    });

    // ========== PRODUCT MODAL ==========
    productCards.forEach(card => {
        card.setAttribute('tabindex', card.getAttribute('tabindex') || '0');

        card.addEventListener('click', function () {
            if (this.classList.contains('unavailable-product')) return;

            const title = this.querySelector('.card-title').textContent.trim();
            const priceEl = this.querySelector('.new-price') || this.querySelector('.card-text');
            const price = parsePriceString(priceEl.textContent);
            const image = this.querySelector('.card-img-top').src;
            const ingredientsOverlay = this.querySelector('.ingredients-overlay');
            const ingredientsHTML = ingredientsOverlay ? ingredientsOverlay.innerHTML : '';

            document.getElementById('modalTitle').textContent = title;
            document.getElementById('modalPrice').textContent = priceEl.textContent;
            document.getElementById('modalImage').src = image;
            document.getElementById('modalIngredients').innerHTML = ingredientsHTML.replace('<div class="view-product">Ver producto</div>', '');

            if (this.classList.contains('hamburguesas')) {
                document.getElementById('modalExtras').innerHTML = `
                    <div class="mb-3">
                        <h6>Extras disponibles:</h6>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="extraQueso">
                            <label class="form-check-label" for="extraQueso">Queso extra (+$1.000)</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="extraTocino">
                            <label class="form-check-label" for="extraTocino">Tocino extra (+$1.800)</label>
                        </div>
                    </div>`;
            } else {
                document.getElementById('modalExtras').innerHTML = '';
            }

            const addBtn = modalElement.querySelector('.cart-btn');

            addBtn.classList.remove('animate');
            addBtn.getBoundingClientRect();  // Forzar repaint

            addBtn.onclick = () => addToCart(title, price, image);

            bsModal.show();
        });

        card.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });

    // ========== GO TO CART BUTTON ==========
    goToCartBtn.addEventListener('click', () => {
        window.location.href = 'carrito_de_compras.html';
    });

    // ========== SYNC STORAGE ==========
    window.addEventListener('storage', () => {
        updateOrderSummary();
        updateCartBadge();
    });
    window.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            updateOrderSummary();
            updateCartBadge();
        }
    });

    // ========== INIT ==========
    updateOrderSummary();
    updateCartBadge();
});
