const KEY="poketea_v2";
const ingredientData={
  tea:{name:"Trà",icon:"🍃",price:4},
  milk:{name:"Sữa",icon:"🥛",price:5},
  sugar:{name:"Đường",icon:"🍬",price:2},
  tapioca:{name:"Trân châu",icon:"⚫",price:5},
  matcha:{name:"Matcha",icon:"🍵",price:8},
  mango:{name:"Xoài",icon:"🥭",price:7},
  chocolate:{name:"Chocolate",icon:"🍫",price:9},
  berry:{name:"Berry",icon:"🫐",price:10},
  cream:{name:"Kem",icon:"🍦",price:6}
};
const recipes=[
{id:"milk",name:"Trà sữa truyền thống",icon:"🧋",price:35,exp:15,unlock:1,need:{tea:1,milk:1,sugar:1,tapioca:1}},
{id:"matcha",name:"Matcha Boba",icon:"🍵",price:52,exp:23,unlock:2,need:{tea:1,milk:1,matcha:1,sugar:1,tapioca:1}},
{id:"mango",name:"Mango Boba",icon:"🥭",price:65,exp:28,unlock:3,need:{tea:1,milk:1,mango:1,sugar:1,tapioca:1}},
{id:"choco",name:"Chocolate Cream",icon:"🍫",price:78,exp:34,unlock:5,need:{milk:1,chocolate:1,sugar:1,cream:1,tapioca:1}},
{id:"berry",name:"Berry Special",icon:"🫐",price:96,exp:45,unlock:7,need:{tea:1,berry:1,milk:1,cream:1,sugar:1}}
];
const staffData=[
{id:"pikachu",name:"Pikachu",icon:"⚡",rarity:"Rare",role:"Kéo khách",skill:"Thunder Call: mỗi 90 phút có thể kéo thêm 1 khách.",stats:{service:8,skill:15},cost:300},
{id:"eevee",name:"Eevee",icon:"🦊",rarity:"Rare",role:"Thu ngân",skill:"Adapt Cash: +12% tiền bán.",stats:{service:6,skill:12},cost:340},
{id:"bulbasaur",name:"Bulbasaur",icon:"🌱",rarity:"Common",role:"Kho",skill:"Harvest: 15% cơ hội hoàn lại 1 nguyên liệu khi pha.",stats:{service:5,skill:15},cost:250},
{id:"psyduck",name:"Psyduck",icon:"🦆",rarity:"Common",role:"Chăm khách",skill:"Calm: giảm tốc độ mất kiên nhẫn của khách 12%.",stats:{service:10,skill:12},cost:230},
{id:"vulpix",name:"Vulpix",icon:"🦊",rarity:"Epic",role:"Sự kiện",skill:"Warm Welcome: tăng 20% cơ hội khách trả đủ + bonus danh tiếng.",stats:{service:12,skill:20},cost:900},
{id:"jigglypuff",name:"Jigglypuff",icon:"🎤",rarity:"Epic",role:"Biểu diễn",skill:"Sing: có cơ hội giữ khách thêm 20 giây.",stats:{service:14,skill:18},cost:850}
];
const upgrades=[
{id:"tables",name:"Bàn ghế",icon:"🪑",desc:"Tăng số khách tối đa.",base:180,max:6},
{id:"machine",name:"Máy pha",icon:"⚙️",desc:"Tăng giá bán và giảm thời gian pha.",base:260,max:5},
{id:"storage",name:"Kho",icon:"📦",desc:"Tăng sức chứa nguyên liệu.",base:150,max:6},
{id:"decor",name:"Trang trí",icon:"🌸",desc:"Tăng danh tiếng và cơ hội khách tốt.",base:220,max:5}
];

let S={
day:1,hour:10,minute:0,open:false,closing:false,
money:500,exp:0,level:1,rep:0,ingredients:{},
upgrades:{tables:1,machine:1,storage:1,decor:1},
staff:{},queue:[],activeOrder:null,selectedIngredients:[],
stats:{served:0,lost:0,stolen:0,wrong:0,revenue:0,cost:0},
quest:{served:0,earned:0,perfect:0}
};
Object.keys(ingredientData).forEach(k=>S.ingredients[k]=5);

let timer=null, customerTimer=null;

function maxQueue(){return S.upgrades.tables+1}
function capacity(){return 40+(S.upgrades.storage-1)*15}
function levelNeed(){return 100+(S.level-1)*70}
function unlockedRecipes(){return recipes.filter(r=>r.unlock<=S.level)}
function save(){localStorage.setItem(KEY,JSON.stringify(S))}
function load(){try{let x=JSON.parse(localStorage.getItem(KEY));if(x)S={...S,...x}}catch(e){}render()}
function reset(){if(confirm("Xóa toàn bộ game?")){localStorage.removeItem(KEY);location.reload()}}
function money(n){return Math.round(n)}
function toast(t){let e=document.getElementById("toast");e.textContent=t;e.classList.add("show");clearTimeout(window.tt);window.tt=setTimeout(()=>e.classList.remove("show"),1800)}

function addExp(n){
 if(S.staff.eevee)n=Math.ceil(n*1.1);
 S.exp+=n;
 while(S.exp>=levelNeed()){S.exp-=levelNeed();S.level++;toast("🎉 Chủ quán lên Level "+S.level+"!")}
}
function openShop(){
 if(S.open)return;
 if(S.hour!==10||S.minute!==0){toast("Ca mới chỉ bắt đầu lúc 10:00.");return}
 S.open=true;S.closing=false;fillQueue();toast("🟢 Mở cửa! Khách bắt đầu vào.");
 save();render();
 if(!timer)timer=setInterval(tick,1000);
}
function closeDay(){
 S.open=false;S.closing=true;
 const bonus=Math.max(0,Math.floor(S.rep/10))*5;
 S.money+=bonus;
 toast("🌙 Đóng cửa 22:00. Bonus danh tiếng +"+bonus+"💰");
 S.day++;S.hour=10;S.minute=0;S.queue=[];S.activeOrder=null;S.selectedIngredients=[];S.quest={served:0,earned:0,perfect:0};
 save();render();
}
function tick(){
 if(!S.open)return;
 S.minute+=5;
 if(S.minute>=60){S.minute=0;S.hour++}
 if(S.hour>=22){closeDay();return}
 // customer patience
 S.queue.forEach(c=>c.wait-=5);
 for(let i=S.queue.length-1;i>=0;i--){
   let c=S.queue[i];
   if(c.wait<=0){
     S.queue.splice(i,1);S.stats.lost++;S.rep=Math.max(0,S.rep-1);toast("😤 "+c.name+" bỏ đi vì chờ quá lâu!");
   }
 }
 if(Math.random()<0.22)fillQueue();
 if(S.activeOrder && S.activeOrder.patience<=0){cancelOrder("Khách mất kiên nhẫn!")}
 render();save();
}

function fillQueue(){
 while(S.queue.length<maxQueue() && Math.random()<.75){
   let rr=unlockedRecipes();
   let r=rr[Math.floor(Math.random()*rr.length)];
   let c={id:Date.now()+Math.random(),name:["An","Minh","Lan","Huy","Mai","Nam","Linh","Khoa","Vy","Tú"][Math.floor(Math.random()*10)],face:["🙂","😋","🤩","😊","😎","🥰"][Math.floor(Math.random()*6)],recipe:r.id,wait:55+Math.floor(Math.random()*10)};
   S.queue.push(c);
 }
}

function chooseCustomer(index){
 if(!S.open){toast("Quán chưa mở.");return}
 if(S.activeOrder){toast("Đang pha một đơn. Bán xong rồi chọn khách khác.");return}
 let c=S.queue[index]; if(!c)return;
 S.queue.splice(index,1);
 S.activeOrder={...c,patience:35+Math.floor(Math.random()*15),start:Date.now()};
 S.selectedIngredients=[];
 toast("🧋 "+c.name+" gọi món. Chọn đúng nguyên liệu!");
 render();
}

function toggleIngredient(id){
 if(!S.activeOrder)return;
 let i=S.selectedIngredients.indexOf(id);
 if(i>=0)S.selectedIngredients.splice(i,1);else S.selectedIngredients.push(id);
 render();
}

function brew(){
 if(!S.activeOrder)return;
 let r=recipes.find(x=>x.id===S.activeOrder.recipe);
 let keys=Object.keys(r.need).sort(), got=[...S.selectedIngredients].sort();
 if(JSON.stringify(keys)!==JSON.stringify(got)){S.stats.wrong++;toast("❌ Sai công thức! Mất thời gian và原料.");S.activeOrder.patience-=12;S.selectedIngredients=[];render();save();return}
 for(let k of keys){
   if((S.ingredients[k]||0)<=0){toast("📦 Thiếu "+ingredientData[k].name+"! Hãy mua thêm ở Kho.");return}
 }
 keys.forEach(k=>S.ingredients[k]--);
 let revenue=r.price+(S.upgrades.machine-1)*6;
 if(S.staff.eevee)revenue=Math.ceil(revenue*1.12);
 // random payment event
 let roll=Math.random();
 let payment= "full", received=revenue;
 let goodChance=.78+(S.upgrades.decor-1)*.03+(S.staff.vulpix?.08:0);
 if(roll>.97){
   payment="stolen";received=0;S.stats.stolen++;toast("🏃 Khách chạy mất! Không trả tiền!");
 }else if(roll>.88 && roll<=.97){
   payment="short";received=Math.max(1,Math.floor(revenue*(0.35+Math.random()*.25)));toast("😶 Khách trả thiếu! Nhận "+received+"💰");
 }else if(Math.random()<.08 && goodChance>.8){
   received+=Math.floor(revenue*.2);toast("💖 Khách hào phóng! Tip thêm.");
 }
 S.money+=received;S.stats.revenue+=received;S.stats.served++;S.rep+=1+(S.staff.vulpix?1:0);
 S.quest.served++;S.quest.earned+=received;
 addExp(r.exp);
 if(payment==="full")S.quest.perfect++;
 if(S.staff.bulbasaur&&Math.random()<.15){let k=keys[Math.floor(Math.random()*keys.length)];if(S.ingredients[k]<capacity())S.ingredients[k]++;toast("🌱 Harvest: Bulbasaur hoàn lại "+ingredientData[k].name)}
 S.activeOrder=null;S.selectedIngredients=[];fillQueue();save();render();
}

function cancelOrder(msg){
 if(S.activeOrder){S.queue.push({id:Date.now(),name:S.activeOrder.name,face:S.activeOrder.face,recipe:S.activeOrder.recipe,wait:15});S.activeOrder=null;S.selectedIngredients=[];toast("😤 "+msg)}
}

function useSkill(){
 if(!S.open){toast("Chỉ dùng skill trong giờ mở cửa.");return}
 if(!S.staff.pikachu){toast("Cần Pikachu.");return}
 if(S.queue.length>=maxQueue()){toast("Quán đã đầy khách.");return}
 S.queue.push({id:Date.now(),name:"Khách được kéo đến",face:"🤩",recipe:unlockedRecipes()[Math.floor(Math.random()*unlockedRecipes().length)].id,wait:60});
 toast("⚡ Pikachu dùng Thunder Call! Một khách mới đến.");
 S.staff.pikachuReady=false;save();render();
}

function buyIngredient(id,qty){
 let item=ingredientData[id], total=Object.values(S.ingredients).reduce((a,b)=>a+b,0);
 let q=Math.min(qty,capacity()-total);
 if(q<=0){toast("📦 Kho đầy.");return}
 let cost=item.price*q;
 if(S.money<cost){toast("💰 Không đủ tiền.");return}
 S.money-=cost;S.ingredients[id]=(S.ingredients[id]||0)+q;S.stats.cost+=cost;save();render();toast("🛒 Đã mua "+q+" "+item.name);
}
function buyAllBasic(){
 Object.keys(ingredientData).forEach(id=>{if(["tea","milk","sugar","tapioca"].includes(id))buyIngredient(id,5)});
}
function upgrade(id){
 let u=upgrades.find(x=>x.id===id),lv=S.upgrades[id],cost=Math.round(u.base*Math.pow(1.55,lv-1));
 if(lv>=u.max){toast("Đã tối đa.");return}
 if(S.money<cost){toast("💰 Chưa đủ tiền.");return}
 S.money-=cost;S.upgrades[id]++;addExp(20);save();render();toast("⬆️ Nâng cấp "+u.name+"!");
}

function hire(id){
 if(S.staff[id]){toast("Đã có Pokémon này.");return}
 let s=staffData.find(x=>x.id===id);
 if(S.money<s.cost){toast("💰 Chưa đủ tiền.");return}
 S.money-=s.cost;S.staff[id]=1;addExp(30);save();render();toast("🐾 "+s.name+" gia nhập quán!");
}
function gacha(){
 if(S.money<250){toast("💰 Cần 250.");return}
 S.money-=250;
 let roll=Math.random(), pool;
 if(roll<.08)pool=staffData.filter(x=>x.rarity==="Epic");
 else if(roll<.35)pool=staffData.filter(x=>x.rarity==="Rare");
 else pool=staffData.filter(x=>x.rarity==="Common");
 let available=pool.filter(x=>!S.staff[x.id]);
 if(!available.length)available=staffData;
 let s=available[Math.floor(Math.random()*available.length)];
 S.staff[s.id]=1;
 document.getElementById("gachaResult").innerHTML=`<div class="result">🎉 Nhận được ${s.icon} ${s.name} <span class="rarity">${s.rarity}</span></div>`;
 addExp(20);save();render();
}

function showScreen(id,btn){
 document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));
 document.getElementById(id).classList.add("active");
 document.querySelectorAll(".nav-btn").forEach(x=>x.classList.remove("active"));
 if(btn)btn.classList.add("active");
 render();
}

function render(){
 document.getElementById("money").textContent=money(S.money);
 document.getElementById("clock").textContent=`${String(S.hour).padStart(2,"0")}:${String(S.minute).padStart(2,"0")}`;
 document.getElementById("dayText").textContent=`Ngày ${S.day} • ${S.open?"🟢 Đang mở cửa":"🔴 Đóng cửa"} • Ca 10:00–22:00`;
 document.getElementById("repText").textContent=S.rep;
 document.getElementById("levelText").textContent="Lv."+S.level;
 document.getElementById("expText").textContent=`${S.exp}/${levelNeed()}`;
 let total=Object.values(S.ingredients).reduce((a,b)=>a+b,0);
 document.getElementById("stockText").textContent=`${total}/${capacity()}`;
 document.getElementById("queueText").textContent=`${S.queue.length}/${maxQueue()}`;
 document.getElementById("prepBox").classList.toggle("hidden",S.open);
 document.getElementById("shiftBox").classList.toggle("hidden",!S.open);

 if(S.open){
  document.getElementById("customers").innerHTML=S.queue.length?S.queue.map((c,i)=>{
   let r=recipes.find(x=>x.id===c.recipe);
   let pct=Math.max(0,Math.min(100,c.wait/60*100));
   return `<div class="customer"><div class="avatar">${c.face}</div><div class="customer-main"><div class="customer-name">${c.name}</div><div class="order">${r.icon} ${r.name}</div><div class="bar"><i style="width:${pct}%"></i></div></div><div class="timer ${c.wait<=15?"danger":""}">${c.wait}s</div><button onclick="chooseCustomer(${i})">Nhận</button></div>`
  }).join(""):`<div class="save-card">👀 Chưa có khách. Hãy chờ một chút...</div>`;
  if(S.activeOrder){
   let r=recipes.find(x=>x.id===S.activeOrder.recipe);
   let all=Object.keys(r.need);
   document.getElementById("orderArea").innerHTML=`<div class="order-card"><b>👤 ${S.activeOrder.name} đang chờ</b><div style="margin:5px 0">${r.icon} <b>${r.name}</b> • còn ${S.activeOrder.patience}s</div><div class="chips">${Object.keys(ingredientData).map(k=>`<button class="chip ${S.selectedIngredients.includes(k)?"selected":""}" onclick="toggleIngredient('${k}')">${ingredientData[k].icon} ${ingredientData[k].name} (${S.ingredients[k]||0})</button>`).join("")}</div><div class="card-actions"><button class="primary" onclick="brew()">🧋 Pha & giao</button><button onclick="cancelOrder('Bạn bỏ đơn')">✖ Bỏ đơn</button></div></div>`;
  }else document.getElementById("orderArea").innerHTML=`<div class="save-card">Chọn một khách để bắt đầu pha chế.</div>`;
  document.getElementById("eventArea").innerHTML=`<div class="event-card">⚡ ${S.staff.pikachu?"Pikachu có thể kéo khách bất kỳ lúc nào.": "Thuê Pikachu để mở skill kéo khách."}${S.staff.pikachu?`<br><button class="primary logout" onclick="useSkill()">⚡ Thunder Call</button>`:""}</div>`;
 }

 document.getElementById("storyQuest").innerHTML=`<div class="save-card"><b>Chương ${Math.min(4,S.level)}: ${S.level<2?"Khởi nghiệp":S.level<4?"Quán bắt đầu đông":"Tiệm nổi tiếng"}</b><p class="muted">Phục vụ: ${S.quest.served}/10 • Thu nhập: ${S.quest.earned}/500 • Đơn trả đủ: ${S.quest.perfect}</p></div>`;

 document.getElementById("ingredients").innerHTML=Object.entries(ingredientData).map(([id,x])=>`<div class="ingredient"><div class="ingredient-top"><div class="ingredient-icon">${x.icon}</div><div class="grow"><b>${x.name}</b><div class="small">${S.ingredients[id]||0} trong kho • ${x.price}💰/cái</div></div></div><div class="card-actions"><button onclick="buyIngredient('${id}',1)">+1</button><button onclick="buyIngredient('${id}',5)">+5</button><button onclick="buyIngredient('${id}',10)">+10</button></div></div>`).join("");

 document.getElementById("recipes").innerHTML=recipes.map(r=>{
  let locked=r.unlock>S.level;
  return `<div class="recipe-card"><div class="recipe-head"><div class="recipe-icon">${r.icon}</div><div class="grow"><b>${r.name}</b><div class="small">${locked?"🔒 Mở Level "+r.unlock:`${r.price}💰 • +${r.exp} EXP`}</div></div></div><div class="chips">${Object.entries(r.need).map(([k,n])=>`<span class="chip">${ingredientData[k].icon} ${ingredientData[k].name} ×${n}</span>`).join("")}</div></div>`
 }).join("");

 document.getElementById("staffList").innerHTML=staffData.map(s=>{
  let owned=S.staff[s.id];
  return `<div class="staff-card"><div class="staff-head"><div class="poke">${s.icon}</div><div class="grow"><b>${s.name}</b> <span class="rarity">${s.rarity}</span><div class="small">${s.role}</div></div></div><div class="skill">⚡ <b>${s.skill}</b><br><span class="small">Chỉ số: phục vụ ${s.stats.service} • skill ${s.stats.skill}</span></div><div class="card-actions"><button ${owned?"disabled":""} class="${owned?"":"primary"}" onclick="hire('${s.id}')">${owned?"Đã có":"Thuê "+s.cost+"💰"}</button></div></div>`
 }).join("");

 document.getElementById("upgradeList").innerHTML=upgrades.map(u=>{
  let lv=S.upgrades[u.id],cost=Math.round(u.base*Math.pow(1.55,lv-1));
  return `<div class="upgrade-card"><div class="upgrade-head"><div class="poke">${u.icon}</div><div class="grow"><b>${u.name} • Lv.${lv}/${u.max}</b><div class="small">${u.desc}</div></div></div><div class="card-actions"><button ${lv>=u.max?"disabled":""} onclick="upgrade('${u.id}')">${lv>=u.max?"MAX":"Nâng cấp "+cost+"💰"}</button></div></div>`
 }).join("");

 document.getElementById("eventList").innerHTML=`<div class="event-card"><b>🎲 Biến cố ngẫu nhiên</b><p class="small">Khách có thể trả thiếu, bỏ trốn hoặc tip. Pokémon và trang trí ảnh hưởng xác suất.</p><p class="small">⏰ Ca làm việc cố định: 10:00–22:00. Cuối ngày tự tổng kết.</p></div>`;

 document.getElementById("summary").innerHTML=`<div class="stats-grid"><div class="stat"><span>🧋 Đã bán</span><b>${S.stats.served}</b></div><div class="stat"><span>😤 Bỏ đi</span><b>${S.stats.lost}</b></div><div class="stat"><span>🏃 Trốn</span><b>${S.stats.stolen}</b></div><div class="stat"><span>❌ Sai món</span><b>${S.stats.wrong}</b></div></div><div class="save-card"><b>Ngày ${S.day}</b><p>Doanh thu thực nhận: <b>${S.stats.revenue}💰</b></p><p>Chi mua nguyên liệu: <b>${S.stats.cost}💰</b></p><p>Danh tiếng: <b>${S.rep}</b></p><button onclick="save()">💾 Lưu</button> <button class="danger" onclick="reset()">Xóa game</button></div>`;
}
load();
