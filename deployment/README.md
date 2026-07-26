# Mrs Honey Deployment

Mrs Honey is deployed as a long-running `service`. GitHub and the exact product-freeze commit are the source of truth.

## Runtime boundary

The productive `_services` directory is a clean detached Git worktree at the
exact product-freeze commit. This lets the Control Center verify both the commit
and the clean release state without making the app dependent on the Control
Center.

`deployment/build_release.py` remains the audit/build helper that proves the
minimal runtime boundary and creates a portable package containing only:

- `index.html`, CSS, runtime JavaScript, manifests and service worker
- `assets/` and `data/`
- the integrated Python app and speech server

Reference material, generation tools, editor pages, Avatar Lab, repository metadata and local models are not published.

Example:

```bash
python deployment/build_release.py \
  --destination "C:\Users\Julius Herrmann\Coding Projects\_services\Mrs_Honey\<commit>" \
  --commit "<commit>"
```

The generated `RELEASE.json` records every runtime file with its size and
SHA-256 hash. It is not used as the productive `_services` checkout because the
standard Control Center service contract requires Git commit evidence there.

## Beelink contract

- App service: `BeelinkApp-MrsHoney`
- Tunnel service: `BeelinkTunnel-MrsHoney`
- Loopback origin: `http://127.0.0.1:5900`
- Public URL: `https://mrshoney.jujies.app`
- Runtime: `C:\Users\Julius Herrmann\Coding Projects\_runtime\Mrs_Honey`
- Service wrappers: `C:\ProgramData\Beelink\Services\mrs-honey` and `C:\ProgramData\Beelink\Tunnels\mrs-honey`

App and tunnel are separate automatic Windows services and must remain operational without the Control Center. Templates under `deployment/windows/` contain no credentials. The named-tunnel credential belongs only in the ACL-protected ProgramData tunnel directory.

The Control Center integration is status-only. It observes the pinned release, readiness endpoint, Windows services, tunnel and registered logs; it does not host or parent the app.

The Beelink benchmark selected `ggml-base.en.bin` for production: four
representative vocabulary words were recognized correctly with materially lower
latency than `ggml-small.bin`. The small model remains a checksum-pinned fallback.
Exact runtime versions and hashes are recorded in
`deployment/windows/runtime-dependencies.json`.
