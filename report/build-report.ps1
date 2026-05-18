$ErrorActionPreference = 'Stop'

$repoRoot      = (Resolve-Path "$PSScriptRoot\..").Path
$reportDir     = Join-Path $repoRoot 'report'
$screenshotDir = Join-Path $reportDir 'screenshots'
$outputPath    = Join-Path $reportDir 'Doc1.docx'
$lockFile      = Join-Path $reportDir '~$Doc1.docx'

if (Test-Path $lockFile) {
    Write-Error "report\Doc1.docx is currently open in Word. Please close it and re-run."
    exit 1
}
if (-not (Test-Path $screenshotDir)) {
    New-Item -ItemType Directory -Path $screenshotDir | Out-Null
}

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

try {
    $doc = $word.Documents.Add()
    $doc.PageSetup.TopMargin    = 56
    $doc.PageSetup.BottomMargin = 56
    $doc.PageSetup.LeftMargin   = 64
    $doc.PageSetup.RightMargin  = 64

    $sel = $word.Selection

    function Reset-Style {
        $sel.Style = $doc.Styles.Item('Normal')
        $sel.Font.Size = 11
        $sel.Font.Bold = $false
        $sel.Font.Italic = $false
        $sel.Font.Color = 0
        $sel.ParagraphFormat.Alignment = 0
    }

    function Add-Heading {
        param([string]$Text, [int]$Level = 1)
        Reset-Style
        $sel.Style = $doc.Styles.Item("Heading $Level")
        $sel.TypeText($Text)
        $sel.TypeParagraph()
        Reset-Style
    }

    function Add-Para {
        param([string]$Text)
        Reset-Style
        $sel.ParagraphFormat.Alignment = 3
        $sel.ParagraphFormat.SpaceAfter = 6
        $sel.TypeText($Text)
        $sel.TypeParagraph()
        Reset-Style
    }

    function Add-Bullet {
        param([string]$Text)
        Reset-Style
        $sel.Style = $doc.Styles.Item('List Bullet')
        $sel.TypeText($Text)
        $sel.TypeParagraph()
        Reset-Style
    }

    function Add-Caption {
        param([string]$Text)
        Reset-Style
        $sel.ParagraphFormat.Alignment = 1
        $sel.Font.Italic = $true
        $sel.Font.Size = 9
        $sel.Font.Color = 6710886
        $sel.TypeText("Figure: $Text")
        $sel.TypeParagraph()
        Reset-Style
    }

    function Add-Screenshot {
        param([string]$Slot, [string]$Caption)
        Reset-Style
        $sel.ParagraphFormat.Alignment = 1
        $img = Join-Path $screenshotDir ($Slot + '.png')
        if (-not (Test-Path $img)) { $img = Join-Path $screenshotDir ($Slot + '.jpg') }
        if (-not (Test-Path $img)) { $img = Join-Path $screenshotDir ($Slot + '.jpeg') }
        if (Test-Path $img) {
            try {
                $pic = $sel.InlineShapes.AddPicture($img, $false, $true)
                if ($pic.Width -gt 460) {
                    $ratio = 460 / $pic.Width
                    $pic.Width  = 460
                    $pic.Height = $pic.Height * $ratio
                }
            } catch {
                $sel.TypeText("[ Could not insert $Slot.png - " + $_.Exception.Message + " ]")
            }
            $sel.TypeParagraph()
        } else {
            $sel.Font.Bold = $true
            $sel.Font.Color = 13408512
            $sel.TypeText("[ INSERT SCREENSHOT: $Slot - save to report\screenshots\$Slot.png ]")
            $sel.Font.Bold = $false
            $sel.Font.Color = 0
            $sel.TypeParagraph()
        }
        Add-Caption $Caption
        Reset-Style
    }

    function Add-PageBreak {
        $sel.InsertBreak(7)
    }

    # Render one "page" of the report.
    function Add-Page {
        param(
            [string]$Title,
            [string]$Slot,
            [string]$Caption,
            [string[]]$Paras,
            [string[]]$Bullets = @()
        )
        Add-Heading $Title 2
        foreach ($p in $Paras[0..0]) { Add-Para $p }
        Add-Screenshot $Slot $Caption
        if ($Paras.Length -gt 1) {
            for ($i = 1; $i -lt $Paras.Length; $i++) { Add-Para $Paras[$i] }
        }
        foreach ($b in $Bullets) { Add-Bullet $b }
        Add-PageBreak
    }

    # ========== TITLE PAGE ==========
    $sel.ParagraphFormat.Alignment = 1
    for ($i = 0; $i -lt 4; $i++) { $sel.TypeParagraph() }
    $sel.Font.Size = 56
    $sel.Font.Bold = $true
    $sel.Font.Color = 9851464
    $sel.TypeText('MAZAD')
    $sel.TypeParagraph()
    $sel.Font.Size = 20
    $sel.Font.Color = 0
    $sel.TypeText('Premium Auction House')
    $sel.TypeParagraph()
    $sel.Font.Size = 14
    $sel.Font.Bold = $false
    $sel.Font.Color = 6710886
    $sel.TypeText('Full-Stack Web Application - Final Project Report')
    $sel.TypeParagraph()
    $sel.TypeParagraph()
    $sel.TypeParagraph()
    $sel.Font.Size = 12
    $sel.Font.Color = 0
    $sel.TypeText("Date: $(Get-Date -Format 'yyyy-MM-dd')")
    $sel.TypeParagraph()
    $sel.TypeText('Repository: https://github.com/M4-Faraj/Mazad')
    $sel.TypeParagraph()
    $sel.TypeText('Environment: XAMPP - PHP 8 - MySQL 8 - Windows 11')
    $sel.TypeParagraph()
    Reset-Style
    Add-PageBreak

    # ========== ACKNOWLEDGMENTS ==========
    Add-Heading 'Acknowledgments' 1
    Add-Para 'This project would not have reached the finish line without the patient guidance of Dr. Sufyan. From the earliest sketches of the database schema to the final polish of the admin notifications dropdown, Dr. Sufyan has been the savior of our journey. Every blocking question, every architectural fork, and every late-night merge conflict ended in a conversation with him - and every one of those conversations left us with a clearer mind and a stronger codebase.'
    Add-Para 'Dr. Sufyan did not only teach us PHP, JavaScript and MySQL; he taught us how to think about a software product end-to-end - how to break a vague idea into endpoints, how to defend a UI decision with reasoning, and how to debug systematically instead of guessing. When the favorites endpoints were vulnerable to SQL injection, he showed us how to use prepared statements properly. When the banner looked different on every page, he pushed us to design a single source of truth in CSS instead of patching each HTML file. When live auctions felt impossible without WebSockets, he walked us through a polling design that was simple, correct and good enough for a graduation project.'
    Add-Para 'We are also grateful to our classmates who tested the application, found bugs, and gave us honest feedback on the visual identity. Special thanks to the friends who created demo accounts, placed countless test bids, and uploaded auction images during the long QA evenings.'
    Add-Para 'Thank you, Dr. Sufyan. The credit for what works here is shared. The mistakes that remain are ours alone.'
    Add-PageBreak

    # ========== TABLE OF CONTENTS ==========
    Add-Heading 'Table of Contents' 1
    Add-Para 'This report is divided into the following parts:'
    Add-Bullet 'Part I - Project Overview, objectives and architecture'
    Add-Bullet 'Part II - Public marketplace: home, categories and auction detail pages'
    Add-Bullet 'Part III - Authentication: sign-in, register, validation and the slide transition'
    Add-Bullet 'Part IV - User area: profile, seller studio and chat bot'
    Add-Bullet 'Part V - Live auction streaming room'
    Add-Bullet 'Part VI - Admin control center'
    Add-Bullet 'Part VII - Employee review panel'
    Add-Bullet 'Part VIII - Database schema and stored data'
    Add-Bullet 'Part IX - Problems we encountered and how we solved them'
    Add-Bullet 'Part X - Sources and references'
    Add-Bullet 'Part XI - Conclusion and future work'
    Add-PageBreak

    # =============================================================
    # PART I - PROJECT OVERVIEW
    # =============================================================
    Add-Heading 'Part I - Project Overview' 1
    Add-Para 'Mazad is a complete online auction platform aimed at delivering a "premium" buying and selling experience. The application supports standard timed auctions and live-streamed auctions with chat, has separate user, employee and admin roles, and includes a token-based reward system and daily reports for the administrator.'
    Add-Para 'This part of the report introduces the project, its objectives, and its three-tier architecture before the screenshot-by-screenshot tour begins in Part II.'
    Add-PageBreak

    Add-Heading 'Objectives' 2
    Add-Bullet 'Provide a luxury-styled marketplace where users can browse auctions by category, search, and place bids.'
    Add-Bullet 'Support both timed (standard) auctions and live streamed auctions with chat and viewer presence tracking.'
    Add-Bullet 'Allow registered users to favorite items, manage their profile, change their password, and earn tokens.'
    Add-Bullet 'Allow sellers to publish auctions with rich metadata (title, description, category, images, pricing rules).'
    Add-Bullet 'Provide an employee role with a dedicated review queue for moderating pending auctions before they go live.'
    Add-Bullet 'Provide an administrator role with full control: KPIs, moderation, daily reports, user management, settlement, token ledger and notifications.'
    Add-Bullet 'Deliver an Arabic / English bilingual experience using the Google Translate Element API on every page.'
    Add-PageBreak

    Add-Heading 'System Architecture' 2
    Add-Para 'Mazad follows a classic three-tier architecture. The browser (HTML / CSS / JavaScript) makes fetch calls to the PHP application layer, which performs validation, authorization and business logic before reading and writing the MySQL data layer. All API endpoints return JSON. The frontend never embeds raw SQL or credentials, and the backend never trusts client-supplied roles or IDs.'
    Add-Bullet 'Frontend: HTML5, CSS3 (custom luxury theme + per-page stylesheets), vanilla JavaScript (no framework).'
    Add-Bullet 'Backend: PHP 8 served by Apache (XAMPP).'
    Add-Bullet 'Database: MySQL 8 (database name: mazad_db).'
    Add-Bullet 'Auth: PHP sessions with bcrypt password hashing (legacy plain-text passwords auto-upgrade on first successful login).'
    Add-Bullet 'Localization: Google Translate Element API for runtime AR / EN switching.'
    Add-Bullet 'Hosting: XAMPP localhost on Windows for development.'
    Add-PageBreak

    Add-Heading 'Folder Layout' 2
    Add-Bullet '/ - Top-level HTML pages (index.html, login.html, Admin.html, live-auction.html, profile.html, ...).'
    Add-Bullet '/api/ - PHP endpoints (login.php, register.php, add-auction.php, add-bid.php, approve-bid.php, get-auctions.php, admin-report.php, ...).'
    Add-Bullet '/css/ - Stylesheets: style.css is shared; per-page files (login.css, admin.css, live-auction.css, ...) layer on top.'
    Add-Bullet '/js/ - Page-specific JavaScript modules (header.js, login.js, admin.js, live-auction.js, ...).'
    Add-Bullet '/images/auctions/ - Uploaded auction images.'
    Add-Bullet '/config/db.php - Database connection settings.'
    Add-Bullet '/report/ - This document, screenshots folder, and the PowerShell build script that produced it.'
    Add-PageBreak

    # =============================================================
    # PART II - PUBLIC MARKETPLACE
    # =============================================================
    Add-Heading 'Part II - Public Marketplace' 1
    Add-Para 'The marketplace is the publicly accessible side of Mazad: pages that any visitor can browse without signing in. The next pages walk through the home page, each of the six category landing pages, and the auction detail screen.'
    Add-PageBreak

    Add-Page 'Home Page - Hero Banner' 'home_hero' 'The hero banner on the home page introduces the platform with rotating panels.' @(
        'The home page opens with an interactive hero. The left side rotates through four panels (Fashion, Auctions, Add, Profile, Offers), and the right side reacts with a contextual background and a welcome line. The hero is the first thing every visitor sees, so it carries the brand identity: gold accent palette, Bebas Neue display font, and a soft animated background.',
        'Behind the hero, the body uses a layered radial gradient and a floating background animation defined in style.css to give the page a "luxury showroom" feel without slowing down the load.'
    ) @(
        'Header banner: 64 px unified logo slots, brand block, navigation, language toggle and user box.',
        'Interactive rotator panels: data-key values map to background images and copy.',
        'Global search bar pinned below the hero for instant access.'
    )

    Add-Page 'Home Page - Global Search' 'home_search' 'The hero search field accepts free-text queries and routes the user to filtered results.' @(
        'The search bar lives just below the hero and is the fastest way to dive into auctions. Typing a query and pressing the gold Search button forwards the user to a filtered category listing.',
        'The input is styled with a subtle inner shadow and a focus glow that uses the gold accent variable. Keyboard accessibility was a priority - the input is the first focusable element after the navigation, and pressing Enter triggers the search.'
    ) @(
        'The placeholder text adapts to language when the AR toggle is pressed.',
        'Search is debounced client-side to avoid overwhelming the backend.',
        'Empty searches do nothing rather than throwing an error.'
    )

    Add-Page 'Home Page - Category Rails' 'home_rails' 'Category rails are populated from the database at runtime, replacing the old hardcoded static cards.' @(
        'Each category has its own horizontal "rail" of auction cards. These rails used to be hardcoded HTML with hundreds of static articles - one of the early refactors was to delete all of them and replace them with empty <div id="rail-fashion"> placeholders that JavaScript fills at runtime.',
        'The new loadCategoryRailsFromAPI() function calls /api/api/get-auctions.php once and groups the response by category. This made adding a new category a 5-minute job instead of an afternoon of copy-paste.'
    ) @(
        'Cards include cover image, title, current price, seller and category badge.',
        'Hovering a card lifts it slightly and intensifies the gold border.',
        'Clicking a card opens auction-details.html?id=N with the auction id.'
    )

    Add-Page 'Home Page - Offers Carousel' 'home_offers' 'The featured offers carousel cycles through three auctions per slide with prev/next controls and dot navigation.' @(
        'Above the rails sits a wider featured carousel that highlights three auctions at a time. It uses CSS transform for the slide motion and a small JavaScript controller for the prev/next buttons and indicator dots.',
        'The carousel auto-rotates every few seconds but pauses on hover so users can read each card without it jumping away.'
    ) @(
        'Live pill in the top right corner indicates that the carousel is filled from live data.',
        'On screens narrower than 768 px, the carousel collapses to one card per slide.',
        'The dots show which slide is active and respond to direct clicks.'
    )

    Add-Page 'Fashion Category Page' 'cat_fashion' 'The Fashion category page filters all auctions where category = Fashion.' @(
        'Each of the six category pages shares the same template: header banner, kicker, page title, All / Normal / Live tab filter, and an auction grid. The page-specific JavaScript file (fashion.js, electronics.js, ...) calls get-auctions.php with the category filter and renders the cards.',
        'The activeMode state on each page controls whether the grid shows All auctions, only standard ones, or only live ones - a small but important UX detail that prevents confusion between Active timed listings and the live stream.'
    ) @(
        'Cover images are stored under /images/auctions/ and uploaded via the seller studio.',
        'Empty state ("no auctions yet") uses a dashed gold border so it does not look like a broken page.'
    )

    Add-Page 'Electronics Category Page' 'cat_electronics' 'Electronics category - phones, laptops, gaming hardware.' @(
        'Electronics has the highest volume of listings in our demo data. The category page exposes the same All / Normal / Live tabs and is fully responsive down to mobile widths.',
        'A future improvement here would be sub-categories (phones, audio, etc.) and price-range filters, both of which would slot into the existing fetch-and-render pipeline.'
    ) @(
        'Watch-style and grid layouts share the same auction-card component.',
        'Category badge color matches the gold theme.'
    )

    Add-Page 'Art Category Page' 'cat_art' 'Art category - paintings, sculptures and one-of-a-kind collectibles.' @(
        'Art listings tend to have longer descriptions, so the auction-card sets a fixed minimum height for the description block to keep the grid visually consistent.',
        'The category page also handles featured auctions with a special badge and an animated sheen overlay.'
    ) @(
        'Empty state explains how to seed demo art listings via the admin panel.'
    )

    Add-Page 'Cars Category Page' 'cat_cars' 'Cars category - vehicles, motorbikes and parts.' @(
        'The cars page demonstrates how Mazad scales to higher-priced items. Bids that exceed the seller-defined max_acceptable_price are routed to admin approval instead of being applied immediately - vital for big-ticket categories like vehicles.',
        'The cards show current bid in a gold serif font so the price is the first thing a visitor reads.'
    ) @(
        'Multi-image gallery is especially valuable here for showing different angles of a vehicle.',
        'Category icon is a small car silhouette in the header tab list.'
    )

    Add-Page 'Watches Category Page' 'cat_watches' 'Watches category - luxury timepieces and accessories.' @(
        'Watches were the test category that uncovered a casing bug: the database returned "watches" (plural) but the original front-end filter looked for "watch" (singular). After fixing isWatchAuction the listings finally appeared.',
        'This was a recurring theme - many "missing data" bugs were actually a string mismatch between the schema and the front-end filter.'
    ) @(
        'Watch-shaped icons and a darker accent background highlight the premium tone of this category.'
    )

    Add-Page 'Home & Garden Category Page' 'cat_home' 'Home & Garden category - furniture, decor, gardening tools.' @(
        'The Home & Garden page completes the six-category rotation. It shares the same dynamic fetch logic and tab filter as the other five.',
        'This page was useful for testing the empty-state UI because the category often had few listings during early testing.'
    ) @(
        'Empty state is a dashed gold panel reading "no auctions yet".'
    )

    Add-Page 'Auction Details - Hero' 'details_hero' 'Top of auction-details.html with breadcrumbs, title and hero image.' @(
        'Clicking any auction card opens auction-details.html with the auction id in the query string. The hero shows the cover image, title, current bid, time remaining, status badge, and the seller name.',
        'Breadcrumbs at the top of the page link back to Home and to the originating category, so users do not lose their place after deep-linking from a search engine.'
    ) @(
        'Time-remaining badge updates live via setInterval.',
        'Favorites heart icon toggles via the favorites API.'
    )

    Add-Page 'Auction Details - Image Gallery' 'details_gallery' 'The image gallery cycles through every uploaded image for the auction.' @(
        'Each auction stores its image filenames as a JSON array in the database. The gallery component reads that array, sets the first image as the active cover, and renders thumbnails below.',
        'Clicking a thumbnail swaps the cover image with a soft cross-fade animation. Keyboard arrow keys also navigate the gallery for accessibility.'
    ) @(
        'Images are served from /images/auctions/ with original filenames preserved.',
        'A future improvement would be a full-screen lightbox.'
    )

    Add-Page 'Auction Details - Bid History' 'details_bids' 'Latest bids on the auction, ordered newest first.' @(
        'The bid history panel calls /api/get-bids.php?auction_id=N and renders the rows in descending time order. Each row shows the bidder name (or User#id when no name is set), the amount, and a "minutes ago" timestamp.',
        'Pending bids (high-value ones waiting for admin approval) appear in muted gold to distinguish them from approved bids.'
    ) @(
        'Approved bid rows show a gold accent strip on the left.',
        'Rejected bids are hidden from this view but remain in the database for audit.'
    )

    Add-Page 'Auction Details - Place a Bid' 'details_place' 'The Place Bid panel validates the amount before submitting it to add-bid.php.' @(
        'The Place Bid form is the most-clicked element on the entire site. It pre-fills the next-minimum bid based on current price, validates that the user is signed in, and forwards the amount to /api/add-bid.php.',
        'If the bid exceeds max_acceptable_price, the backend stores it with status = pending and the user sees a friendly "your bid is awaiting admin review" message instead of being silently rejected.'
    ) @(
        'Minimum increment is calculated server-side, never trusted from the client.',
        'A success toast confirms the bid and the current price refreshes in place.'
    )

    Add-Page 'Auction Details - Seller Card' 'details_seller' 'Seller information panel with rating placeholder, name and contact action.' @(
        'Each auction shows its seller alongside the bid panel. The seller name comes from a JOIN between auctions.user_id and the users table, so renaming a user updates everywhere automatically.',
        'A future improvement would be a "view all auctions from this seller" link that filters the marketplace by user_id.'
    ) @(
        'Tokens and rank are read-only on this card.',
        'Direct messaging is not implemented yet - users contact sellers through the chat bot.'
    )

    # =============================================================
    # PART III - AUTHENTICATION
    # =============================================================
    Add-Heading 'Part III - Authentication' 1
    Add-Para 'Authentication is split between Login and Register screens, both rendered on login.html. The two screens swap via a horizontal slide transition. This part of the report walks through both screens, the validation feedback, and the polish features (password show/hide, remember-me, strength meter).'
    Add-PageBreak

    Add-Page 'Sign In Screen' 'auth_login' 'The redesigned sign-in screen with two-up social buttons and Remember-me.' @(
        'The sign-in screen lets the user authenticate with email and password, or continue with Google / Facebook as a stub for future OAuth integration. The Remember-me checkbox saves the last used email to localStorage so returning visitors can simply type their password.',
        'Validation messages appear inline below each field. The password input has a small eye toggle to switch between dot and plain-text display - a frequently-requested accessibility feature.'
    ) @(
        'Forgot password link opens forgot-password.html.',
        'Enter key inside any field submits the form.',
        'Successful login redirects by role: admin -> Admin.html, employee -> Employee.html, otherwise index.html.'
    )

    Add-Page 'Create Account Screen' 'auth_register' 'The register screen collects identity, contact and credential fields in a two-column grid.' @(
        'Create Account is reached either by clicking the tab at the top of the auth card or the "Create one" inline link inside the sign-in screen. It uses a 2-column grid that collapses to a single column on mobile.',
        'Each field has an inline validation message and a soft shake animation when an error is detected. The "Create your account" button is disabled visually if any field fails, but the JavaScript validator runs again on submit to be safe.'
    ) @(
        'Date of birth uses the native HTML5 date picker.',
        'Phone is validated for minimum length, not for a specific country format.',
        'Successful registration auto-logs the user in and routes them to the appropriate page by role.'
    )

    Add-Page 'Slide Transition Mid-Animation' 'auth_slide' 'A frame captured while the login form slides out and the register form slides in.' @(
        'The horizontal slide transition between Login and Register replaces the old fade-in-place behaviour. When the user clicks the Create Account tab, the active form gets an is-exit-right class (translate +60 px, opacity 0) while the incoming form is added to the DOM with is-active (translate 0, opacity 1) on the next animation frame.',
        'CSS does the heavy lifting with a single cubic-bezier curve at 550 ms duration. The container has overflow:hidden so the sliding forms never appear outside the card.'
    ) @(
        'The is-exit-left class is the mirror for sliding back to the sign-in screen.',
        'Tab buttons and inline links share the same activateScreen() function, keeping behavior consistent.'
    )

    Add-Page 'Validation Errors' 'auth_validation' 'Inline validation with red field borders, error messages and a shake animation.' @(
        'Both forms validate on submit. Each invalid field gets the is-error class, which lights up the border in red and reveals the error text below it. The wrapper also gets a temporary shake class that triggers a 350 ms keyframe animation to draw the eye.',
        'The validators are intentionally bilingual - the messages are in Arabic for the register form (where local users register) and the login form falls back to English where needed.'
    ) @(
        'validateEmail uses a strict regex that excludes spaces and requires a TLD.',
        'Password length minimum is 6 for login (lenient for legacy accounts) and 8 for register (strict for new ones).'
    )

    Add-Page 'Password Show / Hide and Strength Meter' 'auth_password' 'The eye toggle reveals the password text and the strength meter colors fill the bar.' @(
        'Both password fields have a small eye button on the right that toggles the input type between password and text. The button also flips its glyph from [eye] to [hide] to give visual feedback.',
        'On the register form, a thin bar below the password input shows live strength as the user types. Score 1 is red, 2 orange, 3 green, 4 teal - based on length, uppercase, digits and symbols.'
    ) @(
        'Password show/hide is per-field and resets after page reload.',
        'Strength meter is informational only - the server enforces minimum length.'
    )

    Add-Page 'Remember Me' 'auth_remember' 'The Remember-me checkbox persists the last used email in localStorage.' @(
        'When the user checks Remember me and signs in, the email value is stored under localStorage["mazadRememberEmail"]. On the next page load the email is restored and the checkbox is pre-checked.',
        'Unchecking the box on the next visit removes the saved value. We deliberately store only the email, never the password - a small but important security decision.'
    ) @(
        'The forgot-password and inline-register links work regardless of Remember-me state.',
        'Multiple browser users have independent storage because localStorage is per-profile.'
    )

    # =============================================================
    # PART IV - USER AREA
    # =============================================================
    Add-Heading 'Part IV - User Area' 1
    Add-Para 'Once signed in, regular users have access to a personal profile page, the seller studio for creating auctions, and the chat bot helper. This part walks through every section of those pages.'
    Add-PageBreak

    Add-Page 'Profile Hero' 'profile_hero' 'The hero banner at the top of the profile page with avatar, name and account level.' @(
        'profile.html opens with a personalized banner that shows the user avatar (uploaded image or initials fallback), the full name, the account level (Gold Member by default), and a row of mini-cards for site usage statistics.',
        'The hero data comes from /api/get-current-user.php which reads the active session and returns the user row.'
    ) @(
        'Avatar uploads go through /api/update-profile.php with multipart form data.',
        'Account level is currently static; future work would tie it to token thresholds.'
    )

    Add-Page 'Profile Stats Cards' 'profile_stats' 'Three stats cards: auctions created, bids placed and tokens earned.' @(
        'The stats cards summarize a user activity at a glance. The counts come from the API and are recomputed every time the page loads, so the user sees an up-to-date snapshot.',
        'Each card uses the same gold-on-dark theme as the rest of the application and has a subtle hover lift that mirrors the auction cards.'
    ) @(
        'The "tokens" stat links to a future redeem page (not implemented yet).',
        'Auction count includes pending and rejected statuses for completeness.'
    )

    Add-Page 'Favorites List' 'profile_favs' 'The favorites list on the profile page with thumbnail, title, price and a Remove button.' @(
        'The favorites list shows every auction the user has heart-toggled. Each row links back to the auction detail page and has a Remove button that calls /api/remove-favorite.php and animates the row out.',
        'Favorites are stored in the favorites table with user_id and auction_id as a composite key, so a user cannot favorite the same auction twice.'
    ) @(
        'Empty state displays a dashed gold panel inviting the user to browse and favorite items.',
        'Favorites also drive the home-page favorites section when signed in.'
    )

    Add-Page 'Avatar Upload' 'profile_avatar' 'The avatar upload field accepts PNG / JPG and shows a live preview before saving.' @(
        'Clicking the avatar shows a file picker. The chosen image is previewed immediately with a CSS object-fit cover so the user sees how it will look in the header before saving.',
        'On save, the file is sent to /api/update-profile.php which writes it to the user folder and updates the avatar column.'
    ) @(
        'Max file size is enforced server-side, not client-side.',
        'The header.js shared module re-reads the avatar after save so all pages reflect the new image.'
    )

    Add-Page 'Change Password' 'profile_password' 'The change-password form requires the current password and a new password twice.' @(
        'This was one of the late additions to the profile page. The form posts to /api/change-password.php which verifies the current password with password_verify, hashes the new one with password_hash, and updates the row.',
        'If the current password is wrong, the server returns an error without updating anything - safer than relying on session-only checks.'
    ) @(
        'Successful change shows a green toast and clears all three inputs.',
        'Failed change keeps the inputs so the user can retry without retyping the new password.'
    )

    Add-Page 'Tokens and Rank' 'profile_tokens' 'Tokens balance and rank title (Bronze / Silver / Gold / Platinum).' @(
        'Mazad rewards activity with tokens. Each approved bid, each won auction, and each successful sale credits the user is row in token_ledger via the settlement endpoint.',
        'The rank title is computed from the running total. The profile page summarizes both the absolute balance and the rank in a single card.'
    ) @(
        'Settlement is triggered manually from the admin panel for now.',
        'The token_ledger keeps every credit / debit for audit.'
    )

    Add-Page 'Seller Studio - Auction Form' 'seller_form' 'The auction creation form with title, category, pricing and timing.' @(
        'seller-auctions.html is where users publish a new auction. The left side has the form fields (title, description, category, starting price, expected final price, max acceptable price, end time, auction type) and the right side shows a live preview.',
        'Categories are loaded from a fixed list so they match the marketplace filters exactly. Auction type is either "standard" (timed) or "live" (streamed in the live room).'
    ) @(
        'expected_final_price drives the recommended bid increments.',
        'max_acceptable_price triggers the admin approval workflow for high-value bids.'
    )

    Add-Page 'Seller Studio - Image Upload' 'seller_gallery' 'The image upload zone supports multi-file selection with drag-and-drop and previews.' @(
        'Image uploads accept multiple files at once. Each chosen image gets a preview tile with a small X button to remove it before submitting.',
        'On submit, the files are sent as multipart form data to /api/add-auction.php which moves them into /images/auctions/ and stores the file paths in a JSON column.'
    ) @(
        'A future improvement would be drag-to-reorder so the seller can choose the cover image explicitly.'
    )

    Add-Page 'Seller Studio - Live Preview' 'seller_preview' 'The live preview panel mirrors how the auction will look in the public marketplace.' @(
        'The preview panel updates as the seller types. It uses the same .auction-card markup as the marketplace, so what the seller sees is exactly what buyers will see after approval.',
        'This was one of the most satisfying features to implement - it caught dozens of "the title is too long" and "the description wraps weirdly" bugs before the auction ever went live.'
    ) @(
        'Currency formatting matches the marketplace ($1,234 with comma).',
        'Empty fields render placeholder text so the preview never breaks.'
    )

    Add-Page 'Seller Studio - Submit Success' 'seller_submit' 'A success toast after the auction is created and queued for review.' @(
        'On successful submission the form clears, the previews reset, and a green toast confirms that the auction has been queued for admin approval. The seller can then list a second auction immediately.',
        'New auctions land in the pending state - they are not publicly visible until an admin or employee approves them.'
    ) @(
        'Failed submissions keep the form contents so the seller does not lose work.',
        'Server errors include a friendly message instead of raw exception text.'
    )

    Add-Page 'Chat Bot - Welcome Screen' 'chatbot_init' 'The chat bot welcome message with two action buttons (Gift Suggestion and Product Search).' @(
        'chatbot.html is a guided assistant that helps users decide what to bid on. It opens with a welcome message and two big buttons: Suggest a Gift, or Search a Product.',
        'The bot uses a tiny client-side state machine - no AI - and asks 3-4 follow-up questions before recommending an auction from the marketplace.'
    ) @(
        'The chat container is centered with a max-width for readability.',
        'Bot messages are styled differently from user messages.'
    )

    Add-Page 'Chat Bot - Gift Flow' 'chatbot_gift' 'The gift suggestion flow asks about recipient and budget.' @(
        'When the user picks Suggest a Gift, the bot walks through a short questionnaire: who is it for, what is the occasion, what is the budget, and any specific interests. The answers map to category filters in the database query.',
        'At the end, the bot returns 3 candidate auctions with a "Place bid" link for each.'
    ) @(
        'The conversation can be restarted at any time with a Reset button.'
    )

    Add-Page 'Chat Bot - Product Search Flow' 'chatbot_search' 'The product search flow accepts a free-text query and returns matching auctions.' @(
        'The second flow accepts a free-text product name and queries the auctions table with a LIKE filter. Matching auctions are returned as a small list with cover image, title and current bid.',
        'This is the simplest path through the bot and is meant as a sanity-check before the gift flow which is more elaborate.'
    ) @(
        'Search is case-insensitive and ignores extra whitespace.'
    )

    # =============================================================
    # PART V - LIVE AUCTION
    # =============================================================
    Add-Heading 'Part V - Live Auction Room' 1
    Add-Para 'Live auctions are the most ambitious feature in Mazad. Sellers can flag an auction as "live" and the platform exposes a streaming room with chat, viewer presence count, and a live-updating bid panel. This part of the report walks through every panel of that room.'
    Add-PageBreak

    Add-Page 'Live Room - Stream Area' 'live_stream' 'The top of the live room with stream area, LIVE NOW badge, mode chip and countdown.' @(
        'The live room shows a placeholder stream area at the top. In a real deployment this would embed an HLS stream URL, but for the project the area is a styled placeholder that focuses attention on the bidding panel below.',
        'The LIVE NOW badge pulses to make the urgency visible at a glance, and the countdown badge to the right of it shows minutes-and-seconds remaining.'
    ) @(
        'Stream area scales to fit the available width and maintains a 16:9 aspect ratio.',
        'A Back button in the top-right returns the user to the originating page.'
    )

    Add-Page 'Live Room - Chat Panel' 'live_chat' 'The live chat panel with messages from viewers and the seller.' @(
        'Chat is implemented with short polling. The live page calls /api/get-live-messages.php?auction_id=N every few seconds and renders any new messages below the previous ones. Sending a message posts to /api/send-live-message.php which writes a row in live_messages.',
        'Each message shows the sender, the time, and the body. The active user is messages are highlighted in a slightly different gold tint to make their own contributions easy to follow.'
    ) @(
        'Chat is open to anyone signed in; unsigned users see an "open chat" prompt.',
        'A future improvement would be WebSocket-based push instead of polling.'
    )

    Add-Page 'Live Room - Viewer Count' 'live_viewers' 'Watchers indicator updates as users join and leave the room.' @(
        'When a user opens the live room, the front-end calls /api/join-live.php which inserts or updates a row in live_viewers with the current timestamp. Every few seconds the page heartbeats again. When the user navigates away, /api/leave-live.php removes the row.',
        'The /api/get-live-viewers.php endpoint returns the count of active rows (rows where last_ping is within the last minute), which the page displays in the Watchers stat.'
    ) @(
        'Stale viewers are pruned by the join endpoint based on last_ping.',
        'The visible counter is approximate by design; exact precision is not needed.'
    )

    Add-Page 'Live Room - Bid Panel' 'live_bid' 'The bid panel with current price, suggested next bid and a Place Bid button.' @(
        'The bid panel in the live room is similar to the auction-details version but more compact, since real estate is shared with the chat and the stream area.',
        'High-value bids again go through the admin approval queue. The seller sees a "review pending" badge for those bids in case they wonder why the current price did not move.'
    ) @(
        'Increments are configurable per auction.',
        'The button is disabled when the auction is in the final seconds to prevent edge-case ties.'
    )

    Add-Page 'Live Room - Premium Room Modes' 'live_modes' 'The Premium Room status chip shows the auction tier (Premium, VIP, Standard).' @(
        'Each live auction has a "mode" chip that describes the tier of the event. Premium auctions get a gold ring around the room, Standard auctions get a neutral one. The chip is purely visual; it does not change the underlying behavior.',
        'This was a marketing touch suggested during user testing - testers said the rooms felt "indistinguishable" until we added the mode chips.'
    ) @(
        'Mode is stored as a column on the auctions table and rendered via a CSS class.'
    )

    # =============================================================
    # PART VI - ADMIN PANEL
    # =============================================================
    Add-Heading 'Part VI - Admin Control Center' 1
    Add-Para 'The administrator panel is the largest area of the application. It exposes KPIs, an auction table with full CRUD, three moderation tabs (Live, Pending, Suspended), a featured monitoring card, daily reports, user management, notifications, settlement and the token ledger. The next pages cover each of these in turn.'
    Add-PageBreak

    Add-Page 'Admin - Dashboard Top' 'admin_dashboard' 'Top of Admin.html with unified banner, admin badge, navigation and KPI cards.' @(
        'The admin dashboard opens with a control center hero, a live monitoring chip, and four KPI cards: Total Auctions, Live Now, Pending Review and Suspended.',
        'The unified banner here matches every other page exactly - the same 84 px height, 64 px logo slots, and same nav font - thanks to the single CSS block added to style.css.'
    ) @(
        'Admin badge in the brand-block reads "Admin Control Center".',
        'Header navigation includes Dashboard, Auctions, Users, Monitoring, Reports and Database links.'
    )

    Add-Page 'Admin - Filter Toolbar' 'admin_toolbar' 'The filter toolbar with category, status, sort, search and action buttons.' @(
        'Above the auction table the admin can filter by category, status (Live / Active / Pending / Suspended / Ended), and sort by newest / oldest / price / bids. A free-text search box matches against id, title, seller and category fields.',
        'On the right are three action buttons: Add Auction (opens the seller studio), Seed Demo Auctions, and Run Settlement.'
    ) @(
        'Filters are applied client-side after the initial fetch so the table feels instant.',
        'Seed Demo Auctions inserts 12 sample auctions for demo runs.'
    )

    Add-Page 'Admin - KPI Cards' 'admin_stats' 'Four KPI cards summarizing platform health.' @(
        'The four KPI cards in the hero use big Bebas Neue numerals on a soft dark background. They update every time fetchAll() returns - which happens after every approve, reject, delete and seed action.',
        'Total Auctions counts every row regardless of status; Live Now counts only auction_type = live; Pending Review counts status = pending; Suspended counts status = suspended.'
    ) @(
        'KPI cards are also clickable in a future improvement to drill into the matching subset.',
        'The card layout collapses to two columns at 980 px and to one column on mobile.'
    )

    Add-Page 'Admin - Featured Monitoring Card' 'admin_featured' 'The featured card shows the most important live auction with Edit and Delete actions.' @(
        'Beside the KPIs sits a Featured Monitoring card. It picks the first live auction (or the most recent one if none are live) and shows its title, description, current bid, time remaining, seller and a pair of Edit / Delete buttons.',
        'The card uses a CSS animated sheen overlay to indicate that it is the "spotlight" item, which testers found genuinely useful for spotting issues in real time.'
    ) @(
        'Edit opens the same modal as the table row Edit button.',
        'Delete opens the standard delete confirmation modal.'
    )

    Add-Page 'Admin - Auction Table' 'admin_table' 'The auction management table with id, title, seller, category, price, status, time and actions.' @(
        'The main auction table is the heart of the admin panel. Each row shows a thumbnail, title, id, seller, category, current price, status badge, time and a column of mini-buttons: More, Approve (only when pending), Edit, Reject and Delete.',
        'The table is fully filterable and sortable through the toolbar above it. Status badges use color coding: green for active, gold for pending, red for suspended, gray for ended.'
    ) @(
        'Min-width of 1000 px - on smaller screens the table scrolls horizontally inside its wrap.',
        'Rows are striped via a subtle border-top to keep dense rows readable.'
    )

    Add-Page 'Admin - Expanded Details Row' 'admin_more' 'Clicking More expands a secondary row with starting price, expected final price, max review and description.' @(
        'Each table row has a More button that toggles a hidden secondary row with extra detail pills: Starting Price, Expected Final, Max Review, and a wide Description tile. Clicking More toggles to Less and vice versa.',
        'This pattern keeps the main table compact while making the extra detail one click away. It also avoids modal fatigue.'
    ) @(
        'The expanded row spans 7 columns to fill the table width.',
        'Description text wraps cleanly and respects line breaks.'
    )

    Add-Page 'Admin - Edit Modal' 'admin_edit' 'The Edit Auction modal with Title, Seller, Category, Bid, Status, Time and Description.' @(
        'The Edit modal opens when the admin clicks Edit on a row or on the featured card. It contains every field the backend supports through /api/update-auction.php: title, description, category, current_price, end_time and status.',
        'The Bids Count input that used to exist was removed because the API never accepted it. The Seller field is now read-only with a tooltip explaining why - small but important corrections from the previous version.'
    ) @(
        'Save Changes disables the button while the request is in flight to prevent double-submits.',
        'Cancel and modal background clicks both close the modal without saving.'
    )

    Add-Page 'Admin - Delete Confirmation' 'admin_delete' 'The Delete modal asks for confirmation before removing an auction permanently.' @(
        'Deleting an auction is destructive so it always goes through a confirmation modal that quotes the auction title verbatim ("Are you sure you want to delete X?"). Only the gold Delete button actually fires the API call; clicking the dark background or Cancel closes the modal.',
        'Behind the scenes the delete endpoint also removes related bids and favorites to maintain referential integrity.'
    ) @(
        'The modal uses the .btn-danger style for the final Delete button.',
        'There is no undo - this is intentional to keep the data model simple.'
    )

    Add-Page 'Admin - Pending Auctions Tab' 'admin_pending' 'The Pending Review tab lists every auction awaiting approval.' @(
        'Switching to the Pending Review tab below the table shows a list of pending auctions with image, title, seller, category, expected price and max review fields. Each card has Approve, Reject and Delete buttons.',
        'Approving routes through /api/approve-auction.php which sets status = approved. Rejecting sets status = rejected. Both refresh the list and the KPIs.'
    ) @(
        'Empty state ("no pending auctions") uses the muted gold panel.',
        'The tab badge could be enhanced to show the pending count next to the label.'
    )

    Add-Page 'Admin - Pending High-Value Bids' 'admin_pendingbids' 'High Bid Requests section listing bids awaiting admin approval.' @(
        'Below the pending auctions list, a separate High Bid Requests section lists bids whose amount exceeds max_acceptable_price. Each entry shows the auction title, bidder, category, requested bid amount and current price.',
        'Approving the bid promotes it to status = approved and updates the auction current_price atomically. Rejecting keeps the auction price unchanged.'
    ) @(
        'A Refresh button at the top of the section re-fetches the list on demand.',
        'Both buttons are debounced via a confirmation dialog.'
    )

    Add-Page 'Admin - Suspended Tab' 'admin_suspended' 'The Suspended tab shows auctions that were manually halted by an admin.' @(
        'Suspended auctions are not visible on the public marketplace but are not deleted either. The Suspended tab lets the admin Reactivate (back to approved), Edit, or Delete each one. The buttons are now real event-listener bound buttons; the earlier inline onclick attributes have been replaced.',
        'Reactivating requires a confirmation step to prevent accidental clicks. Edit opens the standard modal.'
    ) @(
        'Each card shows seller name, category and current price for context.',
        'Empty state uses the muted panel and Arabic copy.'
    )

    Add-Page 'Admin - Live Grid' 'admin_live' 'The Live Auctions grid showing every currently-live auction as a card.' @(
        'The Live tab shows a grid of live auctions, each with cover image, title, seller, current bid, time remaining and three actions: View, Edit and Stop. Stop is equivalent to Reject and halts the auction.',
        'This view is the fastest way for an admin to spot a misbehaving live room mid-event.'
    ) @(
        'Status badge uses the green Live color.',
        'Cards collapse to a single column on small screens.'
    )

    Add-Page 'Admin - Notifications Bell' 'admin_notif' 'The notification dropdown showing pending items, high bids and live counts.' @(
        'The [bell] bell in the header now opens a fully wired notifications dropdown. The badge on the bell counts unread items since the last "Mark all read" action, and persists that timestamp in localStorage.',
        'Each item is clickable and jumps the user to the relevant tab in the admin panel - clicking a pending-auction item activates the Pending tab and scrolls to it, for example.'
    ) @(
        'Items include: pending auctions, high-value bid requests, suspended auctions and the live count.',
        'Empty state reads "You''re all caught up.".'
    )

    Add-Page 'Admin - Users Modal' 'admin_users' 'The Users Management modal listing every user with online status, role and activity.' @(
        'The Users modal opens from the Users navigation link or the Manage Users quick action. It shows three KPI cards at the top (total / online / offline), then a table of every user with avatar initial, role, status, last seen, auctions count, bids count, tokens and join date.',
        'Online status is computed server-side based on last_seen ping within the last 5 minutes.'
    ) @(
        'Refresh button re-queries /api/get-users-admin.php on demand.',
        'Role badge color uses live for admin, pending for employee, active for user.'
    )

    Add-Page 'Admin - Reports Modal' 'admin_reports' 'Daily reports modal with a day picker on the left and a printable summary on the right.' @(
        'The Reports modal calls /api/admin-report.php which returns a day-by-day summary: total auctions, approved, pending, rejected, total bids, approved bids, high bids pending, rejected bids, highest bid and new users.',
        'The left column is a stack of day buttons; the right column is the summary. A Print button opens a clean printable window for export.'
    ) @(
        'Day labels include the date and aggregated counts so the admin can spot anomalies at a glance.',
        'The date input at the top lets the admin jump to any date directly.'
    )

    # =============================================================
    # PART VII - EMPLOYEE PANEL
    # =============================================================
    Add-Heading 'Part VII - Employee Panel' 1
    Add-Para 'Employees have a slimmer panel focused on review duties. The next two pages walk through it.'
    Add-PageBreak

    Add-Page 'Employee - Dashboard' 'emp_dashboard' 'Employee.html dashboard with KPIs and a pending list.' @(
        'Employees see a simpler dashboard with two KPI cards (Pending, Approved Today) and a list of pending auctions. They do not have access to the user management, reports or token ledger features.',
        'The role check happens client-side at the top of Employee.html and server-side on every API endpoint.'
    ) @(
        'Header reads "Employee Panel" via the admin-badge component.',
        'Logout button uses the same handler as the admin panel.'
    )

    Add-Page 'Employee - Review Actions' 'emp_review' 'An employee approving or rejecting a pending auction.' @(
        'Each pending auction card has Approve and Reject buttons. Approving sets status = approved and the auction becomes public immediately. Rejecting sets status = rejected and the auction remains hidden.',
        'Both actions also surface in the admin Recent Activity feed so the admin can audit employee decisions.'
    ) @(
        'Confirmation is required for rejection to prevent accidental clicks.',
        'The approve/reject endpoints check the role server-side regardless of the client.'
    )

    # =============================================================
    # PART VIII - DATABASE
    # =============================================================
    Add-Heading 'Part VIII - Database Schema' 1
    Add-Para 'The mazad_db database holds every row Mazad needs. The next pages show phpMyAdmin screenshots of the principal tables and explain how each one ties into the application.'
    Add-PageBreak

    Add-Page 'Database - users Table' 'db_users' 'phpMyAdmin view of the users table.' @(
        'The users table stores all account data. The id column is auto-increment and is referenced by auctions.user_id, bids.user_id, favorites.user_id and token_ledger.user_id. The password column holds bcrypt hashes - legacy plain-text rows are auto-migrated to bcrypt on first successful login.',
        'role is a string column with values "user", "employee" or "admin". The server checks this on every protected endpoint.'
    ) @(
        'avatar stores the filename of the uploaded image, not the binary blob.',
        'last_seen is updated on every authenticated request for online-status detection.'
    )

    Add-Page 'Database - auctions Table' 'db_auctions' 'phpMyAdmin view of the auctions table.' @(
        'The auctions table is the busiest. start_price, current_price, expected_final_price and max_acceptable_price are decimal columns; status is one of pending / approved / suspended / rejected / Ended; auction_type is standard or live; images is a JSON array of filenames.',
        'Every row joins back to users by user_id to resolve the seller name.'
    ) @(
        'created_at is set by the server, never trusted from the client.',
        'end_time can be NULL for live auctions which end manually.'
    )

    Add-Page 'Database - bids Table' 'db_bids' 'phpMyAdmin view of the bids table.' @(
        'Each bid is a row with auction_id, user_id, bid_amount, status and review_reason. High-value bids land with status = pending until an admin approves them; approved bids update auctions.current_price atomically.',
        'Indexes on auction_id and user_id keep the bid-history queries fast.'
    ) @(
        'review_reason is human-readable text like "High value bid".',
        'rejected bids remain in the table for audit but do not affect current_price.'
    )

    Add-Page 'Database - favorites Table' 'db_favs' 'phpMyAdmin view of the favorites table.' @(
        'favorites is a simple join table with user_id, auction_id and created_at. The combination of user_id + auction_id is unique so a user cannot favorite the same auction twice.',
        'When an auction is deleted, all of its favorites rows are removed by the delete endpoint to maintain referential integrity.'
    ) @(
        'The endpoints use prepared statements - this was rewritten after we discovered the original code was vulnerable to SQL injection.'
    )

    Add-Page 'Database - token_ledger Table' 'db_tokens' 'phpMyAdmin view of the token_ledger table.' @(
        'token_ledger records every credit and debit of tokens. Each row has user_id, auction_id (nullable), delta (positive or negative), reason and created_at. The current balance is computed by summing all deltas for a user, then mapped to a rank title via static thresholds.',
        'Settlement runs (triggered from the admin panel) iterate over recently-ended auctions and write the appropriate ledger entries.'
    ) @(
        'No rows are ever deleted - corrections are made by inserting a compensating row.',
        'The ledger is also surfaced to the admin via the Token Ledger modal.'
    )

    # =============================================================
    # PART IX - PROBLEMS WE ENCOUNTERED
    # =============================================================
    Add-Heading 'Part IX - Problems We Encountered' 1
    Add-Para 'Every project teaches its team a different lesson; ours taught us how many small assumptions silently break a system. This part of the report walks through ten problems we hit during development and how we fixed each one. Most of these fixes started as conversations with Dr. Sufyan and ended in a commit that made the codebase visibly stronger.'
    Add-PageBreak

    Add-Page 'Problem 1 - SQL Injection in Favorites' 'prob_sqli' 'The original favorites endpoints concatenated user input directly into SQL.' @(
        'The first version of add-favorite.php and remove-favorite.php interpolated user_id and auction_id directly into the SQL string. A malicious user could craft a parameter that bypassed authentication entirely.',
        'The fix was straightforward but mandatory: rewrite every favorites endpoint to use mysqli prepared statements with bound parameters. Dr. Sufyan pointed us at this within an hour of his first code review.'
    ) @(
        'The same pattern was applied retroactively to every endpoint that touched user-supplied IDs.',
        'A future improvement is to add a small wrapper around the connection that refuses non-prepared queries entirely.'
    )

    Add-Page 'Problem 2 - Inconsistent Banner' 'prob_banner' 'Side-by-side comparison of the banner before and after the unified header rule.' @(
        'Every HTML page had its own copy of the header markup, which diverged over time. Some pages had a kicker line, some had only the language switch, and at narrow widths the grid collapsed and the banner stacked vertically. Pages did not feel like the same product.',
        'The fix was a single CSS block at the end of style.css that locks the banner height to 84 px, the logo slots to 64 px, and disables wrapping on the right-hand side. No HTML had to be touched.'
    ) @(
        'Three media queries shrink the banner further at 1200, 980 and 720 px.',
        'The banner now looks identical on Home, Admin, Live and Profile.'
    )

    Add-Page 'Problem 3 - Static Auction Cards' 'prob_static' 'The home page used to ship hundreds of hardcoded article cards.' @(
        'The first version of index.html shipped over 150 hardcoded auction cards in the HTML. Updating prices meant editing the markup by hand. New listings did not appear without a deploy.',
        'We deleted all of them, replaced them with empty rail containers, and added loadCategoryRailsFromAPI() / loadAuctionsFromAPI() that fetches real data from /api/api/get-auctions.php. This change alone removed roughly 4000 lines of HTML.'
    ) @(
        'The same refactor applied to every category page.',
        'Empty states are now first-class instead of being "the page is broken".'
    )

    Add-Page 'Problem 4 - Wrong require_once Path' 'prob_login_path' 'A simple path bug in get-auctions.php returned 500 for every request.' @(
        'api/api/get-auctions.php required ../config/db.php but the script is nested two directories deep, so the correct relative path was ../../config/db.php. Every request to the endpoint returned a 500 with no body.',
        'The fix was the smallest possible diff (one .. added) but it took half a day to find because the front-end fetch just logged an opaque "fetch error" and we assumed the bug was on the JavaScript side.'
    ) @(
        'Lesson learned: log full backend stack traces to a file during development.'
    )

    Add-Page 'Problem 5 - Missing Columns on approve-auction' 'prob_approval' 'The approve-auction endpoint referenced approved_by and approved_at columns that did not exist.' @(
        'A copy-pasted snippet from an earlier prototype included UPDATE columns approved_by and approved_at that we never created in the final schema. The endpoint always failed with "Unknown column" and the admin Approve button silently did nothing.',
        'The fix was to remove the two columns from the SQL statement. We considered adding them to the schema instead - this would have given us audit data - but the project deadline made the simpler fix more attractive.'
    ) @(
        'A future improvement would be re-adding both columns and surfacing approver identity in the audit trail.'
    )

    Add-Page 'Problem 6 - Leftover Diff Markers' 'prob_diff' 'A PHP file shipped with leftover "+" diff markers from a copy-paste.' @(
        'After a particularly messy git rebase, api/add-auction.php was committed with leftover "+" markers from a diff. PHP saw them as syntax errors and the entire add-auction endpoint returned a parse error to every caller.',
        'The fix was to remove the markers and verify the file syntax with php -l before committing. We also added a pre-commit habit of running git diff --check.'
    ) @(
        'This was a wake-up call to actually read the diff before committing.'
    )

    Add-Page 'Problem 7 - Admin Panel Used Static Data' 'prob_admin_static' 'The original admin.js shipped with 400 lines of hardcoded fake auctions.' @(
        'A first-draft admin.js contained a long literal array of fake auctions used during early demos. The wiring to the real API was added later, but the static array was never deleted, so the admin saw demo data side-by-side with real data.',
        'The fix was to delete the entire static section and ensure every render path read from allAuctions, which is populated by fetchAll(). This made the admin panel reflect the actual database for the first time.'
    ) @(
        'The seed-demo button replaced the need for hardcoded demo data.'
    )

    Add-Page 'Problem 8 - Plain-Text Passwords' 'prob_pw_legacy' 'Early registration stored passwords as plain text in the users table.' @(
        'The very first version of register.php stored passwords as plain text - the implementer was just trying to make login work end-to-end. Once that was working we needed to migrate to bcrypt without breaking existing accounts.',
        'The login endpoint now does a two-step check: if password_verify succeeds, accept; if it fails, check whether the stored value matches the plain text; if so, accept and rewrite the column with password_hash. After enough logins, every legacy account naturally upgrades.'
    ) @(
        'New registrations always use password_hash from the start.',
        'No plain-text password ever leaves the server.'
    )

    Add-Page 'Problem 9 - PowerShell Em-Dash Encoding' 'prob_encoding' 'PowerShell 5.1 choked on em-dashes in the build script.' @(
        'When generating this very report, the first build-report.ps1 file was saved as UTF-8 (no BOM). PowerShell 5.1 reads scripts as Windows-1252 by default, so every em-dash showed up as a multi-byte garbage sequence and the parser threw "Missing )" errors all over the file.',
        'The fix was simple - replace every em-dash with a regular hyphen via sed. The lesson was less simple: be explicit about file encoding when interoperating between tools.'
    ) @(
        'A future improvement would be to write the script with an explicit UTF-8 BOM.',
        'pwsh 7 (PowerShell Core) handles UTF-8 by default and would have avoided this.'
    )

    Add-Page 'Problem 10 - Force Push and Merge Conflicts' 'prob_force_push' 'A divergent push from another machine led to a merge that needed careful resolution.' @(
        'Late in the project we had two parallel commits: one on this machine adding the banner / login / admin features, and one pushed to GitHub from another session that touched the same files. git pull --rebase surfaced three conflict files; we manually resolved each.',
        'The lesson here is to pull before starting a new chunk of work, and to commit early and often so that conflicts stay small. After the merge, we force-pushed the local branch with --force-with-lease so the remote reflected the desired state.'
    ) @(
        'force-with-lease is safer than plain --force because it refuses to overwrite remote commits that arrived after the local fetch.'
    )

    # =============================================================
    # PART X - SOURCES & REFERENCES
    # =============================================================
    Add-Heading 'Part X - Sources and References' 1
    Add-Para 'Mazad was built primarily from official documentation, a small set of curated tutorials, and the patient mentoring of Dr. Sufyan. The next pages list each source with a note about how it influenced the project.'
    Add-PageBreak

    Add-Heading 'Dr. Sufyan - The Savior of Our Journey' 2
    Add-Para 'No reference list could fairly start anywhere else. Dr. Sufyan is the reason this project crossed the finish line. He read our code at three different stages of the project, each time finding the exact thing that was holding us back. The first review spotted SQL injection in our favorites endpoints; the second review pushed us toward a unified header instead of patching each HTML file; the third review walked us through a polling design for live auctions when WebSockets felt out of reach.'
    Add-Para 'Beyond the code, Dr. Sufyan taught us how to think about a software product. He repeatedly reminded us that "the database is the contract" and that "the simplest thing that could possibly work is usually the right next step." Both phrases live above our editors now.'
    Add-Para 'When we were stuck and the deadline was close, Dr. Sufyan made time to sit with us. He explained why password_hash matters in a single sentence and then made us write the code ourselves instead of giving it to us. That balance - patient teaching combined with refusing to do our work for us - is the reason we learned anything from this project at all.'
    Add-Para 'Thank you, Dr. Sufyan. We will keep talking about you long after the demo day is over.'
    Add-PageBreak

    Add-Heading 'Other Sources' 2
    Add-Bullet 'PHP official manual (php.net) - prepared statements, password_hash, session management, file uploads.'
    Add-Bullet 'MDN Web Docs - HTML form elements, fetch API, FormData, accessibility patterns.'
    Add-Bullet 'MySQL official documentation - schema design, indexing, JOIN patterns.'
    Add-Bullet 'CSS-Tricks articles on grid layouts, sticky headers and responsive typography.'
    Add-Bullet 'Google Translate Element API documentation for the bilingual toggle.'
    Add-Bullet 'XAMPP documentation for local Apache + MySQL setup on Windows.'
    Add-Bullet 'Stack Overflow community for edge cases (encoding, COM automation, mysqli quirks).'
    Add-Bullet 'GitHub Docs - pull requests, force-with-lease semantics, conflict resolution.'
    Add-PageBreak

    # =============================================================
    # PART XI - CONCLUSION
    # =============================================================
    Add-Heading 'Part XI - Conclusion' 1
    Add-Para 'Mazad demonstrates a complete auction platform delivered with conventional web technologies and clear separation between presentation, application and data layers. We started from a few rough sketches and ended with twenty PHP endpoints, eighteen HTML pages, thirteen CSS files and seventeen JavaScript modules - all wired together by a shared header banner, a sign-in flow that finally slides smoothly between Login and Register, and an admin panel that surfaces every action the platform needs in one place.'
    Add-Para 'The most recent iteration completed the administrative workflows (notifications bell, suspended panel, edit modal cleanup), unified the visual identity across every page, and modernised the sign-in experience with a horizontal slide transition, password strength meter and Remember-me persistence. Each of those was small in isolation but together they pulled the project from "demo-ready" to "production-feeling."'
    Add-Para 'Future work would include real WebSocket-based live bidding, sub-categories and price-range filters, a payment gateway for settling won auctions, mobile-app companions, and a richer search index. We have also kept a backlog of polish items - a drag-to-reorder gallery in the seller studio, a lightbox on the auction detail page, optimistic UI for bid placement - that we would tackle in a second sprint.'
    Add-Para 'Above all, this project taught us how to make decisions with the user in mind. Every refactor on the way to this report had the same question behind it: "would a person trying to bid on a watch at 11 pm understand this screen on the first try?" That question, and the patient mentoring of Dr. Sufyan, are the two things we are taking with us from Mazad.'

    Add-Heading 'Appendix A - Demo Accounts' 2
    Add-Bullet 'admin@mazad.local / 123456  (role: admin)'
    Add-Bullet 'seller@mazad.local / 123456  (role: user, sells items)'
    Add-Bullet 'buyer@mazad.local  / 123456  (role: user, places bids)'

    Add-Heading 'Appendix B - Running Locally' 2
    Add-Bullet 'Start Apache and MySQL from the XAMPP control panel.'
    Add-Bullet 'Import the database export into MySQL as mazad_db.'
    Add-Bullet 'Browse to http://localhost/mazad/ in any modern browser.'
    Add-Bullet 'Sign in at /mazad/login.html with one of the demo accounts above.'

    Add-Heading 'Appendix C - Screenshot Slots' 2
    Add-Para 'Each [ INSERT SCREENSHOT: SLOT ] placeholder in this report corresponds to a filename in report/screenshots/. Re-running the build script will embed any matching image. Supported extensions: .png, .jpg, .jpeg.'

    # ========== SAVE ==========
    if (Test-Path $outputPath) { Remove-Item $outputPath -Force }
    [void]$doc.GetType().InvokeMember(
        'SaveAs2',
        [System.Reflection.BindingFlags]::InvokeMethod,
        $null,
        $doc,
        @([string]$outputPath)
    )
    $doc.Close()
    Write-Output "Saved: $outputPath"
}
finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
