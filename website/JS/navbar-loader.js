/**
 * navbar-loader.js
 * Carga el Navbar Público, gestiona Sesión (Login/Dropdown), Carrito, Logout y Sesión Deslizante.
 */

function loadNavbar() {
    const placeholder = document.getElementById("navbar-placeholder");
    if (!placeholder) return;

    fetch("components/navbar.html")
        .then(response => response.text())
        .then(data => {
            placeholder.innerHTML = data;

            // 1. MARCAR LINK ACTIVO (Resaltar página actual)
            const currentPage = window.location.pathname.split("/").pop();
            document.querySelectorAll("nav a").forEach(link => {
                const href = link.getAttribute("href");
                // Verifica si el href coincide con la página actual
                if (href && currentPage.includes(href.replace('./', ''))) {
                    link.classList.add("active");
                }
            });

            // 2. LÓGICA DE USUARIO
            const container = document.getElementById('auth-container');
            const token = localStorage.getItem('token_bigbite');
            const usuarioStr = localStorage.getItem('usuario_bigbite');

            if (container) {
                if (token && usuarioStr) {
                    // --- A. USUARIO LOGUEADO ---
                    let usuario = {};
                    try { usuario = JSON.parse(usuarioStr); } catch (e) { console.error(e); }

                    // Nombre y Foto
                    const nombre = usuario.nombre_completo ? usuario.nombre_completo.split(' ')[0] : 'Cliente';
                    const inicial = nombre.charAt(0).toUpperCase();

                    let avatarHTML = `<div class="user-avatar-nav">${inicial}</div>`;
                    if (usuario.img) {
                        avatarHTML = `<img src="${usuario.img}" class="user-avatar-nav" style="object-fit: cover;">`;
                    }

                    // Inyectar Dropdown
                    container.innerHTML = `
                        <div class="dropdown">
                            <button class="btn-user-nav dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                ${avatarHTML}
                                <span>Hola, ${nombre}</span>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end animate slideIn">
                                <li><a class="dropdown-item" href="perfil_usuario.html"><i class="bi bi-person-circle"></i> Mi Perfil</a></li>
                                <li><a class="dropdown-item" href="mis_pedidos.html"><i class="bi bi-bag-check"></i> Mis Pedidos</a></li>
                                <li><a class="dropdown-item" href="cambiar_pass.html"><i class="bi bi-key"></i> Cambiar Clave</a></li>
                                <li><hr class="dropdown-divider border-secondary opacity-50"></li>
                                <li><a class="dropdown-item text-danger" href="#" id="btn-logout-nav"><i class="bi bi-box-arrow-right"></i> Cerrar Sesión</a></li>
                            </ul>
                        </div>
                    `;

                    // Activar Logout
                    setTimeout(() => {
                        const btnLogout = document.getElementById('btn-logout-nav');
                        if (btnLogout) {
                            btnLogout.addEventListener('click', (e) => {
                                e.preventDefault();
                                if (confirm("¿Cerrar sesión?")) {
                                    localStorage.clear();
                                    window.location.href = 'inicio.html';
                                }
                            });
                        }
                    }, 100);

                } else {
                    // --- B. NO LOGUEADO (Botón Iniciar Sesión) ---
                    container.innerHTML = `
                        <a href="login.html" class="btn-login-nav">
                            <i class="bi bi-person me-2"></i> Iniciar Sesión
                        </a>
                    `;
                }
            }

            // 3. ACTUALIZAR CARRITO
            updateCartBadge();
        })
        .catch(err => console.error("Error cargando navbar:", err));
}

// Función global para actualizar el badge del carrito desde cualquier lado
function updateCartBadge() {
    setTimeout(() => {
        const badge = document.getElementById('cart-count');
        if (!badge) return;
        const cart = JSON.parse(localStorage.getItem('carrito')) || [];
        const totalItems = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);

        badge.textContent = totalItems;
        // Mostrar badge solo si hay items
        badge.style.display = totalItems > 0 ? 'inline-block' : 'none';
    }, 50);
}

// Cargar Footer también (para ahorrar código en los HTML)
function loadFooter() {
    const f = document.getElementById("footer-placeholder");
    if (f) fetch("components/footer.html").then(r => r.text()).then(d => f.innerHTML = d);
}

// Hacer funciones accesibles globalmente
window.loadNavbar = loadNavbar;
window.updateCartBadge = updateCartBadge;

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    loadNavbar();
    loadFooter();
});

/* =========================================================== */
/* === GESTOR DE SESIÓN DESLIZANTE (AUTO-LOGOUT & REFRESH) === */
/* =========================================================== */

const TIEMPO_EXPIRACION_MIN = 30; // 30 Minutos de inactividad máxima
const TIEMPO_RENOVACION_MIN = 5;  // Intentar renovar el token cada 5 min si hay actividad

let temporizadorInactividad;
let ultimoRefreshTime = Date.now();

function iniciarGestorSesion() {
    const token = localStorage.getItem('token_bigbite');
    if (!token) return; // Si no hay sesión, no hacemos nada

    // 1. Configurar el "Logout por Inactividad" inicial
    resetearTemporizador();

    // 2. Escuchar eventos de actividad del usuario
    // Cada vez que haga algo, reiniciamos la cuenta regresiva
    ['click', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(evento => {
        document.addEventListener(evento, () => {
            resetearTemporizador();
            intentarRenovarToken();
        });
    });
}

function resetearTemporizador() {
    // Si había una bomba de tiempo, la desactivamos
    if (temporizadorInactividad) clearTimeout(temporizadorInactividad);

    // Ponemos una nueva bomba a 30 minutos
    temporizadorInactividad = setTimeout(() => {
        // SI LLEGAMOS AQUÍ, ES QUE EL USUARIO NO HIZO NADA EN 30 MIN
        alert("Tu sesión ha cerrado por inactividad.");
        cerrarSesionForzada();
    }, TIEMPO_EXPIRACION_MIN * 60 * 1000);
}

function cerrarSesionForzada() {
    localStorage.removeItem('token_bigbite');
    localStorage.removeItem('usuario_bigbite');
    window.location.href = '../login.html';
}

async function intentarRenovarToken() {
    // Solo molestamos al servidor si han pasado más de 5 minutos desde la última renovación
    const ahora = Date.now();
    const tiempoPasado = (ahora - ultimoRefreshTime) / 1000 / 60; // En minutos

    if (tiempoPasado >= TIEMPO_RENOVACION_MIN) {
        // Actualizamos la marca de tiempo para no spammear
        ultimoRefreshTime = ahora; 
        
        console.log("🔄 Renovando sesión silenciosamente...");
        const tokenActual = localStorage.getItem('token_bigbite');
        
        // Llamada especial al Backend
        try {
            const query = `mutation { renovarSesion }`;
            const response = await fetch(GRAPHQL_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokenActual}`
                },
                body: JSON.stringify({ query })
            });
            const json = await response.json();

            if (json.data && json.data.renovarSesion) {
                // ¡Éxito! Guardamos el nuevo token fresco
                localStorage.setItem('token_bigbite', json.data.renovarSesion);
                console.log("✅ Sesión extendida 30 min más.");
            }
        } catch (e) {
            console.warn("No se pudo renovar sesión (tal vez ya expiró).", e);
        }
    }
}

// Iniciar el gestor apenas cargue la página
document.addEventListener('DOMContentLoaded', iniciarGestorSesion);