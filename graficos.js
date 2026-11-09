(function(){
  var GA = window.GA;
  if(!GA) return;
  var el = GA.el, fmt = GA.fmt, fmtEur = GA.fmtEur, mean = GA.mean;
  var NS = "http://www.w3.org/2000/svg";
  var evoFlavor = "all", rankAll = false;

  function svgEl(tag, attrs, text){
    var n = document.createElementNS(NS, tag);
    for(var k in attrs){ n.setAttribute(k, attrs[k]); }
    if(text !== undefined) n.textContent = text;
    return n;
  }
  function mondayOf(s){
    var d = GA.parseISO(s);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return GA.isoOf(d);
  }
  function shortDate(s){
    var d = GA.parseISO(s);
    return d.getDate() + " " + GA.months[d.getMonth()];
  }
  function daysBetween(a, b){
    return Math.round((GA.parseISO(b) - GA.parseISO(a)) / 86400000);
  }
  function bucketOf(v){ return v >= 3.5 ? "good" : (v >= 2 ? "mid" : "bad"); }
  function card(title, sub){
    var c = el("section", "chartbox");
    c.appendChild(el("h2", "", title));
    if(sub) c.appendChild(el("p", "chartsub", sub));
    return c;
  }
  function avatar(cat){
    var im = el("img", "mini");
    im.alt = "";
    im.onerror = function(){ im.style.display = "none"; };
    im.src = GA.imgBase + cat + ".jpg";
    return im;
  }
  function catName(cat){
    for(var i = 0; i < GA.cats.length; i++){ if(GA.cats[i][0] === cat) return GA.cats[i][1]; }
    return cat;
  }

  /* ---------- ranking de sabores ---------- */
  function ranking(D){
    var box = card("Ranking de sabores", "Media de las últimas 3 tomas, de 0 a 5.");
    var rows = [];
    D.flavors.forEach(function(f){
      var z = mean(GA.series(f.id, "zoro").slice(-3));
      var g = mean(GA.series(f.id, "gobi").slice(-3));
      var m = GA.scoreFor(f, GA.cats);
      if(m !== null) rows.push({f:f, z:z, g:g, m:m});
    });
    if(!rows.length){
      box.appendChild(el("p", "hint", "Cuando puntúes alguna toma, aquí aparecerán los sabores ordenados de mejor a peor."));
      return box;
    }
    rows.sort(function(a, b){ return (b.m - a.m) || a.f.flavor.localeCompare(b.f.flavor); });
    var shown = rankAll ? rows : rows.slice(0, 8);
    var list = el("div", "rank");
    shown.forEach(function(r, i){
      var row = el("div", "rrow");
      row.appendChild(el("span", "rpos", String(i + 1)));
      if(GA.imgSrc(r.f.id)){
        var im = el("img", "rthumb");
        im.alt = "";
        im.onerror = function(){ im.style.display = "none"; };
        im.src = GA.imgSrc(r.f.id);
        row.appendChild(im);
      }
      var main = el("div", "rmain");
      main.appendChild(el("div", "rname", r.f.flavor));
      [["zoro", r.z], ["gobi", r.g]].forEach(function(p){
        var line = el("div", "rbar");
        line.appendChild(avatar(p[0]));
        if(p[1] === null){
          line.appendChild(el("span", "rnone", "sin puntuar"));
        } else {
          var track = el("div", "track");
          var fill = el("div", "fill f-" + bucketOf(p[1]));
          fill.style.width = Math.max(2, p[1] / 5 * 100) + "%";
          track.appendChild(fill);
          line.appendChild(track);
          line.appendChild(el("span", "rval", fmt(p[1])));
        }
        main.appendChild(line);
      });
      row.appendChild(main);
      list.appendChild(row);
    });
    box.appendChild(list);
    if(rows.length > 8){
      var tg = el("button", "linkbtn", rankAll ? "Ver menos" : "Ver todos (" + rows.length + ")");
      tg.type = "button";
      tg.dataset.k = "rank|toggle";
      tg.style.marginTop = "8px";
      tg.addEventListener("click", function(){ rankAll = !rankAll; GA.render(); });
      box.appendChild(tg);
    }
    return box;
  }

  /* ---------- evolución de las notas ---------- */
  function points(cat, D){
    var groups = {};
    D.ord.forEach(function(l){
      if(evoFlavor !== "all" && l.flavorId !== evoFlavor) return;
      var d = l[cat];
      if(!d || d.s === null) return;
      var key = evoFlavor === "all" ? mondayOf(l.date) : l.date;
      (groups[key] = groups[key] || []).push(d.s);
    });
    return Object.keys(groups).sort().map(function(k){ return {date:k, v:mean(groups[k])}; });
  }

  function evolution(D){
    var box = card("Evolución de las notas", evoFlavor === "all"
      ? "Nota media por semana de todos los sabores."
      : "Nota de cada toma de este sabor.");
    var scored = D.flavors.filter(function(f){
      return GA.series(f.id, "zoro").length || GA.series(f.id, "gobi").length;
    });
    if(!scored.length){
      box.appendChild(el("p", "hint", "Cuando puntúes tomas verás aquí cómo cambian las notas con el tiempo."));
      return box;
    }
    if(evoFlavor !== "all" && !scored.some(function(f){ return f.id === evoFlavor; })) evoFlavor = "all";
    var opts = [["all", "Todos"]].concat(scored.map(function(f){ return [f.id, f.flavor]; }));
    var chips = GA.chipGroup("evoF", opts, evoFlavor, function(v){ evoFlavor = v; GA.render(); });
    chips.className = "chips scrollx";
    box.appendChild(chips);

    var pts = {zoro:points("zoro", D), gobi:points("gobi", D)};
    var all = pts.zoro.concat(pts.gobi);
    var W = 400, H = 210, L = 26, R = 12, T = 12, B = 30;
    var dates = all.map(function(p){ return p.date; }).sort();
    var d0 = dates[0], d1 = dates[dates.length - 1];
    var span = daysBetween(d0, d1);
    function X(date){ return span === 0 ? L + (W - L - R) / 2 : L + daysBetween(d0, date) / span * (W - L - R); }
    function Y(v){ return T + (5 - v) / 5 * (H - T - B); }

    var svg = svgEl("svg", {viewBox:"0 0 " + W + " " + H, "class":"chart", role:"img", "aria-label":"Evolución de las notas de Zoro y Gobi"});
    for(var g = 0; g <= 5; g++){
      svg.appendChild(svgEl("line", {x1:L, x2:W - R, y1:Y(g), y2:Y(g), "class":"grid"}));
      svg.appendChild(svgEl("text", {x:L - 6, y:Y(g) + 3.5, "text-anchor":"end"}, String(g)));
    }
    var labels = span === 0 ? [d0] : (span < 6 ? [d0, d1] : [d0, GA.addDays(d0, Math.round(span / 2)), d1]);
    labels.forEach(function(dt, i){
      var anchor = labels.length === 1 ? "middle" : (i === 0 ? "start" : (i === labels.length - 1 ? "end" : "middle"));
      var x = labels.length === 1 ? X(dt) : (i === 0 ? L : (i === labels.length - 1 ? W - R : X(dt)));
      svg.appendChild(svgEl("text", {x:x.toFixed(1), y:H - 10, "text-anchor":anchor}, shortDate(dt)));
    });
    ["zoro", "gobi"].forEach(function(cat){
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
        c.appendChild(svgEl("title", {}, catName(cat) + ", " + shortDate(q.date) + ": " + fmt(q.v)));
        svg.appendChild(c);
      });
    });
    box.appendChild(svg);

    var lg = el("div", "legend2");
    GA.cats.forEach(function(c){
      var item = el("span", "lg");
      item.appendChild(el("span", "sw sw-" + c[0]));
      item.appendChild(avatar(c[0]));
      item.appendChild(document.createTextNode(c[1]));
      lg.appendChild(item);
    });
    box.appendChild(lg);
    return box;
  }

  /* ---------- consumo y gasto por semana ---------- */
  function spending(D){
    var N = 8;
    var box = card("Consumo y gasto por semana", "Sobres consumidos y coste estimado. Cada barra es la semana que empieza ese lunes.");
    var thisMon = mondayOf(GA.todayISO());
    var weeks = [];
    for(var i = N - 1; i >= 0; i--) weeks.push(GA.addDays(thisMon, -7 * i));
    var acc = {};
    weeks.forEach(function(w){ acc[w] = {s:0, c:0}; });
    var first = null;
    D.logs.forEach(function(l){
      var u = GA.usedBy(l);
      var w = mondayOf(l.date);
      if(!first || l.date < first) first = l.date;
      if(!acc[w]) return;
      acc[w].s += u;
      var f = D.fmap[l.flavorId];
      var p = f ? GA.priceOf(f) : null;
      if(p !== null) acc[w].c += u * p;
    });
    var totalS = 0, totalC = 0;
    weeks.forEach(function(w){ totalS += acc[w].s; totalC += acc[w].c; });
    if(!totalS){
      box.appendChild(el("p", "hint", "Cuando registres tomas verás aquí cuántos sobres gastáis cada semana."));
      return box;
    }
    var elapsed = Math.min(N, Math.round(daysBetween(mondayOf(first), thisMon) / 7) + 1);
    box.appendChild(el("p", "chartsum", "Media semanal: " + fmt(totalS / elapsed) + " sobres y " + fmtEur(totalC / elapsed) + "."));

    var W = 400, H = 190, top = 22, base = 148;
    var max = Math.max.apply(null, weeks.map(function(w){ return acc[w].s; }));
    var band = (W - 20) / N, bw = band * 0.62;
    var svg = svgEl("svg", {viewBox:"0 0 " + W + " " + H, "class":"chart", role:"img", "aria-label":"Sobres consumidos y gasto por semana"});
    svg.appendChild(svgEl("line", {x1:10, x2:W - 10, y1:base, y2:base, "class":"base"}));
    weeks.forEach(function(w, idx){
      var d = acc[w];
      var h = d.s / max * (base - top);
      var x = 10 + idx * band + (band - bw) / 2;
      var rect = svgEl("rect", {
        x:x.toFixed(1), y:(base - h).toFixed(1), width:bw.toFixed(1),
        height:Math.max(h, d.s > 0 ? 2 : 0).toFixed(1), rx:4,
        "class":"bar" + (idx === N - 1 ? " cur" : "")
      });
      rect.appendChild(svgEl("title", {}, "Semana del " + shortDate(w) + ": " + fmt(d.s) + " sobres, " + fmtEur(d.c)));
      svg.appendChild(rect);
      var cx = (x + bw / 2).toFixed(1);
      if(d.s > 0) svg.appendChild(svgEl("text", {x:cx, y:(base - h - 5).toFixed(1), "text-anchor":"middle", "class":"val"}, fmt(d.s)));
      svg.appendChild(svgEl("text", {x:cx, y:base + 15, "text-anchor":"middle"}, shortDate(w)));
      if(d.c > 0) svg.appendChild(svgEl("text", {x:cx, y:base + 28, "text-anchor":"middle"}, fmtEur(d.c)));
    });
    box.appendChild(svg);
    return box;
  }

  GA.charts = function(){
    var D = GA.data();
    var wrap = el("div", "charts");
    wrap.appendChild(ranking(D));
    wrap.appendChild(evolution(D));
    wrap.appendChild(spending(D));
    return wrap;
  };
})();
