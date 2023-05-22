import http from "k6/http";
import { parseHTML } from "k6/html";
import { check, sleep, fail } from "k6";
import { SharedArray } from "k6/data";
import papaparse from "https://jslib.k6.io/papaparse/5.1.1/index.js";
import {
  randomItem,
  randomIntBetween,
  randomString,
} from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

import { URLSearchParams } from "https://jslib.k6.io/url/1.0.0/index.js";

const targetUserCount = 4000;

export const options = {
  summaryTrendStats: [
    "avg",
    "min",
    "med",
    "max",
    "p(95)",
    "p(99)",
    "p(99.99)",
    "count",
  ],

  // performance test profile
  stages: [
    { duration: "5m", target: 10 }, // a few requests to warm service up
    { duration: "30m", target: targetUserCount }, // ramp up - this is important as we don't want all users to login at the same time
    { duration: "30m", target: targetUserCount }, // hold at target user
    { duration: "5m", target: 0 },
  ],
  // // soak test profile
  // stages: [
  //   { duration: "5m", target: 10 },
  //   { duration: "30m", target: targetUserCount },
  //   { duration: "8h", target: targetUserCount },
  //   { duration: "5m", target: 0 },
  // ],
};

const users = new SharedArray("users", function () {
  // Load CSV file and parse it using Papa Parse
  return papaparse
    .parse(open("../users.csv"), { header: false })
    .data.filter((x) => x[0].length > 0); // filter out empty lines
});

const params = Object.assign(
  {
    codeChallenge: "k7ByXQcOKLWeMUkqlGrxrpuRPeb1LEWoJloI_fdRyE4",
    clientId: "b2787263-b02a-4229-8226-0253310339ee",
    redirectUrl: "http://localhost:11001/",
    scope:
      "https://devoio.onmicrosoft.com/landonline-api/Landonline.All https://devoio.onmicrosoft.com/landonline-api/Search.Read",
    response_type: "code",
    authBaseUrl:
      "https://devoio.b2clogin.com/devoio.onmicrosoft.com/b2c_1a_needchangepasswordcustompolicy/v2.0",
    password: "B2ctest1234",
    codeVerifier:
      "b1009071aba54cf08868ec7249d43b6ffdaca7980d3f45dfb1e4654d3c28d83576d55036aa7b4327a874e7cfc3cb82a7",
    b2cPolicy: "b2c_1a_needchangepasswordcustompolicy", //"b2c_1a_usernameoradcustompolicy",
    userInfoEndPoint:
      "https://devoio.b2clogin.com/devoio.onmicrosoft.com/openid/v2.0/userinfo",
    authorization_endpoint:
      "https://devoio.b2clogin.com/devoio.onmicrosoft.com/b2c_1a_needchangepasswordcustompolicy/oauth2/v2.0/authorize",
    token_endpoint:
      "https://devoio.b2clogin.com/devoio.onmicrosoft.com/b2c_1a_needchangepasswordcustompolicy/oauth2/v2.0/token",
    end_session_endpoint:
      "https://devoio.b2clogin.com/devoio.onmicrosoft.com/b2c_1a_needchangepasswordcustompolicy/oauth2/v2.0/logout",
  }
  //envConfigs[targetEnv]
);

function generateGUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getOpenIdConfig() {
  const response = http.get(
    `${params.authBaseUrl}/.well-known/openid-configuration`
  );
  if (
    !check(response, { "oidc config status was 200": (r) => r.status === 200 })
  ) {
    fail(`oidc config status was ${response.status}`);
  }
  return JSON.parse(response.body);
}

function b2cPolicyLoginPage(clientRequestId) {
  const loginPageUrl = `${params.authorization_endpoint}?${[
    `client_id=${params.clientId}`,
    `scope=${encodeURIComponent(params.scope)}`,
    `redirect_uri=${encodeURIComponent(params.redirectUrl)}`,
    `client-request-id=${clientRequestId}`,
    "response_mode=fragment",
    `response_type=${params.response_type}`,
    "x-client-SKU=msal.js.browser",
    "x-client-VER=2.37.0",
    "client_info=1",
    `code_challenge=${params.codeChallenge}`,
    "code_challenge_method=S256",
    `nonce=${generateGUID()}`,
    `state=${randomString(20)}`,
  ].join("&")}`;

  const response = http.get(loginPageUrl);
  if (
    !check(response, {
      "loginPageUrl status was 200": (r) => r.status === 200,
    })
  ) {
    fail(`loginPageUrl failed for user, status was ${response.status}`);
  }
  if (response.status != 200) {
    console.log(response);
  }

  /// Parse the HTML response using k6/html
  const doc = parseHTML(response.body);

  // Find the script element containing the settings variable
  const scriptElement = doc.find("script").first();

  // Extract the text content of the script element
  const scriptContent = scriptElement.text();

  // Extract the value of the settings variable
  const settingsMatch = scriptContent.match(/var\s+SETTINGS\s+=\s+(.*?);/);

  let settingsValue;

  if (settingsMatch) {
    settingsValue = settingsMatch[1].trim();
    //console.log(settingsValue);
  } else {
    console.log("SETTINGS variable not found");
  }

  return settingsValue;
}

function getSelfAsseted(transId, username, password, csrfToken) {
  // 2nd post call
  const url = `https://devoio.b2clogin.com/devoio.onmicrosoft.com/${params.b2cPolicy}/SelfAsserted`;

  const selfAssertedUrl = `${url}?${[
    `tx=${encodeURIComponent(transId)}`,
    `p=${params.b2cPolicy}`,
  ].join("&")}`;

  //console.log(`selfAssretedUrl: ${selfAssertedUrl}`);

  // Define the form data
  const formData = {
    request_type: "RESPONSE",
    userName: username,
    password: password,
  };

  // Define the headers for the request
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    Accept: "application/json, text/javascript, */*; q=0.01",
    "accept-encoding": "gzip, deflate, br",
    "X-CSRF-TOKEN": csrfToken,
  };

  //console.log(`login user: ${username}`)

  const response = http.post(selfAssertedUrl, formData, { headers });

  const loginMessage = JSON.parse(response.body).message;
  const loginStatus = JSON.parse(response.body).status;

  if (
    !check(response, {
      "self asserted status was 200": (r) => r.status === 200,
    })
  ) {
    fail(
      `self asserted failed for user ${username}, status was ${response.status}`
    );
  }
  if (response.status != 200) {
    console.log(response);
  }
  return { user: username, status: loginStatus, message: loginMessage };
}

function confirmAndGetCode(csrfToken, transId) {
  const url = `https://devoio.b2clogin.com/devoio.onmicrosoft.com/${params.b2cPolicy}/api/CombinedSigninAndSignup/confirmed`;

  //const diags = '{"pageViewId":"009a2622-8ef1-4f3a-8caa-33773af39cb1","pageId":"CombinedSigninAndSignup","trace":[{"ac":"T005","acST":1684350982,"acD":2},{"ac":"T021 - URL:https://devoio.b2clogin.com/static/tenant/templates/AzureBlue/unified.cshtml?slice=001-000&dc=MEL","acST":1684350982,"acD":70},{"ac":"T029","acST":1684350982,"acD":6},{"ac":"T019","acST":1684350982,"acD":9},{"ac":"T004","acST":1684350982,"acD":1},{"ac":"T003","acST":1684350982,"acD":1},{"ac":"T035","acST":1684350982,"acD":0},{"ac":"T030Online","acST":1684350982,"acD":0},{"ac":"T002","acST":1684350992,"acD":0},{"ac":"T018T010","acST":1684350991,"acD":456}]}'
  const confirmUrl = `${url}?${[
    "rememberMe=false",
    `csrf_token=${encodeURIComponent(csrfToken)}`,
    `tx=${encodeURIComponent(transId)}`,
    `p=${params.b2cPolicy}`,
    //`diags=${encodeURIComponent(diags)}`,
  ].join("&")}`;

  // Define the headers for the request
  const headers = {
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-encoding": "gzip, deflate, br",
  };

  const getCodeResponse = http.get(confirmUrl, { headers, redirects: 0 });
  if (
    !check(getCodeResponse, {
      "get code status was 200": (r) => r.status === 200 || r.status === 302,
    })
  ) {
    fail(`get code failed for user , status was ${getCodeResponse.status}`);
  }
  if (getCodeResponse.status != 200 && getCodeResponse.status != 302) {
    console.log(getCodeResponse);
  }

  const responseUrl = getCodeResponse.headers.Location;

  const urlParams = new URLSearchParams(responseUrl.split("#")[1]);
  const code = urlParams.get("code");

  if (code == null) {
    console.log("CODE_NULL:");
    console.log(getCodeResponse);
  }

  return code;
}

function getAccessToken(clientRequestId, code) {
  // Define the form data
  const formData = {
    client_id: params.clientId,
    redirect_uri: params.redirectUrl,
    scope: params.scope,
    code: encodeURIComponent(code),
    "x-client-SKU": "msal.js.browser",
    "x-client-VER": "2.37.0",
    "x-client-current-telemetry": "5|865,0,,,|@azure/msal-react,1.5.7",
    "x-client-last-telemetry":
      "5|0|863,64dbbbeb-dfa8-4e2d-b47c-d8a4fa33a829|state_not_found|1,0",
    code_verifier: params.codeVerifier,
    grant_type: "authorization_code",
    client_info: 1,
    "client-request-id": clientRequestId,
    "X-AnchorMailbox": `Oid:5c836871-4407-422d-ab6a-550b7eedc158-${params.b2cPolicy}@99a1ad0a-315f-4f4e-aec2-72e9588565a0`,
  };

  // Define the headers for the request
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    Accept: "*/*",
    "accept-encoding": "gzip, deflate, br",
  };

  const response = http.post(params.token_endpoint, formData, {
    headers,
  });

  if (!check(response, { "token status was 200": (r) => r.status === 200 })) {
    fail(`failed in getting token, status was ${response.status}`);
  }
  if (response.status != 200) {
    console.log(response);
  }

  const body = response.body;
  const accessToken = JSON.parse(body).access_token;
  const refreshToken = JSON.parse(body).refresh_token;

  return { access_token: accessToken, refresh_token: refreshToken };
}

function getUserInfo(token) {
  const userinfo_endpoint = `${params.userInfoEndPoint}?${[
    `p=${params.b2cPolicy}`,
  ].join("&")}`;

  const response = http.get(userinfo_endpoint, {
    headers: {
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br",
      Authorization: `Bearer ${token.access_token}`,
    },
  });
  //console.log(response);
  if (
    !check(response, {
      "user info status was 200": (r) => r.status === 200,
    })
  ) {
    fail(`user info token status was ${response.status}`);
  }
  if (response.status != 200) {
    console.log(response);
  }
}

function refreshToken(clientRequestId, token) {
  const formData = {
    client_id: params.clientId,
    scope: params.scope,
    grant_type: "refresh_token",
    client_info: 1,
    "x-client-SKU": "msal.js.browser",
    "x-client-VER": "2.37.0",
    "x-ms-lib-capability": "retry-after, h429",
    "x-client-current-telemetry": "5|865,0,,,|@azure/msal-react,1.5.7",
    "x-client-last-telemetry": "5|1|||0,0",
    "client-request-id": clientRequestId,
    refresh_token: token.refresh_token,
    "X-AnchorMailbox": `Oid:5c836871-4407-422d-ab6a-550b7eedc158-${params.b2cPolicy}@99a1ad0a-315f-4f4e-aec2-72e9588565a0`,
  };

  // Define the headers for the request
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    Accept: "*/*",
    "accept-encoding": "gzip, deflate, br",
  };

  const response = http.post(params.token_endpoint, formData, {
    headers,
  });

  if (
    !check(response, {
      "refresh token status was 200": (r) => r.status === 200,
    })
  ) {
    fail(`refresh token status was ${response.status}`);
  }
  if (response.status != 200) {
    console.log(response);
  }
  const body = response.body;
  const accessToken = JSON.parse(body).access_token;
  const refreshToken = JSON.parse(body).refresh_token;

  return { access_token: accessToken, refresh_token: refreshToken };
}

function logout(token) {
  const logoutUrl = `${params.end_session_endpoint}?${[
    `id_token_hint=${token.id_token}`,
    `post_logout_redirect_uri=${encodeURIComponent(params.redirectUrl)}`,
  ].join("&")}`;
  const response = http.get(logoutUrl, { redirects: 0 });
  if (
    !check(response, {
      "logout status was 200 or 302": (r) =>
        r.status === 302 || r.status === 200,
    })
  ) {
    fail(`user info token status was ${response.status}`);
  }
  if (response.status != 200 && response.status != 302) {
    console.log(response);
  }
}

export default function () {
  const randomUser = randomItem(users)[0];
  //console.log(`USER: ${randomUser}`);

  const clientRequestId = generateGUID();

  // Calculate the login interval for each VU
  const loginInterval = (60 * 1000) / 20; // 20 users per minute

  // Wait for the calculated login interval
  sleep(loginInterval);

  const settingsValue = b2cPolicyLoginPage(clientRequestId);

  let csrf;
  let transId;

  if (JSON.parse(settingsValue).hasOwnProperty("csrf")) {
    csrf = JSON.parse(settingsValue).csrf;
  } else {
    console.log("csrf not Found");
    return;
  }

  if (JSON.parse(settingsValue).hasOwnProperty("transId")) {
    transId = JSON.parse(settingsValue).transId;
  } else {
    console.log("transId not Found");
    return;
  }

  // user login
  sleep(randomIntBetween(5, 10)); // simulate user taking time entering username and password

  const loginResponse = getSelfAsseted(
    transId,
    randomUser,
    params.password,
    csrf
  );

  //check if login is successful
  if (loginResponse.status != 200) {
    console.log(loginResponse);
    return;
  }

  const code = confirmAndGetCode(csrf, transId);

  // user gets redirected to the application after successful login, which will exchange session code with token
  sleep(randomIntBetween(5, 10)); // simulate application load
  let token = getAccessToken(clientRequestId, code);

  // application UI retrieves user info

  getUserInfo(token);

  // simulates the user using the application for 10-40 minutes, during which the application would refresh token and
  // user info every 4.3 minutes
  let sessionLengthSeconds = randomIntBetween(10, 40) * 60;
  const secondsBetweenRefreshToken = 60 * 4;
  while (sessionLengthSeconds > secondsBetweenRefreshToken) {
    sleep(secondsBetweenRefreshToken);

    token = refreshToken(clientRequestId, token);

    getUserInfo(token);

    sessionLengthSeconds -= secondsBetweenRefreshToken;
  }
  sleep(sessionLengthSeconds);

  // simulate only a small percentage of user explicitly log out (the rest would simply close their browser)
  if (randomIntBetween(1, 10) === 1) {
    logout(token);
  }
}
