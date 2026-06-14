let currentRecordId;

ZOHO.embeddedApp.on("PageLoad", async function (entity) {
    ZOHO.CRM.UI.Resize({ height: "750", width: "1300" });
    currentRecordId = entity.EntityId[0];
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
    const funcName = "fta_get_case_get_record"; // 👈 replace this
    const payload = { "fta_id": currentRecordId };
    const args = { "arguments": JSON.stringify(payload) };

    try {
        const response = await ZOHO.CRM.FUNCTIONS.execute(funcName, args);
        if (response && response.details && response.details.output) {
            const resultData = JSON.parse(response.details.output);
            renderPortal(resultData);
        } else {
            throw new Error("Invalid response from function");
        }
    } catch (error) {
        console.error("[JS SDK] ✗ Execute failed:", error);
        throw error;
    }
}

function renderPortal(data) {
    // 👈 build your UI here
    console.log("FTA Data:", data);
}

function closeAndReload() {
    ZOHO.CRM.UI.Popup.closeReload();
}