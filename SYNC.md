# Working between Desktop-48 and Rainbow Rig

Syncthing shares this project's source, authored assets, and adaptation files
in the **Pride Humility** folder (folder ID `pride-humility`).

- Desktop-48: `C:\Users\ABC\AppData\Roaming\reasonix\global-workspace\pride-humility`
- Rainbow Rig: `C:\Users\marka\Desktop\pride-humility-overnight-20261010`

Open the corresponding folder in Codex on each computer. Work on one computer
at a time and wait for Syncthing to show **Up to Date** before switching.
Save editor buffers before leaving a computer; Syncthing transfers saved files.

Each computer has its own `.stignore`, Git database, dependencies, build output,
and local credentials. Run `npm ci` separately when dependencies change.
The public Worker URL in `.env.production` is shared; local secret files are not.
Syncthing keeps five older versions of files changed or deleted by the other
computer, available through its Restore Versions interface.

GitHub remains the version-history backup. The combined game started on branch
`codex/rainbow-desktop-sync`, commit `81c0bb7`. Git commits, branches, and chat
history do not synchronize through this folder. A commit made on one computer
can therefore appear as uncommitted file changes on the other.

Commit and push from Desktop-48 for a single place to maintain game history.
Pause this Syncthing folder on both computers before independently changing
branches or restoring older versions of the project, since those operations
also change the shared files. Resolve any `.sync-conflict-*` copies before
continuing work on the affected files.
