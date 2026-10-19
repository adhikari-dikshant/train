# SUTRA — Wear the journey

A working clothing-brand concept set inside an Indian train compartment. Built with locally bundled Three.js 0.180.0 and GSAP 3.13.0, plain HTML, CSS, and JavaScript. No installation or build step is required.

The current art direction follows the user's warm painted travel references: one central brass-framed window, tobacco-brown walls, olive upholstery, travel belongings, and a large olive opening ticket. `journey-design.css` controls this composition. `assets/heritage-compartment.jpg` is original generated compartment artwork; the ticket, interface, shutter, product cards and cultural hotspots are live HTML/CSS. A Three.js scene animates the collage outside the window, with CSS image fallbacks. GSAP closes and lifts the shutter, reveals the first collection, and animates the scroll-driven transitions. The illustrated countryside before departure is `assets/countryside.svg`.

## Preview

Run `python3 -m http.server 4173 --bind 127.0.0.1` from this directory and open http://127.0.0.1:4173. Use a server instead of opening the HTML as a file, because the Three.js scene uses JavaScript modules and local textures.

## The experience

- Start your journey closes the preview shutter, opens it, and brings independently animated collage panels into view as the train arrives in Jaipur.
- Scroll through the first stop, the moving scenery, and the arrival in Ahmedabad. The compartment stays fixed during the journey. The two station buttons and The itinerary dialog also navigate between stops.
- Each station reveals a garment concept. Look at the piece opens its details and size selector. Save this piece adds it to a browser-local bag; remove it from the bag at any time. This is a wishlist demo, with no payment or checkout.
- The two plus markers in the window open short design notes about the local visual references.
- Sound is off by default. The sound button enables a quiet, locally synthesized railway rhythm. It pauses when the browser tab is hidden.
- Phone layouts, keyboard controls, native accessible dialogs, reduced motion, and an image-based fallback for unavailable WebGL are included.
- The story section and footer are hidden initially. They become available after the final stop, through the “A little about these clothes” button or by continuing to the end of the journey. Scrolling before starting no longer reveals the story directly below the train.

## Replace with your brand

SUTRA, both garment designs, and the displayed prices are illustrative placeholders. Replace the product data in `script.js`, the garment illustrations in `assets/`, and the branding in `index.html`. The garment designs are not represented as existing products or artisan-made goods. The cultural imagery is a collage, rather than documentary footage. The opening ticket covers the central window; a painted countryside moves gently behind it before departure.

## Artwork

- `assets/heritage-compartment.jpg`: original painted compartment artwork created with the built-in image-generation tool. The complete final prompt and reference role are documented in `docs/compartment-artwork.md`.
- `assets/countryside.svg`: original code-native illustrated fields, hills and trees for the opening window.

- `assets/rajasthan-collage.jpg`: the Rajasthan reference collage recovered from the existing repository history.
- `assets/gujarat-collage.png`: original artwork generated using the built-in image-generation tool. Final prompt: “Use case: illustration-story. Asset type: wide panoramic artwork for the window of an Indian train on an editorial fashion website. Primary request: an exquisite layered mixed-media paper-cut travel collage of Ahmedabad and Gujarat, inspired by vintage Indian railway travel posters, hand-tinted architectural photography and screen printed textile patterns. Landscape composition around 3:2. At center and left a monumental intricately carved Adalaj stepwell and Ahmedabad old city carved wooden pol houses. On the right a woman in a traditional flowing rust red and indigo chaniya choli performing garba, tasteful and realistic. Overlapping foreground cutouts of bandhani fabric, mirrorwork embroidery, a small blue-green peacock, marigolds, and orange white green paper kites flying. Soft textured pale warm mint / cream sky with warm sun, terracotta sand and sage greenery at the bottom. Layered cutout edges with subtle paper shadows; rich warm brick red, coral, muted ochre, indigo and teal. Composition dense and art directed but with graceful breathing room in the upper middle. No letters, no text, no border, no train, no UI, no watermarks. Sophisticated handmade luxury fashion editorial, beautifully detailed.”
- `assets/jaipur-shirt.svg` and `assets/ahmedabad-jacket.svg`: original vector garment concept illustrations created for this prototype.

Google Fonts enhances the typography; local serif and sans-serif fallbacks are provided. Animation libraries and artwork are hosted with the site, rather than fetched from third-party script servers at runtime.

## Publishing

`dist/` contains a mirror of the static website. The hosting manifest retains this repository’s existing private Site identity. Source and deployed files should be updated together.

## Project files

- `index.html`, `script.js`: the current page and interactions.
- `style.css`, `compartment.css`, `journey-design.css`: shared styles, full-screen layout, and the active painted design. All three are used.
- `assets/`: only the images and illustrations referenced by the current site.
- `vendor/`: GSAP, ScrollTrigger, and the two Three.js modules required by the window scene.
- `docs/`: artwork provenance and the final generation prompt.
- `dist/`: the matching static publishing files.
- `.openai/hosting.json`: existing Site identity and publishing configuration.

Obsolete 3D room implementations, the unused optimized GLB, model-only helpers, and generated preview files have been removed. Git history retains the previously tracked versions.
