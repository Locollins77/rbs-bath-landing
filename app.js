(function () {
  var CFG = window.RBS_CONFIG || {};
  var LIVE = (CFG.LIVE_HOSTS || []).some(function (h) { return location.hostname === h || location.hostname.slice(-(h.length + 1)) === "." + h; });
  var PREVIEW = !LIVE;
  var CONSENT = "By tapping Get My Free Quote, you agree that Rainbow Bath & Shower may call or text you at this number about your free in-home quote, including with automated technology. Consent is not a condition of purchase. Message and data rates may apply. Reply STOP to opt out.";

  // ---------- tracking ----------
  // Two modes, never both (so nothing double counts):
  //  - GTM mode (CFG.GTM_ID set): the page loads Google Tag Manager and only pushes dataLayer events.
  //    The Meta pixel and GA4 are tags inside that GTM container (see gtm/ folder).
  //  - Direct mode (no GTM_ID): the page loads the Meta pixel itself (and GA4 if GA4_ID is set).
  // Previews (any host not in LIVE_HOSTS) load nothing.
  // Never put product, "who it's for" or any health/mobility answer into tracking.
  var GTM = !!CFG.GTM_ID && !PREVIEW;
  var IS_TY = document.body.getAttribute("data-page") === "thank-you";
  window.dataLayer = window.dataLayer || [];

  // On the thank-you page, pick up the lead's contact details (stored at submit, removed right after)
  // for Meta advanced matching. Meta hashes them in the browser before sending.
  var ud = null, eid = "";
  if (IS_TY) {
    try {
      eid = sessionStorage.getItem("rbs_event_id") || "";
      ud = JSON.parse(sessionStorage.getItem("rbs_ud") || "null");
      sessionStorage.removeItem("rbs_event_id"); sessionStorage.removeItem("rbs_ud"); // reloads don't double count
    } catch (e) {}
  }
  if (GTM && ud) dataLayer.push({ user_data: ud }); // must be in the dataLayer before GTM's first tags run

  function loadGTM() {
    dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    var s = document.createElement("script"); s.async = true;
    s.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(CFG.GTM_ID);
    document.head.appendChild(s);
  }
  function loadPixel() {
    if (!CFG.PIXEL_ID || window.fbq) return;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    if (ud) fbq("init", CFG.PIXEL_ID, ud); else fbq("init", CFG.PIXEL_ID);
    fbq("trackSingle", CFG.PIXEL_ID, "PageView");
  }
  function loadGtag() {
    if (!CFG.GA4_ID) return;
    var s = document.createElement("script"); s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(CFG.GA4_ID);
    document.head.appendChild(s);
    window.gtag = function () { dataLayer.push(arguments); };
    gtag("js", new Date()); gtag("config", CFG.GA4_ID);
  }
  try { if (GTM) loadGTM(); else if (!PREVIEW) { loadPixel(); loadGtag(); } } catch (e) {}

  // metaName: StartQuote / ReadFAQ / BeforeAfter. GTM and GA4 get the snake_case name.
  var GA_NAME = { StartQuote: "start_quote", ReadFAQ: "read_faq", BeforeAfter: "before_after" };
  function track(metaName) {
    if (PREVIEW) return;
    if (GTM) { dataLayer.push({ event: GA_NAME[metaName], meta_event: metaName }); return; }
    try { if (window.fbq && CFG.PIXEL_ID) fbq("trackSingleCustom", CFG.PIXEL_ID, metaName); } catch (e) {}
    try { if (window.gtag) gtag("event", GA_NAME[metaName]); } catch (e) {}
  }

  // ---------- thank-you page: fire Lead once, with the same event_id sent to Zapier (for CAPI dedup) ----------
  if (IS_TY) {
    if (eid && !PREVIEW) {
      if (GTM) dataLayer.push({ event: "generate_lead", event_id: eid });
      else {
        try { if (window.fbq) fbq("trackSingle", CFG.PIXEL_ID, "Lead", {}, { eventID: eid }); } catch (e) {}
        try { if (window.gtag) gtag("event", "generate_lead"); } catch (e) {}
      }
    }
    fillPhones();
    var pn = document.querySelector("[data-preview-note]"), wasPrev = false;
    try { wasPrev = sessionStorage.getItem("rbs_preview") === "1"; sessionStorage.removeItem("rbs_preview"); } catch (e) {}
    if (pn && (wasPrev || PREVIEW)) pn.hidden = false;
    return;
  }

  // ---------- attribution (survives the multi-step form) ----------
  var KEYS = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term","utm_id","fbclid"];
  var qs = new URLSearchParams(location.search), attr = {}, landingUrl = location.href;
  try { attr = JSON.parse(sessionStorage.getItem("rbs_attr") || "{}"); } catch (e) {}
  KEYS.forEach(function (k) { if (qs.get(k)) attr[k] = qs.get(k); });
  try {
    sessionStorage.setItem("rbs_attr", JSON.stringify(attr));
    if (!location.search && sessionStorage.getItem("rbs_landing")) landingUrl = sessionStorage.getItem("rbs_landing");
    else sessionStorage.setItem("rbs_landing", landingUrl);
  } catch (e) {}
  function cookie(n) { var m = document.cookie.match("(?:^|; )" + n + "=([^;]*)"); return m ? decodeURIComponent(m[1]) : ""; }
  function fbc() { // build _fbc from fbclid if the pixel hasn't set it yet
    return cookie("_fbc") || (attr.fbclid ? "fb.1." + Date.now() + "." + attr.fbclid : "");
  }

  // ---------- service area ----------
  // Accepted: zips starting 486, 494, 496, 497, 498 (NW Lower Michigan + Eastern U.P.). Call center confirms.
  var AREA = /^(486|494|496|497|498)\d\d$/;
  var PET = ("49770 49740 49706 49716 49769 49718 49737 49764 49720 49712 49727 49713 49796 49721 49749 49701 49717 " +
    "49761 49791 49735 49734 49795 49730 49751 49759 49755 49799 49705 49783 49715 49788 49774 49780 49752 49724 " +
    "49725 49736 49728 49768 49710 49726 49757 49781 49762 49760 49775 49793").split(" ");
  function office(z) { return (PET.indexOf(z) > -1 || /^498/.test(z)) ? "Petoskey" : "Traverse City"; }

  // ---------- the form ----------
  var STEPS = [
    { key: "project", q: "What Would You Like to Do?", opts: ["Replace my tub with a walk-in shower", "Replace an old shower", "Add a walk-in tub", "Not sure yet, show me options"] },
    { key: "for_whom", q: "Who Is the New Bathroom For?", opts: ["Me or my spouse", "A parent or family member"] },
    { key: "homeowner", q: "Is the Home Owned (Not Rented)?", opts: ["Yes, it's owned", "No, it's rented"] },
    { key: "timeline", q: "When Would You Like It Done?", opts: ["As soon as possible", "In the next 1 to 3 months", "Just researching for now"] },
    { key: "contact", q: "Last Step: How Do We Reach You to Set Up Your Free Quote?", type: "contact" }
  ];
  var shared = {}, started = false;

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function input(type, ph, ac, val, label) {
    var i = el("input"); i.type = type; i.placeholder = ph; i.autocomplete = ac; i.value = val || ""; i.setAttribute("aria-label", label || ph); return i;
  }

  function Funnel(root) {
    var data = shared, i = -1, sending = false;
    render();

    function render() {
      root.innerHTML = "";
      if (i < 0) return renderZip();
      var s = STEPS[i];
      root.appendChild(el("div", "step-n", "Step " + (i + 1) + " of " + STEPS.length));
      root.appendChild(el("div", "bar", "<i style='width:" + Math.round(((i + 1) / STEPS.length) * 100) + "%'></i>"));
      var q = el("p", "q", esc(s.q)); q.tabIndex = -1; root.appendChild(q);
      if (s.opts) {
        var box = el("div", "choices");
        s.opts.forEach(function (o) {
          var b = el("button", "choice" + (data[s.key] === o ? " on" : ""), esc(o)); b.type = "button";
          b.onclick = function () { data[s.key] = o; i++; render(); };
          box.appendChild(b);
        });
        root.appendChild(box);
        if (s.key === "homeowner" && data.homeowner === "No, it's rented")
          root.appendChild(el("p", "fine", "That's okay. We'll just need the owner's go-ahead before any work is done."));
      } else renderContact();
      if (!sending) {
        var back = el("button", "back", "&larr; Back"); back.type = "button";
        back.onclick = function () { i--; render(); };
        root.appendChild(back);
      }
      q.focus({ preventScroll: true });
    }

    function renderZip() {
      root.appendChild(el("p", "q", "Enter the Zip Code of the Home"));
      var inp = input("text", "ZIP code", "postal-code", data.zip, "ZIP code of the home");
      inp.inputMode = "numeric"; inp.maxLength = 5;
      var msg = el("div");
      var b = el("button", "btn", "Get My Free Quote"); b.type = "button";
      function go() {
        var z = inp.value.trim(); msg.innerHTML = "";
        if (!/^\d{5}$/.test(z)) { msg.appendChild(el("div", "err", "Please enter a 5-digit ZIP code.")); return; }
        if (!AREA.test(z)) {
          msg.appendChild(el("div", "oos", "Thanks for your interest. That zip looks outside our service area of Northern Michigan and the Eastern U.P. If the home is up here, call us at <a href='tel:" + CFG.PHONE_TEL + "'><b>" + esc(CFG.PHONE_DISPLAY) + "</b></a> and we'll sort it out."));
          return;
        }
        data.zip = z; data.office = office(z); i = 0;
        if (!started) { started = true; track("StartQuote"); }
        render();
      }
      b.onclick = go;
      inp.onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); go(); } };
      root.appendChild(inp); root.appendChild(msg); root.appendChild(b);
      root.appendChild(el("p", "fine", "Takes about a minute. No obligation, no pressure."));
    }

    function renderContact() {
      var r = el("div", "row2");
      var f = input("text", "First name", "given-name", data.first_name);
      var l = input("text", "Last name", "family-name", data.last_name);
      r.appendChild(f); r.appendChild(l);
      var m = input("email", "Email address", "email", data.email);
      var p = input("tel", "Phone number", "tel", data.phone); p.inputMode = "tel";
      var hp = el("input", "hp"); hp.type = "text"; hp.name = "company_website"; hp.tabIndex = -1; hp.autocomplete = "off"; hp.setAttribute("aria-hidden", "true");
      var err = el("div");
      var b = el("button", "btn rbs-submit", "Get My Free Quote"); b.type = "button";
      root.appendChild(r); root.appendChild(m); root.appendChild(p); root.appendChild(hp); root.appendChild(err); root.appendChild(b);
      root.appendChild(el("p", "fine left", esc(CONSENT) + " See our <a href='" + CFG.PRIVACY_URL + "' target='_blank' rel='noopener'>Privacy Policy</a>."));
      function go() {
        err.innerHTML = "";
        data.first_name = f.value.trim(); data.last_name = l.value.trim(); data.email = m.value.trim();
        var d = p.value.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, ""); data.phone = p.value;
        if (!data.first_name || !data.last_name) return err.appendChild(el("div", "err", "Please enter your first and last name."));
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) return err.appendChild(el("div", "err", "Please enter a valid email address."));
        if (d.length !== 10) return err.appendChild(el("div", "err", "Please enter a 10-digit phone number."));
        if (hp.value) return; // bot
        data.phone = d; submit(b, err);
      }
      b.onclick = go;
      [f, l, m, p].forEach(function (x) { x.onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); go(); } }; });
    }

    function submit(btn, err) {
      if (sending) return;
      var test = qs.get("test") === "1" || location.hash === "#test";
      if (PREVIEW) { // demo mode: never send from a preview
        try { sessionStorage.setItem("rbs_preview", "1"); sessionStorage.setItem("rbs_first", data.first_name); } catch (e) {}
        location.href = CFG.THANK_YOU_PATH; return;
      }
      if (!CFG.WEBHOOK_URL && !test) {
        err.appendChild(el("div", "err", "Something went wrong on our end. Please call us at " + esc(CFG.PHONE_DISPLAY) + " and we'll set up your free quote."));
        return;
      }
      sending = true; btn.disabled = true; btn.textContent = "Sending…";
      var eid = "rbs-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
      try {
        sessionStorage.setItem("rbs_event_id", eid); sessionStorage.setItem("rbs_first", data.first_name);
        sessionStorage.setItem("rbs_ud", JSON.stringify({ em: data.email.toLowerCase(), ph: "1" + data.phone,
          fn: data.first_name.toLowerCase(), ln: data.last_name.toLowerCase(), zp: data.zip, country: "us" }));
      } catch (e) {}
      var payload = Object.assign({
        first_name: data.first_name, last_name: data.last_name, email: data.email, phone: data.phone,
        zip: data.zip, office: data.office, project: data.project, for_whom: data.for_whom,
        homeowner: data.homeowner, timeline: data.timeline,
        lead_source: CFG.LEAD_SOURCE, brand: "Bath", page_url: landingUrl, referrer: document.referrer,
        event_id: eid, fbp: cookie("_fbp"), fbc: fbc(), user_agent: navigator.userAgent,
        consent_text: CONSENT, submitted_at: new Date().toISOString(), is_test: test ? "yes" : "no"
      }, attr);
      function done() { location.href = CFG.THANK_YOU_PATH + (test ? "?test=1" : ""); }
      if (!CFG.WEBHOOK_URL) return done();
      var finished = false;
      function once() { if (!finished) { finished = true; done(); } }
      fetch(CFG.WEBHOOK_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(payload).toString(), keepalive: true })
        .then(once, function () {
          sending = false; btn.disabled = false; btn.textContent = "Get My Free Quote";
          err.appendChild(el("div", "err", "We couldn't send that. Please try again or call " + esc(CFG.PHONE_DISPLAY) + "."));
        });
      setTimeout(once, 4000);
    }

    root._reset = function () { if (!sending) { i = data.zip ? 0 : -1; render(); } };
  }

  // ---------- page wiring ----------
  function fillPhones() {
    document.querySelectorAll("[data-phone]").forEach(function (a) { a.href = "tel:" + CFG.PHONE_TEL; var b = a.querySelector("b"); if (b) b.textContent = CFG.PHONE_DISPLAY; });
    var n = document.querySelector("[data-first]"), f = ""; try { f = sessionStorage.getItem("rbs_first") || ""; } catch (e) {}
    if (n && f) n.textContent = ", " + f;
  }
  fillPhones();
  var forms = [].slice.call(document.querySelectorAll("[data-funnel]")).map(function (r) { new Funnel(r); return r; });
  // A "Get my free quote" link elsewhere on the page jumps to the top form and picks up where they left off
  document.querySelectorAll("[data-to-form]").forEach(function (a) {
    a.addEventListener("click", function () { forms[0] && forms[0]._reset(); });
  });
  // Phones: the pinned Call / Get quote bar stays hidden while a quote form is on screen, so it never covers the form
  var bar = document.querySelector(".mbar");
  if (bar && "IntersectionObserver" in window) {
    var seen = new Set();
    var barObs = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); });
      bar.classList.toggle("show", seen.size === 0);
    }, { threshold: 0.15 });
    document.querySelectorAll(".card").forEach(function (c) { barObs.observe(c); });
  } else if (bar) bar.classList.add("show");
  document.querySelectorAll("details").forEach(function (d) {
    d.addEventListener("toggle", function () { if (d.open) track("ReadFAQ"); }, { once: true });
  });
  // Before / after sliders
  document.querySelectorAll(".ba input").forEach(function (r) {
    var fig = r.closest(".ba"), used = false;
    r.addEventListener("input", function () { fig.style.setProperty("--p", r.value + "%"); if (!used) { used = true; track("BeforeAfter"); } });
  });
  // If a photo fails to load, show a labelled tile instead of a broken image
  document.querySelectorAll("img[data-ph]").forEach(function (im) {
    function fail() { im.parentNode.classList.add("noimg"); im.parentNode.setAttribute("data-label", im.alt); }
    if (im.complete && !im.naturalWidth) fail(); else im.addEventListener("error", fail);
  });
})();
