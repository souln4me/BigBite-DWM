// ==============
// 1. NAVBAR Y FOOTER
// ==============

// Función para actualizar el contador (badge) del carrito en el navbar
function updateCartBadge() {
  const badge = document.getElementById('cart-count');
  if (!badge) return;

  const cart = JSON.parse(localStorage.getItem('carrito')) || [];
  const totalItems = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);

  badge.textContent = totalItems;
}

// Carga dinámica del Navbar
fetch("components/navbar.html")
  .then(response => response.text())
  .then(data => {
    const navbarPlaceholder = document.getElementById("navbar-placeholder");
    navbarPlaceholder.innerHTML = data;

    // Marca el enlace activo basado en la URL actual
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

    // Actualiza el contador del carrito una vez cargado el navbar
    updateCartBadge();

    // Protege el enlace de "Perfil" si el usuario no ha iniciado sesión
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

// Carga dinámica del Footer
fetch("components/footer.html")
  .then(response => response.text())
  .then(data => {
    document.getElementById("footer-placeholder").innerHTML = data;
  });

// Actualiza el badge si el carrito cambia en otra pestaña o al volver a la pestaña
window.addEventListener('storage', updateCartBadge);
window.addEventListener('visibilitychange', () => {
  if (!document.hidden) updateCartBadge();
});

// ==============
// 2. PRODUCTOS, MODAL Y CARRITO
// ==============

// Espera a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
  // Referencias a elementos del DOM
  const modalElement = document.getElementById('productModal');
  const bsModal = new bootstrap.Modal(modalElement);
  const goToCartBtn = document.getElementById('go-to-cart-btn');
  const productCards = document.querySelectorAll('.product-card');
  const orderBar = document.getElementById('order-summary-bar');
  const leftColumn = document.getElementById('order-summary-left');
  const noProductsMessage = document.getElementById('no-products-message');

  // ========== FUNCIONES DEL CARRITO ==========

  // Carga el carrito desde LocalStorage
  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem('carrito')) || [];
    } catch (e) {
      return [];
    }
  }

  // Guarda el carrito en LocalStorage y notifica (actualiza badge)
  function saveCart(cart) {
    localStorage.setItem('carrito', JSON.stringify(cart));
    window.dispatchEvent(new Event('cart-updated')); // Evento para sincronización
    updateCartBadge();
  }

  // Anima el botón "Agregar al carrito" en el modal
  function animateAddButton() {
    const btn = document.querySelector('#productModal .cart-btn');
    if (!btn) return;

    btn.classList.remove('animate');   // Limpia animación anterior
    btn.getBoundingClientRect();      // Fuerza reflow
    btn.classList.add('animate');     // Agrega clase de animación

    // Quita el foco del botón después de la animación (usabilidad)
    setTimeout(() => {
        btn.blur();
    }, 0);

    // Limpia la clase de animación cuando termina
    btn.addEventListener('animationend', function handler() {
      btn.classList.remove('animate');
      btn.removeEventListener('animationend', handler);
    });
  }

  // Añade un producto al carrito (o incrementa cantidad si ya existe)
  function addToCart(productName, productPrice, productImage) {
    const cart = loadCart();
    const existing = cart.find(i => i.name === productName);
    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
    } else {
      cart.push({ name: productName, price: productPrice, quantity: 1, image: productImage });
    }
    saveCart(cart);
    updateOrderSummary(); // Actualiza la barra inferior
    animateAddButton();   // Anima el botón del modal
  }

  // Actualiza la barra inferior de resumen del pedido
  function updateOrderSummary() {
    const cart = loadCart();
    // Si el carrito está vacío, oculta la barra
    if (!cart || cart.length === 0) {
      orderBar.classList.add('d-none');
      return;
    }

    // Agrupa productos por nombre y calcula subtotal
    const agg = {};
    let subtotal = 0;
    cart.forEach(it => {
      const qty = it.quantity || 1;
      if (!agg[it.name]) agg[it.name] = { ...it };
      else agg[it.name].quantity = (agg[it.name].quantity || 0) + qty;
      subtotal += (it.price || 0) * qty;
    });

    // Construye el texto del resumen (ej: "2x Hamburguesa, 1x Papas")
    let text = '';
    for (const [name, item] of Object.entries(agg)) {
      text += `${item.quantity}x ${name}, `;
    }
    text = text.replace(/, $/, ''); // Elimina la última coma y espacio

    // Actualiza el HTML de la barra y la muestra
    leftColumn.innerHTML = `
            <strong>${text}</strong> |
            <span class="order-total">Subtotal: ${formatPrice(subtotal)}</span>
        `;
    orderBar.classList.remove('d-none');
  }

  // Funciones de utilidad para precios
  function parsePriceString(s) { return parseInt((s || '').replace(/\D/g, ''), 10) || 0; }
  function formatPrice(n) { return '$' + n.toLocaleString('es-CL'); }

  // ========== FILTROS DE PRODUCTOS ==========

  const filterButtons = document.querySelectorAll('.filter-btn');
  const productCardsArr = Array.from(productCards); // Convierte NodeList a Array
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Gestiona la clase 'active' en los botones de filtro
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.category; // Obtiene la categoría del botón pulsado
      let visible = 0; // Contador de productos visibles

      // Muestra u oculta las tarjetas de producto según la categoría
      productCardsArr.forEach(card => {
        if (cat === 'todos' || card.classList.contains(cat)) {
          card.classList.remove('d-none');
          visible++;
        } else {
          card.classList.add('d-none');
        }
      });

      // Muestra u oculta el mensaje de "No hay productos"
      if (visible === 0) noProductsMessage.classList.remove('hidden');
      else noProductsMessage.classList.add('hidden');
    });
  });

  // ========== MODAL DE PRODUCTO ==========

  // Añade listeners a cada tarjeta de producto para abrir el modal
  productCards.forEach(card => {
    card.setAttribute('tabindex', card.getAttribute('tabindex') || '0'); // Para accesibilidad (navegación por teclado)

    card.addEventListener('click', function () {
      // No abre el modal si el producto está marcado como no disponible
      if (this.classList.contains('unavailable-product')) return;

      // Extrae la información del producto de la tarjeta clickeada
      const title = this.querySelector('.card-title').textContent.trim();
      const priceEl = this.querySelector('.new-price') || this.querySelector('.card-text');
      const price = parsePriceString(priceEl.textContent);
      const image = this.querySelector('.card-img-top').src;
      const ingredientsOverlay = this.querySelector('.ingredients-overlay');
      const ingredientsHTML = ingredientsOverlay ? ingredientsOverlay.innerHTML : '';

      // Rellena el contenido del modal
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalPrice').textContent = priceEl.textContent; // Muestra precio formateado
      document.getElementById('modalImage').src = image;
      // Limpia el HTML de ingredientes (quita el "Ver producto")
      document.getElementById('modalIngredients').innerHTML = ingredientsHTML.replace('<div class="view-product">Ver producto</div>', '');

      const addBtn = modalElement.querySelector('.cart-btn');

      // Resetea animación del botón por si se abrió rápido otra vez
      addBtn.classList.remove('animate');
      addBtn.getBoundingClientRect(); // Fuerza reflow

      // Asigna la función de añadir al carrito al botón del modal
      addBtn.onclick = () => addToCart(title, price, image);

      // Muestra el modal
      bsModal.show();
    });

    // Permite abrir el modal con Enter o Espacio (accesibilidad)
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.click();
      }
    });
  });

  // ========== BOTÓN "IR AL CARRITO" ==========
  goToCartBtn.addEventListener('click', () => {
    window.location.href = 'carrito_de_compras.html';
  });

  // ========== SINCRONIZACIÓN ENTRE PESTAÑAS ==========
  // Escucha cambios en LocalStorage (hechos en otra pestaña)
  window.addEventListener('storage', () => {
    updateOrderSummary();
    updateCartBadge();
  });
  // Escucha cuando la pestaña vuelve a ser visible
  window.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      updateOrderSummary();
      updateCartBadge();
    }
  });

  // ========== INICIALIZACIÓN ==========
  // Actualiza la barra de resumen y el badge al cargar la página
  updateOrderSummary();
  updateCartBadge();
});