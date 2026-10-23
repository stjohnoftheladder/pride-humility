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

GitHub holds the version history, and `dev` is the one working branch: CI
tests every push to it and deploys it to https://pride-humility.pages.dev. Git
commits, branches, and chat history do not synchronize through this folder. A
commit made on one computer can therefore appear as uncommitted file changes on
the other.

Commit and push only from Desktop-48, in this folder, on `dev`. Rainbow edits
files and lets Syncthing carry them over; its own Git database is not used for
commits. Work done anywhere else, such as a cloud session or a temporary clone,
reaches this folder by being pushed to `dev` and then pulled here with
`git pull` (pause the folder first, as below). Before starting work, check that
`git status` here shows `dev` and that `git log origin/dev..` is empty.
Pause this Syncthing folder on both computers before independently changing
branches or restoring older versions of the project, since those operations
also change the shared files. Resolve any `.sync-conflict-*` copies before
continuing work on the affected files.

## adaptation/ backup

`adaptation/` holds research, scripts, plans and media that stay out of this
public repo. On Desktop-48 a separate Git database, `.adaptation-git` (ignored
here and by Syncthing), backs up its text files to a private repository. Media
(video, images, audio, archives) is deliberately not backed up; the only media
worth keeping, the Chrysostom homily recordings, lives in this repo under
`public/assets/audio/chrysostom/`. Run `bash tools/backup-adaptation.sh` after
adaptation work; it commits whatever changed and pushes.
