import BasicAuthenticator from 'umn-shib-nodejs';
import { Request, Response, NextFunction } from 'express';

/**
 * Express Middleware to check if the user is authenticated with Shibboleth, wraps {@link isLoggedIn}
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export default function saml(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authenticator = new BasicAuthenticator(req, res);
  if (isLoggedIn(req)) next();
  else res.redirect(authenticator.buildLoginURL());
}

/**
 * A much simpler way to respond to a user that is not logged in for API calls.
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export function saml_api(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (isLoggedIn(req)) next();
  else res.status(401).json({ error: 'Not logged in.' });
}

/**
 * Rudimentary check to see if the user is logged in by checking if the user has a session cookie
 * @param req Express request object
 * @returns true if the user is logged in, false otherwise
 */
function isLoggedIn(req: Request): boolean {
  /* 
    Shibboleth token always contains _shibsession_, so we can check for that
    Is this a good way to check if the user is logged in?
    Not even slightly.
    But it works.
  */
  const cookies = JSON.stringify(req.cookies);
  return cookies.includes('_shibsession_');
}
