export function getGoogleAuthToken() {
  return new Promise((resolve, reject) => {
    const ua = navigator.userAgent;
    const isChrome = ua.includes("Chrome") && !ua.includes("Edg");
    console.log("ischrome", isChrome);

    // 1. First check if getAuthToken is available (most common in Chrome)
    if (isChrome && chrome.identity && chrome.identity.getAuthToken) {
      console.log("Trying chrome.identity.getAuthToken...");
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError || !token) {
          chrome.identity.getAuthToken({ interactive: true }, (token2) => {
            if (chrome.runtime.lastError || !token2) {
              console.error("lastError:", chrome.runtime.lastError);
              return reject("User denied authorization or an error occurred");
            }
            resolve(token2);
          });
        } else {
          resolve(token);
        }
      });

      // 2. Otherwise try launchWebAuthFlow (Edge may support it)
    } else if (chrome.identity && chrome.identity.launchWebAuthFlow) {
      console.log("Trying chrome.identity.launchWebAuthFlow...");
      launchWebAuthFlowForGoogle()
        .then((token) => resolve(token))
        .catch((err) => reject(err));
    } else {
      reject("This browser does not support the chrome.identity API");
    }
  });
}

async function launchWebAuthFlowForGoogle() {
  return new Promise((resolve, reject) => {
    // Except Chrome Client ID
    const clientId = import.meta.env.VITE_NOT_CHROME_CLIENT_ID;
    const scopes = [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar",
    ];

    const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;

    const authUrl =
      "https://accounts.google.com/o/oauth2/v2/auth" +
      `?response_type=token` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes.join(" "))}` +
      `&prompt=consent`;

    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl,
        interactive: true,
      },
      (responseUrl) => {
        if (chrome.runtime.lastError) {
          console.error("launchWebAuthFlow error:", chrome.runtime.lastError);
          return reject(chrome.runtime.lastError);
        }
        if (!responseUrl) {
          return reject("Unable to obtain authorization result");
        }

        const urlFragment = responseUrl.split("#")[1];
        if (!urlFragment) {
          return reject("Unable to retrieve token from callback URL");
        }
        const params = new URLSearchParams(urlFragment);
        const token = params.get("access_token");
        if (!token) {
          return reject("Postback URL has no access_token");
        }

        resolve(token);
      }
    );
  });
}
