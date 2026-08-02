import { setupServer } from "msw/node";

import { handlers } from "./handlers";

/**
 * The MSW server used by every test.
 *
 * Started in `setup.ts` with `onUnhandledRequest: "error"`, so a test that
 * accidentally hits an unmocked endpoint fails loudly instead of hanging.
 */
export const server = setupServer(...handlers);
