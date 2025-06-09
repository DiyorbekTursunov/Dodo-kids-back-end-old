import express, { Express, Request, RequestHandler, Response } from "express";
import dotenv from "dotenv";
import "module-alias/register";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import departmentRoutes from "./routes/department.routes";
import colorRoutes from "./routes/color.routes";
import sizeRoutes from "./routes/size.routes";
import productRoutes from "./routes/product.routes";
import fileRoutes from "./routes/file.routes"; // Add this line
import productPackRoutes from "./routes/product_pack.routes";
import employeeRoutes from "./routes/employee.routes";
import {
  staticFilesMiddleware,
  serveFile,
} from "./middleware/static.middleware"; // Add this line
import outsourseCompanyRoutes from "./routes/outsourseCompany.routes";
import searchRouters from "./routes/search.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import filterRouters from "./routes/filters.routes";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: [
      "https://dodo-kids-back-end-xq7q.onrender.com",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Serve static files from the uploads directory
app.use("/uploads", staticFilesMiddleware);
app.get("/uploads/:filename", serveFile as RequestHandler);

// Health check route
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});

// Root route
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Welcome to the Dodo kids API" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/department", departmentRoutes);
app.use("/api/color", colorRoutes);
app.use("/api/size", sizeRoutes);
app.use("/api/files", fileRoutes); // Add this line
app.use("/api/products", productRoutes);
app.use("/api/product_pack", productPackRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/outsourse_company", outsourseCompanyRoutes);
app.use("/api/models", searchRouters);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/models", filterRouters);

// Error handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({ error: message });
});

// Start server
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
