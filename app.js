(function(){
  var CFG = window.APP_CONFIG || {};
  var SUPABASE_URL = CFG.url || "";
  var SUPABASE_KEY = CFG.key || "";
  var IMG_BASE = "img/";
  var CATS = [["zoro","Zoro"],["gobi","Gobi"]];
  var EATS = [
    ["now","Al momento","Se la come al momento"],
    ["half","Deja la mitad","Se deja la mitad y no la acaba"],
    ["later","Acaba luego","Se deja la mitad pero se la acaba durante el día"]
  ];
  var EATLABEL = {now:"Al momento", half:"Deja la mitad", later:"Acaba luego"};
  var BRANDS = ["Leonardo","Ownat"];
  var MS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  var MONTHS = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  var WD = ["dom","lun","mar","mié","jue","vie","sáb"];
  var HAS_IMG = {};

  var SEEDS = [
    ["leo-fisch-shrimps","Pescado y gambas","Fisch + Shrimps","Leonardo"],
    ["leo-lamm-cranberries","Cordero, ave y arándanos","Lamm + Cranberries","Leonardo"],
    ["leo-wild-heidelbeeren","Venado y arándanos","Wild + Heidelbeeren","Leonardo"],
    ["leo-senior-kalb-pur","Senior puro de ternera","Senior Kalb pur","Leonardo"],
    ["leo-buffel-blaubeeren","Pollo, búfalo y arándanos","Büffel + Blaubeeren","Leonardo"],
    ["leo-ente-kase","Pollo y pato con queso","Ente + Käse","Leonardo"],
    ["leo-fasan-cranberries","Faisán y arándanos","Fasan + Cranberries","Leonardo"],
    ["leo-rind-pur","Puro de ternera","Rind pur","Leonardo"],
    ["leo-truthahn-pur","Puro de pavo","Truthahn pur","Leonardo"],
    ["own-sterilized-chicken-salmon","Esterilizados pollo y salmón","Wetline Sterilized Chicken & Salmon","Ownat"],
    ["own-sterilized-turkey-tuna","Esterilizados pavo y atún","Wetline Sterilized Turkey & Tuna","Ownat"],
    ["own-sterilized-chicken-turkey","Esterilizados pollo y pavo","Wetline Sterilized Chicken & Turkey","Ownat"],
    ["own-veal-turkey","Ternera y pavo","Wetline Veal & Turkey","Ownat"],
    ["own-salmon-herring","Salmón y arenque","Wetline Salmon & Herring","Ownat"],
    ["own-chicken-shrimps","Pollo y gambas","Wetline Chicken & Shrimps","Ownat"],
    ["own-turkey-chicken","Pavo y pollo","Wetline Turkey & Chicken","Ownat"]
  ];
  SEEDS.forEach(function(s){ HAS_IMG[s[0]] = true; });
  function imgSrc(id){ return HAS_IMG[id] ? IMG_BASE + id + ".jpg" : null; }

  /* ---------- fechas ---------- */
  function pad(n){ return n < 10 ? "0" + n : String(n); }
  function isoOf(d){ return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function todayISO(){ return isoOf(new Date()); }
  function parseISO(s){ var p = String(s).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function fmtDate(s){ var d = parseISO(s); return d.getDate() + " " + MS[d.getMonth()] + " " + d.getFullYear(); }
  function fmtDateLong(s){ var d = parseISO(s); return WD[d.getDay()] + " " + fmtDate(s); }
  function addDays(s, n){ var d = parseISO(s); d.setDate(d.getDate() + n); return isoOf(d); }
  function validISO(s){ return /^\d{4}-\d{2}-\d{2}$/.test(String(s)); }

  /* ---------- estado ---------- */
  var flavors = [], logs = [];
  var tab = "flavors";
  var fBrand = "all", fCat = "both", fLike = "all", fSort = "default", fStock = "all";
  var expanded = {};
  var stockEdit = {}, stockAddVal = {}, stockSetVal = {};
  var addBrand = "Leonardo", addName = "", addOpen = false;
  var regDate = todayISO(), regBrand = "all", regFlavor = null, regMsg = "";
  var regData = {zoro:{s:null, e:null}, gobi:{s:null, e:null}};
  var regNote = "", regEditId = null, editFrom = "hist", priceOpen = false;
  var prices = {Leonardo:1.4, Ownat:1.7};
  var alertAt = 2;
  var now0 = new Date();
  var calY = now0.getFullYear(), calM = now0.getMonth(), selDay = null;
  var hBrand = "all", hCat = "both";
  var armed = null, armTimer = null;
  var exportText = "", exportMsg = "", importText = "", importMsg = "";
  var ORD = [], FMAP = {};

  /* ---------- datos ---------- */
  function normLog(l){
    CATS.forEach(function(c){
      var v = l[c[0]];
      if(v && typeof v === "object"){
        l[c[0]] = {s: (typeof v.s === "number") ? v.s : null, e: v.e || null};
      } else {
        l[c[0]] = null;
      }
    });
    l.used = (typeof l.used === "number" && l.used > 0) ? l.used : 0;
    l.note = (typeof l.note === "string") ? l.note : "";
    if(!validISO(l.date)) l.date = todayISO();
    return l;
  }

  function loadPrices(p){
    if(p && typeof p === "object"){
      BRANDS.forEach(function(b){ if(typeof p[b] === "number" && p[b] >= 0) prices[b] = p[b]; });
    }
  }

  function loadAlert(a){
    if(typeof a === "number" && a >= 0) alertAt = a;
  }

  function nextPos(){
    return flavors.reduce(function(m, f){ return Math.max(m, typeof f.pos === "number" ? f.pos : -1); }, -1) + 1;
  }

  function cleanFlavors(){
    flavors.forEach(function(f){
      if(typeof f.stock !== "number" || f.stock < 0) f.stock = null;
      if(!f.alt) f.alt = "";
    });
    flavors.forEach(function(f){ if(typeof f.pos !== "number") f.pos = nextPos(); });
    flavors.sort(function(a, b){ return a.pos - b.pos; });
  }

  function seed(){
    SEEDS.forEach(function(s){
      if(!flavors.some(function(f){ return f.id === s[0]; })){
        flavors.push({id:s[0], flavor:s[1], alt:s[2], brand:s[3], stock:null, pos:nextPos()});
      }
    });
  }

  /* ---------- sincronización con Supabase ---------- */
  var sb = null, session = null, ready = false, booting = true, loadErr = "";
  var synced = {f:{}, l:{}, s:""};
  var syncing = false, again = false, syncState = "ok", syncMsg = "", retryTimer = null;
  var loginEmail = "", loginMsg = "", loginBusy = false;

  function rowFlavor(f){
    return {id:f.id, brand:f.brand, flavor:f.flavor, alt:f.alt || "", stock:(typeof f.stock === "number") ? f.stock : null, pos:f.pos};
  }
  function rowLog(l){
    return {
      id:l.id, date:l.date, flavor_id:l.flavorId,
      zoro_s:l.zoro ? l.zoro.s : null, zoro_e:l.zoro ? l.zoro.e : null,
      gobi_s:l.gobi ? l.gobi.s : null, gobi_e:l.gobi ? l.gobi.e : null,
      note:l.note || "", used:l.used || 0
    };
  }
  function fromFlavor(r){
    return {id:r.id, brand:r.brand, flavor:r.flavor, alt:r.alt || "",
      stock:(r.stock === null || r.stock === undefined) ? null : Number(r.stock), pos:Number(r.pos) || 0};
  }
  function fromLog(r){
    return {
      id:r.id, date:r.date, flavorId:r.flavor_id,
      zoro:(r.zoro_s !== null || r.zoro_e) ? {s:r.zoro_s, e:r.zoro_e} : null,
      gobi:(r.gobi_s !== null || r.gobi_e) ? {s:r.gobi_s, e:r.gobi_e} : null,
      note:r.note || "", used:Number(r.used) || 0
    };
  }
  function settingsKey(){ return JSON.stringify([prices, alertAt]); }

  function snapshot(){
    synced = {f:{}, l:{}, s:settingsKey()};
    flavors.forEach(function(f){ synced.f[f.id] = JSON.stringify(rowFlavor(f)); });
    logs.forEach(function(l){ synced.l[l.id] = JSON.stringify(rowLog(l)); });
  }

  function diff(){
    var d = {fUp:[], fDel:[], lUp:[], lDel:[], fKeys:{}, lKeys:{}, sKey:settingsKey()};
    flavors.forEach(function(f){
      var r = rowFlavor(f), k = JSON.stringify(r);
      d.fKeys[f.id] = k;
      if(synced.f[f.id] !== k) d.fUp.push(r);
    });
    Object.keys(synced.f).forEach(function(id){ if(!(id in d.fKeys)) d.fDel.push(id); });
    logs.forEach(function(l){
      var r = rowLog(l), k = JSON.stringify(r);
      d.lKeys[l.id] = k;
      if(synced.l[l.id] !== k) d.lUp.push(r);
    });
    Object.keys(synced.l).forEach(function(id){ if(!(id in d.lKeys)) d.lDel.push(id); });
    d.sUp = d.sKey !== synced.s;
    return d;
  }
  function isDirty(){
    var d = diff();
    return !!(d.fUp.length || d.fDel.length || d.lUp.length || d.lDel.length || d.sUp);
  }

  function chunks(a, n){
    var out = [];
    for(var i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
    return out;
  }
  async function must(p){
    var r = await p;
    if(r.error) throw r.error;
    return r;
  }

  async function pushDiff(){
    var d = diff();
    if(!(d.fUp.length || d.fDel.length || d.lUp.length || d.lDel.length || d.sUp)) return;
    var c;
    for(c of chunks(d.fUp, 200)){
      await must(sb.from("flavors").upsert(c));
      c.forEach(function(r){ synced.f[r.id] = d.fKeys[r.id]; });
    }
    for(c of chunks(d.lUp, 200)){
      await must(sb.from("logs").upsert(c));
      c.forEach(function(r){ synced.l[r.id] = d.lKeys[r.id]; });
    }
    for(c of chunks(d.lDel, 100)){
      await must(sb.from("logs").delete().in("id", c));
      c.forEach(function(id){ delete synced.l[id]; });
    }
    for(c of chunks(d.fDel, 100)){
      await must(sb.from("flavors").delete().in("id", c));
      c.forEach(function(id){ delete synced.f[id]; });
    }
    if(d.sUp){
      await must(sb.from("settings").upsert([{key:"prices", value:prices}, {key:"alert_at", value:alertAt}]));
      synced.s = d.sKey;
    }
  }

  function setSync(state, msg){
    syncState = state;
    syncMsg = msg || "";
    renderStatus();
  }

  async function runSync(){
    if(syncing){ again = true; return; }
    syncing = true;
    if(retryTimer){ clearTimeout(retryTimer); retryTimer = null; }
    try{
      do{
        again = false;
        if(isDirty()){
          setSync("saving");
          await pushDiff();
        }
      } while(again);
      setSync("ok");
    }catch(e){
      setSync("error", (e && e.message) ? e.message : "sin conexión");
      retryTimer = setTimeout(runSync, 8000);
    }
    syncing = false;
  }

  function save(){ if(ready) runSync(); }

  async function fetchAll(table, cols){
    var out = [], from = 0, size = 1000;
    for(;;){
      var q = sb.from(table).select("*");
      cols.forEach(function(c){ q = q.order(c); });
      var r = await q.range(from, from + size - 1);
      if(r.error) throw r.error;
      out = out.concat(r.data);
      if(r.data.length < size) break;
      from += size;
    }
    return out;
  }

  async function fetchState(){
    var fl = await fetchAll("flavors", ["pos", "id"]);
    var lg = await fetchAll("logs", ["date", "created_at", "id"]);
    var st = await sb.from("settings").select("*");
    if(st.error) throw st.error;
    return {flavors:fl.map(fromFlavor), logs:lg.map(fromLog).map(normLog), settings:st.data};
  }

  function applyState(s){
    flavors = s.flavors;
    logs = s.logs;
    s.settings.forEach(function(r){
      if(r.key === "prices") loadPrices(r.value);
      if(r.key === "alert_at") loadAlert(r.value);
    });
    cleanFlavors();
    snapshot();
  }

  async function refresh(){
    if(!ready || syncing || isDirty()) return;
    var ae = document.activeElement;
    if(ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) return;
    try{
      var s = await fetchState();
      if(syncing || isDirty()) return;
      var before = JSON.stringify(synced);
      applyState(s);
      if(JSON.stringify(synced) !== before) render();
    }catch(e){}
  }

  async function start(){
    loadErr = "";
    render();
    try{
      applyState(await fetchState());
      if(!flavors.length){ seed(); cleanFlavors(); }
      ready = true;
      render();
      save();
    }catch(e){
      loadErr = (e && e.message) ? e.message : "No se pudo conectar con Supabase.";
      render();
    }
  }

  function login(email, password){
    loginBusy = true; loginMsg = "";
    render();
    sb.auth.signInWithPassword({email:email, password:password}).then(function(r){
      loginBusy = false;
      if(r.error || !r.data || !r.data.session){ loginMsg = "Correo o contraseña incorrectos."; render(); return; }
      session = r.data.session;
      start();
    }, function(){
      loginBusy = false;
      loginMsg = "No se pudo conectar. Inténtalo de nuevo.";
      render();
    });
  }

  function logout(){
    sb.auth.signOut().then(function(){
      session = null; ready = false; flavors = []; logs = [];
      synced = {f:{}, l:{}, s:""};
      render();
    });
  }

  function viewLogin(){
    var wrap = el("div", "panel");
    var h = el("h2", "", "Entrar");
    h.style.marginTop = "0";
    wrap.appendChild(h);
    var form = el("form", "loginform");
    var em = el("input");
    em.type = "email"; em.autocomplete = "username"; em.placeholder = "Correo"; em.required = true;
    em.value = loginEmail; em.dataset.k = "login|email";
    em.setAttribute("aria-label", "Correo");
    em.addEventListener("input", function(){ loginEmail = em.value; });
    var pw = el("input");
    pw.type = "password"; pw.autocomplete = "current-password"; pw.placeholder = "Contraseña"; pw.required = true;
    pw.dataset.k = "login|pass";
    pw.setAttribute("aria-label", "Contraseña");
    var go = el("button", "primary", loginBusy ? "Entrando..." : "Entrar");
    go.type = "submit"; go.disabled = loginBusy;
    form.addEventListener("submit", function(e){
      e.preventDefault();
      loginEmail = em.value.trim();
      login(loginEmail, pw.value);
    });
    form.appendChild(em); form.appendChild(pw); form.appendChild(go);
    if(loginMsg) form.appendChild(el("p", "hint", loginMsg));
    wrap.appendChild(form);
    return wrap;
  }

  function viewLoading(){
    if(!loadErr) return el("div", "empty", "Cargando datos...");
    var w = el("div", "panel");
    w.appendChild(el("p", "ok", "No se pudieron cargar los datos."));
    w.appendChild(el("p", "hint", loadErr));
    var rb = el("button", "primary", "Reintentar");
    rb.type = "button";
    rb.style.marginTop = "10px";
    rb.addEventListener("click", start);
    w.appendChild(rb);
    return w;
  }

  function renderStatus(){
    var bar = document.getElementById("statusbar");
    bar.innerHTML = "";
    if(!session) return;
    var txt = !ready ? "Conectando..." : (syncState === "saving" ? "Guardando..." : (syncState === "error" ? "No se pudo guardar (" + syncMsg + "). Se reintenta solo." : "Datos sincronizados"));
    bar.appendChild(el("span", syncState === "error" ? "bad" : "", txt));
    var out = el("button", "linkbtn", "Salir");
    out.type = "button";
    out.addEventListener("click", logout);
    bar.appendChild(out);
  }

  /* ---------- cálculos ---------- */
  function prep(){
    FMAP = {};
    flavors.forEach(function(f){ FMAP[f.id] = f; });
    ORD = logs.map(function(l, i){ return {l:l, i:i}; });
    ORD.sort(function(a, b){
      if(a.l.date < b.l.date) return -1;
      if(a.l.date > b.l.date) return 1;
      return a.i - b.i;
    });
    ORD = ORD.map(function(x){ return x.l; });
  }

  function mean(a){
    if(!a.length) return null;
    return a.reduce(function(x, y){ return x + y; }, 0) / a.length;
  }
  function fmt(n){ return String(Math.round(n * 10) / 10).replace(".", ","); }

  function series(fid, cat){
    var out = [];
    ORD.forEach(function(l){
      if(l.flavorId === fid && l[cat] && l[cat].s !== null) out.push(l[cat].s);
    });
    return out;
  }
  function eatCounts(fid, cat){
    var c = {now:0, half:0, later:0};
    logs.forEach(function(l){
      if(l.flavorId === fid && l[cat] && l[cat].e) c[l[cat].e]++;
    });
    return c;
  }
  function activeCats(){
    return CATS.filter(function(c){ return fCat === "both" || fCat === c[0]; });
  }
  function scoreFor(f, cats){
    var vals = [];
    cats.forEach(function(c){
      var m = mean(series(f.id, c[0]).slice(-3));
      if(m !== null) vals.push(m);
    });
    return mean(vals);
  }
  function scoreOf(f){ return scoreFor(f, activeCats()); }
  function bucket(avg){
    if(avg === null) return "none";
    if(avg >= 3.5) return "good";
    if(avg >= 2) return "mid";
    return "bad";
  }
  function flavorLogs(fid){
    return ORD.filter(function(l){ return l.flavorId === fid; });
  }

  /* ---------- stock (en sobres; cada gato come medio sobre) ---------- */
  function stockClean(n){ return Math.max(0, Math.round(n * 2) / 2); }
  function setStock(f, n){ f.stock = stockClean(n); save(); }
  function stockStatus(f){
    if(typeof f.stock !== "number") return "unset";
    if(f.stock <= 0) return "out";
    if(f.stock <= 2) return "low";
    return "ok";
  }
  function stockText(f){
    return typeof f.stock === "number" ? fmt(f.stock) + (f.stock === 1 ? " sobre" : " sobres") : "sin indicar";
  }
  function parseNum(v){
    var n = parseFloat(String(v).replace(",", "."));
    return (isFinite(n) && n >= 0) ? n : null;
  }
  function usedBy(data){
    var n = 0;
    CATS.forEach(function(c){ if(data[c[0]] && (data[c[0]].s !== null || data[c[0]].e !== null)) n++; });
    return n * 0.5;
  }
  var DAILY = 1; // sobres al día: medio sobre por gato
  function priceOf(f){
    var pr = prices[f.brand];
    return (typeof pr === "number") ? pr : null;
  }
  function fmtEur(n){ return n.toFixed(2).replace(".", ",") + " €"; }
  function daysText(f){
    if(typeof f.stock !== "number" || f.stock <= 0) return "";
    var d = f.stock / DAILY;
    return "para " + fmt(d) + (d === 1 ? " día" : " días");
  }
  function regStockHint(f){
    var need = usedBy(regData);
    var t = "Stock de " + f.flavor + ": " + stockText(f) + ". ";
    if(typeof f.stock !== "number") return t + "Como no has indicado el stock, esta toma no restará nada.";
    if(need === 0) return t + "Cada gato come medio sobre: un gato resta 0,5 y los dos, 1.";
    if(f.stock < need) return t + "Esta toma restaría " + fmt(need) + " sobres y no hay suficiente, así que el stock quedará en 0.";
    return t + "Esta toma restará " + fmt(need) + (need === 1 ? " sobre" : " sobres") + ". Quedarán " + fmt(f.stock - need) + ".";
  }

  /* ---------- helpers de interfaz ---------- */
  function el(tag, cls, text){
    var n = document.createElement(tag);
    if(cls) n.className = cls;
    if(text !== undefined) n.textContent = text;
    return n;
  }

  function chipGroup(key, opts, current, onPick){
    var box = el("div", "chips");
    opts.forEach(function(o){
      var b = el("button", "", o[1]);
      b.type = "button";
      b.dataset.k = key + "|" + o[0];
      b.setAttribute("aria-pressed", current === o[0] ? "true" : "false");
      b.addEventListener("click", function(){ onPick(o[0]); });
      box.appendChild(b);
    });
    return box;
  }

  function fgroup(label, chips){
    var g = el("div", "fgroup");
    g.appendChild(el("span", "flabel", label));
    g.appendChild(chips);
    return g;
  }

  function catLabel(c, size){
    var w = el("span", "catname catlabel");
    {
      var im = el("img", "cavatar");
      im.onerror = function(){ im.style.display = "none"; };
      im.src = IMG_BASE + c[0] + ".jpg";
      im.alt = "";
      im.width = size || 26;
      im.height = size || 26;
      w.appendChild(im);
    }
    w.appendChild(document.createTextNode(c[1]));
    return w;
  }

  function pill(v){ return el("span", "pill p" + v, String(v)); }

  function scaleEl(cur, key, label, onPick){
    var scale = el("div", "scale");
    scale.setAttribute("role", "group");
    scale.setAttribute("aria-label", "Puntuación de " + label + " de 0 a 5");
    for(var v = 0; v <= 5; v++){
      (function(v){
        var b = el("button", "", String(v));
        b.type = "button";
        b.dataset.v = String(v);
        b.dataset.k = key + "|" + v;
        b.title = v === 0 ? "0, no le gusta nada" : (v === 5 ? "5, le gusta mucho" : String(v));
        b.setAttribute("aria-label", label + ": " + v + " de 5");
        b.setAttribute("aria-pressed", cur === v ? "true" : "false");
        b.addEventListener("click", function(){ onPick(v); });
        scale.appendChild(b);
      })(v);
    }
    return scale;
  }

  function eatEl(cur, key, label, onPick){
    var eat = el("div", "eat");
    eat.setAttribute("role", "group");
    eat.setAttribute("aria-label", "Cómo se lo come " + label);
    EATS.forEach(function(e){
      var b = el("button", "", e[1]);
      b.type = "button";
      b.dataset.v = e[0];
      b.dataset.k = key + "|" + e[0];
      b.title = e[2];
      b.setAttribute("aria-pressed", cur === e[0] ? "true" : "false");
      b.addEventListener("click", function(){ onPick(e[0]); });
      eat.appendChild(b);
    });
    return eat;
  }

  function armBtn(key, label, armedLabel, cls, onConfirm){
    var isArmed = armed === key;
    var b = el("button", (cls || "del") + (isArmed ? " armed" : ""), isArmed ? armedLabel : label);
    b.type = "button";
    b.dataset.k = "arm|" + key;
    b.addEventListener("click", function(){
      if(armed === key){
        armed = null;
        if(armTimer) clearTimeout(armTimer);
        onConfirm();
      } else {
        armed = key;
        if(armTimer) clearTimeout(armTimer);
        armTimer = setTimeout(function(){ armed = null; render(); }, 3500);
        render();
      }
    });
    return b;
  }

  function copyText(t, done){
    function fallback(){
      var ok = false;
      try{
        var ta = document.createElement("textarea");
        ta.value = t;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      }catch(e){}
      done(ok);
    }
    try{
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(t).then(function(){ done(true); }, fallback);
        return;
      }
    }catch(e){}
    fallback();
  }

  /* ---------- tomas ---------- */
  function entryEl(l, showFlavor, onlyCat){
    var f = FMAP[l.flavorId];
    var box = el("div", "entry");
    var top = el("div", "entrytop");
    if(showFlavor){
      var n = el("div", "entryname", f ? f.flavor : "Sabor eliminado");
      if(f) n.appendChild(el("span", "alt", f.brand));
      top.appendChild(n);
    } else {
      top.appendChild(el("div", "entryname", fmtDateLong(l.date)));
    }
    var acts = el("div", "tags");
    var eb = el("button", "del", "Editar");
    eb.type = "button";
    eb.dataset.k = "edit|" + l.id;
    eb.addEventListener("click", function(){ startEdit(l); });
    acts.appendChild(eb);
    acts.appendChild(armBtn("log|" + l.id, "Eliminar toma", "Pulsa otra vez para eliminar", "del", function(){
      var ff = FMAP[l.flavorId];
      if(ff && typeof ff.stock === "number" && l.used) ff.stock = stockClean(ff.stock + l.used);
      logs = logs.filter(function(x){ return x.id !== l.id; });
      save(); render();
    }));
    top.appendChild(acts);
    box.appendChild(top);
    CATS.forEach(function(c){
      if(onlyCat && onlyCat !== "both" && onlyCat !== c[0]) return;
      var d = l[c[0]];
      if(!d) return;
      var line = el("div", "eline");
      line.appendChild(catLabel(c, 26));
      if(d.s !== null) line.appendChild(pill(d.s)); else line.appendChild(el("span", "muted", "sin puntuar"));
      if(d.e) line.appendChild(el("span", "etag e-" + d.e, EATLABEL[d.e]));
      box.appendChild(line);
    });
    if(l.note) box.appendChild(el("p", "hint", "Nota: " + l.note));
    if(l.used) box.appendChild(el("p", "hint", "Restó " + fmt(l.used) + (l.used === 1 ? " sobre" : " sobres") + " del stock."));
    return box;
  }

  /* ---------- vista: sabores ---------- */
  function visibleFlavor(f){
    if(fBrand !== "all" && f.brand !== fBrand) return false;
    if(fLike !== "all" && bucket(scoreOf(f)) !== fLike) return false;
    if(fStock !== "all"){
      var st = stockStatus(f);
      if(fStock === "have" && !(st === "ok" || st === "low")) return false;
      if(fStock === "low" && st !== "low") return false;
      if(fStock === "out" && st !== "out") return false;
    }
    return true;
  }
  function brandCount(b){
    return flavors.filter(function(f){ return b === "all" || f.brand === b; }).length;
  }

  function stockForm(f, label, ph, store, btnText, apply){
    var line = el("div", "stockform");
    line.appendChild(el("span", "small", label));
    var inp = el("input");
    inp.type = "text";
    inp.inputMode = "decimal";
    inp.value = store[f.id] || "";
    inp.placeholder = ph;
    inp.setAttribute("aria-label", label + " " + f.flavor);
    inp.addEventListener("input", function(){ store[f.id] = inp.value; });
    function go(){
      var n = parseNum(inp.value);
      if(n === null) return;
      store[f.id] = "";
      apply(n);
      render();
    }
    inp.addEventListener("keydown", function(e){ if(e.key === "Enter") go(); });
    line.appendChild(inp);
    var b = el("button", "secondary", btnText);
    b.type = "button";
    b.dataset.k = f.id + "|" + btnText;
    b.addEventListener("click", go);
    line.appendChild(b);
    return line;
  }

  function stockRow(f){
    var wrap = el("div");
    var row = el("div", "stockrow");
    row.appendChild(el("span", "catname", "Stock"));
    row.appendChild(el("span", "stockval", stockText(f)));
    var info = [];
    var pr = priceOf(f);
    if(pr !== null) info.push(fmtEur(pr) + " por sobre");
    if(info.length) row.appendChild(el("span", "small", info.join(", ")));
    [["−1", -1], ["+1", 1]].forEach(function(p){
      var b = el("button", "stockbtn", p[0]);
      b.type = "button";
      b.dataset.k = f.id + "|stock|" + p[1];
      b.setAttribute("aria-label", (p[1] < 0 ? "Quitar" : "Añadir") + " un sobre de " + f.flavor);
      b.addEventListener("click", function(){
        setStock(f, (typeof f.stock === "number" ? f.stock : 0) + p[1]);
        render();
      });
      row.appendChild(b);
    });
    var ed = el("button", "linkbtn", stockEdit[f.id] ? "Cerrar" : "Editar stock");
    ed.type = "button";
    ed.dataset.k = f.id + "|stockedit";
    ed.addEventListener("click", function(){ stockEdit[f.id] = !stockEdit[f.id]; render(); });
    row.appendChild(ed);
    wrap.appendChild(row);
    if(stockEdit[f.id]){
      var box = el("div", "stockedit");
      box.appendChild(stockForm(f, "Añadir compra", "Sobres comprados", stockAddVal, "Añadir", function(n){
        setStock(f, (typeof f.stock === "number" ? f.stock : 0) + n);
      }));
      box.appendChild(stockForm(f, "Fijar stock en", "Sobres que quedan", stockSetVal, "Fijar", function(n){
        setStock(f, n);
      }));
      wrap.appendChild(box);
    }
    return wrap;
  }

  function flavorCard(f){
    var art = el("article", "card");
    if(imgSrc(f.id)){
      art.className = "card has-img";
      var im = el("img", "thumb");
      im.onerror = function(){ im.style.display = "none"; };
      im.src = imgSrc(f.id);
      im.alt = "Sobre " + f.brand + " " + f.flavor;
      im.width = 84;
      art.appendChild(im);
    }
    var body = el("div", "body");
    var head = el("div", "head");
    var name = el("div", "name", f.flavor);
    if(f.alt) name.appendChild(el("span", "alt", f.alt));
    head.appendChild(name);

    var tags = el("div", "tags");
    var avg = scoreOf(f);
    var b = bucket(avg);
    var labels = {good:"Le gusta", mid:"Regular", bad:"No le gusta", none:"Sin valorar"};
    var main = el("span", "chip v-" + b);
    if(avg !== null){
      main.appendChild(el("b", "", fmt(avg)));
      main.title = "Media de las últimas 3 tomas";
    }
    main.appendChild(document.createTextNode(labels[b]));
    tags.appendChild(main);
    var zr = mean(series(f.id, "zoro").slice(-3)), gr = mean(series(f.id, "gobi").slice(-3));
    if(fCat === "both" && zr !== null && gr !== null && Math.abs(zr - gr) >= 3){
      tags.appendChild(el("span", "chip v-mixed", "Solo para " + (zr > gr ? "Zoro" : "Gobi")));
    }
    if(stockStatus(f) === "out") tags.appendChild(el("span", "chip v-none", "Sin stock"));
    head.appendChild(tags);
    body.appendChild(head);

    var fl = flavorLogs(f.id);
    var metaText = fl.length
      ? fl.length + (fl.length === 1 ? " toma" : " tomas") + ", última el " + fmtDate(fl[fl.length - 1].date)
      : "Sin tomas registradas";
    body.appendChild(el("p", "meta", metaText));

    CATS.forEach(function(c){
      var ser = series(f.id, c[0]);
      var row = el("div", "crow");
      row.appendChild(catLabel(c, 24));
      if(ser.length){
        var sr = el("div", "series");
        ser.slice(-6).forEach(function(v){ sr.appendChild(pill(v)); });
        row.appendChild(sr);
        row.appendChild(el("span", "small", "media " + fmt(mean(ser)) + " en " + ser.length + (ser.length === 1 ? " toma" : " tomas")));
      } else {
        row.appendChild(el("span", "small", "sin puntuar"));
      }
      var ec = eatCounts(f.id, c[0]);
      var parts = [];
      EATS.forEach(function(e){ if(ec[e[0]]) parts.push(e[1] + " " + ec[e[0]]); });
      if(parts.length) row.appendChild(el("span", "small", parts.join(", ")));
      body.appendChild(row);
    });

    body.appendChild(stockRow(f));

    var act = el("div", "actions");
    var reg = el("button", "primary", "Registrar toma");
    reg.type = "button";
    reg.dataset.k = f.id + "|reg";
    reg.addEventListener("click", function(){
      startNew(); regFlavor = f.id; regBrand = f.brand; tab = "reg"; render();
      window.scrollTo(0, 0);
    });
    act.appendChild(reg);
    var hb = el("button", "secondary", expanded[f.id] ? "Ocultar historial" : "Ver historial (" + fl.length + ")");
    hb.type = "button";
    hb.dataset.k = f.id + "|hist";
    hb.addEventListener("click", function(){ expanded[f.id] = !expanded[f.id]; render(); });
    act.appendChild(hb);
    act.appendChild(armBtn("flavor|" + f.id, "Eliminar sabor", "Pulsa otra vez: se borran también sus tomas", "del", function(){
      flavors = flavors.filter(function(x){ return x.id !== f.id; });
      logs = logs.filter(function(l){ return l.flavorId !== f.id; });
      save(); render();
    }));
    body.appendChild(act);

    if(expanded[f.id]){
      var h = el("div", "history");
      if(!fl.length) h.appendChild(el("p", "hint", "Todavía no hay tomas de este sabor."));
      fl.slice().reverse().forEach(function(l){ h.appendChild(entryEl(l, false, "both")); });
      body.appendChild(h);
    }
    art.appendChild(body);
    return art;
  }

  function viewFlavors(){
    var wrap = el("div");
    var panel = el("section", "panel");
    panel.setAttribute("aria-label", "Filtros");
    panel.appendChild(fgroup("Marca", chipGroup("fBrand",
      [["all", "Todas (" + brandCount("all") + ")"]].concat(BRANDS.map(function(b){ return [b, b + " (" + brandCount(b) + ")"]; })),
      fBrand, function(v){ fBrand = v; render(); })));
    panel.appendChild(fgroup("Gato", chipGroup("fCat",
      [["both","Ambos"],["zoro","Zoro"],["gobi","Gobi"]], fCat, function(v){ fCat = v; render(); })));
    panel.appendChild(fgroup("Valoración", chipGroup("fLike",
      [["all","Todos"],["good","Le gusta"],["mid","Regular"],["bad","No le gusta"],["none","Sin valorar"]],
      fLike, function(v){ fLike = v; render(); })));
    panel.appendChild(fgroup("Stock", chipGroup("fStock",
      [["all","Todos"],["have","Con stock"],["out","Sin stock"]],
      fStock, function(v){ fStock = v; render(); })));
    panel.appendChild(fgroup("Orden", chipGroup("fSort",
      [["default","Por marca"],["best","Mejor valorados"],["worst","Peor valorados"]],
      fSort, function(v){ fSort = v; render(); })));
    wrap.appendChild(panel);

    var shown = flavors.filter(visibleFlavor);
    var line = el("div", "countline");
    line.appendChild(el("span", "", shown.length + " de " + flavors.length + " sabores"));
    if(fBrand !== "all" || fLike !== "all" || fStock !== "all"){
      var rs = el("button", "linkbtn", "Quitar filtros");
      rs.type = "button";
      rs.dataset.k = "resetfilters";
      rs.addEventListener("click", function(){ fBrand = "all"; fLike = "all"; fStock = "all"; render(); });
      line.appendChild(rs);
    }
    wrap.appendChild(line);

    var list = el("div");
    if(!shown.length){
      list.appendChild(el("div", "empty", flavors.length ? "Ningún sabor coincide con estos filtros." : "Aún no hay sabores. Añade el primero abajo."));
    } else if(fSort === "default"){
      var brands = [];
      shown.forEach(function(f){ if(brands.indexOf(f.brand) < 0) brands.push(f.brand); });
      brands.forEach(function(br){
        list.appendChild(el("h2", "", br));
        shown.filter(function(f){ return f.brand === br; }).forEach(function(f){ list.appendChild(flavorCard(f)); });
      });
    } else {
      var sorted = shown.slice().sort(function(a, b){
        var sa = scoreOf(a), sb = scoreOf(b);
        if(sa === null && sb === null) return 0;
        if(sa === null) return 1;
        if(sb === null) return -1;
        return fSort === "best" ? sb - sa : sa - sb;
      });
      sorted.forEach(function(f){ list.appendChild(flavorCard(f)); });
    }
    wrap.appendChild(list);

    var det = el("details", "addbox");
    if(addOpen) det.open = true;
    det.addEventListener("toggle", function(){ addOpen = det.open; });
    det.appendChild(el("summary", "", "Añadir otro sabor"));
    var form = el("div", "addform");
    form.appendChild(chipGroup("addBrand", BRANDS.map(function(b){ return [b, b]; }), addBrand, function(v){ addBrand = v; addOpen = true; render(); }));
    var row = el("div", "addrow");
    var inp = el("input");
    inp.type = "text";
    inp.id = "flavorName";
    inp.value = addName;
    inp.placeholder = "Sabor, por ejemplo pato con arándanos";
    inp.setAttribute("aria-label", "Nombre del sabor");
    inp.addEventListener("input", function(){ addName = inp.value; });
    inp.addEventListener("keydown", function(e){ if(e.key === "Enter") addFlavor(); });
    row.appendChild(inp);
    var go = el("button", "primary", "Añadir sabor");
    go.type = "button";
    go.dataset.k = "addflavor";
    go.addEventListener("click", addFlavor);
    row.appendChild(go);
    form.appendChild(row);
    det.appendChild(form);
    wrap.appendChild(det);

    var pd = el("details", "addbox");
    if(priceOpen) pd.open = true;
    pd.addEventListener("toggle", function(){ priceOpen = pd.open; });
    pd.appendChild(el("summary", "", "Precios y aviso de stock"));
    var pf = el("div", "addform");
    pf.appendChild(el("p", "hint", "Precio aproximado por sobre, igual para todos los sabores de la marca. Sirve para estimar el gasto."));
    BRANDS.forEach(function(br){
      var pline = el("div", "stockform");
      pline.appendChild(el("span", "small", br));
      var pi = el("input");
      pi.type = "text";
      pi.inputMode = "decimal";
      pi.value = String(prices[br]).replace(".", ",");
      pi.dataset.k = "price|" + br;
      pi.setAttribute("aria-label", "Precio por sobre de " + br);
      pi.addEventListener("change", function(){
        var n = parseNum(pi.value);
        if(n === null){ render(); return; }
        prices[br] = Math.round(n * 100) / 100;
        priceOpen = true;
        save(); render();
      });
      pline.appendChild(pi);
      pline.appendChild(el("span", "small", "€ por sobre"));
      pf.appendChild(pline);
    });
    var aline = el("div", "stockform");
    aline.appendChild(el("span", "small", "Avisar con"));
    var ai = el("input");
    ai.type = "text";
    ai.inputMode = "decimal";
    ai.value = String(alertAt).replace(".", ",");
    ai.dataset.k = "alertAt";
    ai.setAttribute("aria-label", "Sobres en total a partir de los cuales avisar");
    ai.addEventListener("change", function(){
      var n = parseNum(ai.value);
      if(n === null){ render(); return; }
      alertAt = stockClean(n);
      priceOpen = true;
      save(); render();
    });
    aline.appendChild(ai);
    aline.appendChild(el("span", "small", "sobres o menos en total"));
    pf.appendChild(aline);
    pd.appendChild(pf);
    wrap.appendChild(pd);

    var lg = el("div", "legend");
    lg.appendChild(el("p", "", "Le gusta: media de 3,5 o más en las últimas 3 tomas. Regular: entre 2 y 3,4. No le gusta: menos de 2."));
    lg.appendChild(el("p", "", "Con el filtro de gato elegido, la valoración usa solo a ese gato. Con Ambos, promedia a los dos."));
    lg.appendChild(el("p", "", "Stock en sobres: cada gato come medio sobre. Una toma con los dos resta 1 sobre y con un solo gato, 0,5. Si borras una toma, el stock se devuelve."));
    lg.appendChild(el("p", "", "El aviso de compra usa el stock total de todos los sabores y calcula los días con 1 sobre al día (medio sobre para cada gato)."));
    wrap.appendChild(lg);
    return wrap;
  }

  function addFlavor(){
    var name = addName.trim();
    if(!name) return;
    flavors.push({id:"custom-" + Date.now() + "-" + Math.floor(Math.random() * 1000), brand:addBrand, flavor:name, alt:"", stock:null, pos:nextPos()});
    addName = ""; fBrand = "all"; fLike = "all"; fStock = "all"; addOpen = true;
    save(); render();
  }

  /* ---------- vista: registrar ---------- */
  function startNew(){
    regEditId = null;
    regNote = "";
    regMsg = "";
    regData = {zoro:{s:null, e:null}, gobi:{s:null, e:null}};
  }

  function startEdit(l){
    var f = FMAP[l.flavorId];
    regEditId = l.id;
    editFrom = tab;
    regDate = l.date;
    regFlavor = l.flavorId;
    regBrand = "all";
    regNote = l.note || "";
    regMsg = "";
    regData = {};
    CATS.forEach(function(c){
      regData[c[0]] = l[c[0]] ? {s:l[c[0]].s, e:l[c[0]].e} : {s:null, e:null};
    });
    tab = "reg";
    render();
    window.scrollTo(0, 0);
  }

  function cancelEdit(){
    startNew();
    regFlavor = null;
    tab = editFrom;
    render();
  }

  function viewRegister(){
    var wrap = el("div");
    var panel = el("section", "panel");

    if(regEditId){
      var banner = el("div", "panel");
      banner.style.marginBottom = "12px";
      banner.appendChild(el("p", "ok", "Editando una toma. Los cambios sustituyen a la original y el stock se ajusta."));
      var cb = el("button", "secondary", "Cancelar edición");
      cb.type = "button";
      cb.dataset.k = "reg|canceledit";
      cb.addEventListener("click", cancelEdit);
      banner.appendChild(cb);
      wrap.appendChild(banner);
    }

    var dr = el("div", "regrow");
    dr.appendChild(el("span", "flabel", "Fecha"));
    var di = el("input");
    di.type = "date";
    di.value = regDate;
    di.dataset.k = "reg|date";
    di.setAttribute("aria-label", "Fecha de la toma");
    di.addEventListener("change", function(){ if(validISO(di.value)){ regDate = di.value; render(); } });
    dr.appendChild(di);
    dr.appendChild(chipGroup("regDay", [["today","Hoy"],["yesterday","Ayer"]],
      regDate === todayISO() ? "today" : (regDate === addDays(todayISO(), -1) ? "yesterday" : ""),
      function(v){ regDate = v === "today" ? todayISO() : addDays(todayISO(), -1); render(); }));
    panel.appendChild(dr);

    panel.appendChild(fgroup("Marca", chipGroup("regBrand",
      [["all","Todas"]].concat(BRANDS.map(function(b){ return [b, b]; })),
      regBrand, function(v){ regBrand = v; render(); })));

    var picker = el("div", "picker");
    flavors.filter(function(f){ return regBrand === "all" || f.brand === regBrand; }).forEach(function(f){
      var b = el("button");
      b.type = "button";
      b.dataset.k = "regflavor|" + f.id;
      b.setAttribute("aria-pressed", regFlavor === f.id ? "true" : "false");
      if(imgSrc(f.id)){
        var im = el("img");
        im.onerror = function(){ im.style.display = "none"; };
        im.src = imgSrc(f.id);
        im.alt = "";
        b.appendChild(im);
      }
      b.appendChild(document.createTextNode(f.flavor));
      if(typeof f.stock === "number"){
        var sb = el("span", "sb" + (f.stock <= 0 ? " low" : ""), fmt(f.stock));
        sb.title = "Stock en sobres";
        b.appendChild(sb);
      }
      b.addEventListener("click", function(){ regFlavor = f.id; regMsg = ""; render(); });
      picker.appendChild(b);
    });
    panel.appendChild(el("p", "hint", "Elige el sabor que les has dado:"));
    panel.appendChild(picker);
    var rf = regFlavor ? FMAP[regFlavor] : null;
    if(rf && !regEditId) panel.appendChild(el("p", "hint", regStockHint(rf)));
    wrap.appendChild(panel);

    CATS.forEach(function(c){
      var d = regData[c[0]];
      var box = el("div", "catbox");
      var line = el("div", "catline");
      line.appendChild(catLabel(c, 26));
      line.appendChild(scaleEl(d.s, "reg|" + c[0] + "|s", c[1], function(v){ d.s = (d.s === v) ? null : v; regMsg = ""; render(); }));
      box.appendChild(line);
      box.appendChild(eatEl(d.e, "reg|" + c[0] + "|e", c[1], function(v){ d.e = (d.e === v) ? null : v; regMsg = ""; render(); }));
      wrap.appendChild(box);
    });

    var nbox = el("div", "catbox");
    nbox.appendChild(el("div", "catname", "Nota"));
    var ni = el("input", "noteinput");
    ni.type = "text";
    ni.value = regNote;
    ni.placeholder = "Opcional, por ejemplo: le sentó mal";
    ni.setAttribute("aria-label", "Nota de la toma");
    ni.addEventListener("input", function(){ regNote = ni.value; });
    nbox.appendChild(ni);
    wrap.appendChild(nbox);

    var any = CATS.some(function(c){ return regData[c[0]].s !== null || regData[c[0]].e !== null; });
    var canSave = !!regFlavor && any;
    var sv = el("button", "primary", regEditId ? "Guardar cambios" : "Guardar toma");
    sv.type = "button";
    sv.disabled = !canSave;
    sv.dataset.k = "reg|save";
    sv.style.marginTop = "14px";
    sv.addEventListener("click", saveLog);
    wrap.appendChild(sv);
    if(!regFlavor) wrap.appendChild(el("p", "hint", "Falta elegir un sabor."));
    else if(!any) wrap.appendChild(el("p", "hint", "Puntúa o marca cómo se lo comió al menos un gato. Puedes dejar vacío el gato que no la probó."));
    if(regMsg) wrap.appendChild(el("p", "ok", regMsg));
    return wrap;
  }

  function saveLog(){
    if(!regFlavor) return;
    var rec = {id:"l" + Date.now() + "-" + Math.floor(Math.random() * 1000), date:regDate, flavorId:regFlavor, zoro:null, gobi:null, note:regNote.trim(), used:0};
    var any = false;
    CATS.forEach(function(c){
      var d = regData[c[0]];
      if(d.s !== null || d.e !== null){ rec[c[0]] = {s:d.s, e:d.e}; any = true; }
    });
    if(!any) return;
    var f = FMAP[regFlavor];
    var need = usedBy(rec);
    var used = 0;

    var old = null;
    if(regEditId){
      for(var i = 0; i < logs.length; i++){ if(logs[i].id === regEditId){ old = logs[i]; break; } }
    }
    if(old){
      rec.id = old.id;
      if(old.used > 0){
        var oldF = FMAP[old.flavorId];
        if(oldF && typeof oldF.stock === "number") oldF.stock = stockClean(oldF.stock + old.used);
        if(f && typeof f.stock === "number"){
          used = Math.min(f.stock, need);
          f.stock = stockClean(f.stock - used);
        }
      }
      rec.used = used;
      logs[logs.indexOf(old)] = rec;
      startNew();
      regFlavor = null;
      tab = editFrom;
      save(); render();
      window.scrollTo(0, 0);
      return;
    }

    if(f && typeof f.stock === "number"){
      used = Math.min(f.stock, need);
      f.stock = stockClean(f.stock - used);
    }
    rec.used = used;
    logs.push(rec);
    regMsg = "Guardada la toma de " + (f ? f.flavor : "sabor") + " del " + fmtDate(regDate) + ".";
    if(f && typeof f.stock === "number"){
      regMsg += " Quedan " + stockText(f) + ".";
      if(used < need) regMsg += " No había stock suficiente para toda la toma.";
    }
    regFlavor = null;
    regNote = "";
    regData = {zoro:{s:null, e:null}, gobi:{s:null, e:null}};
    save(); render();
  }

  /* ---------- vista: calendario ---------- */
  function dayBucket(arr){
    var vals = [];
    arr.forEach(function(l){
      CATS.forEach(function(c){ if(l[c[0]] && l[c[0]].s !== null) vals.push(l[c[0]].s); });
    });
    var m = mean(vals);
    return m === null ? "none" : bucket(m);
  }

  function viewCalendar(){
    var wrap = el("div");
    var head = el("div", "calhead");
    head.appendChild(el("h2", "", MONTHS[calM] + " " + calY));
    var nav = el("div", "calnav");
    [["‹", -1, "Mes anterior"], ["›", 1, "Mes siguiente"]].forEach(function(n){
      var b = el("button", "", n[0]);
      b.type = "button";
      b.setAttribute("aria-label", n[2]);
      b.dataset.k = "cal|nav|" + n[1];
      b.addEventListener("click", function(){
        calM += n[1];
        if(calM < 0){ calM = 11; calY--; }
        if(calM > 11){ calM = 0; calY++; }
        render();
      });
      nav.appendChild(b);
    });
    head.appendChild(nav);
    wrap.appendChild(head);

    var byDay = {};
    logs.forEach(function(l){ (byDay[l.date] = byDay[l.date] || []).push(l); });

    var grid = el("div", "cal");
    ["L","M","X","J","V","S","D"].forEach(function(w){ grid.appendChild(el("div", "wd", w)); });
    var first = new Date(calY, calM, 1);
    var lead = (first.getDay() + 6) % 7;
    for(var i = 0; i < lead; i++) grid.appendChild(el("div", "day blank"));
    var dim = new Date(calY, calM + 1, 0).getDate();
    var today = todayISO();
    for(var d = 1; d <= dim; d++){
      (function(d){
        var key = calY + "-" + pad(calM + 1) + "-" + pad(d);
        var arr = byDay[key] || [];
        var b = el("button", "day" + (key === today ? " today" : ""));
        b.type = "button";
        b.dataset.k = "cal|" + key;
        b.setAttribute("aria-pressed", selDay === key ? "true" : "false");
        b.setAttribute("aria-label", fmtDate(key) + (arr.length ? ", " + arr.length + " tomas" : ", sin tomas"));
        b.appendChild(el("span", "", String(d)));
        if(arr.length) b.appendChild(el("span", "dot d-" + dayBucket(arr), String(arr.length)));
        b.addEventListener("click", function(){ selDay = (selDay === key) ? null : key; render(); });
        grid.appendChild(b);
      })(d);
    }
    wrap.appendChild(grid);

    var info = el("div");
    if(!selDay){
      info.appendChild(el("p", "hint", "Toca un día para ver qué comieron. El número indica las tomas de ese día y el color la valoración media."));
    } else {
      info.appendChild(el("h2", "", fmtDateLong(selDay)));
      var dl = byDay[selDay] || [];
      if(!dl.length) info.appendChild(el("p", "hint", "No hay tomas este día."));
      dl.forEach(function(l){ info.appendChild(entryEl(l, true, "both")); });
      var add = el("button", "secondary", "Registrar toma este día");
      add.type = "button";
      add.dataset.k = "cal|addday";
      add.style.marginTop = "12px";
      add.addEventListener("click", function(){ startNew(); regDate = selDay; tab = "reg"; render(); window.scrollTo(0, 0); });
      info.appendChild(add);
    }
    wrap.appendChild(info);
    return wrap;
  }

  /* ---------- vista: historial ---------- */
  function overall(cat){
    var ss = [], eat = {now:0, half:0, later:0}, n = 0;
    logs.forEach(function(l){
      var d = l[cat];
      if(!d) return;
      n++;
      if(d.s !== null) ss.push(d.s);
      if(d.e) eat[d.e]++;
    });
    return {n:n, mean:mean(ss), eat:eat};
  }

  function summaryText(){
    var lines = ["Resumen de sabores (" + fmtDate(todayISO()) + ")"];
    flavors.forEach(function(f){
      var parts = [];
      CATS.forEach(function(c){
        var s = series(f.id, c[0]);
        parts.push(c[1] + " " + (s.length ? fmt(mean(s)) + " (" + s.length + (s.length === 1 ? " toma" : " tomas") + ")" : "sin puntuar"));
      });
      lines.push(f.brand + ", " + f.flavor + ": " + parts.join("; ") + (typeof f.stock === "number" ? "; stock " + stockText(f) : ""));
    });
    return lines.join("\n");
  }

  function viewHistory(){
    var wrap = el("div");
    var stats = el("div", "stats");
    CATS.forEach(function(c){
      var o = overall(c[0]);
      var st = el("div", "stat");
      var h3 = el("h3");
      h3.appendChild(catLabel(c, 30));
      st.appendChild(h3);
      st.appendChild(el("div", "big", o.mean === null ? "Sin datos" : fmt(o.mean)));
      st.appendChild(el("p", "", o.n + (o.n === 1 ? " toma registrada" : " tomas registradas")));
      st.appendChild(el("p", "", "Al momento " + o.eat.now + ", deja la mitad " + o.eat.half + ", acaba luego " + o.eat.later));
      stats.appendChild(st);
    });
    var cons = 0, cost = 0, byBrand = {};
    logs.forEach(function(l){
      var ff = FMAP[l.flavorId];
      var n = usedBy(l);
      cons += n;
      var pr = ff ? priceOf(ff) : null;
      if(pr !== null){ cost += n * pr; byBrand[ff.brand] = (byBrand[ff.brand] || 0) + n * pr; }
    });
    var stockSobres = 0, stockValue = 0;
    flavors.forEach(function(f){
      if(typeof f.stock === "number"){
        stockSobres += f.stock;
        var pr = priceOf(f);
        if(pr !== null) stockValue += f.stock * pr;
      }
    });
    var gc = el("div", "stat");
    gc.appendChild(el("h3", "", "Gasto estimado"));
    gc.appendChild(el("div", "big", fmtEur(cost)));
    gc.appendChild(el("p", "", fmt(cons) + (cons === 1 ? " sobre consumido" : " sobres consumidos")));
    gc.appendChild(el("p", "", BRANDS.map(function(b){ return b + " " + fmtEur(byBrand[b] || 0); }).join(", ")));
    gc.appendChild(el("p", "", "Stock actual: " + fmt(stockSobres) + " sobres, valorado en " + fmtEur(stockValue)));
    stats.appendChild(gc);
    wrap.appendChild(stats);

    var panel = el("section", "panel");
    panel.style.marginTop = "16px";
    panel.appendChild(fgroup("Marca", chipGroup("hBrand",
      [["all","Todas"]].concat(BRANDS.map(function(b){ return [b, b]; })), hBrand, function(v){ hBrand = v; render(); })));
    panel.appendChild(fgroup("Gato", chipGroup("hCat",
      [["both","Ambos"],["zoro","Zoro"],["gobi","Gobi"]], hCat, function(v){ hCat = v; render(); })));
    wrap.appendChild(panel);

    var list = ORD.filter(function(l){
      var f = FMAP[l.flavorId];
      if(hBrand !== "all" && (!f || f.brand !== hBrand)) return false;
      if(hCat !== "both" && !l[hCat]) return false;
      return true;
    }).reverse();

    wrap.appendChild(el("div", "countline")).appendChild(el("span", "", list.length + (list.length === 1 ? " toma" : " tomas")));
    if(!list.length){
      wrap.appendChild(el("div", "empty", logs.length ? "Ninguna toma coincide con estos filtros." : "Aún no hay tomas. Registra la primera en la pestaña Registrar."));
    }
    var lastDate = null;
    list.forEach(function(l){
      if(l.date !== lastDate){
        wrap.appendChild(el("div", "datehead", fmtDateLong(l.date)));
        lastDate = l.date;
      }
      wrap.appendChild(entryEl(l, true, hCat));
    });

    wrap.appendChild(el("h2", "", "Copia y resumen"));
    var bp = el("section", "panel");
    bp.appendChild(el("p", "hint", "Tus datos se guardan en Supabase. Puedes sacar una copia de seguridad cuando quieras."));
    var row = el("div", "actions");
    var b1 = el("button", "secondary", "Mostrar resumen en texto");
    b1.type = "button"; b1.dataset.k = "exp|sum";
    b1.addEventListener("click", function(){ exportText = summaryText(); exportMsg = ""; render(); });
    var b2 = el("button", "secondary", "Mostrar copia de seguridad");
    b2.type = "button"; b2.dataset.k = "exp|json";
    b2.addEventListener("click", function(){ exportText = JSON.stringify({v:3, flavors:flavors, logs:logs, prices:prices, alertAt:alertAt}); exportMsg = ""; render(); });
    row.appendChild(b1); row.appendChild(b2);
    bp.appendChild(row);
    if(exportText){
      var ta = el("textarea", "box");
      ta.readOnly = true;
      ta.value = exportText;
      ta.setAttribute("aria-label", "Texto para copiar");
      bp.appendChild(ta);
      var cp = el("button", "primary", "Copiar");
      cp.type = "button"; cp.dataset.k = "exp|copy";
      cp.style.marginTop = "8px";
      cp.addEventListener("click", function(){
        copyText(exportText, function(ok){
          exportMsg = ok ? "Copiado." : "No se pudo copiar solo. Selecciona el texto y cópialo a mano.";
          render();
        });
      });
      bp.appendChild(cp);
      if(exportMsg) bp.appendChild(el("p", "ok", exportMsg));
    }
    bp.appendChild(el("h2", "", "Restaurar copia"));
    var ti = el("textarea", "box");
    ti.value = importText;
    ti.placeholder = "Pega aquí una copia de seguridad";
    ti.setAttribute("aria-label", "Copia de seguridad a restaurar");
    ti.addEventListener("input", function(){ importText = ti.value; });
    bp.appendChild(ti);
    var ar = el("div", "actions");
    ar.appendChild(armBtn("import", "Restaurar copia", "Pulsa otra vez: se reemplazan los datos actuales", "secondary", doImport));
    bp.appendChild(ar);
    if(importMsg) bp.appendChild(el("p", "hint", importMsg));
    wrap.appendChild(bp);
    return wrap;
  }

  function doImport(){
    try{
      var p = JSON.parse(importText.trim());
      if(!p || !Array.isArray(p.flavors) || !Array.isArray(p.logs)) throw new Error("formato");
      var okF = p.flavors.every(function(f){ return f && typeof f.id === "string" && typeof f.flavor === "string" && typeof f.brand === "string"; });
      if(!okF) throw new Error("sabores");
      flavors = p.flavors;
      loadPrices(p.prices);
      loadAlert(p.alertAt);
      logs = p.logs.filter(function(l){ return l && typeof l.flavorId === "string"; }).map(function(l){
        if(!l.id) l.id = "l" + Date.now() + "-" + Math.floor(Math.random() * 100000);
        return normLog(l);
      });
      cleanFlavors();
      importText = "";
      importMsg = "Copia restaurada: " + flavors.length + " sabores y " + logs.length + " tomas.";
      save();
    }catch(e){
      importMsg = "No se pudo restaurar. Comprueba que has pegado la copia completa.";
    }
    render();
  }

  /* ---------- aviso global de stock ---------- */
  function totalStock(){
    var t = 0, any = false;
    flavors.forEach(function(f){
      if(typeof f.stock === "number"){ t += f.stock; any = true; }
    });
    return any ? t : null;
  }

  function buyAdvice(){
    var good = [], bad = [];
    flavors.forEach(function(f){
      var m = scoreFor(f, CATS);
      var b = bucket(m);
      if(b === "good") good.push({f:f, m:m});
      if(b === "bad") bad.push(f);
    });
    good.sort(function(a, b){ return b.m - a.m; });
    return {good:good, bad:bad};
  }

  function renderAlert(){
    var box = document.getElementById("alert");
    box.innerHTML = "";
    var t = totalStock();
    if(t === null){
      box.appendChild(el("div", "alertbar a-none", "Indica el stock de cada sabor (en Sabores, Editar stock) para activar el aviso de compra."));
      return;
    }
    var days = t / DAILY;
    var low = t <= alertAt;
    var bar = el("div", "alertbar " + (low ? "a-low" : "a-ok"));
    var head = el("div", "alerthead");
    head.appendChild(el("strong", "", low ? (t <= 0 ? "Sin stock. Toca comprar." : "Toca comprar.") : "Stock total."));
    head.appendChild(document.createTextNode(" Quedan " + fmt(t) + (t === 1 ? " sobre" : " sobres") + " en total, para " + fmt(days) + (days === 1 ? " día" : " días") + "."));
    bar.appendChild(head);
    if(low){
      var adv = buyAdvice();
      if(adv.good.length){
        var names = adv.good.slice(0, 6).map(function(g){
          var pr = priceOf(g.f);
          return g.f.flavor + " (" + g.f.brand + ", " + fmt(g.m) + (pr !== null ? ", " + fmtEur(pr) : "") + ")";
        });
        bar.appendChild(el("p", "alertline", "Para comprar, los mejor valorados: " + names.join("; ") + "."));
      } else {
        bar.appendChild(el("p", "alertline", "Todavía no hay sabores con buena valoración para recomendar."));
      }
      if(adv.bad.length){
        bar.appendChild(el("p", "alertline", "Mejor evitar: " + adv.bad.map(function(f){ return f.flavor; }).join(", ") + "."));
      }
    }
    box.appendChild(bar);
  }

  /* ---------- render ---------- */
  var TABS = [["flavors","Sabores"],["reg","Registrar"],["cal","Calendario"],["hist","Historial"]];
  function renderTabs(){
    var nav = document.getElementById("tabs");
    nav.innerHTML = "";
    TABS.forEach(function(t){
      var b = el("button", "", t[1]);
      b.type = "button";
      b.dataset.k = "tab|" + t[0];
      b.setAttribute("aria-pressed", tab === t[0] ? "true" : "false");
      b.addEventListener("click", function(){ tab = t[0]; render(); });
      nav.appendChild(b);
    });
  }

  function render(){
    var ae = document.activeElement;
    var k = ae && ae.dataset ? ae.dataset.k : null;
    var scrollY = window.pageYOffset;
    renderStatus();
    if(booting || !session || !ready){
      document.getElementById("alert").innerHTML = "";
      document.getElementById("tabs").innerHTML = "";
      var gv = document.getElementById("view");
      gv.innerHTML = "";
      gv.appendChild((booting || session) ? viewLoading() : viewLogin());
      if(k){
        var ins = document.querySelectorAll("[data-k]");
        for(var j = 0; j < ins.length; j++){ if(ins[j].dataset.k === k){ ins[j].focus(); break; } }
      }
      return;
    }
    prep();
    renderAlert();
    renderTabs();
    var v = document.getElementById("view");
    v.innerHTML = "";
    if(tab === "flavors") v.appendChild(viewFlavors());
    else if(tab === "reg") v.appendChild(viewRegister());
    else if(tab === "cal") v.appendChild(viewCalendar());
    else v.appendChild(viewHistory());
    if(k){
      var all = document.querySelectorAll("[data-k]");
      for(var i = 0; i < all.length; i++){
        if(all[i].dataset.k === k){
          try{ all[i].focus({preventScroll:true}); }catch(e){ all[i].focus(); }
          break;
        }
      }
    }
    try{ window.scrollTo(0, scrollY); }catch(e){}
  }

  function boot(){
    if(!window.supabase || !SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL.indexOf("TU-") !== -1){
      document.getElementById("view").appendChild(el("div", "empty", "Falta configurar Supabase: rellena la url y la key en config.js."));
      return;
    }
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    sb.auth.onAuthStateChange(function(ev, sess){
      if(sess) session = sess;
      if(ev === "SIGNED_OUT"){ session = null; ready = false; render(); }
    });
    sb.auth.getSession().then(function(r){
      booting = false;
      session = (r.data && r.data.session) ? r.data.session : null;
      if(session) start(); else render();
    }, function(){ booting = false; render(); });
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", function(){ if(document.visibilityState === "visible") refresh(); });
    window.addEventListener("online", function(){ if(ready) runSync(); });
    setInterval(function(){ if(document.visibilityState === "visible") refresh(); }, 60000);
    window.addEventListener("beforeunload", function(e){
      if(ready && (syncing || syncState === "error")){ e.preventDefault(); e.returnValue = ""; }
    });
    render();
  }

  boot();
})();
