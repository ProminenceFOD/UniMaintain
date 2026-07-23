import { INITIAL_REQUESTS, USERS } from "../src/data/mockData";

async function main() {
  console.log("Mock requests synced:", INITIAL_REQUESTS.length);
}

main().catch(console.error);
