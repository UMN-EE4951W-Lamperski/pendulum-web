import BasicAuthenticator from 'umn-shib-nodejs';
import { Request, Response, NextFunction } from 'express';

const saml = function (req: Request, res: Response, next: NextFunction): void {
  const authenticator = new BasicAuthenticator(req, res);
  if (!authenticator.hasSession()) {
    authenticator.redirectToLogin();
    next();
  }
  next();
};

export default saml;
