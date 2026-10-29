# HASSTRA — A journey, woven

An interactive clothing collection journal built with plain HTML, CSS, locally bundled Three.js 0.180.0, GSAP 3.13.0 and Lenis 1.3.27. No package installation is required.

## Preview and publish files

Run `python3 -m http.server 4173 --bind 127.0.0.1`, then open http://127.0.0.1:4173/. JavaScript modules require an HTTP server.

Run `node --test tests/*.test.mjs` for route, scroll, map-zoom, page-route and hotspot-coordinate checks. Run `node scripts/build.mjs` to validate local asset references and regenerate `dist/`. The existing private Site identity is retained in `.openai/hosting.json`.

## Experience

- The opening is a restrained indigo journal in the painted compartment, with cream editorial typography and a muted bronze accent. The itinerary and garment panels share this navy/cream/chocolate palette; story and collection pages use warm paper backgrounds. The existing Caslon and DM Sans remain working fonts pending the client’s final type choice.
- The itinerary continues the compartment setting with an indigo panel and a warm paper map. The map keeps its original geography and pin coordinates; `assets/paper-grain.svg` adds an original paper texture.
- The map zooms from 100% to 300% using the buttons, mouse wheel or keyboard (+, −, 0/Home, arrow keys). Drag to pan while enlarged. Pins keep readable labels; selecting a destination gently focuses the map before departure. Closing cancels that focus, and reopening resets the view. Reduced motion makes zoom immediate.
- Start your journey first opens a short, skippable explanation of the train and scroll interaction, including direct collection browsing. The header’s Our journey button reopens it. Continuing opens an India map. Select Jaipur or Ahmedabad as the starting point. The two-stop route then follows that order, visiting the other destination second. The bottom navigation jumps to either stop without changing that route.
- The shutter opens onto still countryside, ready for the visitor to scroll. Before the first stop, travel occupies 300 pixels of scrolling; the intercity sequence spans 600 pixels, including the return to the compartment. Scrolling moves the landscape, reveals the station and expands its collage. Pausing holds the scenery in place; there is no timed travel playback or scroll lock. Destination navigation starts at the selected leg’s travel section; the next-chapter button can advance that section in small steps.
- Intercity departure first restores the compartment, then moves the countryside through its window. The next station changes only while the scenery fully covers it. Scenery cruises briskly, then brakes progressively to a standstill before revealing the station; the collage expands only after that reveal finishes. All phases follow scroll in either direction, within the same short travel distance.
- The compartment disappears completely during the two cultural chapters and garment reveal. Intercity motion pans one generated photographic countryside panorama through the window. The long image contains fields, trees, village houses and hazy hills; it works independently of WebGL and needs no video download or autoplay permission. Reduced motion holds the panorama still while scroll still controls arrival and the collage reveal. See `docs/travel-panorama.md` for provenance and the full prompt.
- On arrival, independent transparent illustrations fly in from different directions, with staggered easing, slight rotation and depth. Architecture arrives first, followed by people, wildlife, flowers or kites. A panoramic regional landscape fills the whole view behind them; an additional botanical/textile foreground enters with the final group. Smaller figures leave room for distant architecture, water, hills and foliage, creating a continuous scenery collage. Scroll assembles the subjects; reverse scrolling unpacks them. They remain assembled during departure so the smooth compartment/scenery handoff is preserved. Reduced motion shows the assembled composition directly.
- The first chapter introduces the place. The second combines the collage and a supplied design sheet. The last introduces the garment and its own story page.
- Detail notes open as nonmodal side panels without a blurred or dimmed backdrop. On phones they become compact panels above the bottom route navigation.
- Both the immersive journey and the direct collection (`#collection`) lead to the same deep-linkable garment pages (`#piece/jaipur`, `#piece/ahmedabad`). Three hotspots per piece stay aligned to the supplied image when it resizes or letterboxes; each opens a focused crop and its own detail note. Stories include place imagery, three detail studies, original notebook artwork and restrained scroll reveals. Returning preserves the journey position. There are no purchase buttons, prices, size selection or checkout.
- Interest registration appears at the end of each story and is intentionally inactive at the user’s request. The disabled form states “Interest registration opens soon.” No email is collected, stored or sent. No backend or mailing-service integration was added.
- The next-chapter control also advances the scroll narrative by click/keyboard. Reduced motion removes timed animations, ambience is opt-in, and image fallbacks work without WebGL.
- Lenis smooths mouse-wheel scrolling and chapter navigation, synchronized with GSAP and the Three.js render loop. Touch keeps native scrolling. Smoothing pauses for the itinerary and detail panel; their own content remains scrollable. Story entry and return reset scroll momentum and preserve the journey position. Reduced motion uses native scrolling.
- The graphics buffer stays at the viewport size during zooming, avoiding repeated GPU buffer allocations. Chapter text and notebook fragments fade between states, and garment background shading follows scroll progress continuously.
- The existing `sutra-saved` browser data is left untouched. The old shopping-style interface has been removed from this story-only version.

## Assets and scope

This version implements the existing Jaipur / Rajasthan and Ahmedabad / Gujarat demonstration route. The complete collection, final garment names, final route and designer videos can be added when supplied; there is no placeholder video player. Working garment titles describe the supplied sheets and are not final commercial product names.

The brand logo is the supplied gold-and-denim HASSTRA / ARTISANS ALWAYS artwork, processed into a transparent PNG. The header and favicon share the updated asset; no blend mode changes its colours. Garment images are compressed copies of the user's Drive artwork, not newly generated garment designs. See `docs/collection-assets.md` for the original file IDs and map attribution. The older illustrative shirt/jacket assets and the two superseded style layers have been removed.

The painted compartment is retained. Ten generated transparent cutouts and two panoramic backgrounds form the two Three.js collages, with subtle pointer parallax. The original complete regional images remain the static fallback if WebGL or cutout loading fails. They are illustrations, not documentary footage or a 3D compartment model. `docs/compartment-artwork.md` records the compartment art provenance; `docs/collage-cutouts.md` and `docs/scenic-collages.md` list the generated assets and prompts.

Google Fonts enhances typography, with local serif/sans-serif fallbacks. The animation libraries and all artwork are served with the site. No runtime Drive connection, API keys or server data are required.

Lenis is vendored from its official npm release; `vendor/lenis-LICENSE.txt` retains its MIT license. Integration follows the [official GSAP setup](https://github.com/darkroomengineering/lenis#gsap-scrolltrigger).

## Source

- `index.html`, `style.css`, `script.js`: interface and visual narrative.
- `journey-state.mjs`, `map-view.mjs`, `piece-view.mjs`: fixed route, scroll chapters, bounded map zoom/pan, hash routes and contained-image hotspot coordinates.
- `assets/`, `vendor/`: used artwork and locally bundled libraries.
- `tests/`, `scripts/build.mjs`: route checks and static output generation.
- `dist/`: generated publishing files.

The generated `assets/travel-panorama.webp` replaces the three flat SVG travel layers. Its horizontal position and the existing window mask follow the route’s scroll progress directly. The cruise/braking curve and station handoff are unchanged; there is no timed travel playback or repeating image seam.
