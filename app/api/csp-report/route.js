import { createCspReportHandler } from "../../../lib/security/cspReport.js";

// Receives CSP violation reports (`report-uri` and Reporting API `report-to`).
// State for rate limiting and de-duplication is per server instance.
export const POST = createCspReportHandler();
