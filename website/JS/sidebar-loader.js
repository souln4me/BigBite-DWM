/**
 * sidebar-loader.js
 * CONTROLADOR MAESTRO DEL PANEL DE ADMIN
 * - Carga Sidebar
 * - Gestiona Seguridad (Permisos)
 * - Gestiona Sesión (Logout y Renovación)
 * - Menú Responsive
 */

// 1. CONFIGURACIÓN DE PERMISOS
const PERMISOS_PAGINAS = {
    'reportes_ventas.html': ['Administrador', 'Dueño'],
    'ordenes_cocina.html': ['Administrador', 'Dueño', 'Cajero Virtual'],
    'despachos.html': ['Administrador', 'Dueño', 'Encargado Despachos'],
    'mantenedor_productos.html': ['Administrador', 'Dueño'],
    'mantenedor_usuarios.html': ['Administrador', 'Dueño'],
    'mantenedor_clientes.html': ['Administrador', 'Dueño']
};

// 2. VALIDACIÓN DE ACCESO INICIAL
function validarAccesoInicial() {
    const token = localStorage.getItem('token_bigbite');
    const usuarioData = localStorage.getItem('usuario_bigbite');

    if (!token || !usuarioData) {
        window.location.href = '../login.html';
        return null;
    }

    const usuario = JSON.parse(usuarioData);
    const miRol = usuario.rol.nombre;
    const path = window.location.pathname;
    const paginaActual = path.substring(path.lastIndexOf('/') + 1);

    if (PERMISOS_PAGINAS[paginaActual] && !PERMISOS_PAGINAS[paginaActual].includes(miRol)) {
        alert(`⛔ Acceso Denegado\n\nTu perfil de "${miRol}" no tiene autorización para estar aquí.`);
        window.location.href = '../inicio.html';
        return null;
    }
    return usuario;
}

const usuarioGlobal = validarAccesoInicial();

// 3. CARGA DEL SIDEBAR
function loadSidebar() {
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    if (!sidebarPlaceholder || !usuarioGlobal) return;

    fetch('includes/sidebar.html')
        .then(r => r.text())
        .then(data => {
            sidebarPlaceholder.innerHTML = data;

            // A. Link Activo
            const path = window.location.pathname;
            const currentPage = path.substring(path.lastIndexOf('/') + 1);
            document.querySelectorAll('.nav-sidebar .nav-link').forEach(l => {
                const href = l.getAttribute('href');
                if (href && href.includes(currentPage)) {
                    l.classList.add('active');
                }
            });

            // B. Nombre y Foto
            const primerNombre = usuarioGlobal.nombre_completo ? usuarioGlobal.nombre_completo.split(' ')[0] : 'Admin';
            const labelNombre = document.getElementById('sidebar-username');
            if (labelNombre) labelNombre.textContent = primerNombre;

            if (usuarioGlobal.img) {
                const avatarPlaceholder = document.querySelector('#dropdownUser1 .rounded-circle');
                if (avatarPlaceholder) {
                    const img = document.createElement('img');
                    img.src = usuarioGlobal.img;
                    img.className = "rounded-circle me-2";
                    img.style.width = "32px";
                    img.style.height = "32px";
                    img.style.objectFit = "cover";
                    img.style.border = "2px solid #ffc107";
                    avatarPlaceholder.replaceWith(img);
                }
            }

            // C. Responsive
            const toggleBtn = document.getElementById('sidebarToggle');
            const sidebar = document.querySelector('.nav-sidebar');
            let overlay = document.getElementById('sidebar-overlay');
            if (!overlay && toggleBtn) {
                overlay = document.createElement('div');
                overlay.id = 'sidebar-overlay';
                document.body.appendChild(overlay);
            }
            if (toggleBtn && sidebar) {
                toggleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    sidebar.classList.toggle('active');
                    if (overlay) overlay.classList.toggle('active');
                });
                if (overlay) overlay.addEventListener('click', () => {
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                });
            }

            // D. Logout
            const btnLogoutSide = document.getElementById('btn-logout-sidebar');
            if (btnLogoutSide) {
                btnLogoutSide.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (confirm("¿Cerrar sesión?")) {
                        localStorage.clear();
                        window.location.href = '../login.html';
                    }
                });
            }

            // E. Protección Clics
            const miRol = usuarioGlobal.rol.nombre;
            document.querySelectorAll('.nav-sidebar .nav-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    const href = link.getAttribute('href');
                    if (!href) return;
                    const targetPage = href.split('/').pop().split('?')[0];
                    if (PERMISOS_PAGINAS[targetPage] && !PERMISOS_PAGINAS[targetPage].includes(miRol)) {
                        e.preventDefault();
                        alert(`⛔ Acceso Restringido\n\nTu perfil de "${miRol}" no tiene permisos.`);
                    }
                });
            });

        })
        .catch(err => console.error("Error sidebar:", err));
}

// 4. GESTIÓN DE SESIÓN (Renovación Automática)
const TIEMPO_RENOVACION_MIN = 5;
let ultimoRefreshTime = Date.now();

function iniciarGestorSesion() {
    ['click', 'mousemove', 'keypress', 'touchstart'].forEach(evento => {
        document.addEventListener(evento, intentarRenovarToken);
    });
}

async function intentarRenovarToken() {
    const ahora = Date.now();
    const tiempoPasado = (ahora - ultimoRefreshTime) / 1000 / 60; // Minutos

    if (tiempoPasado >= TIEMPO_RENOVACION_MIN) {
        ultimoRefreshTime = ahora;
        const tokenActual = localStorage.getItem('token_bigbite');

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
                localStorage.setItem('token_bigbite', json.data.renovarSesion);
                console.log("✅ (Admin) Sesión renovada.");
            }
        } catch (e) {
            console.warn("Error renovando sesión admin:", e);
        }
    }
}

// EJECUTAR TODO
document.addEventListener('DOMContentLoaded', () => {
    loadSidebar();
    iniciarGestorSesion();
});