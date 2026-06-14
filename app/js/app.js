let currentRecordId;

// Zoho CRM default country list
const ZOHO_COUNTRIES = [
    "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda",
    "Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain",
    "Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia",
    "Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso",
    "Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic",
    "Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica","Croatia","Cuba",
    "Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic",
    "Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini",
    "Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana",
    "Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras",
    "Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy",
    "Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan",
    "Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania",
    "Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta",
    "Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova",
    "Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru",
    "Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea",
    "North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama",
    "Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar",
    "Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia",
    "Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe",
    "Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore",
    "Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea",
    "South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria",
    "Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga",
    "Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine",
    "United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan",
    "Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
];

function populateCountrySelects() {
    const selects = ["field-nationality", "field-pp-country"];
    selects.forEach(id => {
        const el = document.getElementById(id);
        el.innerHTML = '<option value="">-- Select Country --</option>';
        ZOHO_COUNTRIES.forEach(country => {
            const opt = document.createElement("option");
            opt.value = country;
            opt.textContent = country;
            el.appendChild(opt);
        });
    });
}

ZOHO.embeddedApp.on("PageLoad", async function (entity) {
    console.log("[FTA] ► PageLoad entity:", JSON.parse(JSON.stringify(entity)));
    ZOHO.CRM.UI.Resize({ height: "750", width: "900" });
    currentRecordId = entity.data?.recordId;
    console.log("[FTA] ► Record ID:", currentRecordId);
    populateCountrySelects();
    await initPortal();
});

ZOHO.embeddedApp.init();

async function initPortal() {
    try {
        await fetchData();
        setTimeout(() => {
            document.getElementById("initial-preloader").classList.add("fade-out");
            document.getElementById("main-portal").classList.replace("opacity-0", "opacity-100");
        }, 1000);
    } catch (err) {
        console.error("Initialization error:", err);
        document.getElementById("loader-status-text").textContent = "Portal Load Error";
        setTimeout(() => {
            document.getElementById("initial-preloader").classList.add("fade-out");
            document.getElementById("main-portal").classList.replace("opacity-0", "opacity-100");
        }, 1000);
    }
}

async function fetchData() {
    const funcName = "fta_get_case_get_record";
    const payload = { "fta_id": currentRecordId };
    const args = { "arguments": JSON.stringify(payload) };

    console.log("[FTA] ► Function:", funcName);
    console.log("[FTA] ► Arguments:", JSON.parse(args.arguments));

    try {
        const response = await ZOHO.CRM.FUNCTIONS.execute(funcName, args);
        console.log("[FTA] ◄ Raw Response:", JSON.parse(JSON.stringify(response)));
        if (response && response.details && response.details.output) {
            const resultData = JSON.parse(response.details.output);
            console.log("[FTA] ◄ Parsed Output:", resultData);
            renderPortal(resultData);
        } else {
            console.error("[FTA] ✗ Unexpected response shape:", JSON.parse(JSON.stringify(response)));
            throw new Error("Invalid response from function");
        }
    } catch (error) {
        console.error("[FTA] ✗ Execute failed:", JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error))));
        throw error;
    }
}

function formatDateForInput(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d)) return "";
    return d.toISOString().split("T")[0];
}

function renderPortal(data) {
    window.lastFetchedData = data;

    const dobInput = document.getElementById("field-dob");
    const nationalitySelect = document.getElementById("field-nationality");

    const dobVal = formatDateForInput(data.dob2);
    const natVal = data.nationality_2 || "";

    if (dobVal) {
        dobInput.value = dobVal;
        dobInput.classList.add("prefilled");
    }

    if (natVal) {
        nationalitySelect.value = natVal;
        nationalitySelect.classList.add("prefilled");
    }
}

async function submitForm() {
    const btn = document.getElementById("submit-btn");
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<div class="w-4 h-4 border-2 border-t-white border-white/30 rounded-full animate-spin mx-auto"></div>`;

    const formData = {
        fta_id: currentRecordId,
        dob2: document.getElementById("field-dob").value,
        nationality_2: document.getElementById("field-nationality").value,
        emirates_id_number_2: document.getElementById("field-eid-number").value,
        emirates_id_issue_date_2: document.getElementById("field-eid-issue").value,
        emirates_id_expiry_date_2: document.getElementById("field-eid-expiry").value,
        pp_number_2: document.getElementById("field-pp-number").value,
        pp_issuing_country_2: document.getElementById("field-pp-country").value,
        pp_issue_date_2: document.getElementById("field-pp-issue").value,
        pp_expiry_date_2: document.getElementById("field-pp-expiry").value,
    };

    console.log("[FTA Submit] Payload:", formData);

    // TODO: wire up your Zoho function to save the form
    // await ZOHO.CRM.FUNCTIONS.execute("fta_update_case_record", { "arguments": JSON.stringify(formData) });

    await new Promise(r => setTimeout(r, 1200)); // remove when wired

    btn.disabled = false;
    btn.innerHTML = originalText;

    showToast("Record updated successfully.");
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.remove("opacity-0", "translate-y-2");
    toast.classList.add("opacity-100", "translate-y-0");
    setTimeout(() => {
        toast.classList.remove("opacity-100", "translate-y-0");
        toast.classList.add("opacity-0", "translate-y-2");
    }, 3000);
}

function closeAndReload() {
    ZOHO.CRM.UI.Popup.closeReload();
}