# Project: Harmonix Remote Access Setup
## Problem statement
You want a reliable way to access your development environment at `urbnpl4nn3r@PabloJ:~/dev/harmonix-pro-analyzer` from your iPad when away from home, using a terminal, without relying on a temporary Cloudflare tunnel that times out\.
## Current context
* Current working directory: `/home/urbnpl4nn3r/dev/harmonix-pro-analyzer/frontend`\.
* The main project you want to reach remotely appears to live under `~/dev/harmonix-pro-analyzer`\.
* You already have a Cloudflare account and have previously used a temporary Cloudflare tunnel, but that solution was unstable for long sessions\.
## High\-level approach
* Create a separate infrastructure project dedicated to remote access configuration and automation\.
* Use a persistent Cloudflare Tunnel associated with your Cloudflare account \(not the temp/"quick" tunnel\), exposing SSH on your dev machine\.
* Store configuration and helper scripts in a git repository so you can iterate and keep a history of changes\.
* Document how to connect from the iPad \(e\.g\., using a terminal app or SSH client\) and how to rotate credentials safely\.
## Proposed project layout
* New project directory: `~/dev/harmonix-remote-access`
* Inside this project:
    * `README.md`: Explains overall architecture, prerequisites, and setup steps\.
    * `cloudflare/`
        * `tunnel-setup.sh`: Script to create/configure a named Cloudflare Tunnel tied to your account\.
        * `tunnel-config.yml`: Example or generated configuration mapping a hostname \(or Cloudflare\-assigned URL\) to local SSH \(`localhost:22`\)\.
    * `ssh/`
        * `hardening-notes.md`: Short notes on SSH keys, disabling password login, etc\.
    * `.gitignore`: Standard Node/Unix/OS junk ignores, plus anything sensitive you choose not to track\.
## Key design choices
* **Persistent tunnel vs\. temp tunnel**: Use `cloudflared tunnel` with a named tunnel stored in your Cloudflare account\. This should keep working even when you are away, as long as `cloudflared` is running as a service on your PC\.
* **Security model**: Prefer SSH key\-based auth\. Limit which users can log in \(likely just `urbnpl4nn3r`\) and consider restricting to a dedicated group\.
* **Service management**: Long term, run `cloudflared` as a systemd service or equivalent so the tunnel survives reboots\. Initial project setup will focus on config and scripts; you can later wire these into systemd\.
* **iPad client**: Any SSH\-capable terminal app can be used; the project will document connection details \(hostname, port, key usage\) rather than automate the iPad side\.
## Implementation steps
* Create `~/dev/harmonix-remote-access` and initialize it as a git repository\.
* Add an initial `README.md` describing goals and a high\-level setup flow\.
* Add a `.gitignore` and empty/templated `cloudflare/tunnel-config.yml` and `cloudflare/tunnel-setup.sh` files\.
* Optionally add `ssh/hardening-notes.md` with guidance about SSH key setup\.
* Later, extend scripts to:
    * Log into Cloudflare \(`cloudflared tunnel login`\)\.
    * Create a named tunnel and configure it\.
    * Register a DNS record or use generated hostname for SSH access\.
    * Configure `cloudflared` to run automatically on boot\.
