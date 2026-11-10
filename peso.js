(function(){
  var GA = window.GA;
  if(!GA) return;
  var el = GA.el;
  var NS = "http://www.w3.org/2000/svg";
  var TABLE = "weights";

  /* ---------- estado ---------- */
  var list = [], loaded = false, loading = false, loadErr = "", uid = null, lastLoad = 0;
  var fDate = GA.todayISO(), fCat = "zoro", fKg = "", fNote = "", editId = null;
  var msg = "", msgBad = false, busy = false;
  var per = "6m", vCat = "both";

  /* ---------- utilidades ---------- */
  function svgEl(tag, attrs, text){
    var n = document.createElementNS(NS, tag);
    for(var k in attrs){ n.setAttribute(k, attrs[k]); }
    if(text !== undefined) n.textContent = text;
    return n;
  }
  function catName(cat){
    for(var i = 0; i < GA.cats.length; i++){ if(GA.cats[i][0] === cat) return GA.cats[i][1]; }
    return cat;
  }
  function catPair(cat){
    for(var i = 0; i < GA.cats.length; i++){ if(GA.cats[i][0] === cat) return GA.cats[i]; }
    return [cat, cat];
  }
  function num(n, dec){ return n.toFixed(dec).replace(".", ","); }
  function fmtKg(n){ return num(n, 2) + " kg"; }
  function fmtDelta(d){
    if(Math.abs(d) < 0.005) return "sin cambios";
    return (d > 0 ? "+" : "−") + num(Math.abs(d), 2) + " kg";
  }
  function fmtPct(d, base){
    if(!base || Math.abs(d) < 0.005) return "";
    var p = d / base * 100;
    return " (" + (p > 0 ? "+" : "−") + num(Math.abs(p), 1) + " %)";
  }
  function deltaCls(d){ return Math.abs(d) < 0.005 ? "wd-flat" : (d > 0 ? "wd-up" : "wd-down"); }
  function daysBetween(a, b){ return Math.round((GA.parseISO(b) - GA.parseISO(a)) / 86400000); }
  function shortDate(s){
    var d = GA.parseISO(s);
    return d.getDate() + " " + GA.months[d.getMonth()];
  }
  function fromRow(r){
    return {id:r.id, date:String(r.date).slice(0, 10), cat:r.cat, kg:Number(r.kg), note:r.note || "", created:r.created_at || ""};
  }
  function sortList(){
    list.sort(function(a, b){
      if(a.date !== b.date) return a.date < b.date ? -1 : 1;
      return a.created < b.created ? -1 : (a.created > b.created ? 1 : 0);
    });
  }
  function ofCat(cat){ return list.filter(function(w){ return w.cat === cat; }); }

  /* ---------- Supabase ---------- */
  async function load(){
    var sb = GA.client();
    if(!sb) return;
    loading = true; loadErr = "";
    try{
      var r = await sb.from(TABLE).select("*").order("date").order("created_at");
      if(r.error) throw r.error;
      list = r.data.map(fromRow);
      sortList();
      loaded = true;
      lastLoad = Date.now();
    }catch(e){
      loadErr = (e && e.message) ? e.message : "No se pudo conectar con Supabase.";
    }
    loading = false;
    GA.render();
  }

  async function saveWeight(){
    if(busy) return;
    var kg = GA.parseNum(fKg);
    if(!GA.validISO(fDate)){ msg = "Indica una fecha válida."; msgBad = true; GA.render(); return; }
    if(kg === null || kg <= 0 || kg >= 30){ msg = "Indica un peso válido en kg, por ejemplo 4,35."; msgBad = true; GA.render(); return; }
    kg = Math.round(kg * 100) / 100;
    var old = null;
    if(editId){ for(var i = 0; i < list.length; i++){ if(list[i].id === editId){ old = list[i]; break; } } }
    var row = {
      id: old ? old.id : "w" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      date:fDate, cat:fCat, kg:kg, note:fNote.trim()
    };
    busy = true; msg = ""; GA.render();
    try{
      var r = await GA.client().from(TABLE).upsert(row).select();
      if(r.error) throw r.error;
      var saved = (r.data && r.data[0]) ? fromRow(r.data[0]) : fromRow(row);
      if(old) list[list.indexOf(old)] = saved; else list.push(saved);
      sortList();
      msg = (old ? "Actualizado: " : "Guardado: ") + catName(saved.cat) + ", " + fmtKg(saved.kg) + " el " + GA.fmtDate(saved.date) + ".";
      msgBad = false;
      editId = null; fKg = ""; fNote = "";
    }catch(e){
      msg = "No se pudo guardar (" + ((e && e.message) ? e.message : "sin conexión") + ").";
      msgBad = true;
    }
    busy = false;
    GA.render();
  }

  async function deleteWeight(w){
    try{
      var r = await GA.client().from(TABLE).delete().eq("id", w.id);
      if(r.error) throw r.error;
      list = list.filter(function(x){ return x.id !== w.id; });
      if(editId === w.id) cancelEdit();
      msg = "Pesaje eliminado."; msgBad = false;
    }catch(e){
      msg = "No se pudo eliminar (" + ((e && e.message) ? e.message : "sin conexión") + ").";
      msgBad = true;
    }
    GA.render();
  }

  function startEdit(w){
    editId = w.id; fDate = w.date; fCat = w.cat; fKg = num(w.kg, 2); fNote = w.note; msg = "";
    GA.render();
    window.scrollTo(0, 0);
  }
  function cancelEdit(){
    editId = null; fDate = GA.todayISO(); fKg = ""; fNote = ""; msg = "";
    GA.render();
  }

  /* ---------- formulario ---------- */
  function form(){
    var box = el("section", "panel");
    var h = el("h2", "", editId ? "Editar pesaje" : "Nuevo pesaje");
    h.style.marginTop = "0";
    box.appendChild(h);

    var row = el("div", "regrow");
    row.appendChild(el("span", "flabel", "Fecha"));
    var di = el("input");
    di.type = "date"; di.value = fDate; di.max = GA.todayISO(); di.dataset.k = "w|date";
    di.setAttribute("aria-label", "Fecha del pesaje");
    di.addEventListener("change", function(){ if(GA.validISO(di.value)) fDate = di.value; });
    row.appendChild(di);
    box.appendChild(row);

    var cg = el("div", "chips");
    GA.cats.forEach(function(c){
      var b = el("button", "wcat");
      b.type = "button";
      b.dataset.k = "w|cat|" + c[0];
      b.setAttribute("aria-pressed", fCat === c[0] ? "true" : "false");
      b.appendChild(GA.catLabel(c, 22));
      b.addEventListener("click", function(){ fCat = c[0]; GA.render(); });
      cg.appendChild(b);
    });
    var g1 = el("div", "fgroup");
    g1.appendChild(el("span", "flabel", "Gato"));
    g1.appendChild(cg);
    box.appendChild(g1);

    var g2 = el("div", "fgroup");
    g2.appendChild(el("span", "flabel", "Peso"));
    var kgw = el("span", "kgwrap");
    var ki = el("input", "kginput");
    ki.type = "text"; ki.inputMode = "decimal"; ki.placeholder = "4,35"; ki.value = fKg; ki.dataset.k = "w|kg";
    ki.setAttribute("aria-label", "Peso en kilos");
    ki.addEventListener("input", function(){ fKg = ki.value; });
    ki.addEventListener("keydown", function(e){ if(e.key === "Enter"){ e.preventDefault(); saveWeight(); } });
    kgw.appendChild(ki);
    kgw.appendChild(el("span", "muted", "kg"));
    g2.appendChild(kgw);
    box.appendChild(g2);

    var ni = el("input", "noteinput");
    ni.type = "text"; ni.placeholder = "Nota opcional (veterinario, báscula de casa...)"; ni.value = fNote; ni.dataset.k = "w|note";
    ni.setAttribute("aria-label", "Nota");
    ni.addEventListener("input", function(){ fNote = ni.value; });
    box.appendChild(ni);

    var last = ofCat(fCat);
    if(last.length && !editId){
      var lw = last[last.length - 1];
      box.appendChild(el("p", "hint", "Último peso de " + catName(fCat) + ": " + fmtKg(lw.kg) + " el " + GA.fmtDate(lw.date) + "."));
    }

    var acts = el("div", "actions");
    var sv = el("button", "primary", busy ? "Guardando..." : (editId ? "Guardar cambios" : "Guardar pesaje"));
    sv.type = "button"; sv.disabled = busy; sv.dataset.k = "w|save";
    sv.addEventListener("click", saveWeight);
    acts.appendChild(sv);
    if(editId){
      var cb = el("button", "secondary", "Cancelar");
      cb.type = "button";
      cb.addEventListener("click", cancelEdit);
      acts.appendChild(cb);
    }
    box.appendChild(acts);
    if(msg){
      var m = el("p", msgBad ? "hint wbad" : "ok", msg);
      box.appendChild(m);
    }
    return box;
  }

  /* ---------- resumen por gato ---------- */
  function summary(){
    var wrap = el("div", "stats wstats");
    GA.cats.forEach(function(c){
      var arr = ofCat(c[0]);
      var s = el("div", "stat");
      var h = el("h3", "");
      h.appendChild(GA.catLabel(c, 24));
      s.appendChild(h);
      if(!arr.length){
        s.appendChild(el("p", "", "Sin pesajes todavía."));
        wrap.appendChild(s);
        return;
      }
      var last = arr[arr.length - 1];
      s.appendChild(el("div", "big", fmtKg(last.kg)));
      s.appendChild(el("p", "", GA.fmtDate(last.date)));
      if(arr.length > 1){
        var prev = arr[arr.length - 2];
        var d1 = last.kg - prev.kg;
        var p1 = el("p", "");
        p1.appendChild(document.createTextNode("Desde el anterior (" + shortDate(prev.date) + "): "));
        p1.appendChild(el("b", deltaCls(d1), fmtDelta(d1) + fmtPct(d1, prev.kg)));
        s.appendChild(p1);
        var ref = null;
        var limit = GA.addDays(last.date, -30);
        for(var i = arr.length - 1; i >= 0; i--){ if(arr[i].date <= limit){ ref = arr[i]; break; } }
        if(ref && ref !== prev){
          var d2 = last.kg - ref.kg;
          var p2 = el("p", "");
          p2.appendChild(document.createTextNode("Hace un mes o más (" + shortDate(ref.date) + "): "));
          p2.appendChild(el("b", deltaCls(d2), fmtDelta(d2) + fmtPct(d2, ref.kg)));
          s.appendChild(p2);
        }
      }
      wrap.appendChild(s);
    });
    return wrap;
  }

  /* ---------- gráfico de evolución ---------- */
  function niceStep(range){
    var steps = [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5];
    for(var i = 0; i < steps.length; i++){ if(range / steps[i] <= 5) return steps[i]; }
    return 10;
  }

  function chart(){
    var box = el("section", "chartbox");
    box.appendChild(el("h2", "", "Evolución del peso"));
    box.appendChild(el("p", "chartsub", "Un punto por pesaje. Pasa el dedo o el ratón por encima para ver el valor."));

    var g1 = el("div", "fgroup");
    g1.appendChild(el("span", "flabel", "Periodo"));
    g1.appendChild(GA.chipGroup("wper", [["3m","3 meses"],["6m","6 meses"],["1y","1 año"],["all","Todo"]], per, function(v){ per = v; GA.render(); }));
    box.appendChild(g1);
    var g2 = el("div", "fgroup");
    g2.appendChild(el("span", "flabel", "Gato"));
    g2.appendChild(GA.chipGroup("wcat", [["both","Los dos"]].concat(GA.cats), vCat, function(v){ vCat = v; GA.render(); }));
    box.appendChild(g2);

    var today = GA.todayISO();
    var start = per === "3m" ? GA.addDays(today, -91) : (per === "6m" ? GA.addDays(today, -182) : (per === "1y" ? GA.addDays(today, -365) : null));
    var cats = GA.cats.filter(function(c){ return vCat === "both" || vCat === c[0]; }).map(function(c){ return c[0]; });
    var pts = {};
    var all = [];
    cats.forEach(function(cat){
      var byDay = {};
      ofCat(cat).forEach(function(w){ if(!start || w.date >= start) byDay[w.date] = w.kg; });
      pts[cat] = Object.keys(byDay).sort().map(function(d){ return {date:d, v:byDay[d]}; });
      all = all.concat(pts[cat]);
    });
    if(!all.length){
      box.appendChild(el("p", "hint", list.length
        ? "No hay pesajes en este periodo. Prueba con un periodo más largo."
        : "Cuando registres pesajes verás aquí cómo evoluciona el peso de cada gato."));
      return box;
    }

    var W = 400, H = 220, L = 40, R = 14, T = 12, B = 30;
    var dates = all.map(function(p){ return p.date; }).sort();
    var d0 = dates[0], d1 = dates[dates.length - 1];
    var span = daysBetween(d0, d1);
    var vals = all.map(function(p){ return p.v; });
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    var pad = Math.max((mx - mn) * 0.15, 0.1);
    var step = niceStep(mx - mn + 2 * pad);
    var lo = Math.floor((mn - pad) / step) * step, hi = Math.ceil((mx + pad) / step) * step;
    if(lo < 0) lo = 0;
    var dec = step < 0.1 ? 2 : (step < 1 ? 1 : 0);
    function X(date){ return span === 0 ? L + (W - L - R) / 2 : L + daysBetween(d0, date) / span * (W - L - R); }
    function Y(v){ return T + (hi - v) / (hi - lo) * (H - T - B); }

    var svg = svgEl("svg", {viewBox:"0 0 " + W + " " + H, "class":"chart", role:"img", "aria-label":"Evolución del peso de " + cats.map(catName).join(" y ")});
    for(var g = lo; g <= hi + step / 2; g += step){
      svg.appendChild(svgEl("line", {x1:L, x2:W - R, y1:Y(g).toFixed(1), y2:Y(g).toFixed(1), "class":"grid"}));
      svg.appendChild(svgEl("text", {x:L - 6, y:(Y(g) + 3.5).toFixed(1), "text-anchor":"end"}, num(g, dec)));
    }
    var labels = span === 0 ? [d0] : (span < 6 ? [d0, d1] : [d0, GA.addDays(d0, Math.round(span / 2)), d1]);
    labels.forEach(function(dt, i){
      var anchor = labels.length === 1 ? "middle" : (i === 0 ? "start" : (i === labels.length - 1 ? "end" : "middle"));
      var x = labels.length === 1 ? X(dt) : (i === 0 ? L : (i === labels.length - 1 ? W - R : X(dt)));
      svg.appendChild(svgEl("text", {x:x.toFixed(1), y:H - 10, "text-anchor":anchor}, shortDate(dt)));
    });
    cats.forEach(function(cat){
      var p = pts[cat];
      if(!p.length) return;
      if(p.length > 1){
        svg.appendChild(svgEl("polyline", {
          points:p.map(function(q){ return X(q.date).toFixed(1) + "," + Y(q.v).toFixed(1); }).join(" "),
          "class":"ln ln-" + cat
        }));
      }
      p.forEach(function(q){
        var c = svgEl("circle", {cx:X(q.date).toFixed(1), cy:Y(q.v).toFixed(1), r:4, "class":"dt dt-" + cat});
        c.appendChild(svgEl("title", {}, catName(cat) + ", " + GA.fmtDate(q.date) + ": " + fmtKg(q.v)));
        svg.appendChild(c);
      });
    });
    box.appendChild(svg);

    var lg = el("div", "legend2");
    cats.forEach(function(cat){
      var item = el("span", "lg");
      item.appendChild(el("span", "sw sw-" + cat));
      item.appendChild(GA.catLabel(catPair(cat), 18));
      lg.appendChild(item);
    });
    box.appendChild(lg);
    return box;
  }

  /* ---------- historial de pesajes ---------- */
  function history(){
    var box = el("section", "chartbox");
    box.appendChild(el("h2", "", "Pesajes registrados"));
    var shown = list.filter(function(w){ return vCat === "both" || w.cat === vCat; }).slice().reverse();
    if(!shown.length){
      box.appendChild(el("p", "hint", "Todavía no hay pesajes."));
      return box;
    }
    var prevOf = {};
    GA.cats.forEach(function(c){
      var arr = ofCat(c[0]);
      for(var i = 1; i < arr.length; i++) prevOf[arr[i].id] = arr[i - 1];
    });
    shown.forEach(function(w){
      var e = el("div", "entry");
      var top = el("div", "entrytop");
      top.appendChild(el("div", "entryname", GA.fmtDateLong(w.date)));
      var acts = el("div", "tags");
      var eb = el("button", "del", "Editar");
      eb.type = "button";
      eb.dataset.k = "wedit|" + w.id;
      eb.addEventListener("click", function(){ startEdit(w); });
      acts.appendChild(eb);
      acts.appendChild(GA.armBtn("w|" + w.id, "Eliminar", "Pulsa otra vez para eliminar", "del", function(){ deleteWeight(w); }));
      top.appendChild(acts);
      e.appendChild(top);
      var line = el("div", "eline");
      line.appendChild(GA.catLabel(catPair(w.cat), 22));
      line.appendChild(el("b", "wkg", fmtKg(w.kg)));
      var p = prevOf[w.id];
      if(p){
        var d = w.kg - p.kg;
        line.appendChild(el("span", "wdelta " + deltaCls(d), fmtDelta(d)));
      }
      e.appendChild(line);
      if(w.note) e.appendChild(el("p", "meta", w.note));
      box.appendChild(e);
    });
    return box;
  }

  /* ---------- vista ---------- */
  GA.weightView = function(){
    var s = GA.session();
    var id = (s && s.user) ? s.user.id : null;
    if(id !== uid){ uid = id; list = []; loaded = false; loadErr = ""; }
    if(!loaded){
      if(loadErr){
        var w = el("div", "panel");
        w.appendChild(el("p", "ok", "No se pudieron cargar los pesajes."));
        w.appendChild(el("p", "hint", loadErr));
        w.appendChild(el("p", "hint", "Si es la primera vez, comprueba que has creado la tabla weights en Supabase."));
        var rb = el("button", "primary", "Reintentar");
        rb.type = "button";
        rb.style.marginTop = "10px";
        rb.addEventListener("click", function(){ loadErr = ""; load(); GA.render(); });
        w.appendChild(rb);
        return w;
      }
      if(!loading) load();
      return el("div", "empty", "Cargando pesajes...");
    }
    if(!loading && !busy && !editId && Date.now() - lastLoad > 60000) load();
    var wrap = el("div", "weights");
    wrap.appendChild(form());
    var h = el("h2", "", "Último peso");
    wrap.appendChild(h);
    wrap.appendChild(summary());
    wrap.appendChild(chart());
    wrap.appendChild(history());
    return wrap;
  };
})();
