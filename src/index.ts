import "dotenv/config";
import app from "./app";
import { connectMongo } from "./db/mongo/client";
import logger from "./lib/logger";
import { PORT } from "./lib/constants";

async function main() {
  await connectMongo();
  app.listen(PORT, () => logger.info(`Backend running on port ${PORT}`));
}

main().catch((err) => {
  logger.error(err, "Startup failed");
  process.exit(1);
});
