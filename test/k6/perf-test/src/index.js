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

// const targetUserCount = 4000;

// export const options = {
//   // vus: 10,
//   // duration: '30s',
//   stages: [
//     { duration: "30m", target: targetUserCount },
//     { duration: "30m", target: targetUserCount },
//     { duration: "5m", target: 0 },
//   ],
// };

// export const options = {
//   // vus: 10,
//   // duration: '30s',
//   stages: [
//     { duration: "30s", target: 20 },
//     { duration: "1m30s", target: 10 },
//     { duration: "20s", target: 0 },
//   ],
// };

const users = new SharedArray("users", function () {
  // Load CSV file and parse it using Papa Parse
  return papaparse
    .parse(open("../users.csv"), { header: false })
    .data.filter((x) => x[0].length > 0); // filter out empty lines
});

const params = Object.assign(
  {
    codeChallenge: "k7ByXQcOKLWeMUkqlGrxrpuRPeb1LEWoJloI_fdRyE4",
    clientId: "b2787263-b02a-4229-8226-0253310339ee", //STEP-AUTH-POC   //"e3186101-d75a-4f8a-a3e9-173e3b602575",
    redirectUrl: "http://localhost:11001/", //"https%3A%2F%2Fjwt.ms",
    scope:
      "https://devoio.onmicrosoft.com/landonline-api/Landonline.All https://devoio.onmicrosoft.com/landonline-api/Search.Read openid profile offline_access",
    response_type: "code",
    authBaseUrl:
      "https://devoio.b2clogin.com/devoio.onmicrosoft.com/b2c_1a_needchangepasswordcustompolicy/v2.0/",
    password: "B2ctest1234",
    username: "test9",
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

function b2cPolicyLoginPage(openIdConfig) {
  const loginPageUrl = `${openIdConfig.authorization_endpoint}?${[
    `client_id=${params.clientId}`,
    `scope=${encodeURIComponent(params.scope)}`,
    `redirect_uri=${encodeURIComponent(params.redirectUrl)}`,
    `client-request-id=${generateGUID()}`,
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

  // console.log(openIdConfig)
  // console.log(`b2cBase: ${openIdConfig.authorization_endpoint}`);
  // console.log("B2c Policy Page URL:", loginPageUrl);

  const response = http.get(loginPageUrl);

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

function getSelfAsseted(transId, username, password) {
  // 2nd post call
  const url =
    "https://devoio.b2clogin.com/devoio.onmicrosoft.com/B2C_1A_NeedChangePasswordCustomPolicy/SelfAsserted";

  const selfAssertedUrl = `${url}?${[
    `tx=${encodeURIComponent(transId)}`,
    `p=B2C_1A_NeedChangePasswordCustomPolicy`,
  ].join("&")}`;

  console.log(`selfAssretedUrl: ${selfAssertedUrl}`);

  //--------------------------------------------------
  // Define the form data
  // const formData = {
  //   request_type: "RESPONSE",
  //   userName: username,
  //   password: password,
  // };

  // // Define the query string parameters
  // const queryParams = {
  //   tx: transId,
  //   p: "B2C_1A_NeedChangePasswordCustomPolicy",
  // };

  // // Define the headers for the request
  // const headers = {
  //   "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  //   Accept: "application/json, text/javascript, */*; q=0.01",
  //   "accept-encoding": "gzip, deflate, br",
  // };

  // const loginResponse = http.post(selfAssertedUrl, formData, { headers });

  //--------------------------------------------------
  const loginResponse = http.post(
    selfAssertedUrl,
    [
      `username=${username}`,
      `password=${password}`,
      "request_type=RESPONSE",
    ].join("&"),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "accept-encoding": "gzip, deflate, br",
      },
      redirects: 0,
    }
  );
  //--------------------------------------------------

  console.log(loginResponse);

  if (
    !check(loginResponse, { "login status was 302": (r) => r.status === 302 })
  ) {
    fail(
      `login failed for user ${username}, status was ${loginResponse.status}`
    );
  }

  console.log(loginResponse);

  // confirm login 3rd post call
  // url : https://devoio.b2clogin.com/devoio.onmicrosoft.com/B2C_1A_NeedChangePasswordCustomPolicy/api/CombinedSigninAndSignup/confirmed
  // add parameters csrf_token
}

export default function () {
  // user visits application page, which would query for openid config
  const openIdConfig = getOpenIdConfig();

  // user gets redirected to the login pag  e
  sleep(1);

  const settingsValue = b2cPolicyLoginPage(openIdConfig);

  const csrf = JSON.parse(settingsValue).csrf;
  const transId = JSON.parse(settingsValue).transId;
  console.log(`transId: ${transId}`);

  // user login
  sleep(randomIntBetween(5, 10)); // simulate user taking time entering username and password
  getSelfAsseted(transId, params.username, params.password);
}
