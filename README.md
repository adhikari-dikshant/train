# HASSTRA — A journey, woven

An interactive clothing collection journal built with plain HTML, CSS, locally bundled Three.js 0.180.0, GSAP 3.13.0 and Lenis 1.3.27. No package installation is required.

## Preview and publish files

Run `python3 -m http.server 4173 --bind 127.0.0.1`, then open http://127.0.0.1:4173/. JavaScript modules require an HTTP server.

Run `node --test tests/*.test.mjs` for the route, scroll and map-zoom checks. Run `node scripts/build.mjs` to validate local asset references and regenerate `dist/`. The existing private Site identity is retained in `.openai/hosting.json`.

## Experience

- The opening railway ticket uses indigo twill, ecru lettering, tobacco stitching and coloured denim swatches. `assets/denim-weave.svg` is an original lightweight texture shared by the ticket and swatches.
- The itinerary continues the compartment setting with a stitched indigo card and a folded paper map. The map keeps its original geography and pin coordinates; `assets/paper-grain.svg` adds an original paper texture.
- The map zooms from 100% to 300% using the buttons, mouse wheel or keyboard (+, −, 0/Home, arrow keys). Drag to pan while enlarged. Pins keep readable labels; selecting a destination gently focuses the map before departure. Closing cancels that focus, and reopening resets the view. Reduced motion makes zoom immediate.
- Start your journey opens an India map. Select Jaipur or Ahmedabad as the starting point. The two-stop route then follows that order, visiting the other destination second. The bottom navigation jumps to either stop without changing that route.
- The shutter opens onto still countryside, ready for the visitor to scroll. Before the first stop, travel occupies 300 pixels of scrolling; the intercity sequence spans 600 pixels, including the return to the compartment. Scrolling moves the landscape, reveals the station and expands its collage. Pausing holds the scenery in place; there is no timed travel playback or scroll lock. Destination navigation starts at the selected leg’s travel section; the next-chapter button can advance that section in small steps.
- Intercity departure first restores the compartment, then moves the countryside through its window. The next station changes only while the scenery fully covers it. Scenery cruises briskly, then brakes progressively to a standstill before revealing the station; the collage expands only after that reveal finishes. All phases follow scroll in either direction, within the same short travel distance.
- The compartment disappears completely during the two cultural chapters and garment reveal. Intercity motion uses original SVG hills, villages, fields and railway poles, animated at different speeds. It works independently of WebGL and needs no video download or autoplay permission. Reduced motion keeps the travel layers still while scroll still controls arrival and the collage reveal.
- On arrival, independent transparent illustrations fly in from different directions, with staggered easing, slight rotation and depth. Architecture arrives first, followed by people, wildlife, flowers or kites. A panoramic regional landscape fills the whole view behind them; an additional botanical/textile foreground enters with the final group. Smaller figures leave room for distant architecture, water, hills and foliage, creating a continuous scenery collage. Scroll assembles the subjects; reverse scrolling unpacks them. They remain assembled during departure so the smooth compartment/scenery handoff is preserved. Reduced motion shows the assembled composition directly.
- The first chapter introduces the place. The second combines the collage and a supplied design sheet. The last introduces the garment and its own story page.
- Detail notes open as nonmodal side panels without a blurred or dimmed backdrop. On phones they become compact panels above the bottom route navigation.
- Every garment has a deep-linkable page (`#piece/jaipur`, `#piece/ahmedabad`), with supplied artwork and design notes. Returning preserves the journey position. There are no purchase buttons, prices, size selection or checkout.
- The next-chapter control also advances the scroll narrative by click/keyboard. Reduced motion removes timed animations, ambience is opt-in, and image fallbacks work without WebGL.
- Lenis smooths mouse-wheel scrolling and chapter navigation, synchronized with GSAP and the Three.js render loop. Touch keeps native scrolling. Smoothing pauses for the itinerary and detail panel; their own content remains scrollable. Story entry and return reset scroll momentum and preserve the journey position. Reduced motion uses native scrolling.
- The graphics buffer stays at the viewport size during zooming, avoiding repeated GPU buffer allocations. Chapter text and notebook fragments fade between states, and garment background shading follows scroll progress continuously.
- The existing `sutra-saved` browser data is left untouched. The old shopping-style interface has been removed from this story-only version.

## Assets and scope

This version implements the existing Jaipur / Rajasthan and Ahmedabad / Gujarat demonstration route. The complete collection, final garment names, final route and designer videos can be added when supplied; there is no placeholder video player. Working garment titles describe the supplied sheets and are not final commercial product names.

The brand logo is the supplied HASSTRA PNG. Garment images are compressed copies of the user's Drive artwork, not newly generated garment designs. See `docs/collection-assets.md` for the original file IDs and map attribution. The older illustrative shirt/jacket assets and the two superseded style layers have been removed.

The painted compartment is retained. Ten generated transparent cutouts and two panoramic backgrounds form the two Three.js collages, with subtle pointer parallax. The original complete regional images remain the static fallback if WebGL or cutout loading fails. They are illustrations, not documentary footage or a 3D compartment model. `docs/compartment-artwork.md` records the compartment art provenance; `docs/collage-cutouts.md` and `docs/scenic-collages.md` list the generated assets and prompts.

Google Fonts enhances typography, with local serif/sans-serif fallbacks. The animation libraries and all artwork are served with the site. No runtime Drive connection, API keys or server data are required.

Lenis is vendored from its official npm release; `vendor/lenis-LICENSE.txt` retains its MIT license. Integration follows the [official GSAP setup](https://github.com/darkroomengineering/lenis#gsap-scrolltrigger).

## Source

- `index.html`, `style.css`, `script.js`: interface and visual narrative.
- `journey-state.mjs`, `map-view.mjs`: fixed route, scroll chapters and bounded map zoom/pan calculations.
- `assets/`, `vendor/`: used artwork and locally bundled libraries.
- `tests/`, `scripts/build.mjs`: route checks and static output generation.
- `dist/`: generated publishing files.

The original `assets/travel-horizon.svg`, `travel-fields.svg` and `travel-foreground.svg` form the travel animation. Their positions and opacity follow the route’s scroll progress directly. Time-based travel keyframes and the timed interlude have been removed.
