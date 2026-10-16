/* Multi Clone UI Prototype
   This file uses mock data only. It does not clone or launch installed Android apps. */
(() => {
  const MAX_CLONES_PER_APP = 50;
  // Real launchable apps are loaded from the native Android bridge when running in the APK.
  // Browser preview fallback is intentionally empty rather than pretending demo apps are installed.
  let appCatalog = [];
  const state = {
    page:"home", previousPage:"home", selectedApp:"whatsapp", selectedCloneId:null,
    query:"", category:"All", createCount:1, selectedIcon:"Default",
    clones:[], 
    settings:{notifications:true, lightTheme:true}
  };
  const $ = (s,root=document) => root.querySelector(s);
  const host = $("#screenHost");
  const title = $("#topTitle");
  const subtitle = $("#topSubtitle");
  const backBtn = $("#backBtn");
  const modalBackdrop = $("#modalBackdrop");
  const modalTitle = $("#modalTitle");
  const modalBody = $("#modalBody");
  const modalActions = $("#modalActions");
  let toastTimer;

  const appById = id => appCatalog.find(a => a.id === id) || {id:String(id||"unknown"),name:"Unknown App",package:String(id||""),glyph:"▣",category:"Installed",css:"installed"};
  const totalClones = () => state.clones.length;
  const appCloneCount = id => state.clones.filter(c => c.appId === id).length;
  function saveClones() {
    try {
      localStorage.setItem("multiCloneEntries", JSON.stringify(state.clones));
    } catch (e) {
      showToast("Unable to save clone entries.");
    }
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const icon = app => `<div class="app-icon ${app.css}">${app.glyph}</div>`;
  const largeIcon = app => `<div class="app-icon large ${app.css}">${app.glyph}</div>`;
  const appRow = (app, actionLabel="Add", action="add") => `
    <div class="list-row">
      ${icon(app)}
      <div class="list-main"><strong>${esc(app.name)}</strong><small>${esc(app.package)}</small></div>
      <button class="primary-btn btn-small" data-action="${action}" data-app="${app.id}">${actionLabel}</button>
    </div>`;
  const cloneRow = clone => {
    const app = appById(clone.appId);
    return `<div class="list-row">
      ${icon(app)}
      <button class="list-main text-row-button" data-action="open-clone" data-clone="${clone.id}" style="border:0;background:none;text-align:left;padding:0;color:inherit">
        <strong>${esc(clone.name)}</strong>
        <small>${esc(app.name)} · Clone #${clone.id}</small>
        <div class="clone-count"><span class="status-dot" style="background:${clone.status==="Active"?"#1cb879":"#9aa8ba"}"></span>${esc(clone.status)} · ${esc(clone.created)}</div>
      </button>
      <button class="row-action" aria-label="Clone options" data-action="clone-menu" data-clone="${clone.id}">⋮</button>
    </div>`;
  };

  function setPage(page) {
    state.previousPage = state.page;
    state.page = page;
    state.query = "";
    state.category = "All";
    render();
  }
  function pageHeader(h, p="", right="") {
    return `<div class="page-heading"><div><h1>${h}</h1>${p?`<p>${p}</p>`:""}</div>${right}</div>`;
  }
  function renderHome() {
    const recentApps = [...new Set(state.clones.slice(0,4).map(c=>c.appId))].map(appById);
    const storage = (0.4 + totalClones()*0.13).toFixed(1);
    return `
      <section class="card">
        <div class="hero-stat">
          <div class="hero-icon">▣</div>
          <div style="flex:1">
            <div class="eyebrow">Total Clones</div>
            <div class="big-number">${totalClones()} <span>/ ${MAX_CLONES_PER_APP} per app</span></div>
            <div class="progress"><span style="width:${Math.min(100,totalClones()/MAX_CLONES_PER_APP*100)}%"></span></div>
          </div>
        </div>
      </section>
      <div class="stats-grid">
        <div class="mini-stat"><div class="mini-icon">▣</div><div class="mini-label">Installed Apps</div><div class="mini-value">${appCatalog.length}</div></div>
        <div class="mini-stat"><div class="mini-icon">◉</div><div class="mini-label">Active Clones</div><div class="mini-value">${state.clones.filter(c=>c.status==="Active").length}</div></div>
        <div class="mini-stat"><div class="mini-icon">▤</div><div class="mini-label">Clone Entries</div><div class="mini-value">${totalClones()}</div></div>
        <div class="mini-stat"><div class="mini-icon">⇧</div><div class="mini-label">Per-App Limit</div><div class="mini-value">50</div></div>
      </div>
      <div class="section-title"><h2>Recently Used</h2><button class="link-btn" data-action="navigate" data-page="clones">View All</button></div>
      <div class="quick-apps">${recentApps.map(a=>`<button class="quick-app" data-action="app-details" data-app="${a.id}" style="border:0;background:none;padding:0;color:inherit">${icon(a)}<div class="app-name">${esc(a.name)}</div><div class="clone-count">${appCloneCount(a.id)} Clone${appCloneCount(a.id)===1?"":"s"}</div></button>`).join("")}</div>
      <button class="primary-btn full" style="margin-top:22px" data-action="navigate" data-page="add">＋ &nbsp; Add App</button>
      <div class="notice">Installed app names come from Android. Clone entries are only saved in this app; separate app-data cloning is not implemented yet.</div>`;
  }
  function renderAdd() {
    const q = state.query.toLowerCase();
    const filtered = appCatalog.filter(a => (state.category==="All" || state.category==="Installed") && (a.name.toLowerCase().includes(q)||a.package.toLowerCase().includes(q)));
    return `${pageHeader("Add App","Choose an app to start a clone")}
      <label class="search-box"><span>⌕</span><input id="appSearch" placeholder="Search apps..." value="${esc(state.query)}" autocomplete="off"></label>
      <div class="filter-row">${["All","Installed"].map(c=>`<button class="filter-chip ${state.category===c?"active":""}" data-action="category" data-category="${c}">${c}</button>`).join("")}</div>
      <div class="app-list">${filtered.length?filtered.map(a=>appRow(a,"Add","add")).join(""):`<div class="empty-state"><div class="empty-icon">⌕</div><strong>${appCatalog.length ? "No apps found" : "No installed apps loaded"}</strong><p>${appCatalog.length ? "Try a different search." : "Open this screen in the installed Android APK, not a browser preview."}</p></div>`}</div>
      <div class="notice">These are launchable apps detected by Android. Adding an entry does not create an isolated app copy yet.</div>`;
  }
  function renderClones() {
    const q=state.query.toLowerCase();
    const filtered=state.clones.filter(c=>c.name.toLowerCase().includes(q)||appById(c.appId).name.toLowerCase().includes(q));
    return `${pageHeader("My Clones",`${totalClones()} sample clone${totalClones()===1?"":"s"}`)}
      <label class="search-box"><span>⌕</span><input id="cloneSearch" placeholder="Search clones..." value="${esc(state.query)}" autocomplete="off"></label>
      <div class="filter-row">${["All","Active","Paused"].map(c=>`<button class="filter-chip ${state.category===c?"active":""}" data-action="clone-filter" data-category="${c}">${c}</button>`).join("")}</div>
      <div class="clone-list">${(state.category==="All"?filtered:filtered.filter(c=>c.status===state.category)).length?(state.category==="All"?filtered:filtered.filter(c=>c.status===state.category)).map(cloneRow).join(""):`<div class="empty-state"><div class="empty-icon">▣</div><strong>No clones here yet</strong><p>Add an app and create a sample clone to see it listed here.</p><button class="primary-btn btn-small" data-action="navigate" data-page="add">Add App</button></div>`}</div>
      <button class="secondary-btn full" style="margin-top:14px" data-action="navigate" data-page="manager">Open Clone Manager</button>`;
  }
  function renderSettings() {
    return `${pageHeader("Settings","Personalize your experience")}
      <div class="settings-group"><h3>General</h3>
        <div class="setting-row"><div class="setting-icon">▣</div><div class="setting-copy"><strong>Clone Limit</strong><small>Maximum clones allowed per app</small></div><div class="setting-value">50 <span>›</span></div></div>
        <div class="setting-row"><div class="setting-icon">▤</div><div class="setting-copy"><strong>Storage Usage</strong><small>Sample estimate for this preview</small></div><div class="setting-value">${(0.4+totalClones()*0.13).toFixed(1)} GB <span>›</span></div></div>
      </div>
      <div class="settings-group"><h3>Appearance</h3>
        <div class="setting-row"><div class="setting-icon">☼</div><div class="setting-copy"><strong>Light Theme</strong><small>Blue and white interface</small></div><button class="toggle ${state.settings.lightTheme?"on":""}" data-action="toggle-theme" aria-label="Toggle theme"></button></div>
        <div class="setting-row"><div class="setting-icon">文</div><div class="setting-copy"><strong>Language</strong><small>App display language</small></div><div class="setting-value">English <span>›</span></div></div>
      </div>
      <div class="settings-group"><h3>Support</h3>
        <button class="setting-row" style="width:100%;text-align:left;border:0" data-action="info" data-info="Help & Support"><div class="setting-icon">?</div><div class="setting-copy"><strong>Help & Support</strong><small>Get help using Multi Clone</small></div><div class="setting-value">›</div></button>
        <button class="setting-row" style="width:100%;text-align:left;border:0" data-action="info" data-info="About Multi Clone"><div class="setting-icon">ⓘ</div><div class="setting-copy"><strong>About App</strong><small>Version 1.0.0 · UI Prototype</small></div><div class="setting-value">›</div></button>
      </div>
      <div class="card" style="text-align:center;padding:18px"><div style="font-size:24px;color:var(--blue)">♥</div><strong style="font-size:12px">Thanks for using Multi Clone</strong><p class="helper">Make more with your apps.</p></div>`;
  }
  function renderDetails() {
    const clone=state.clones.find(c=>c.id===state.selectedCloneId);
    if(!clone) return renderClones();
    const app=appById(clone.appId);
    return `<div class="detail-hero">${largeIcon(app)}<div><h1>${esc(clone.name)}</h1><p>${esc(app.name)} · Clone #${clone.id}</p><span class="pill ${clone.status==="Active"?"green":"gray"}">${clone.status}</span></div></div>
      <div class="card info-card">
        <div class="info-row"><span>Clone Name</span><span>${esc(clone.name)} <button class="link-btn" data-action="rename" data-clone="${clone.id}">✎</button></span></div>
        <div class="info-row"><span>Original App</span><span>${esc(app.name)}</span></div>
        <div class="info-row"><span>Package Name</span><span>${esc(app.package)}</span></div>
        <div class="info-row"><span>Created</span><span>${esc(clone.created)}</span></div>
      </div>
      <button class="primary-btn full" data-action="open-sample">▶ &nbsp; Open Clone</button>
      <div style="height:12px"></div>
      <button class="action-row" data-action="rename" data-clone="${clone.id}"><span class="action-symbol">✎</span><span class="action-copy"><strong>Rename</strong><small>Change this clone's display name</small></span><span class="chevron">›</span></button>
      <button class="action-row" data-action="change-icon" data-clone="${clone.id}"><span class="action-symbol">▧</span><span class="action-copy"><strong>Change Icon</strong><small>Choose a preview icon style</small></span><span class="chevron">›</span></button>
      <button class="action-row" data-action="delete" data-clone="${clone.id}"><span class="action-symbol" style="background:#fff0f2;color:var(--red)">⌫</span><span class="action-copy"><strong style="color:var(--red)">Delete Clone</strong><small>Remove this sample entry</small></span><span class="chevron">›</span></button>
      <div class="notice">Open Clone is a demo interaction only. It does not launch another Android app.</div>`;
  }
  function renderCreate() {
    const app=appById(state.selectedApp);
    const count=appCloneCount(app.id);
    const canAdd=Math.max(0,MAX_CLONES_PER_APP-count);
    return `${pageHeader("Create Clone","Customize your new clone")}
      <div class="card" style="text-align:center;padding:20px 16px 16px">${largeIcon(app)}<h2 style="font-size:17px;margin:12px 0 5px">${esc(app.name)}</h2><p class="helper" style="margin:0">Create a sample clone for ${esc(app.name)}</p></div>
      <label class="form-label" for="cloneName">Clone Name</label><input class="text-input" id="cloneName" maxlength="30" value="${esc(app.name+" Clone "+(count+1))}" placeholder="Enter clone name">
      <div class="helper" id="nameCounter">Suggested name · up to 30 characters</div>
      <label class="form-label">Icon Style</label><div class="icon-choices">${["Default","V1","V2","V3"].map((v,i)=>`<button class="icon-choice ${state.selectedIcon===v?"selected":""}" data-action="icon-choice" data-icon="${v}">${largeIcon({...app,css:app.css,glyph:i===0?app.glyph:["✦","●","◆"][i-1]})}<span>${v}</span></button>`).join("")}</div>
      <label class="form-label">Number of Clones</label>
      <div style="display:flex;align-items:center;gap:10px"><div class="stepper"><button data-action="count-down">−</button><output>${state.createCount}</output><button data-action="count-up">＋</button></div><span class="helper" style="margin:0">(Max ${Math.min(MAX_CLONES_PER_APP,canAdd)} more for this app)</span></div>
      ${canAdd===0?`<div class="notice">This app already has the maximum of ${MAX_CLONES_PER_APP} sample clones.</div>`:""}
      <button class="primary-btn full" style="margin-top:24px" data-action="create-clone" ${canAdd===0?"disabled":""}>Create Clone</button>
      <div class="notice">This creates sample entries in this prototype, not real app instances.</div>`;
  }
  function renderManager() {
    const grouped=appCatalog.map(a=>({app:a,count:appCloneCount(a.id)})).filter(x=>x.count);
    return `${pageHeader("Clone Manager","Organize your sample clones")}
      <div class="manager-grid">
        <button class="manager-tile" data-action="navigate" data-page="add"><span class="tile-icon">＋</span><strong>Create Clone</strong><small>Add a sample clone</small></button>
        <button class="manager-tile" data-action="multi-select"><span class="tile-icon">☑</span><strong>Multi Select</strong><small>Select multiple entries</small></button>
        <button class="manager-tile" data-action="sort"><span class="tile-icon">↕</span><strong>Sort</strong><small>By name or date</small></button>
        <button class="manager-tile" data-action="navigate" data-page="clones"><span class="tile-icon">⌕</span><strong>Search</strong><small>Find your clones</small></button>
      </div>
      <div class="section-title"><h2>Apps with Clones</h2><span>${grouped.length} apps</span></div>
      <div class="clone-list">${grouped.map(({app,count})=>`<div class="list-row">${icon(app)}<div class="list-main"><strong>${esc(app.name)}</strong><small>${count} sample clone${count===1?"":"s"}</small></div><button class="secondary-btn btn-small" data-action="app-details" data-app="${app.id}">Manage</button></div>`).join("")}</div>`;
  }
  function render() {
    const pages={home:renderHome,add:renderAdd,clones:renderClones,settings:renderSettings,details:renderDetails,create:renderCreate,manager:renderManager};
    const names={home:["Multi Clone","Multiple Apps · One Space"],add:["Add App","Choose an app to clone"],clones:["My Clones","Manage your clone entries"],settings:["Settings","Customize Multi Clone"],details:["Clone Details","Manage your clone"],create:["Create Clone","Customize your new clone"],manager:["Clone Manager","Organize your clones"]};
    const [t,s]=names[state.page]||names.home;
    title.textContent=t; subtitle.textContent=s;
    backBtn.classList.toggle("hidden",["home","add","clones","settings"].includes(state.page));
    host.innerHTML=(pages[state.page]||renderHome)();
    document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===state.page || (state.page==="details"&&b.dataset.page==="clones") || (state.page==="create"&&b.dataset.page==="add") || (state.page==="manager"&&b.dataset.page==="clones")));
    const appSearch=$("#appSearch"); if(appSearch){appSearch.focus({preventScroll:true});appSearch.setSelectionRange(appSearch.value.length,appSearch.value.length);}
    const cloneSearch=$("#cloneSearch"); if(cloneSearch){cloneSearch.focus({preventScroll:true});cloneSearch.setSelectionRange(cloneSearch.value.length,cloneSearch.value.length);}
  }
  function showToast(message) {
    const toast=$("#toast");toast.textContent=message;toast.classList.add("show");
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),2400);
  }
  function openModal(titleText,body,actions=[]) {
    modalTitle.textContent=titleText;modalBody.innerHTML=body;modalActions.innerHTML="";
    actions.forEach(a=>{
      const b=document.createElement("button");b.className=a.className||"secondary-btn";b.textContent=a.label;b.addEventListener("click",()=>{if(a.onClick)a.onClick();});modalActions.appendChild(b);
    });
    modalBackdrop.classList.remove("hidden");
  }
  function closeModal(){modalBackdrop.classList.add("hidden");}
  function openCreate(appId) {
    state.selectedApp=appId;state.createCount=1;state.selectedIcon="Default";state.page="create";render();
  }
  function getClone(id){return state.clones.find(c=>c.id===Number(id));}
  function actionHandler(el) {
    const action=el.dataset.action;
    if(!action)return;
    const appId=el.dataset.app;
    const cloneId=el.dataset.clone;
    if(action==="navigate") setPage(el.dataset.page);
    else if(action==="add") openCreate(appId);
    else if(action==="category"){state.category=el.dataset.category;render();}
    else if(action==="clone-filter"){state.category=el.dataset.category;render();}
    else if(action==="open-clone"){state.selectedCloneId=Number(cloneId);setPage("details");}
    else if(action==="app-details"){
      const app=appById(appId);
      openModal(app.name,`<div style="display:flex;align-items:center;gap:13px">${largeIcon(app)}<div><strong>${esc(app.name)}</strong><p class="modal-text">${appCloneCount(app.id)} sample clone(s) in this prototype.</p></div></div>`,[
        {label:"Cancel",className:"secondary-btn",onClick:closeModal},
        {label:"Create Clone",className:"primary-btn",onClick:()=>{closeModal();openCreate(app.id);}}
      ]);
    }
    else if(action==="clone-menu"){
      const c=getClone(cloneId); if(!c)return;
      openModal(c.name,`<p class="modal-text">Choose an action for this sample clone.</p>`,[
        {label:"Cancel",className:"secondary-btn",onClick:closeModal},
        {label:"Open Details",className:"primary-btn",onClick:()=>{closeModal();state.selectedCloneId=c.id;setPage("details");}}
      ]);
    }
    else if(action==="rename"){
      const c=getClone(cloneId);if(!c)return;
      openModal("Rename Clone",`<label class="form-label" for="renameInput">Clone Name</label><input class="text-input" id="renameInput" maxlength="30" value="${esc(c.name)}">`,[
        {label:"Cancel",className:"secondary-btn",onClick:closeModal},
        {label:"Save Name",className:"primary-btn",onClick:()=>{const v=$("#renameInput").value.trim();if(!v){showToast("Please enter a name.");return;}c.name=v;saveClones();closeModal();render();showToast("Clone entry renamed.");}}
      ]);
    }
    else if(action==="delete"){
      const c=getClone(cloneId);if(!c)return;
      openModal("Delete Clone?",`<p class="modal-text">Remove <strong>${esc(c.name)}</strong> from the sample list? This cannot be undone in this preview.</p>`,[
        {label:"Cancel",className:"secondary-btn",onClick:closeModal},
        {label:"Delete",className:"danger-btn",onClick:()=>{state.clones=state.clones.filter(x=>x.id!==c.id);saveClones();closeModal();state.page="clones";render();showToast("Clone entry deleted.");}}
      ]);
    }
    else if(action==="change-icon"){
      openModal("Change Icon",`<p class="modal-text">Icon styles are visual placeholders in this UI prototype. Actual Android launcher icons are not changed.</p>`,[{label:"Done",className:"primary-btn",onClick:closeModal}]);
    }
    else if(action==="open-sample"){
      const clone=state.clones.find(c=>c.id===state.selectedCloneId);
      const app=clone ? appById(clone.appId) : null;
      if(!app){showToast("App entry not found.");return;}
      if(window.AndroidApps && typeof window.AndroidApps.launchApp==="function"){
        const launched=window.AndroidApps.launchApp(app.package);
        showToast(launched ? "Opened original app. This is not an isolated clone yet." : "Android could not launch this app.");
      } else {
        showToast("Install and open the Android APK to launch apps.");
      }
    }
    else if(action==="icon-choice"){state.selectedIcon=el.dataset.icon;render();}
    else if(action==="count-down"){state.createCount=Math.max(1,state.createCount-1);render();}
    else if(action==="count-up"){
      const room=MAX_CLONES_PER_APP-appCloneCount(state.selectedApp);
      state.createCount=Math.min(Math.max(1,room),state.createCount+1);render();
    }
    else if(action==="create-clone"){
      const app=appById(state.selectedApp);
      const nameInput=$("#cloneName");
      const baseName=nameInput?nameInput.value.trim():`${app.name} Clone`;
      const room=MAX_CLONES_PER_APP-appCloneCount(app.id);
      if(room<=0){showToast("Maximum 50 sample clones per app.");return;}
      if(!baseName){showToast("Please enter a clone name.");return;}
      const count=Math.min(state.createCount,room);
      for(let i=0;i<count;i++){
        const id=state.clones.length?Math.max(...state.clones.map(c=>c.id))+1:1;
        state.clones.push({id,appId:app.id,name:count===1?baseName:`${baseName} ${i+1}`,status:"Active",created:"Just now"});
      }
      saveClones();
      state.page="clones";
      state.category="All";
      render();
      showToast(`${count} clone entr${count===1?"y":"ies"} added.`);
    }
    else if(action==="toggle-theme"){
      state.settings.lightTheme=!state.settings.lightTheme;
      showToast("Theme preference preview updated.");
      render();
    }
    else if(action==="info"){
      openModal(el.dataset.info,`<p class="modal-text">Multi Clone UI Prototype · Version 1.0.0</p><p class="modal-text">This screen is a design preview. Native Android features and real app cloning are not connected yet.</p>`,[{label:"Close",className:"primary-btn",onClick:closeModal}]);
    }
    else if(action==="multi-select"){
      openModal("Multi Select","<p class='modal-text'>This is a planned manager feature. Bulk selection will be implemented after the design is approved.</p>",[{label:"Got it",className:"primary-btn",onClick:closeModal}]);
    }
    else if(action==="sort"){
      state.clones.sort((a,b)=>a.name.localeCompare(b.name));saveClones();render();showToast("Clones sorted by name.");
    }
  }

  document.addEventListener("click",e=>{
    const nav=e.target.closest(".nav-item");
    if(nav){setPage(nav.dataset.page);return;}
    const action=e.target.closest("[data-action]");
    if(action){actionHandler(action);return;}
    if(e.target===modalBackdrop)closeModal();
  });
  document.addEventListener("input",e=>{
    if(e.target.id==="appSearch"){const pos=e.target.selectionStart;state.query=e.target.value;render();const n=$("#appSearch");if(n){n.focus();n.setSelectionRange(pos,pos);}}
    if(e.target.id==="cloneSearch"){const pos=e.target.selectionStart;state.query=e.target.value;render();const n=$("#cloneSearch");if(n){n.focus();n.setSelectionRange(pos,pos);}}
    if(e.target.id==="cloneName"){const c=$("#nameCounter");if(c)c.textContent=`${e.target.value.length}/30 characters`;}
  });
  $("#modalClose").addEventListener("click",closeModal);
  backBtn.addEventListener("click",()=>{if(state.page==="details")setPage("clones");else if(state.page==="create")setPage("add");else if(state.page==="manager")setPage("clones");else setPage("home");});
  $("#topMoreBtn").addEventListener("click",()=>openModal("Multi Clone",`<p class="modal-text">UI prototype · Version 1.0.0</p><p class="modal-text">This preview uses sample app and clone data.</p>`,[{label:"Close",className:"primary-btn",onClick:closeModal}]));
  window.addEventListener("keydown",e=>{if(e.key==="Escape"&&!modalBackdrop.classList.contains("hidden"))closeModal();});
  function loadInstalledApps() {
    try {
      if (window.AndroidApps && typeof window.AndroidApps.getInstalledAppsJson === "function") {
        const apps = JSON.parse(window.AndroidApps.getInstalledAppsJson() || "[]");
        appCatalog = apps.map(a => ({
          id: String(a.id), name: String(a.name), package: String(a.package),
          glyph: a.glyph || "▣", category: "Installed", css: "installed"
        }));
      } else {
        appCatalog = [];
      }
    } catch (err) {
      appCatalog = [];
      console.error("Unable to read installed apps", err);
    }
    render();
  }
  loadInstalledApps();
})();