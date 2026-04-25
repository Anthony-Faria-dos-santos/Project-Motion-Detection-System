# Security Policy

Thanks for helping keep **MotionOps** and its users safe. This document explains how to report a vulnerability and what you can expect from us in return.

## Supported Versions

MotionOps is in active development. Security fixes are applied to the `main` branch and released as part of regular tagged versions. Older versions are not maintained.

| Version            | Supported          |
| ------------------ | ------------------ |
| `main` (latest)    | :white_check_mark: |
| Tagged `v2.x`      | :white_check_mark: |
| `V1/` (legacy)     | :x:                |

The `V1/` directory is kept as a historical reference of the original Python prototype and **will not receive security updates**. Please do not run it in production.

## Reporting a Vulnerability

**Please do not open public GitHub issues, pull requests, or discussions for security problems.** Public disclosure before a fix is available puts users at risk.

### Preferred channel — GitHub Private Vulnerability Reporting

The fastest and most secure way to report an issue is through GitHub's private advisory workflow:

1. Go to <https://github.com/Anthony-Faria-dos-santos/MotionOps/security/advisories/new>
2. Click **Report a vulnerability**
3. Fill in the form with as much detail as possible

This creates an encrypted, private channel between you and the maintainers.

### What to include in your report

To help us triage quickly, please provide as much of the following as you can:

- A clear description of the issue and the impact you believe it has
- The affected component (`apps/api`, `apps/web`, `apps/worker-cv`, a shared `packages/*`, infra/Docker, CI workflow, etc.)
- The version, commit SHA, or branch where you reproduced it
- Step-by-step reproduction instructions, ideally with a minimal proof of concept
- Any logs, screenshots, HTTP requests, or payloads that demonstrate the problem
- Your assessment of severity (CVSS vector welcome but not required)
- Whether the issue is already known publicly, and any deadline you have in mind for disclosure

## Our Commitments

When you report a vulnerability in good faith, we commit to:

- **Acknowledging your report within 72 hours** (business days, Europe/Paris time)
- **Providing an initial triage and severity assessment within 7 days**
- **Keeping you informed** of progress at least every 14 days until resolution
- **Crediting you** in the security advisory and release notes if you wish (or keeping you anonymous if you prefer)
- **Not pursuing legal action** against researchers acting in good faith and within the scope of this policy

Target resolution windows, depending on severity:

| Severity (CVSS)    | Target fix window |
| ------------------ | ----------------- |
| Critical (9.0–10)  | 3 days            |
| High (7.0–8.9)     | 7 days            |
| Medium (4.0–6.9)   | 15 days           |
| Low (< 4.0)        | Best effort       |

## Scope

The following are **in scope** for this policy:

- The MotionOps source code in this repository (`apps/`, `packages/`, `e2e/`, root tooling)
- Official Docker images built from this repository
- CI/CD workflows in `.github/workflows/`
- Default configuration shipped in the repo (compose files, `.env.example`, etc.)

The following are **out of scope**:

- The legacy `V1/` Python prototype
- Vulnerabilities in third-party dependencies that have already been disclosed upstream (please report them to the upstream project; you may still notify us so we can pin or patch)
- Issues that require a compromised host, physical access, or a malicious local user with elevated privileges
- Self-XSS, missing security headers without a demonstrable exploit, missing best-practice hardening with no concrete impact
- Denial-of-service via volumetric attacks, brute force, or rate-limit testing against any hosted instance you do not own
- Social engineering of maintainers or users
- Findings from automated scanners without a working proof of concept

## Safe Harbor

We consider security research conducted under this policy to be:

- Authorized in regard to any applicable anti-hacking laws, and we will not initiate or support legal action against you for accidental, good-faith violations
- Authorized in regard to applicable anti-circumvention laws, and we will not bring a claim against you for circumvention of technology controls
- Exempt from restrictions in our terms of service that would interfere with conducting security research, for the limited purpose of this policy

You are expected to:

- Make a good-faith effort to avoid privacy violations, data destruction, and interruption or degradation of our services
- Only interact with accounts you own or with explicit permission of the account holder
- Stop testing and report immediately if you encounter user data, credentials, or any sign of an existing compromise

## Coordinated Disclosure

We follow a **coordinated disclosure** model:

1. You report privately
2. We confirm, fix, and prepare a release
3. We publish a GitHub Security Advisory (and request a CVE when applicable)
4. We credit you, unless you prefer to stay anonymous
5. Public disclosure happens **after** users have a reasonable window to upgrade (typically 7 to 30 days after the patched release, depending on severity)

If we cannot reach an agreement on a disclosure timeline, we will work with you in good faith to find a reasonable path forward.

## Hardening & Dependencies

MotionOps uses several automated controls to reduce its attack surface:

- **Dependabot** for `npm`, `pip`, `docker`, `docker-compose`, and `github-actions` (see `.github/dependabot.yml`)
- **CI tests** (unit + optional E2E gated on `ENABLE_E2E`) on every pull request
- **Pinned base images** in Dockerfiles where possible
- **Least-privilege secrets** in GitHub Actions

If you spot a gap in any of these, a report through the channels above is very welcome.

## Out-of-Band Contact

For sensitive coordination (e.g., suspected active exploitation), you may request a PGP key or an alternative secure channel via the email address above.

---

Thank you for helping make MotionOps safer. Responsible disclosure makes a real difference for everyone running this project.
