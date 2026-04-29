import app from "./app.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  const lastUpdate = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "full", 
    timeStyle: "medium" 
  });

  console.log(`🟢 Silane Server (Foundry Gateway) is running on port ${PORT}`);
  console.log(`📅 Last Start/Update: ${lastUpdate} WIB`);
});