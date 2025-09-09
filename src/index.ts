import express from "express";
import "dotenv/config";
import cors from 'cors'
import authRouter from "./routes/auth.route.js";
import cookieParser from "cookie-parser";
import employerRouter from "./routes/employer.route.js";
import companyRouter from "./routes/company.route.js";
import JobRouter from "./routes/job.route.js";




const app = express()
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.ORIGIN,
    credentials: true,
 }));
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth',authRouter)
app.use('/api/employer',employerRouter)
app.use('/api/employer/companies',companyRouter)
app.use('/api/jobs',JobRouter)

app.listen(PORT,()=>{
    console.log(`Server running on http://localhost:${PORT}`);
});