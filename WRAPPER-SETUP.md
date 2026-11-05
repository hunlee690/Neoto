# Neoto website wrapper

The website starts the Unity build immediately from the existing `Build` folder. Website files live at the repository root and in `site-assets`, so a game update does not need to replace them.

## Update the game safely

Build Unity into a separate folder. Then run:

```powershell
.\Update-NeotoGame.ps1 -UnityWebBuild "C:\path\to\new\webgl\build"
```

The helper copies only the four Neoto build files and optional `NpcData`. It does not replace `index.html`, policy pages, ad configuration or styling.

## Enable display ads after approval

1. Add the approved AdSense client and slot IDs to `site-assets/ads-config.js`.
2. Change `enabled` to `true`.
3. Copy the exact AdSense ads.txt line into a new root file named `ads.txt`. The included `ads.txt.example` is only a template and must not be published as a real authorization record.
4. Configure Google Privacy & Messaging or another Google-certified CMP before personalized ads are served in regions where it is required.

Standard banners remain outside the Unity canvas and the desktop game rail only appears on sufficiently wide screens. H5 Games interstitial and rewarded ads stay disabled until the AdSense H5 Games program approves the site.
