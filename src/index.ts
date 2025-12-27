import cors from "cors";
import "dotenv/config";
import express from "express";
import energyGenerationRecordRouter from "./api/energy-generation-record";
import { globalErrorHandler } from "./api/middlewares/global-error-handling-middleware";
import { loggerMiddleware } from "./api/middlewares/logger-middleware";
import { connectDB } from "./infrastructure/db";
import { initializeEnergyCron } from "./infrastructure/energy-generation-cron";
import weatherRouter from "./api/weather";

const server = express();
server.use(cors({ origin: "https://fed-4-front-end-chathum.netlify.app" }));

server.use(loggerMiddleware);

server.use(express.json());

server.use("/api/energy-generation-records", energyGenerationRecordRouter);
server.use("/api/weather", weatherRouter);

server.use(globalErrorHandler);

connectDB();
initializeEnergyCron();

const PORT = process.env.PORT || 8001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
