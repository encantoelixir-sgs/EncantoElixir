import { firebaseConfig, SOCIAL_LINKS } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const STORAGE_KEY="encanto_elixir_products_cache_v2_assets";
const PRODUCTS_COLLECTION="perfumes";
const $=id=>document.getElementById(id);
let products=[], adminMode=false, isLoggedIn=false, app=null, auth=null, db=null, firebaseReady=false;

function firebaseConfigured(){
  return firebaseConfig && firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("PEGA_AQUI") && firebaseConfig.projectId && !firebaseConfig.projectId.includes("PEGA_AQUI");
}
function initFirebase(){
  if(!firebaseConfigured()){ console.warn("Firebase no configurado"); return; }
  app=initializeApp(firebaseConfig); auth=getAuth(app); db=getFirestore(app); firebaseReady=true;
}
function normalizeProduct(p){
  return {id:String(p.id||Date.now()), name:p.name||"", price:p.price||"", category:p.category||"Catálogo", details:p.details||"", image:p.image||""};
}
function sortProducts(){ products.sort((a,b)=>a.name.localeCompare(b.name,"es",{sensitivity:"base"})); }
function saveCache(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(products)); }
function loadCacheOrDefault(){
  const saved=localStorage.getItem(STORAGE_KEY);
  products=saved?JSON.parse(saved).map(normalizeProduct):structuredClone(window.DEFAULT_PRODUCTS).map(normalizeProduct);
  sortProducts(); renderCategories(); renderCatalog();
}
async function seedFirebaseIfEmpty(){
  if(!firebaseReady||!isLoggedIn)return;
  const snap=await getDocs(collection(db,PRODUCTS_COLLECTION));
  if(!snap.empty)return;
  const batch=writeBatch(db);
  products.forEach(p=>batch.set(doc(db,PRODUCTS_COLLECTION,String(p.id)),normalizeProduct(p)));
  await batch.commit();
}
function listenProductsCloud(){
  if(!firebaseReady)return;
  onSnapshot(collection(db,PRODUCTS_COLLECTION),snap=>{
    const cloud=[]; snap.forEach(d=>cloud.push(normalizeProduct({id:d.id,...d.data()})));
    if(cloud.length>0){ products=cloud; sortProducts(); saveCache(); renderCategories(); renderCatalog(); }
  },err=>{ console.error(err); alert("No se pudo leer Firestore. Revisa las reglas."); });
}
function init(){
  $("whatsappLink").href=SOCIAL_LINKS.whatsapp; $("instagramLink").href=SOCIAL_LINKS.instagram;
  initFirebase(); loadCacheOrDefault();
  if(firebaseReady){
    onAuthStateChanged(auth,async user=>{
      isLoggedIn=!!user; $("logoutBtn").classList.toggle("hidden",!isLoggedIn); $("adminToggle").textContent=isLoggedIn?"Panel admin":"Iniciar sesión";
      if(!isLoggedIn){adminMode=false;$("adminPanel").classList.add("hidden");document.body.classList.remove("admin-on");}
      if(isLoggedIn) await seedFirebaseIfEmpty();
      renderCatalog();
    });
    listenProductsCloud();
  }else alert("Firebase aún no está configurado. Pega tus datos en firebase-config.js.");
}
init();

function openLogin(){ $("loginView").classList.remove("hidden"); $("loginError").textContent=""; setTimeout(()=>$("username").focus(),50); }
function closeLogin(){ $("loginView").classList.add("hidden"); }
$("adminToggle").onclick=()=>{ if(!isLoggedIn){openLogin();return;} adminMode=!adminMode; $("adminPanel").classList.toggle("hidden",!adminMode); document.body.classList.toggle("admin-on",adminMode); $("adminToggle").textContent=adminMode?"Ocultar admin":"Panel admin"; renderCatalog(); };
$("closeLoginBtn").onclick=closeLogin;
$("loginView").addEventListener("click",e=>{ if(e.target.id==="loginView")closeLogin(); });
$("loginForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!firebaseReady){ $("loginError").textContent="Primero configura Firebase."; return; }
  try{ await signInWithEmailAndPassword(auth,$("username").value.trim(),$("password").value); closeLogin(); adminMode=true; $("adminPanel").classList.remove("hidden"); document.body.classList.add("admin-on"); $("adminToggle").textContent="Ocultar admin"; }
  catch(err){ $("loginError").textContent="Correo o clave incorrectos."; }
});
$("logoutBtn").onclick=async()=>{ if(firebaseReady) await signOut(auth); };
$("searchInput").addEventListener("input",renderCatalog); $("categoryFilter").addEventListener("change",renderCatalog);

function normalizeText(t){ return String(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""); }
function renderCategories(){ const cats=[...new Set(products.map(p=>p.category||"Catálogo"))].sort(); $("categoryFilter").innerHTML='<option value="">Todas las categorías</option>'+cats.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join(""); }
function renderCatalog(){
  const q=normalizeText($("searchInput").value.trim()), cat=$("categoryFilter").value;
  const filtered=products.filter(p=>{ const h=normalizeText(`${p.name} ${p.price} ${p.category||"Catálogo"} ${p.details||""}`); return(!q||h.includes(q))&&(!cat||(p.category||"Catálogo")===cat); });
  $("countText").textContent=`${filtered.length} fragancias disponibles`;
  $("catalogGrid").innerHTML=filtered.map(p=>`<article class="card" onclick="openProductModal('${p.id}')"><div class="card-actions" onclick="event.stopPropagation()"><button onclick="editProduct('${p.id}')">Editar</button><button class="danger" onclick="deleteProduct('${p.id}')">Borrar</button></div><div class="image-box">${p.image?`<img src="${p.image}" alt="${escapeHtml(p.name)}">`:`<div class="placeholder">Subir<br>imagen</div>`}</div><div><h3>${escapeHtml(p.name)}</h3><span class="price">${formatPrice(p.price)}</span>${p.details?`<p class="details">${escapeHtml(p.details)}</p>`:""}<div class="category">${escapeHtml(p.category||"Catálogo")}</div></div></article>`).join("");
}
$("productForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!isLoggedIn||!firebaseReady){ alert("Debes iniciar sesión para guardar cambios en la nube."); return; }
  const id=$("productId").value?String($("productId").value):String(Date.now());
  const product=normalizeProduct({id,name:$("productName").value.trim(),price:$("productPrice").value.trim().replace("$",""),category:$("productCategory").value.trim()||"Catálogo",details:$("productDetails").value.trim(),image:$("productImage").value.trim()});
  await setDoc(doc(db,PRODUCTS_COLLECTION,id),product); clearForm();
});
window.editProduct=function(id){ const p=products.find(x=>x.id===String(id)); if(!p)return; $("productId").value=p.id;$("productName").value=p.name;$("productPrice").value=p.price;$("productCategory").value=p.category||"Catálogo";$("productDetails").value=p.details||"";$("productImage").value=p.image||""; window.scrollTo({top:document.querySelector(".admin-panel").offsetTop-20,behavior:"smooth"}); };
window.deleteProduct=async function(id){ if(!isLoggedIn||!firebaseReady){alert("Debes iniciar sesión para borrar.");return;} if(confirm("¿Borrar esta loción?")) await deleteDoc(doc(db,PRODUCTS_COLLECTION,String(id))); };
function clearForm(){ $("productForm").reset(); $("productId").value=""; } $("clearForm").onclick=clearForm;
$("exportBtn").onclick=()=>{ const blob=new Blob([JSON.stringify(products,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="catalogo-encanto-elixir.json"; a.click(); URL.revokeObjectURL(a.href); };
$("importInput").onchange=async e=>{ const file=e.target.files[0]; if(!file)return; if(!isLoggedIn||!firebaseReady){alert("Debes iniciar sesión para importar.");return;} const imported=JSON.parse(await file.text()).map(normalizeProduct); const batch=writeBatch(db); imported.forEach(p=>batch.set(doc(db,PRODUCTS_COLLECTION,String(p.id)),p)); await batch.commit(); e.target.value=""; };
$("resetBtn").onclick=async()=>{ if(!isLoggedIn||!firebaseReady){alert("Debes iniciar sesión para restaurar.");return;} if(confirm("Esto restaurará la lista inicial en Firebase. ¿Continuar?")){ const snap=await getDocs(collection(db,PRODUCTS_COLLECTION)); const bd=writeBatch(db); snap.forEach(d=>bd.delete(d.ref)); await bd.commit(); const ba=writeBatch(db); structuredClone(window.DEFAULT_PRODUCTS).map(normalizeProduct).forEach(p=>ba.set(doc(db,PRODUCTS_COLLECTION,String(p.id)),p)); await ba.commit(); } };
window.openProductModal=function(id){ const p=products.find(x=>x.id===String(id)); if(!p)return; $("productModalContent").innerHTML=`<div class="modal-product-image">${p.image?`<img src="${p.image}" alt="${escapeHtml(p.name)}">`:`<div class="placeholder">Imagen<br>pendiente</div>`}</div><h2>${escapeHtml(p.name)}</h2><span class="price">${formatPrice(p.price)}</span>${p.details?`<p class="modal-details">${escapeHtml(p.details)}</p>`:""}<a class="buy-btn" target="_blank" rel="noopener" href="${SOCIAL_LINKS.whatsapp}?text=${encodeURIComponent("Hola, me interesa la fragancia "+p.name+" del catálogo Encanto Elixir.")}">Comprar por WhatsApp</a>`; $("productModal").classList.remove("hidden"); };
$("closeProductModal").onclick=()=>$("productModal").classList.add("hidden"); $("productModal").addEventListener("click",e=>{ if(e.target.id==="productModal")$("productModal").classList.add("hidden"); });
function formatPrice(price){ const c=String(price||"").trim(); return c.startsWith("$")?c:"$"+c; }
function escapeHtml(str){ return String(str??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m])); }
