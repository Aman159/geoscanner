# Geo Excavation AR

A zero-backend, mobile-first web app that overlays a conceptual 3D subsurface profile on the live camera view. It requests GPS and orientation data, queries the free Macrostrat public API for regional geologic context, and renders an indicative layered model with Three.js.

## Important limitation

This application does **not** see through soil and must never be used to authorize excavation, locate utilities, identify voids, or replace approved drawings, geotechnical investigations, utility locator services, ground-penetrating radar, permits, or a competent person's assessment. Public geology is regional and may be incomplete or unavailable.

## Features

- Rear-camera stream with mobile permissions
- High-accuracy browser geolocation
- Device heading and tilt response
- Public Macrostrat geology lookup, with transparent fallback
- Three.js conceptual layered profile
- Depth visualization control
- Installable PWA shell and offline caching for app assets
- No API key, backend, account, or paid cloud resource required

## Run locally

Camera and geolocation require a secure context. `localhost` is allowed for development.

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080` on the development machine. For a phone, deploy to HTTPS first.

## Deploy free with GitHub Pages

1. Create a public GitHub repository.
2. Upload every file from this folder to the repository root.
3. Open **Settings > Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`, then save.
6. Open the generated HTTPS Pages URL on a phone and select **Start camera + scan**.

## Data and packages

- Macrostrat API: regional geological map context, CC BY 4.0. Add source attribution if publishing derived results.
- Three.js: loaded from jsDelivr CDN under its open-source license.
- Browser APIs: MediaDevices, Geolocation, and DeviceOrientation.

## Production hardening

For a real excavation workflow, replace the conceptual model with authoritative site-owned data such as surveyed utility GIS, approved as-builts, BIM/IFC, boreholes, and geotechnical logs. Add authentication, data provenance, uncertainty envelopes, coordinate-system validation, audit logs, and a formal safety review. A phone camera and free public APIs alone cannot provide excavation-grade subsurface detection.
