const USER = "SusanaGS";
const PASS = "S.usa.435*";
const STORAGE_KEY = "encanto_elixir_products_v1";
let products = [];
let adminMode = false;

const $ = (id)=>document.getElementById(id);

function loadProducts(){
  const saved = localStorage.getItem(STORAGE_KEY);
  products = saved ? JSON.parse(saved) : structuredClone(window.DEFAULT_PRODUCTS);
}
function saveProducts(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); }

function login(){
  $("loginView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  loadProducts(); renderCategories(); renderCatalog();
}

$("loginForm").addEventListener("submit", e=>{
  e.preventDefault();
  if($("username").value.trim() === USER && $("password").value === PASS){
    sessionStorage.setItem("encanto_auth","ok"); login();
  }else $("loginError").textContent = "Usuario o clave incorrectos.";
});
$("logoutBtn").onclick = ()=>{sessionStorage.removeItem("encanto_auth"); location.reload();};
if(sessionStorage.getItem("encanto_auth")==="ok") login();

$("adminToggle").onclick = ()=>{
  adminMode = !adminMode;
  $("adminPanel").classList.toggle("hidden", !adminMode);
  document.body.classList.toggle("admin-on", adminMode);
  $("adminToggle").textContent = adminMode ? "Ocultar admin" : "Panel admin";
  renderCatalog();
};

$("searchInput").addEventListener("input", renderCatalog);
$("categoryFilter").addEventListener("change", renderCatalog);

function renderCategories(){
  const categories = [...new Set(products.map(p=>p.category || "Catálogo"))].sort();
  $("categoryFilter").innerHTML = '<option value="">Todas las categorías</option>' + categories.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
}

function renderCatalog(){
  const q = $("searchInput").value.toLowerCase().trim();
  const cat = $("categoryFilter").value;
  const filtered = products.filter(p => 
    (!q || p.name.toLowerCase().includes(q)) &&
    (!cat || (p.category || "Catálogo") === cat)
  );
  $("countText").textContent = `${filtered.length} fragancias disponibles`;
  $("catalogGrid").innerHTML = filtered.map(p=>`
    <article class="card">
      <div class="card-actions">
        <button onclick="editProduct(${p.id})">Editar</button>
        <button class="danger" onclick="deleteProduct(${p.id})">Borrar</button>
      </div>
      <div class="image-box">${p.image ? `<img src="${p.image}" alt="${escapeHtml(p.name)}">` : `<div class="placeholder">Subir<br>imagen</div>`}</div>
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
  saveProducts(); renderCategories(); renderCatalog(); clearForm();
});

function editProduct(id){
  const p = products.find(x=>x.id===id); if(!p) return;
  $("productId").value = p.id;
  $("productName").value = p.name;
  $("productPrice").value = p.price;
  $("productCategory").value = p.category || "Catálogo";
  window.scrollTo({top: document.querySelector(".admin-panel").offsetTop - 20, behavior:"smooth"});
}
function deleteProduct(id){
  if(confirm("¿Borrar esta loción?")){
    products = products.filter(p=>p.id!==id); saveProducts(); renderCategories(); renderCatalog();
  }
}
function clearForm(){ $("productForm").reset(); $("productId").value=""; }
$("clearForm").onclick = clearForm;

$("exportBtn").onclick = ()=>{
  const blob = new Blob([JSON.stringify(products,null,2)], {type:"application/json"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "catalogo-encanto-elixir.json"; a.click(); URL.revokeObjectURL(a.href);
};
$("importInput").onchange = async e=>{
  const file = e.target.files[0]; if(!file) return;
  products = JSON.parse(await file.text()); saveProducts(); renderCategories(); renderCatalog(); e.target.value="";
};
$("resetBtn").onclick = ()=>{
  if(confirm("Esto borra cambios locales y restaura la lista inicial. ¿Continuar?")){
    localStorage.removeItem(STORAGE_KEY); loadProducts(); renderCategories(); renderCatalog();
  }
};

function fileToDataURL(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }); }
function escapeHtml(str){ return String(str ?? "").replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m])); }
