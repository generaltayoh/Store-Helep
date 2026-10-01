const fs = require('fs');
const file = 'js/app.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Chart empty state
content = content.replace(
  /<div class="card chart-card">[\s\S]*?<div class="chart-head"><b>\${chartTitle}<\/b><\/div>[\s\S]*?<div class="chart-area">\${chartSVG}<\/div>[\s\S]*?<div class="chart-labels">\${d\.weeklyChart[\s\S]*?\.join\(""\)}<\/div>[\s\S]*?<\/div>/,
  `    <div class="card chart-card">
      <div class="chart-head"><b>\${chartTitle}</b></div>
      \${Number(d.metrics.totalSales) > 0 ? \`<div class="chart-area">\${chartSVG}</div>
      <div class="chart-labels">\${d.weeklyChart
        .map((c) => \`<span class="\${c.day === "Sun" ? "sun" : ""}">\${t("ana." + c.day.toLowerCase())}</span>\`)
        .join("")}</div>\` : \`<div class="chart-empty" style="padding: 40px 0; text-align: center; color: #666;">\${t("ana.noSales")}</div>\`}
    </div>`
);

// 2. History Row Checkboxes
content = content.replace(
  /return `<div class="card hist-row" \$\{clickAttr\}>[\s\S]*?<span class="hist-date"><b>\$\{day\}<\/b>/,
  `return \`<div class="card hist-row" \${clickAttr}>
          <label class="scan-checkbox-label" onclick="event.stopPropagation()">
            <input type="checkbox" value="\${s.id}" class="scan-checkbox" onchange="toggleBulkDeleteBtn()" style="margin-right:8px; transform:scale(1.3); cursor:pointer;" />
          </label>
          <span class="hist-date"><b>\${day}</b>`
);

// 3. Review row isUnknown rendering
content = content.replace(
  /<span class="avatar \$\{r\.productName === "Unknown item" \|\| r\.unitPrice === 0 \? "amber" : "green"\}">\$\{initials\([\s\S]*?r\.productName[\s\S]*?\)\}<\/span>[\s\S]*?<input class="input" data-field="productName" value="\$\{escapeHtml\(r\.productName\)\}" style="flex:2;" \/>/,
  `<span class="avatar \${r.productName === "Unknown item" || r.unitPrice === 0 || r.isUnknown ? "amber" : "green"}">\${initials(
      r.productName
    )}</span>
      <div style="flex:2; display:flex; flex-direction:column;">
        <input class="input" data-field="productName" value="\${escapeHtml(r.productName)}" style="width:100%;" />
        \${r.isUnknown ? \`<span style="font-size:11px; color:#b23b3b; margin-top:2px;">Not part of the system</span>\` : ""}
      </div>`
);

// 4. Bulk Delete logic
content = content.replace(
  /async function deleteScanById[\s\S]*?toast\(err\.message \|\| "Delete failed", "error"\);\s*\}\s*\}/,
  `async function deleteScanById(id, btn) {
  try {
    await api(\`/scans/\${id}\`, { method: "DELETE" });
    const card = btn.closest(".prev-scan-card, .hist-row");
    if (card) card.remove();
    toast("Scan deleted");
    loadScans().catch(console.error);
  } catch (err) {
    toast(err.message || "Delete failed", "error");
  }
}

window.toggleBulkDeleteBtn = function() {
  const btn = document.getElementById("bulkDeleteBtn");
  if (!btn) return;
  const anyChecked = document.querySelectorAll(".scan-checkbox:checked").length > 0;
  btn.style.display = anyChecked ? "inline-block" : "none";
};

window.bulkDeleteSelected = async function() {
  const checkboxes = document.querySelectorAll(".scan-checkbox:checked");
  if (!checkboxes.length) return;
  if (!confirm("Are you sure you want to delete the selected scans?")) return;
  
  const ids = Array.from(checkboxes).map(c => c.value);
  for (const id of ids) {
    try {
      await api(\`/scans/\${id}\`, { method: "DELETE" });
    } catch(err) {
      console.error(err);
    }
  }
  toast(\`Deleted \${ids.length} scans\`);
  loadHistory().catch(console.error);
  toggleBulkDeleteBtn(); // hide button again
};`
);

fs.writeFileSync(file, content, 'utf8');
console.log('App.js patched successfully');
