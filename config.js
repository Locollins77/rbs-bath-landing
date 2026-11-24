// ---- Rainbow Bath & Shower Meta landing page: the only file you should need to edit ----
window.RBS_CONFIG = {
  // Zapier "Catch Hook" URL (Webhooks by Zapier > Catch Hook). Leave blank until it exists.
  // While blank the form will not submit (it tells people to call), unless the URL ends in ?test=1.
  WEBHOOK_URL: "https://hooks.zapier.com/hooks/catch/20921842/45cpvqx/",

  // Meta pixel. 957697473160510 = "Rainbow Seamless Systems's Pixel Main" (carries both sites).
  // Loaded directly by this page. Do NOT also add a Meta tag through GTM or Lead fires twice.
  PIXEL_ID: "", // OFF until ads launch. Restore: "957697473160510"

  // Optional: Google tag for GA4 / Google Ads. Leave blank to skip.
  GA4_ID: "",

  // Meta landing page tracking number (bath). Calls to this number = Facebook.
  PHONE_DISPLAY: "(231) 758-5096",
  PHONE_TEL: "+12317585096",

  // Where the page counts as live. Anywhere else (your computer, the claude.ai preview) the form runs as a
  // demo: it goes to the thank-you page with a "preview" note and sends nothing.
  LIVE_HOSTS: ["go.rainbowbathandshower.com", "github.io"],

  THANK_YOU_PATH: "thank-you/index.html",
  LEAD_SOURCE: "Meta Landing Page - Bath",
  PRIVACY_URL: "https://www.rainbowbathandshower.com/privacy-policy"
};
