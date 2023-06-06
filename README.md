# Azure B2C POC

Components

- `mock-user-store` - a Node.JS REST API service that provides a mocked user backend for B2C custom policy to validate
  users against.

  Note - this gets deployed to free service hosting at back4app.com and available to consume at https://mockuserstore1-jweng.b4a.run/

- `policy` - Azure B2C custom policies

- `demo-client` - React SPA that demos Azure B2C login

  Run `npm i` & `npm run dev` to run it locally
