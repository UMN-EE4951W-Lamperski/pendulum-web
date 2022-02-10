import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import path from 'path';
import { env } from 'process';
import helmet from 'helmet';
import csurf from 'csurf';
import cookieParser from 'cookie-parser';

const app = express();

// Middleware
const port: string = env.PORT || '2000';

app.use(cookieParser());
const csrf = csurf({ cookie: true });
const rateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 100, // allow 100 requests per 15 minutes, then...
    delayMs: 500 // begin adding 500ms of delay per request above 100:
    // request # 101 is delayed by  500ms
    // request # 102 is delayed by 1000ms
    // request # 103 is delayed by 1500ms
    // etc.
});
// This will be run behind an nginx proxy
app.enable('trust proxy');
//  apply to all requests
app.use(speedLimiter);
app.use('/api', rateLimiter);
app.use(helmet());

// Add ejs as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views/pages'));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', csrf, (req: Request, res: Response) => {
    res.render('index', {
        errors: [],
    });
});

app.get('/about', csrf, (req: Request, res: Response) => {
    res.render('about');
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});