const USER = "SusanaGS";
const PASS = "S.usa.435*";
const STORAGE_KEY = "encanto_elixir_products_v2";
let products = [];
let adminMode = false;

const $ = id => document.getElementById(id);

function loadProducts(){
  const saved = localStorage.getItem(STORAGE_KEY);
  products = saved ? JSON.parse(saved) : structuredClone(window.DEFAULT_PRODUCTS);
}
function saveProducts(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); }

function init(){
  loadProducts();
  renderCategories();
  renderCatalog();
  if(sessionStorage.getItem("encanto_auth")==="ok") setLoggedIn(true);
}
init();

$("loginOpenBtn").onclick = () => $("loginModal").classList.remove("hidden");
$("loginCloseBtn").onclick = () => $("loginModal").classList.add("hidden");
$("loginModal").addEventListener("click", e => { if(e.target.id==="loginModal") $("loginModal").classList.add("hidden"); });

$("loginForm").addEventListener("submit", e=>{
  e.preventDefault();
  if($("username").value.trim() === USER && $("password").value === PASS){
    sessionStorage.setItem("encanto_auth","ok");
    $("loginModal").classList.add("hidden");
    setLoggedIn(true);
    setAdminMode(true);
  }else{
    $("loginError").textContent = "Usuario o clave incorrectos.";
  }
});

function setLoggedIn(ok){
  $("loginOpenBtn").classList.toggle("hidden", ok);
  $("adminToggle").classList.toggle("hidden", !ok);
  $("logoutBtn").classList.toggle("hidden", !ok);
}
$("logoutBtn").onclick = ()=>{
  sessionStorage.removeItem("encanto_auth");
  setLoggedIn(false);
  setAdminMode(false);
};
$("adminToggle").onclick = ()=> setAdminMode(!adminMode);

function setAdminMode(active){
  adminMode = active;
  $("adminPanel").classList.toggle("hidden", !active);
  document.body.classList.toggle("admin-on", active);
  $("adminToggle").textContent = active ? "Ocultar admin" : "Panel admin";
  renderCatalog();
}

$("searchInput").addEventListener("input", renderCatalog);
$("categoryFilter").addEventListener("change", renderCatalog);

function normalizeText(t){
  return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
}

function renderCategories(){
  const categories = [...new Set(products.map(p=>p.category || "Catálogo"))].sort();
  $("categoryFilter").innerHTML = '<option value="">Todas las categorías</option>' +
    categories.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
}

function renderCatalog(){
  const q = normalizeText($("searchInput").value.trim());
  const cat = $("categoryFilter").value;
  const filtered = products.filter(p => {
    const haystack = normalizeText(`${p.name} ${p.price} ${p.category}`);
    return (!q || haystack.includes(q)) && (!cat || (p.category || "Catálogo") === cat);
  });
  $("countText").textContent = `${filtered.length} fragancias disponibles`;
  $("catalogGrid").innerHTML = filtered.map(p=>`
    <article class="card">
      <div class="card-actions">
        <button onclick="editProduct(${p.id})">Editar</button>
        <button class="danger" onclick="deleteProduct(${p.id})">Borrar</button>
      </div>
      <div class="image-box">${p.image ? `<img src="${p.image}" alt="${escapeHtml(p.name)}">` : `<div class="placeholder">Imagen<br>pendiente</div>`}</div>
      <div>
        <h3>${escapeHtml(p.name)}</h3>
        <span class="price">$${escapeHtml(p.price)}</span>
        <div class="category">${escapeHtml(p.category || "Catálogo")}</div>
      </div>
    </article>`).join("");
}

$("productForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const id = $("productId").value ? Number($("productId").value) : Date.now();
  const existing = products.find(p=>p.id===id);
  const file = $("productImage").files[0];
  const image = file ? await fileToDataURL(file) : (existing?.image || "");
  const product = {
    id,
    name: $("productName").value.trim(),
    price: $("productPrice").value.trim().replace("$",""),
    category: $("productCategory").value.trim() || "Catálogo",
    image
  };
  if(existing) Object.assign(existing, product); else products.unshift(product);
  saveProducts();
  renderCategories();
  renderCatalog();
  clearForm();
});

function editProduct(id){
  const p = products.find(x=>x.id===id);
  if(!p) return;
  if(!adminMode) setAdminMode(true);
  $("productId").value = p.id;
  $("productName").value = p.name;
  $("productPrice").value = p.price;
  $("productCategory").value = p.category || "Catálogo";
  window.scrollTo({top: document.querySelector(".admin-panel").offsetTop - 80, behavior:"smooth"});
}
function deleteProduct(id){
  if(confirm("¿Borrar esta loción?")){
    products = products.filter(p=>p.id!==id);
    saveProducts();
    renderCategories();
    renderCatalog();
  }
}
function clearForm(){
  $("productForm").reset();
  $("productId").value="";
}
$("clearForm").onclick = clearForm;

$("exportBtn").onclick = ()=>{
  const blob = new Blob([JSON.stringify(products,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "catalogo-encanto-elixir.json";
  a.click();
  URL.revokeObjectURL(a.href);
};
$("importInput").onchange = async e=>{
  const file = e.target.files[0];
  if(!file) return;
  products = JSON.parse(await file.text());
  saveProducts();
  renderCategories();
  renderCatalog();
  e.target.value="";
};
$("resetBtn").onclick = ()=>{
  if(confirm("Esto borra cambios locales y restaura la lista inicial. ¿Continuar?")){
    localStorage.removeItem(STORAGE_KEY);
    loadProducts();
    renderCategories();
    renderCatalog();
  }
};

function fileToDataURL(file){
  return new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
}
