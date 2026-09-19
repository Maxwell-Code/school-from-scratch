# The School From Scratch — Website Settings

Every setting the website uses lives in this file. The website reads only the grey code blocks; everything else (like this text) is notes for people, so write notes anywhere you like.

How to edit:

- Each setting looks like `NAME = value`, inside a code block (between lines of three backticks).
- Numbers are plain (`80`). Text and colors go in quotes (`"#ffffff"`).
- Save this file, then reload the page to see the change.
- If a code block has a mistake, just that block is skipped and its settings fall back to the built-in defaults (the browser console says which block).
- Settings only load when the site is served (on localhost or online), not when index.html is opened straight from the folder.

Sizes are in screen pixels at normal zoom. 96 pixels is about 1 inch.

## Gallery on / off

- `true` = the photo landscape: photos all around the menu, drag to move, zoom in and out, and the menu bar across the top.
- `false` = a plain, normal webpage: just the title and menu, centered, with no photos, no dragging, no zooming, and no menu bar.

(Type true or false with no quotes.)

```js
GALLERY_ENABLED = true
```

How visitors move around the photo landscape:

- `"read"` = a normal scrolling webpage: the browser scrolls it like any other site (mouse wheel, middle-click, scrollbar, keys, swiping on a phone). No dragging, no sideways movement, no zooming.
- `"explore"` = move in any direction by dragging, arrow keys, or swiping, and zoom in and out with the mouse wheel or a pinch.

```js
GALLERY_MODE = "read"
```

Read mode: how far above the Home position you can scroll, in pixels.
0 = the top of the page is where Home takes you.

```js
READ_MODE_SCROLL_ABOVE_HOME = 0
```

## Photos

Folder holding every image the site uses: the gallery photos and the
Venmo logo (relative to index.html).

```js
PHOTO_FOLDER = "images/"
PHOTO_SMALL_FOLDER = "images/small/"
```

Every photo to show. Browsers can't look inside a folder on their own,
so add each new photo's filename here, in quotes, followed by a comma.

Photos are shown small (a few hundred pixels across), so the site loads
small copies of them from the folder below instead of the originals: on a
first visit that's about 1.4 MB instead of 20 MB. Each small copy has the
same name with .jpg on the end. A photo with no small copy still shows,
using its original file, so after adding photos to the images folder ask
Claude to make the small copies (or delete the folder's contents to go back
to the originals). Leave the folder name empty ("") to always use the
originals.

```js
PHOTOS = [
  "children_on_an_oak_tree.jpg",
  "children_playing_in_the_mud.jpg",
  "Collaborating on building a school model.jpg",
  "forest_camp_comfort.jpeg",
  "libby_bowl_writing.jpg",
  "sfs_kids_at_work.jpeg",
  "sfs_tent_with_kids.jpeg",
  "tent_kids.jpg",
  "wood_sawing.jpg",
  "wooden_airplane.jpg",
]
```

Size range for photos, measured along each photo's longest side.
Every photo gets a random size somewhere in between.

```js
PHOTO_SIZE_SMALLEST = 110
PHOTO_SIZE_LARGEST = 270
```

How long a photo takes to fade in once it loads, in milliseconds.

```js
PHOTO_FADE_IN_MS = 500
```

## Spacing & density

Empty space around photos close to the menu. Each photo picks a random
amount in this range; two photos sit apart by the average of what they want.

```js
SPACING_NEAR_MENU_MIN = 15
SPACING_NEAR_MENU_MAX = 60
```

Photos go from crowded, to sparse, to nothing:

`menu -- crowded --| CROWDED_AREA_RADIUS -- thinning out --| PHOTOS_END_DISTANCE -- empty`

Both distances are in pixels, measured from the center of the menu.
At normal zoom a laptop screen shows about 700 pixels in each direction;
fully zoomed out it shows about three times that (around 2,000-3,000).

HOW GRADUAL IT FEELS comes mostly from the gap between these two numbers:
the bigger the gap, the slower the photos thin out. For an even slower
fade, raise PHOTOS_END_DISTANCE (try 20000 or 30000).

Photos stay fully crowded out to this distance.

```js
CROWDED_AREA_RADIUS = 1500
```

How full the crowded area is, from 0 to 100 (percent).
100 = as packed as the spacing above allows. 50 = about half as many
photos. The thinning-out area scales down along with it.

```js
CROWDED_AREA_DENSITY = 100
```

No photos appear past this distance.

```js
PHOTOS_END_DISTANCE = 12000
```

How the thinning is shaped between those two distances.
1 = thins out evenly the whole way.
Lower (0.5) = stays full longer, then drops off closer to the end.
Higher (2, 3) = thins out sooner, leaving a long, very sparse outer ring.

```js
FADE_CURVE = 1
```

Gaps between photos also widen as they thin out, reaching this many times
the near-menu spacing at the end distance. 1 = no widening.

```js
SPACING_AT_EDGE_MULTIPLIER = 3
```

How many random spots are tried per 1000x1000 pixel area when placing
photos. Higher = more tightly packed (up to the spacing rules above).

```js
PLACEMENT_TRIES = 250
```

Empty space kept between the menu and the nearest photos.

```js
MENU_CLEARANCE = 40
```

Change this to any other whole number for a completely different
(but still consistent) arrangement of photos. Or write
`LAYOUT_SEED = random`
(no quotes) to scatter the photos differently on every visit.

```js
LAYOUT_SEED = random
```

## Photo frames

Space between a photo and its border.

```js
FRAME_PADDING = 3
```

Thickness of the border line.

```js
FRAME_BORDER_WIDTH = 0
```

Border color, and the color of the padding around each photo
("transparent" = no visible frame; the padding is just a gap).

```js
FRAME_BORDER_COLOR = "rgba(255, 255, 255, 0.35)"
FRAME_FILL_COLOR = "transparent"
```

Rounded corners on the photos (true or false, no quotes).

```js
PHOTO_ROUNDED_CORNERS = true
```

How rounded. With PHOTO_CORNER_RADIUS_UNIT = "pixels" this is a size in
pixels (0 = square, 12 = gently rounded, 30 = very round). With "percent"
it's a percentage of each photo's shorter side, so big and small photos
look equally round (50 = as round as possible).

```js
PHOTO_CORNER_RADIUS = 15
PHOTO_CORNER_RADIUS_UNIT = "pixels"
```

## Zoom & movement

How far visitors can zoom out and in (3 = three times smaller / larger).
Explore mode only; read mode stays at normal zoom.

```js
ZOOM_OUT_LIMIT = 10
ZOOM_IN_LIMIT = 3
```

Zoom speed for a mouse scroll wheel, and for a trackpad pinch (explore mode).

```js
WHEEL_ZOOM_SPEED = 0.0015
TRACKPAD_PINCH_ZOOM_SPEED = 0.01
```

How long the landscape keeps gliding after a quick drag is released.
0 = stops instantly; closer to 1 = glides longer (keep below 1).

```js
GLIDE_AFTER_DRAG = 0.90
```

How far the arrow keys move the view per press.

```js
KEYBOARD_MOVE_STEP = 120
```

How long the menu bar's Home option takes to glide back to the main menu,
in milliseconds.

```js
HOME_TRAVEL_MS = 800
```

## Colors

```js
BACKGROUND_COLOR = "#fffef7"
TEXT_COLOR = "#0b1105"
```

Accent color: fills the menu bar across the top of the screen. #e8f0d4

```js
ACCENT_COLOR = "#dfeac0"
```

Color the home screen's title and the line under it with the accent color
(true), or with TEXT_COLOR like the rest of the text (false).

```js
MENU_TITLE_IN_ACCENT_COLOR = false
```

The menu bar across the top appears once the main menu has been scrolled
off screen. Its height, and the size of its text, in pixels:

```js
TOP_MENU_HEIGHT = 64
TOP_MENU_TEXT_SIZE = 17
```

Hovering an option in the menu bar spreads its letters apart, nudging the
options beside it. Letter spacing while hovered, as a fraction of the
letter size (at rest it uses MENU_LETTER_SPACING_HOVER), and how long the
spreading takes, in milliseconds.

```js
TOP_MENU_HOVER_LETTER_SPACING = 0.5
TOP_MENU_HOVER_SPEED_MS = 250
```

Underline a menu bar option while the pointer is over it, growing out from
the middle (true or false), and how thick the line is, in pixels.

```js
TOP_MENU_UNDERLINE_ON_HOVER = false
TOP_MENU_UNDERLINE_THICKNESS = 2
```

When a chosen option leans up (on its way to a section above), its
underline turns into a small arrow under the word pointing up (true or
false). Length of each side of the arrow, in pixels.

```js
TOP_MENU_ARROW_WHEN_MOVING_UP = false
TOP_MENU_ARROW_SIZE = 10
```

Slide the menu bar down from the top of the screen when it appears, and
back up when it goes (true), or show and hide it instantly (false).

```js
TOP_MENU_ANIMATION = true
```

How long that slide takes, in milliseconds.

```js
TOP_MENU_SLIDE_MS = 350
```

A menu option (on the home screen or in the menu bar) glows for a moment
when it's clicked (true or false, no quotes), in this color, for this many
milliseconds.

```js
MENU_CLICK_GLOW = false
MENU_CLICK_GLOW_COLOR = "#ffffff"
MENU_CLICK_GLOW_MS = 1200
```

When a menu option is chosen, its letters (only in the menu you clicked)
jump to scattered heights, stay there while the page
glides to its section, and drop back into line once it arrives.
On or off (true or false, no quotes):

```js
MENU_CLICK_NUDGE = false
```

How far the letters jump, as a fraction of the letter size:

```js
MENU_CLICK_NUDGE_AMOUNT = 0.25
```

How long they take to jump and to drop back, in milliseconds:

```js
MENU_CLICK_NUDGE_SPEED_MS = 150
```

The chosen option's letters also spread apart until it arrives (true or
false), by this much per letter, as a fraction of the letter size:

```js
MENU_CLICK_EXPAND = true
MENU_CLICK_EXPAND_AMOUNT = 0.12
```

The chosen option's whole word also moves down (to a section further down
the page) or up (to one above) until it arrives, so it looks like it's
leading the way (true or false). How far, as a fraction of the letter size:

```js
MENU_CLICK_MOVE_TOWARD_SECTION = true
MENU_CLICK_MOVE_AMOUNT = 0.4
```

The menu bar's first option, which takes you back to the main menu.

```js
TOP_MENU_HOME_LABEL = "Home"
```

## Fonts & menu

The big title at the top of the menu.

```js
MENU_TITLE = "The School From Scratch"
```

A line of text under the title. Leave empty ("") for none.

```js
MENU_SUBTITLE = "An Educational Commons for students, teachers, parents, and other learners."
```

The menu options, top to bottom. Each one goes in quotes, followed by a
comma. Reorder, add, or remove lines to change the menu.

Each option opens its own page file, named after it in lowercase with
dashes: "People" opens people.html. When you add a new
option, copy cost.html, rename the copy to match, and change the name in its
data-page="..." line. (Until you do, it still works on a web server, but not
when index.html is opened straight from the folder.)

```js
MENU_ITEMS = [
  "Approach",
  "People",
  "Parent-Learning",
  "Logistics",
  "FAQs",
  "Cost",
  "Payments",
]
```

Menu options that open an address of their own instead of scrolling to a
section on the home page. Write the option's name exactly as in MENU_ITEMS,
then a colon and the address in quotes: a page on this site
("payments.html") or a full web address ("https://example.com"). An option
listed here has no section of its own and needs no file in the sections
folder.

```js
MENU_LINKS = {
  "Payments": "payments.html",
}
```

Fonts are loaded from Google Fonts (fonts.google.com). Type the family name
exactly as it appears there, in quotes. Weight: 400 = regular, 500 = medium,
600 = semi-bold, 700 = bold (the font must offer that weight).

The title, "The School From Scratch".

```js
HEADING_FONT = "Lora"
HEADING_FONT_WEIGHT = 600
```

Everything else: the menu options and the menu bar across the top.

```js
BODY_FONT = "Quicksand"
BODY_FONT_WEIGHT = 500
```

Text sizes, in pixels. Both shrink automatically on narrow screens.
HEADING_FONT_SIZE is the heading on the separate pages; BODY_FONT_SIZE is
the menu options.

```js
HEADING_FONT_SIZE = 64
BODY_FONT_SIZE = 24
```

The big title on the home screen, and the line under it, in pixels. Both
shrink automatically on narrow screens.

```js
MENU_TITLE_SIZE = 76
MENU_SUBTITLE_SIZE = 24
```

Space between the title and the line under it, in pixels.

```js
SUBTITLE_GAP = 16
```

Space between the title (or the line under it) and the menu options below,
in pixels. Bigger = the title sits higher, more like a heading on its own.

```js
TITLE_GAP = 96
```

Menu options start with their letters spread apart and draw together when
the pointer moves over them. Spacing is a fraction of the letter size
(0 = normal spacing, 0.3 = noticeably spread out).

```js
MENU_LETTER_SPACING = 0.55
MENU_LETTER_SPACING_HOVER = 0.15
```

How far each letter starts nudged up or down before it drops into place
when the pointer moves over the option (0 = perfectly lined up).

```js
MENU_LETTER_OFFSET = 0.15
```

Which way each letter is nudged. A whole number keeps the same scatter on
every visit; the word random (no quotes) scatters them afresh each time.

```js
MENU_LETTER_SEED = random
```

Turn either part of that movement off (true or false, no quotes).
Sideways: letters spread apart and draw together.
Up and down: letters sit off the line and drop into place.

```js
MENU_LETTERS_SPREAD_SIDEWAYS = true
MENU_LETTERS_NUDGE_UP_DOWN = false
```

Which way the hover goes.
false = letters rest spread out and draw together when hovered.
true  = the reverse: letters rest tidy and spread out when hovered.

```js
MENU_HOVER_EXPANDS = true
```

Underline an option while the pointer is over it, growing outward from the
middle. It starts once that option's letters have settled; the delay below
is the extra pause on top of that.

```js
MENU_UNDERLINE_ON_HOVER = false
MENU_UNDERLINE_DELAY_MS = 10
MENU_UNDERLINE_SPEED_MS = 200
MENU_UNDERLINE_THICKNESS = 3
```

How long the letters take to settle, in milliseconds. This is the time for
the letter with the farthest to travel; nearer letters take proportionally
less, so every letter moves at the same speed in every option.

```js
MENU_HOVER_SPEED_MS = 150
```

true = every letter moves at the same speed, so letters with farther to go
take longer (long options take longer to settle than short ones).
false = every letter takes exactly MENU_HOVER_SPEED_MS, however far it
moves (the original behavior; long options look like they move faster).

```js
MENU_LETTERS_EVEN_SPEED = false
```

Letters start moving at slightly different moments, each up to this many
milliseconds after the others. 0 = every letter starts at the same time.

```js
MENU_LETTER_STAGGER_MS = 0
```

## Pages

In read mode, each menu option (on the home screen and in the menu bar)
scrolls down to that option's section on the same page.

Each section's text is its own file in the "sections" folder, named after
the menu option in lowercase with dashes: People -> sections/people.md,
Parent-Learning -> sections/parent-learning.md. Edit a file, save it,
and reload the page. A missing or empty file shows "Under Development".
The section's heading is the menu option's name, so don't repeat it.

The files are Markdown, like this one:

- A blank line starts a new paragraph.
- A line starting with `#` is a small heading: `# Our questions`
- A line starting with `##` is a centered name: `## Dr. Gopal Krishnamurthy`. The lines right under it (before the next blank line) are centered too, for a picture and a title.
- A picture: `![Headshot of Gopal](images/gopal_headshot.jpeg)`. On a line of its own it sits centered. Put picture files in images/.
- Lines starting with `-` (or `1.` `2.` `3.`) make a list.
- `**bold**`, `*italic*`, `***bold and italic***`
- A link: `[the words to click](https://example.com)`, or to a page on this site: `[Make a payment](payments.html)`
- Put `\` in front of a character to show it as it is: `\*not italic\*`

(The text files only load when the site is served, e.g. on localhost or online, not when index.html is opened straight from the folder.)

In explore mode, or with the gallery off, each option opens its own page
instead (people.html, cost.html, ...), showing its name and
"Under Development".

Room for photos between one section and the next (and between the menu and
the first section), in pixels. Photos can also sit beside the text.

```js
SPACE_BETWEEN_SECTIONS = 550
```

Photos are crowded only around the menu. From the top of the first
section they thin out gradually, over this many pixels, until there are
none left (like CROWDED_AREA_RADIUS to PHOTOS_END_DISTANCE in the gallery).
Bigger = a slower, more gradual thinning. The shape of the thinning follows
FADE_CURVE. If the sections are longer than this (on a phone, say), it
stretches so there are still photos down to the last section.

```js
SECTION_PHOTO_THIN_OUT_DISTANCE = 10500
```

Empty space kept between a section's text and the nearest photo, in pixels.

```js
SECTION_PHOTO_CLEARANCE = 40
```

Widest the text of a section can be, in pixels. On narrow screens it fills
the screen, less a small margin on each side.

```js
SECTION_TEXT_WIDTH = 720
```

Text sizes in the sections, in pixels: each section's heading (it shrinks
on narrow screens) and its paragraphs.

```js
SECTION_HEADING_SIZE = 44
SECTION_TEXT_SIZE = 19
```

Widest a picture in a section (a headshot, say) can be, in pixels. It uses
the same rounded corners as the gallery photos.

```js
SECTION_PICTURE_WIDTH = 200
```

When a menu option is chosen, the page glides down to the section (true)
or jumps straight there (false). No quotes. The same goes for the
menu bar's Home option.

```js
SECTION_LINKS_SCROLL_SMOOTHLY = true
```

How long that glide takes, in milliseconds, however far the section is.
(Home uses HOME_TRAVEL_MS.)

```js
SECTION_SCROLL_MS = 1000
```

How far below the top of the screen a section's heading lands after
choosing it from the menu, in pixels.

```js
SECTION_SCROLL_MARGIN = 96
```

Sections (and pages) that show the contact details below: the phone number,
and the Venmo logo if it's switched on. Use the names exactly as in
MENU_ITEMS, in quotes, separated by commas. Empty (`[]`) shows them nowhere.

```js
CONTACT_PAGES = []
```

Phone number shown on those pages. Tapping it on a phone starts a call.
Leave empty ("") to hide it.

```js
PHONE_NUMBER = "+1 (805) 798-5098"
```

Show the Venmo logo under the phone number (true or false).

```js
SHOW_VENMO_LOGO = false
```

Optional: a web address the Venmo logo opens when clicked, starting with
https:// (for example your Venmo profile link). Leave "" for no link.

```js
VENMO_LINK = ""
```

## Payments page (payments.html)

The payments page shows the heading, the Zelle logo, and the steps for
sending a payment. Details that are still empty below show as a [bracketed
placeholder].

The school's Zelle tag (or the email or US phone number its Zelle is
registered to), and the name parents will see when they send to it.

```js
ZELLE_RECIPIENT = "transformativeedu26"
ZELLE_RECIPIENT_NAME = "The School From Scratch"
```

The Zelle logo file, and how wide it's shown, in pixels. Its corners are
rounded like the gallery photos' (PHOTO_CORNER_RADIUS). Download the
official logo from Zelle's brand page (zellepay.com has a "Brand guidelines"
section), save it in the images folder, and put its file name here, for
example "images/zelle_logo.svg". While this is empty, the page shows the
word "Zelle" instead.

```js
ZELLE_LOGO = "images/Zelle_logo.svg"
ZELLE_LOGO_WIDTH = 240
```

Size of the numbered circles beside the steps, and the space between one
step and the next, in pixels.

```js
PAYMENT_STEP_CIRCLE_SIZE = 36
PAYMENT_STEP_SPACING = 28
```

## Background grid

Show a faint grid behind everything (true or false, no quotes).
With the gallery on, it moves and zooms along with the photos.

```js
GRID_ENABLED = false
```

Size of each grid square at normal zoom.

```js
GRID_SQUARE_SIZE = 50
```

Line color. The last number is how visible the lines are:
0 = invisible, 1 = solid. Around 0.05 to 0.12 keeps it subtle.

```js
GRID_LINE_COLOR = "rgba(255, 255, 255, 0.07)"
```

Line thickness at normal zoom (lines shrink and grow with zoom, like the photos).

```js
GRID_LINE_THICKNESS = 3
```

true = the grid fades away toward the edges of the screen.
false = the grid is evenly visible everywhere.

```js
GRID_FADES_AT_EDGES = false
```

## Performance

true = show a performance panel in the top-right corner: frames per second,
a live frame-time graph (green = smooth, yellow = OK, red = a stutter),
what's being drawn, memory use, your position and zoom, and more.
Press P on the keyboard to hide or show it. Set back to false before publishing.

```js
SHOW_PERFORMANCE_INFO = false
```

true = next to the frames-per-second number, also show a one-word rating
(BUTTERY, SMOOTH, OK, CHOPPY, or IDLE when standing still).

```js
SHOW_PERFORMANCE_RATING = false
```

true = when zoomed out, draw areas of photos once and reuse them (like an
online map loads tiles). Much smoother. Photos at the edge of the screen
may take a moment to sharpen or appear after a big zoom.
false = draw every photo individually every frame (slower when zoomed out).

```js
SPEED_UP_ZOOMED_OUT_VIEW = true
```

true = while you're dragging or zooming out, draw at slightly lower
sharpness on high-resolution screens, then sharpen when you stop.
No effect on standard screens.

```js
LOWER_RESOLUTION_WHILE_MOVING = true
```
