import {
  AccountInfo,
  CacheLookupPolicy,
  IPublicClientApplication,
  InteractionRequiredAuthError,
  RedirectRequest,
} from "@azure/msal-browser";
import "./App.css";
import {
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
  useMsal,
} from "@azure/msal-react";
import { useQuery } from "@tanstack/react-query";

const loginRequest: RedirectRequest = {
  scopes: [
    "https://devoio.onmicrosoft.com/landonline-api/Landonline.All",
    "https://devoio.onmicrosoft.com/landonline-api/Search.Read",
  ],
};
const Login: React.FC = () => {
  // const { login } = useMsalAuthentication(
  //   InteractionType.Redirect,
  //   loginRequest
  // );
  const { instance } = useMsal();

  return (
    <button onClick={() => instance.loginRedirect(loginRequest)}>Log In</button>
  );
};

async function getUserInfo(
  instance: IPublicClientApplication,
  account: AccountInfo
): Promise<any> {
  let token: string | undefined;
  try {
    const result = await instance.acquireTokenSilent({
      ...loginRequest,
      account,
      cacheLookupPolicy: CacheLookupPolicy.Default,
    });
    token = result.accessToken;
  } catch (e) {
    console.log("silent token acquisition fails.");
    if (e instanceof InteractionRequiredAuthError) {
      console.log("acquiring token using redirect");
      try {
        const result = await instance.acquireTokenPopup(loginRequest);
        token = result.accessToken;
      } catch (e) {
        console.error(e);
      }
    } else {
      console.error(e);
    }
  }

  if (token) {
    return await fetch(
      "https://devoio.b2clogin.com/devoio.onmicrosoft.com/openid/v2.0/userinfo?p=b2c_1a_usernameoradcustompolicy",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  }
}

const SignedInUserInfo: React.FC<{ account: AccountInfo }> = ({ account }) => {
  const { instance } = useMsal();
  const { isLoading, error, data } = useQuery({
    queryKey: ["userinfo"],
    queryFn: () => getUserInfo(instance, account).then((res) => res.json()),
  });

  return (
    <>
      <div>Signed In User: {account.idTokenClaims?.displayName as string}</div>
      {isLoading ? <div>Loading...</div> : null}
      {error ? (
        <div>Error loading user info: {JSON.stringify(error)}</div>
      ) : null}
      {data ? (
        <ul>
          <li>userName: {data.userName}</li>
          <li>Name: {data.name}</li>
        </ul>
      ) : null}
    </>
  );
};

const SignedInUser: React.FC = () => {
  const { accounts } = useMsal();

  if (!accounts || accounts.length === 0) {
    return null;
  }

  console.log("account", accounts[0]);
  return <SignedInUserInfo account={accounts[0]} />;
};

const Page: React.FC = () => {
  const { instance } = useMsal();
  return (
    <>
      <SignedInUser />
      <button onClick={() => instance.logout()}>Log Out</button>
    </>
  );
};

function App() {
  return (
    <>
      <h1>B2C demo client</h1>
      <AuthenticatedTemplate>
        <Page />
      </AuthenticatedTemplate>
      <UnauthenticatedTemplate>
        <p>No users are signed in!</p>
        <Login />
      </UnauthenticatedTemplate>
    </>
  );
}

export default App;
