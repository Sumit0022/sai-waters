import localtunnel from "localtunnel";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";

const PORT = 3000;
const SUBDOMAIN = `sai-waters-${Math.random().toString(36).substring(2, 6)}`;

console.log("\n=======================================================");
console.log("   SAI WATERS ERP — SECURE DRIVER REMOTE TUNNEL        ");
console.log("=======================================================\n");
console.log(`Connecting localhost:${PORT} to secure public HTTPS tunnel...`);

try {
  const tunnel = await localtunnel({ port: PORT, subdomain: SUBDOMAIN });

  const driverUrl = `${tunnel.url}/driver`;
  console.log("\n[SUCCESS] TUNNEL IS LIVE!");
  console.log(`- Base Public URL:  ${tunnel.url}`);
  console.log(`- Driver PWA URL:   ${driverUrl}`);
  console.log("\nShow this URL to your drivers or let them scan the QR code below on their smartphones:\n");

  const qrTerminal = await QRCode.toString(driverUrl, { type: "terminal", small: true });
  console.log(qrTerminal);

  // Write active tunnel URL to data/active-tunnel.json so the web app can read it
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(dataDir, "active-tunnel.json"),
    JSON.stringify({
      active: true,
      url: tunnel.url,
      driverUrl,
      startedAt: new Date().toISOString(),
    }, null, 2)
  );

  console.log("\nPress Ctrl+C to close the tunnel.\n");

  tunnel.on("close", () => {
    console.log("Tunnel closed.");
    try {
      fs.unlinkSync(path.join(dataDir, "active-tunnel.json"));
    } catch (e) {}
    process.exit(0);
  });

  process.on("SIGINT", () => {
    tunnel.close();
    process.exit(0);
  });
} catch (err) {
  console.error("Failed to start tunnel:", err);
  process.exit(1);
}
