# Managed custom domains — release checklist

This local implementation is disabled by default. No DNS or Hosting changes happen in demo mode. Real domain requests use server-only Hosting credentials, per-business ownership TXT challenges, global transactional claims and fail-closed routing. One setup per owner; domain replacement and removal deliberately require support until safe teardown is implemented.

Before enabling production:

1. Deploy the domain callables to the same project as Hosting. Enable the Firebase Hosting API and grant the function service identity only the Hosting permissions needed to create/get custom domains. Never ship credentials to the browser.
2. Set function environment `CUSTOM_DOMAINS_ENABLED=true` and `CUSTOM_DOMAIN_SITE_ID=build-a-booking-ai`. Confirm the actual Hosting site ID before enabling.
3. Set build environment `VITE_CUSTOM_DOMAINS_ENABLED=true` and `VITE_PRIMARY_HOSTS` to a comma-separated list of every primary app hostname. Platform Firebase hosts and localhost are automatically excluded.
4. Review plan eligibility, billing/limits and abuse controls before release. Currently requests require a verified owner and published workspace; no paid entitlement is claimed or enforced.
5. Keep Firestore domain claims/routes server-only. Default-deny rules cover the top-level `customDomainClaims` and `customDomainRoutes` collections. Owner connection details live in their server-written private document.
6. Test a controlled subdomain with real DNS: exact challenge, TXT chunk handling, duplicate requests, other-owner conflict, provider records, SSL activation, edited hashes, unpublished workspace, reconnect/errors. Do not call integration complete until this succeeds.
7. Verify custom-host OAuth/email return URLs, analytics exclusion, CSP, checkout return links and public navigation. No implicit www alias: configure each address explicitly. Domain replacement/removal, plan enforcement, ongoing reconciliation and operator recovery remain release requirements.

Checks are user-triggered and limited to once per owner per 30 seconds; no timers/jobs or registrar credentials. Firebase returns the actual required records. Never hardcode DNS targets. SSL is considered ready only when host, ownership and certificate are active.

References: https://firebase.google.com/docs/hosting/custom-domain and https://firebase.google.com/docs/reference/hosting/rest/v1beta1/projects.sites.customDomains

Registrar logo sources: https://commons.wikimedia.org/wiki/File:GoDaddy_logo.svg and https://commons.wikimedia.org/wiki/File:Namecheap_Logo.svg. Marks remain their respective owners’ trademarks; inclusion does not imply partnership.
