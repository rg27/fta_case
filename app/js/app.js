let currentRecordId;
let currentAccountID;
let currentModificationOrigin;

function populateCountrySelects(countries, selectedNationality = "") {
    const nationalityEl = document.getElementById("field-nationality");
    const passportEl = document.getElementById("field-pp-country");
    
    if (!nationalityEl || !passportEl) return;

    [nationalityEl, passportEl].forEach(el => {
        el.innerHTML = '<option value="">-- Select Country --</option>';
        countries.forEach(country => {
            const opt = document.createElement("option");
            opt.value = country;
            opt.textContent = country;
            if (el.id === "field-nationality" && country === selectedNationality) opt.selected = true;
            el.appendChild(opt);
        });
    });
}

ZOHO.embeddedApp.on("PageLoad", async function (entity) {
    ZOHO.CRM.UI.Resize({ height: "550", width: "800" });
    currentRecordId = entity.data?.recordId;
    await initPortal();
});

ZOHO.embeddedApp.init();

async function initPortal() {
    try {
        const countryResponse = await ZOHO.CRM.FUNCTIONS.execute("fta_case_get_countries", { "arguments": "{}" });
        if (countryResponse?.details?.output) {
            const responseData = JSON.parse(countryResponse.details.output);
            const countries = responseData.data.map(item => item.Data).sort();
            populateCountrySelects(countries);
        }
        await fetchData();
        
        const preloader = document.getElementById("initial-preloader");
        const portal = document.getElementById("main-portal");
        if (preloader) preloader.classList.add("fade-out");
        if (portal) portal.classList.replace("opacity-0", "opacity-100");
    } catch (err) { console.error("Initialization error:", err); }
}

async function fetchData() {
    try {
        const response = await ZOHO.CRM.FUNCTIONS.execute("fta_get_case_get_record", { "arguments": JSON.stringify({ "fta_id": currentRecordId }) });
        if (response?.details?.output) {
            const data = JSON.parse(response.details.output);
            currentAccountID = data.account_id;
            currentModificationOrigin = data.modification_origin;
            renderPortal(data);
        }
    } catch (err) { console.error("Fetch error:", err); }
}

function formatDateForInput(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
}

function renderPortal(data) {
    const fields = {
        "field-account-name": data.account_name,
        "field-client-name": data.client_name,
        "field-document-type": data.document_type
    };
    
    Object.keys(fields).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = fields[id] || "N/A";
    });

    const shouldPopulate = data.modification_origin && data.modification_origin.trim() !== "";
    
    document.getElementById("field-dob").value = shouldPopulate ? formatDateForInput(data.date_of_birth) : "";
    
    const countries = Array.from(document.getElementById("field-nationality").options).slice(1).map(o => o.value);
    populateCountrySelects(countries, shouldPopulate ? data.nationality : "");
    
    document.getElementById("field-pp-number").value = shouldPopulate ? (data.pp_number || "") : "";
    document.getElementById("field-pp-country").value = shouldPopulate ? (data.pp_issuing_country || "") : "";
    document.getElementById("field-pp-issue").value = shouldPopulate ? formatDateForInput(data.pp_issued_date) : "";
    document.getElementById("field-pp-expiry").value = shouldPopulate ? formatDateForInput(data.pp_expiry_date) : "";

    document.getElementById("field-eid-number").value = shouldPopulate ? (data.eid_number || "") : "";
    document.getElementById("field-eid-issue").value = shouldPopulate ? formatDateForInput(data.eid_issued_date) : "";
    document.getElementById("field-eid-expiry").value = shouldPopulate ? formatDateForInput(data.eid_expiry_date) : "";

    document.getElementById("tl-name").value = shouldPopulate ? (data.tl_name || "") : "";
    document.getElementById("tl-license-number").value = shouldPopulate ? (data.tl_license_number || "") : "";
    document.getElementById("tl-start-date").value = shouldPopulate ? formatDateForInput(data.tl_start_date) : "";
    document.getElementById("tl-expiry-date").value = shouldPopulate ? formatDateForInput(data.tl_expiry_date) : "";
    
    const docType = (data.document_type || "").toLowerCase();
    document.getElementById("section-eid").classList.add("hidden");
    document.getElementById("section-passport").classList.add("hidden");
    document.getElementById("section-tl").classList.add("hidden");

    if (docType.includes("trade license")) {
        document.getElementById("section-tl").classList.remove("hidden");
    } else if (docType.includes("eid") || docType.includes("visa")) {
        document.getElementById("section-eid").classList.remove("hidden");
    } else if (docType.includes("passport")) {
        document.getElementById("section-passport").classList.remove("hidden");
    }
}

async function submitForm() {
    const recordData = {
        tl_name: document.getElementById("tl-name").value,
        tl_license_number: document.getElementById("tl-license-number").value,
        tl_start_date: document.getElementById("tl-start-date").value,
        tl_expiry_date: document.getElementById("tl-expiry-date").value,
        pp_number: document.getElementById("field-pp-number").value,
        pp_issuing_country: document.getElementById("field-pp-country").value,
        pp_issued_date: document.getElementById("field-pp-issue").value,
        pp_expiry_date: document.getElementById("field-pp-expiry").value,
        eid_number: document.getElementById("field-eid-number").value,
        eid_issued_date: document.getElementById("field-eid-issue").value,
        eid_expiry_date: document.getElementById("field-eid-expiry").value,
        date_of_birth: document.getElementById("field-dob").value,
        nationality: document.getElementById("field-nationality").value,
        account_name: document.getElementById("field-account-name").textContent,
        client_name: document.getElementById("field-client-name").textContent,
        document_type: document.getElementById("field-document-type").textContent,
        modification_origin: currentModificationOrigin || ""
    };
    await triggerLog("update_record", recordData);
}

const triggerLog = async (action, recordData) => {
    try {
        const payload = { "action": action, "account_id": currentAccountID, "fta_id": currentRecordId, "affected_record": recordData };
        const logRes = await ZOHO.CRM.FUNCTIONS.execute("fta_case_update", { "arguments": JSON.stringify(payload) });
        alert("Record updated successfully!");
    } catch (err) { alert("Failed to update record."); }
};

function closeAndReload() { ZOHO.CRM.UI.Popup.closeReload(); }