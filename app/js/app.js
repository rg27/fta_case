let currentRecordId;
let currentAccountID;
let currentModificationOrigin;

let cachedFileEid = null;
let cachedFilePassport = null;
let cachedFileTl = null;

function populateCountrySelects(countries, selectedNationality = "") {
    console.log("Populating country selects...");
    const selects = document.querySelectorAll(".nationality-field");
    const passportEl = document.getElementById("field-pp-country");
    
    selects.forEach(el => {
        el.innerHTML = '<option value="">-- Select Country --</option>';
        countries.forEach(country => {
            const opt = document.createElement("option");
            opt.value = country;
            opt.textContent = country;
            if (country === selectedNationality) opt.selected = true;
            el.appendChild(opt);
        });
    });
    if (passportEl) {
        passportEl.innerHTML = '<option value="">-- Select Country --</option>';
        countries.forEach(country => {
            const opt = document.createElement("option");
            opt.value = country;
            opt.textContent = country;
            passportEl.appendChild(opt);
        });
    }
}

ZOHO.embeddedApp.on("PageLoad", async function (entity) {
    console.log("Page Load Triggered");
    ZOHO.CRM.UI.Resize({ height: "550", width: "1100" });
    currentRecordId = entity.data?.recordId;
    await initPortal();
});

ZOHO.embeddedApp.init();

async function initPortal() {
    console.log("Initializing Portal...");
    try {
        const args = { "arguments": "{}" };
        console.log("Calling fta_case_get_countries with args:", args);
        const countryResponse = await ZOHO.CRM.FUNCTIONS.execute("fta_case_get_countries", args);
        console.log("fta_case_get_countries response:", countryResponse);
        
        if (countryResponse?.details?.output) {
            const responseData = JSON.parse(countryResponse.details.output);
            const countries = responseData.data.map(item => item.Data).sort();
            populateCountrySelects(countries);
        }
        await fetchData();
        document.getElementById("initial-preloader")?.classList.add("fade-out");
        document.getElementById("main-portal")?.classList.replace("opacity-0", "opacity-100");
    } catch (err) { 
        console.error("Initialization error:", err); 
    }
}

async function fetchData() {
    console.log("Fetching case record data for ID:", currentRecordId);
    try {
        const args = { "arguments": JSON.stringify({ "fta_id": currentRecordId }) };
        console.log("Calling fta_get_case_get_record with args:", args);
        const response = await ZOHO.CRM.FUNCTIONS.execute("fta_get_case_get_record", args);
        console.log("fta_get_case_get_record response:", response);
        
        if (response?.details?.output) {
            const data = JSON.parse(response.details.output);
            currentAccountID = data.account_id;
            currentModificationOrigin = data.modification_origin;
            renderPortal(data);
        }
    } catch (err) { 
        console.error("Fetch error:", err); 
    }
}

function formatDateForInput(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
}

function clearFields(sectionKey) {
    console.log("Clearing fields for section:", sectionKey);
    if (sectionKey === 'eid') {
        document.getElementById("field-eid-number").value = "";
        document.getElementById("field-eid-issue").value = "";
        document.getElementById("field-eid-expiry").value = "";
    } else if (sectionKey === 'passport') {
        document.getElementById("field-pp-number").value = "";
        document.getElementById("field-pp-country").value = "";
        document.getElementById("field-pp-issue").value = "";
        document.getElementById("field-pp-expiry").value = "";
    } else if (sectionKey === 'tl') {
        document.getElementById("tl-name").value = "";
        document.getElementById("tl-license-number").value = "";
        document.getElementById("tl-start-date").value = "";
        document.getElementById("tl-expiry-date").value = "";
    }
    document.querySelectorAll(".dob-field").forEach(el => el.value = "");
    document.querySelectorAll(".nationality-field").forEach(el => el.value = "");
}

async function handleFileSelected(inputEl, sectionKey) {
    const file = inputEl.files?.[0];
    if (!file) return;
    
    console.log("File selected for:", sectionKey);
    clearFields(sectionKey);

    if (sectionKey === "eid") cachedFileEid = file;
    else if (sectionKey === "passport") cachedFilePassport = file;
    else if (sectionKey === "tl") cachedFileTl = file;

    await handleOcrUpload(sectionKey);
}

async function handleOcrUpload(sectionKey) {
    console.log("Starting OCR Upload process for:", sectionKey);
    const promptEl = document.getElementById(`attach-${sectionKey}-prompt`);
    
    promptEl.className = "mt-3 p-3 rounded-lg text-[10px] font-black uppercase tracking-widest border-l-4 animate-pulse-slow bg-amber-50 text-amber-700 border-amber-500";
    promptEl.textContent = "Processing document, please wait...";
    promptEl.classList.remove("hidden");

    let file = (sectionKey === "eid") ? cachedFileEid : (sectionKey === "passport") ? cachedFilePassport : cachedFileTl;

    try {
        const fileUploadArgs = { 
            "CONTENT_TYPE": "multipart", 
            "PARTS": [{ "headers": { "Content-Disposition": "file;" }, "content": "__FILE__" }], 
            "FILE": { "fileParam": "content", "file": file } 
        };
        console.log("Calling uploadFile with args:", fileUploadArgs);
        const uploadResponse = await ZOHO.CRM.API.uploadFile(fileUploadArgs);
        console.log("uploadFile response:", uploadResponse);
        
        const fileId = uploadResponse?.data?.[0]?.details?.id;
        console.log("File uploaded, ID:", fileId);
        
        const validatorArgs = { 
            "arguments": JSON.stringify({ "fta_id": String(currentRecordId), "file_id": String(fileId) }) 
        };
        console.log("Calling ta_fta_eid_validator with args:", validatorArgs);
        const validatorResult = await ZOHO.CRM.FUNCTIONS.execute("ta_fta_eid_validator", validatorArgs);
        console.log("ta_fta_eid_validator response:", validatorResult);

        const data = validatorResult?.details?.output ? JSON.parse(validatorResult.details.output) : null;
        console.log("OCR Data Received:", data);

        if (data && Object.values(data).some(val => val !== null && val !== "")) {
            if (data.pp_number) document.getElementById("field-pp-number").value = data.pp_number;
            if (data.pp_issuing_country) document.getElementById("field-pp-country").value = data.pp_issuing_country;
            if (data.pp_issued_date) document.getElementById("field-pp-issue").value = data.pp_issued_date;
            if (data.pp_expiry_date) document.getElementById("field-pp-expiry").value = data.pp_expiry_date;
            if (data.nationality) document.querySelectorAll(".nationality-field").forEach(el => el.value = data.nationality);
            if (data.date_of_birth) document.querySelectorAll(".dob-field").forEach(el => el.value = data.date_of_birth);

            promptEl.classList.remove("animate-pulse-slow", "bg-amber-50", "text-amber-700", "border-amber-500");
            promptEl.classList.add("bg-emerald-50", "text-emerald-700", "border-emerald-500");
            promptEl.textContent = "Data successfully extracted. Please verify all information carefully.";
        } else {
            throw new Error("No data extracted");
        }
    } catch (err) {
        console.error("OCR Process Error:", err);
        clearFields(sectionKey);
        promptEl.classList.remove("animate-pulse-slow", "bg-amber-50", "text-amber-700", "border-amber-500");
        promptEl.classList.add("bg-red-50", "text-red-700", "border-red-500");
        promptEl.textContent = "Processing failed. Kindly verify that the file is correct. If so, the system is currently unable to read or extract its content.";
    }
}

function renderPortal(data) {
    console.log("Rendering portal data...");
    document.getElementById("field-account-name").textContent = data.account_name || "N/A";
    document.getElementById("field-client-name").textContent = data.client_name || "N/A";
    document.getElementById("field-document-type").textContent = data.document_type || "N/A";

    const shouldPopulate = !!data.modification_origin;
    const dobValue = shouldPopulate ? formatDateForInput(data.date_of_birth) : "";
    document.querySelectorAll(".dob-field").forEach(el => el.value = dobValue);
    
    const countries = Array.from(document.querySelectorAll(".nationality-field")[0]?.options || []).slice(1).map(o => o.value);
    populateCountrySelects(countries, shouldPopulate ? data.nationality : "");
    
    document.getElementById("field-eid-number").value = shouldPopulate ? (data.eid_number || "") : "";
    document.getElementById("field-eid-issue").value = shouldPopulate ? formatDateForInput(data.eid_issued_date) : "";
    document.getElementById("field-eid-expiry").value = shouldPopulate ? formatDateForInput(data.eid_expiry_date) : "";

    document.getElementById("field-pp-number").value = shouldPopulate ? (data.pp_number || "") : "";
    document.getElementById("field-pp-country").value = shouldPopulate ? (data.pp_issuing_country || "") : "";
    document.getElementById("field-pp-issue").value = shouldPopulate ? formatDateForInput(data.pp_issued_date) : "";
    document.getElementById("field-pp-expiry").value = shouldPopulate ? formatDateForInput(data.pp_expiry_date) : "";

    document.getElementById("tl-name").value = shouldPopulate ? (data.tl_name || "") : "";
    document.getElementById("tl-license-number").value = shouldPopulate ? (data.tl_license_number || "") : "";
    document.getElementById("tl-start-date").value = shouldPopulate ? formatDateForInput(data.tl_start_date) : "";
    document.getElementById("tl-expiry-date").value = shouldPopulate ? formatDateForInput(data.tl_expiry_date) : "";
    
    const docType = (data.document_type || "").toLowerCase();
    document.getElementById("section-eid").classList.toggle("hidden", !(docType.includes("eid") || docType.includes("visa")));
    document.getElementById("section-passport").classList.toggle("hidden", !docType.includes("passport"));
    document.getElementById("section-tl").classList.toggle("hidden", !docType.includes("trade license"));
    ["attach-eid", "attach-passport", "attach-tl"].forEach(id => document.getElementById(id).classList.toggle("hidden", shouldPopulate));
}

async function submitForm() {
    console.log("Submitting form...");
    
    const docType = document.getElementById("field-document-type").textContent.toLowerCase();
    let dobInput = document.querySelector(".dob-field");
    let natInput = document.querySelector(".nationality-field");

    if (docType.includes("eid") || docType.includes("visa")) {
        dobInput = document.getElementById("eid-dob") || dobInput;
        natInput = document.getElementById("eid-nationality") || natInput;
    } else if (docType.includes("passport")) {
        dobInput = document.getElementById("pp-dob") || dobInput;
        natInput = document.getElementById("pp-nationality") || natInput;
    }

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
        date_of_birth: dobInput.value,
        nationality: natInput.value,
        modification_origin: currentModificationOrigin || ""
    };

    try {
        const updateArgs = { 
            "arguments": JSON.stringify({ "action": "update_record", "account_id": currentAccountID, "fta_id": currentRecordId, "affected_record": recordData }) 
        };
        console.log("Calling fta_case_update with args:", updateArgs);
        const updateResult = await ZOHO.CRM.FUNCTIONS.execute("fta_case_update", updateArgs);
        console.log("fta_case_update response:", updateResult);
        
        document.getElementById("success-modal").classList.remove("hidden");
    } catch (err) { 
        console.error("Submission error:", err);
        document.getElementById("error-modal").classList.remove("hidden"); 
    }
}

function closeAndReload() { $Client.close(); }