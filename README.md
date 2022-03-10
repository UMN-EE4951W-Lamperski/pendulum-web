# Lamperski Inverted Pendulum - Web

[![GitHub Actions](https://github.com/RosstheRoss/4951w-pendulum/actions/workflows/node.yml/badge.svg)](https://github.com/RosstheRoss/4951w-pendulum/actions/workflows/node.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/UMN-EE4951W-Lamperski/pendulum-web/badge.svg)](https://snyk.io/test/github/UMN-EE4951W-Lamperski/pendulum-web)

An complete rewrite of the web application for Professor Andrew Lamperski's Remotely Accessible Inverted Pendulum, in TypeScript.

## TODO

- Feature parity with the original web application.
  - This includes running the python scripts like the Flask app did.
- Login with the University's Shibboleth system.
- Add the livestreaming feature.
- **Improve the readme.**

## Structure

The structure of the repository is as follows:

```
├── src (folder)
│ ├── public (folder)
│ │ ├── css (where all CSS files are stored)
│ │ │ └── style.css (the main CSS file)
│ | ├── js (where all on-site JavaScript files are stored)
│ | │ └── form.js (JavaScript for the form's AJAX requests)
│ | └── img (Images for the website)
| |   └── site-logo.png (the logo for the website, used as a favicon and in the about page)
│ ├── routes (folder)
│ | └── api.ts (the API endpoints)
│ ├── views (folder)
│ │ ├── pages (Template files for the main static pages)
│ │ └── partials (Boilerplate used by every static page)
| └── index.ts (the entry point, where the static content is served)
└── README.md (what you are currently reading)
```
