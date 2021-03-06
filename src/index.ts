import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import path from 'path';
import { env } from 'process';
import api from './routes/api.js';
import saml from './routes/middleware/saml.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

/* MIDDLEWARE */

// Hide the software being used (helps security)
app.use(helmet());

// CSRF protection
app.use(cookieParser());
const csrf = csurf({ cookie: true });

// Rate limiting
const rateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 40, // Limit each IP to 40 requests per `window` (here, per 1 minute)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(rateLimiter);

// The API
app.use('/api/v1/', api);

/* RENDERING */

app.set('view engine', 'ejs'); // Add ejs as view engine
app.set('views', path.join(__dirname, 'views/pages')); // Set views directory (where the ejs is)
app.use('/public', express.static(path.join(__dirname, 'public'))); // Set static directory (where the static CSS/JS/images lie)

/* ROUTING */

app.get('/pendulum', csrf, saml, (req: Request, res: Response) => {
  res.render('index', { csrfToken: req.csrfToken() });
});
app.get('/', csrf, (req: Request, res: Response) => {
  res.render('about');
});
app.all('/login', csrf, (req: Request, res: Response) => {
  res.redirect('/api/v1/login');
});

// Start the server
const port = env.PORT || 2000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
