// ==============
// 1. CONFIGURACIÓN Y NAVBAR
// ==============

// Helper para peticiones GraphQL simples
async function gqlRequest(query, variables = {}) {
  const token = localStorage.getItem('token_bigbite');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ query, variables })
    });
    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
  } catch (e) {
    console.error("Error GQL:", e);
    return null;
  }
}

// ==============
// 2. LÓGICA DE PRODUCTOS
// ==============

document.addEventListener('DOMContentLoaded', () => {
  const modalElement = document.getElementById('productModal');
  const bsModal = new bootstrap.Modal(modalElement);
  const contenedorProductos = document.getElementById('contenedor-productos');
  const noProductsMessage = document.getElementById('no-products-message');
  const goToCartBtn = document.getElementById('go-to-cart-btn');
  const orderBar = document.getElementById('order-summary-bar');
  const leftColumn = document.getElementById('order-summary-left');

  // --- A. AGREGAR AL CARRITO (LÓGICA CORREGIDA) ---
  window.addToCart = async function (id, nombre, precio, img) {
    const token = localStorage.getItem('token_bigbite');
    const usuario = JSON.parse(localStorage.getItem('usuario_bigbite'));

    // 1. Feedback visual
    const btn = document.querySelector('#productModal .cart-btn');
    const originalText = '<i class="bi bi-cart3 me-2"></i> Agregar al carrito';
    if (btn) {
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Agregando...';
      btn.disabled = true;
    }
    
    // Miramos el carrito local para saber cuántos hay y sumarle 1
    const localCart = JSON.parse(localStorage.getItem('carrito')) || [];
    const existingItem = localCart.find(i => i.id === id);
    const cantidadFinal = existingItem ? existingItem.quantity + 1 : 1;

    // 2. ESCENARIO: USUARIO LOGUEADO -> Base de Datos
    if (token && usuario) {
      const mutation = `
              mutation Add($u: ID!, $p: ID!, $c: Int!) {
                  agregarAlCarrito(usuarioId: $u, productoId: $p, cantidad: $c) { id }
              }
          `;

      // ¡AQUÍ ESTÁ EL CAMBIO! Enviamos 'cantidadFinal' en vez de '1'
      await gqlRequest(mutation, { u: usuario.id, p: id, c: cantidadFinal });

      // Sincronizamos localmente
      guardarEnLocal(id, nombre, precio, img);
    }
    // 3. ESCENARIO: INVITADO -> LocalStorage
    else {
      guardarEnLocal(id, nombre, precio, img);
    }

    // 4. Feedback Final
    if (btn) {
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-success');
      btn.innerHTML = '<i class="bi bi-check-lg me-2"></i> ¡Agregado!';

      setTimeout(() => {
        btn.classList.remove('btn-success');
        btn.classList.add('btn-primary');
        btn.innerHTML = originalText;
        btn.disabled = false;

        const modalEl = document.getElementById('productModal');
        if (modalEl) modalEl.focus();
      }, 700);
    }
  };

  function guardarEnLocal(id, name, price, image) {
    const cart = JSON.parse(localStorage.getItem('carrito')) || [];
    const existing = cart.find(i => i.id === id || i.name === name);

    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
    } else {
      cart.push({ id, name, price, quantity: 1, image });
    }

    localStorage.setItem('carrito', JSON.stringify(cart));
    window.dispatchEvent(new Event('cart-updated'));
    updateCartBadge();
    updateOrderSummary();
  }

  // --- B. RENDERIZADO ---
  async function cargarProductosDesdeBD() {
    const query = `
      query {
        getProductos {
          id, nombre, descripcion, precio, stock, img, esta_activo
          categoria { nombre }
        }
      }
    `;
    const data = await gqlRequest(query);
    if (data && data.getProductos) {
      renderizarProductos(data.getProductos);
    } else {
      if (contenedorProductos) contenedorProductos.innerHTML = '<h4 class="text-center text-danger">Error de conexión</h4>';
    }
  }

  function renderizarProductos(lista) {
    if (!contenedorProductos) return;
    contenedorProductos.innerHTML = '';

    lista.forEach(prod => {
      if (!prod.esta_activo) return;

      const catClass = prod.categoria ? normalizarCategoria(prod.categoria.nombre) : 'otros';
      const imgSrc = prod.img || 'img/default.jpg';

      // Lógica Stock
      const sinStock = prod.stock <= 0;
      const unavailableClass = sinStock ? 'unavailable-product' : '';
      const overlayHTML = sinStock
        ? '<div class="unavailable-overlay">Agotado</div>'
        : `<div class="ingredients-overlay">
            <p class="ingredients-list">${prod.descripcion || ''}</p>
            <div class="view-product">Ver producto</div>
          </div>`;

      // DATOS SEGUROS PARA HTML
      const cardHTML = `
        <div class="col-md-4 col-sm-6 mb-4 product-card ${catClass} ${unavailableClass} reveal" 
             data-id="${prod.id}"
             data-nombre="${prod.nombre}"
             data-precio="${prod.precio}"
             data-img="${imgSrc}"
             data-desc="${prod.descripcion || ''}"
             tabindex="0">
          <div class="card h-100">
             <div class="image-container">
                <img src="${imgSrc}" class="card-img-top" alt="${prod.nombre}">
                ${overlayHTML}
             </div>
             <div class="card-body">
                <h5 class="category">${prod.categoria.nombre.toUpperCase()}</h5>
                <h5 class="card-title">${prod.nombre}</h5>
                <p class="card-text new-price">$${prod.precio.toLocaleString('es-CL')}</p>
             </div>
          </div>
        </div>
      `;
      contenedorProductos.innerHTML += cardHTML;
    });
    activarAnimaciones();
    activarEventosDeProductos();
  }

  // Función auxiliar para animaciones (asegúrate de tener el Observer en tu código)
  function activarAnimaciones() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  function activarEventosDeProductos() {
    // Filtros
    const filterButtons = document.querySelectorAll('.filter-btn');
    const cards = document.querySelectorAll('.product-card');

    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.category;
        let visible = 0;
        cards.forEach(card => {
          if (cat === 'todos' || card.classList.contains(cat)) {
            card.classList.remove('d-none'); visible++;
          } else { card.classList.add('d-none'); }
        });
        if (noProductsMessage) {
          if (visible === 0) noProductsMessage.classList.remove('d-none');
          else noProductsMessage.classList.add('d-none');
        }
      });
    });

    // Click en Tarjeta -> Modal
    cards.forEach(card => {
      card.addEventListener('click', function () {
        if (this.classList.contains('unavailable-product')) return;

        const id = this.dataset.id;
        const nombre = this.dataset.nombre;
        const precio = parseInt(this.dataset.precio);
        const img = this.dataset.img;
        const desc = this.dataset.desc;

        document.getElementById('modalTitle').textContent = nombre;
        document.getElementById('modalPrice').textContent = '$' + precio.toLocaleString('es-CL');
        document.getElementById('modalImage').src = img;
        // Limpiamos descripción de etiquetas HTML si las hubiera
        const descLimpia = desc.replace(/<[^>]*>?/gm, '');
        document.getElementById('modalIngredients').textContent = descLimpia;

        const addBtn = modalElement.querySelector('.cart-btn');

        // Restauramos botón por si quedó verde de antes
        addBtn.classList.remove('btn-success');
        addBtn.classList.add('btn-primary');
        addBtn.innerHTML = '<i class="bi bi-cart3 me-2"></i> Agregar al carrito';
        addBtn.disabled = false;

        // ASIGNAR FUNCION
        addBtn.onclick = () => addToCart(id, nombre, precio, img);

        bsModal.show();
      });
    });
  }

  function updateOrderSummary() {
    const cart = JSON.parse(localStorage.getItem('carrito')) || [];
    if (!cart.length || !orderBar) {
      if (orderBar) orderBar.classList.add('d-none');
      return;
    }
    let subtotal = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

    // Resumen corto (ej: "2x Combo, 1x Bebida")
    let itemsSummary = cart.map(i => `${i.quantity || 1}x ${i.name}`).join(', ');
    if (itemsSummary.length > 50) itemsSummary = itemsSummary.substring(0, 50) + '...';

    if (leftColumn) {
      leftColumn.innerHTML = `<strong>${itemsSummary}</strong> | <span class="order-total">Total: $${subtotal.toLocaleString('es-CL')}</span>`;
    }
    orderBar.classList.remove('d-none');
  }

  function normalizarCategoria(nombre) {
    if (!nombre) return 'otros';
    return nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ñ/g, "n").replace(/\s+/g, "_");
  }

  // INICIO
  cargarProductosDesdeBD();
  updateOrderSummary();
  if (goToCartBtn) goToCartBtn.addEventListener('click', () => window.location.href = 'carrito_de_compras.html');
});