export interface IndustryContent {
  slug: string;
  title: string;
  eyebrow: string;
  headline: string;
  subhead: string;
  image: string;
  imageAlt: string;
  seo: { title: string; description: string; keywords: string[] };
  stats: { value: string; label: string }[];
  pains: { pain: string; solution: string }[];
  menu: { name: string; price: string; duration: string }[];
  features: string[];
  testimonial: { quote: string; name: string; role: string; business: string; city: string };
  faqs: { q: string; a: string }[];
}

export const industries: IndustryContent[] = [
  {
    slug: "auto-detailing",
    title: "Auto Detailing",
    eyebrow: "For detailing studios & shops",
    headline: "Run a five-star detailing shop without living on your phone.",
    subhead:
      "From $79 maintenance washes to $850 two-stage corrections, Lustra books, quotes, schedules, inspects, collects and follows up — so you can spend your hours on paint, not paperwork.",
    image: "/images/foam-wash.webp",
    imageAlt: "Detailer applying snow foam to a red car in a detailing studio",
    seo: {
      title: "Auto Detailing Software — Booking, CRM & Payments",
      description:
        "All-in-one auto detailing software: online booking, quotes, job board, inspections, payments, memberships and automated follow-ups.",
      keywords: ["auto detailing software", "car detailing CRM", "detailing business app", "detailing shop management software"],
    },
    stats: [
      { value: "38%", label: "more booked jobs" },
      { value: "9h", label: "admin saved weekly" },
      { value: "4.9★", label: "average shop rating" },
    ],
    pains: [
      { pain: "Customers text at 11pm asking for prices and availability.", solution: "A booking page that quotes and books 24/7 with real-time availability." },
      { pain: "Interior jobs balloon because of pet hair and stains nobody quoted.", solution: "Condition-aware Copilot quotes add the right upcharges before you start." },
      { pain: "Regulars disappear between details.", solution: "Maintenance memberships and automatic 'time for a refresh' follow-ups." },
    ],
    menu: [
      { name: "Maintenance Wash", price: "$79", duration: "1h" },
      { name: "Interior Deep Clean", price: "$189", duration: "3h" },
      { name: "Full Detail", price: "$249", duration: "4h" },
      { name: "Paint Correction — Stage 1", price: "$450", duration: "6h" },
      { name: "Engine Bay Detail", price: "$89", duration: "1h" },
    ],
    features: ["online-booking", "quote-copilot", "memberships", "workflow-automations"],
    testimonial: {
      quote: "We went from a whiteboard and three group chats to one live board. Saturday used to be chaos — now the team just looks at the TV and knows what's next.",
      name: "Marcus Vellani",
      role: "Owner",
      business: "Gloss Theory Detail Studio",
      city: "Scottsdale, AZ",
    },
    faqs: [
      { q: "Is Lustra good for a one-person detailing business?", a: "Yes. Express at $70/month gives a solo detailer booking-ready quotes, invoices, reminders, inspections and payments — and you can add teammates any time at no extra cost." },
      { q: "Can I import my existing customers?", a: "Yes. Data import is free on every plan — send us a CSV export from your current tool and we'll bring customers, vehicles and history across." },
    ],
  },
  {
    slug: "ceramic-coating",
    title: "Ceramic Coating",
    eyebrow: "For certified coating installers",
    headline: "Sell protection as an asset, not a line item.",
    subhead:
      "Quote multi-year coatings with prep built in, schedule cure time correctly, issue verifiable warranty certificates and book every annual maintenance before the customer forgets.",
    image: "/images/ceramic-polish.webp",
    imageAlt: "Installer polishing paint before applying a ceramic coating",
    seo: {
      title: "Ceramic Coating Business Software",
      description:
        "Software for ceramic coating installers: correction-aware quotes, cure-time scheduling, QR warranty certificates and maintenance automations.",
      keywords: ["ceramic coating software", "ceramic coating CRM", "coating warranty certificate", "ceramic coating business app"],
    },
    stats: [
      { value: "+31%", label: "maintenance rebookings" },
      { value: "1 scan", label: "warranty verification" },
      { value: "$1,640", label: "avg. coating ticket" },
    ],
    pains: [
      { pain: "Customers balk at price because they don't see the prep work.", solution: "Itemized quotes show correction, decon and coating separately, with good/better/best add-ons." },
      { pain: "Warranty claims depend on paper cards nobody keeps.", solution: "QR-verifiable certificates linked to the vehicle and installer, forever." },
      { pain: "Annual maintenance visits fall through the cracks.", solution: "An 11-month automation that texts, links to booking and fills the calendar." },
    ],
    menu: [
      { name: "Ceramic Coating — 1 Year", price: "$699", duration: "1 day" },
      { name: "Ceramic Coating — 5 Year", price: "$1,299", duration: "2 days" },
      { name: "9H Lifetime Coating", price: "$1,999", duration: "2–3 days" },
      { name: "Paint Correction — Stage 2", price: "$850", duration: "1 day" },
      { name: "Coating Maintenance Wash", price: "$129", duration: "2h" },
    ],
    features: ["warranty-certificates", "quote-copilot", "workflow-automations", "smart-scheduling"],
    testimonial: {
      quote: "The certificates alone changed our close rate. Customers scan the QR in the shop and you can see it click — this is real, this is protected.",
      name: "Danielle Okafor",
      role: "Founder",
      business: "Halo Ceramic Lab",
      city: "Charlotte, NC",
    },
    faqs: [
      { q: "Can I issue certificates for any coating brand?", a: "Yes. Certificates record the product, coverage and term you choose, so they work with any coating line you're certified on." },
      { q: "Can Lustra block cure time on the calendar?", a: "Yes. Service durations and multi-day jobs reserve the bay for the full cure window." },
    ],
  },
  {
    slug: "paint-protection-film",
    title: "Paint Protection Film",
    eyebrow: "For PPF installers",
    headline: "Quote, sell and schedule PPF packages like a flagship studio.",
    subhead:
      "Partial front, full front, track pack, full body — present tiers visually with the 3D Visualizer, lock in deposits, schedule multi-day installs and issue film warranties customers can verify.",
    image: "/images/ppf-install.webp",
    imageAlt: "PPF installer applying clear paint protection film to a car hood",
    seo: {
      title: "PPF Shop Software — Paint Protection Film CRM",
      description:
        "Paint protection film software: package quoting, 3D visualizer, deposits, multi-day scheduling, inventory and warranty certificates.",
      keywords: ["PPF software", "paint protection film CRM", "PPF quote tool", "clear bra shop software", "PPF installer app"],
    },
    stats: [
      { value: "$2,950", label: "avg. PPF ticket on Lustra" },
      { value: "+27%", label: "full-front → full-body upgrades" },
      { value: "−80%", label: "deposit no-shows" },
    ],
    pains: [
      { pain: "Customers can't picture the difference between coverage tiers.", solution: "Show partial, full front, track pack and full body on their exact car in 3D." },
      { pain: "Big tickets get ghosted after the quote.", solution: "Portal quotes with e-signature, deposits and automated nudges." },
      { pain: "Running out of a film SKU mid-install.", solution: "Roll-level inventory with low-stock alerts." },
    ],
    menu: [
      { name: "Partial Front PPF", price: "$995", duration: "1 day" },
      { name: "Full Front PPF", price: "$1,800", duration: "1–2 days" },
      { name: "Track Pack PPF", price: "$2,400", duration: "2 days" },
      { name: "Full Body PPF", price: "$6,500", duration: "4–5 days" },
      { name: "Headlight & Door Cup Kit", price: "$249", duration: "2h" },
    ],
    features: ["quote-copilot", "customer-portal", "inventory", "warranty-certificates"],
    testimonial: {
      quote: "We put the visualizer on an iPad at the counter. People walk in for a full front and leave with a track pack — and the deposit's already paid.",
      name: "Andre Liang",
      role: "Lead Installer & Owner",
      business: "Clearline PPF Atelier",
      city: "Irvine, CA",
    },
    faqs: [
      { q: "Does the 3D Visualizer show PPF coverage?", a: "Yes. The add-on highlights covered panels for partial front, full front, track pack and full body, and also previews color PPF and satin finishes." },
      { q: "Can I collect a deposit before scheduling?", a: "Yes. Require a deposit on booking or quote approval so install days are locked in." },
    ],
  },
  {
    slug: "window-tint",
    title: "Window Tint",
    eyebrow: "For automotive tint shops",
    headline: "Quote by film and shade in seconds. Fill every bay.",
    subhead:
      "Price ceramic, carbon and windshield tint by vehicle size, show shades on the customer's car, book 90-minute slots precisely and send aftercare instructions automatically.",
    image: "/images/tint-dark.webp",
    imageAlt: "Dark sedan with freshly tinted windows",
    seo: {
      title: "Window Tint Shop Software",
      description:
        "Window tint shop software with fast film-and-shade quoting, tint visualizer, precise scheduling, aftercare automations and payments.",
      keywords: ["window tint software", "tint shop CRM", "tint quote tool", "automotive tint booking"],
    },
    stats: [
      { value: "90s", label: "to quote a full car" },
      { value: "+2.1", label: "jobs per bay per day" },
      { value: "0", label: "missed aftercare texts" },
    ],
    pains: [
      { pain: "The same 'how much for 20% all around?' question, 40 times a day.", solution: "Public pricing on your booking page with instant, size-adjusted totals." },
      { pain: "Customers unsure how dark is too dark.", solution: "Preview 5–70% shades on their vehicle in the 3D Visualizer." },
      { pain: "Comebacks from customers rolling windows down too early.", solution: "Automatic aftercare texts the moment the job is completed." },
    ],
    menu: [
      { name: "Ceramic Tint — Full Car", price: "$399", duration: "2h" },
      { name: "Carbon Tint — Full Car", price: "$249", duration: "2h" },
      { name: "Windshield Ceramic Tint", price: "$199", duration: "1h" },
      { name: "Sunroof / Panoramic Roof", price: "$149", duration: "45m" },
      { name: "Tint Removal", price: "$99", duration: "1h" },
    ],
    features: ["online-booking", "workflow-automations", "smart-scheduling", "payments"],
    testimonial: {
      quote: "Our booking page does the quoting now. Phones are quieter, the bays are fuller, and aftercare texts killed our comebacks.",
      name: "Priya Raman",
      role: "General Manager",
      business: "Shade District Tint Co.",
      city: "Houston, TX",
    },
    faqs: [
      { q: "Does Lustra know my state's tint laws?", a: "Tint laws vary by state and change over time, so Lustra lets you add your own compliance notes to services and quotes. Always confirm current local regulations." },
      { q: "Can customers book online with a specific film?", a: "Yes — each film/shade combination can be its own bookable service with its own price and duration." },
    ],
  },
  {
    slug: "vinyl-wrap",
    title: "Vinyl Wrap",
    eyebrow: "For wrap & graphics shops",
    headline: "From color change to chrome delete — sold in 3D.",
    subhead:
      "Let customers spin their car in satin, matte or gloss before they commit, manage multi-day installs and design approvals, and take deposits that protect your schedule.",
    image: "/images/red-coupe.webp",
    imageAlt: "Bright red coupe showing a high-gloss finish",
    seo: {
      title: "Vinyl Wrap Shop Software",
      description:
        "Software for vinyl wrap shops: 3D color previews, design approvals, deposits, multi-day scheduling and inventory for wrap film.",
      keywords: ["vinyl wrap software", "wrap shop CRM", "car wrap quote tool", "color change wrap visualizer"],
    },
    stats: [
      { value: "$3,800", label: "avg. color change ticket" },
      { value: "2×", label: "faster design approvals" },
      { value: "100%", label: "deposits on wraps" },
    ],
    pains: [
      { pain: "Customers change their mind on color after the film is ordered.", solution: "3D previews plus signed approvals before you order a single roll." },
      { pain: "Week-long installs collide with quick jobs.", solution: "Bay-aware scheduling blocks multi-day wraps cleanly." },
      { pain: "Film waste and leftover rolls nobody tracks.", solution: "Inventory with costs, suppliers and usage logs." },
    ],
    menu: [
      { name: "Full Color Change Wrap", price: "$3,800", duration: "4–5 days" },
      { name: "Chrome Delete", price: "$650", duration: "1 day" },
      { name: "Roof Wrap", price: "$450", duration: "4h" },
      { name: "Commercial Graphics (per vehicle)", price: "$1,200+", duration: "1–2 days" },
      { name: "Caliper Paint", price: "$450", duration: "1 day" },
    ],
    features: ["customer-portal", "smart-scheduling", "inventory", "payments"],
    testimonial: {
      quote: "Customers used to bring us screenshots from forums. Now they design it with us in 3D, sign off, and pay the deposit before they leave.",
      name: "Tomasz Brennan",
      role: "Owner",
      business: "Satin Republic Wraps",
      city: "Denver, CO",
    },
    faqs: [
      { q: "Does the visualizer include matte and satin finishes?", a: "Yes. Gloss, satin, matte and metallic/chrome finishes are all previewable with realistic reflections." },
      { q: "Can I manage commercial fleet wraps?", a: "Yes. Multi-vehicle jobs, ACH payments and company customers are supported." },
    ],
  },
  {
    slug: "mobile-detailing",
    title: "Mobile Detailing",
    eyebrow: "For crews on the road",
    headline: "Your whole business, in the van.",
    subhead:
      "Optimized routes, on-my-way texts, driveway inspections, tap-to-pay and tips — Lustra is built to work one-handed in a customer's driveway.",
    image: "/images/mobile-detailing.webp",
    imageAlt: "Mobile detailer hand-drying a car on location",
    seo: {
      title: "Mobile Detailing App — Routing, Booking & Payments",
      description:
        "The mobile detailing app for routing, online booking, on-site inspections, tap-to-pay and automated reminders.",
      keywords: ["mobile detailing app", "mobile detailing software", "mobile car wash app", "mobile detailer scheduling"],
    },
    stats: [
      { value: "+1.4", label: "jobs per day" },
      { value: "−22%", label: "drive time" },
      { value: "35%", label: "fewer no-shows" },
    ],
    pains: [
      { pain: "Zig-zagging across town between appointments.", solution: "Route optimization orders stops to minimize drive time." },
      { pain: "Customer isn't home or the car is locked.", solution: "One-tap on-my-way texts with a live ETA from your optimized route." },
      { pain: "Chasing payments after you've left.", solution: "Tap-to-pay and text-to-pay before you pull away." },
    ],
    menu: [
      { name: "Mobile Express Detail", price: "$129", duration: "1.5h" },
      { name: "Mobile Full Detail", price: "$279", duration: "4h" },
      { name: "Fleet Wash (per vehicle)", price: "$45", duration: "30m" },
      { name: "Pet Hair Removal Add-on", price: "$60", duration: "45m" },
      { name: "Monthly Maintenance Membership", price: "$99/mo", duration: "—" },
    ],
    features: ["mobile-routing", "messaging", "payments", "memberships"],
    testimonial: {
      quote: "Two vans, one app. The guys see their route, the customers get the on-my-way text, and the money's in the account before they're back in the truck.",
      name: "Jordan Pike",
      role: "Owner",
      business: "Driveway Pros Mobile Detailing",
      city: "Tampa, FL",
    },
    faqs: [
      { q: "Does it work on my phone?", a: "Yes — Lustra runs on iPhone, Android and any browser, and installs to your home screen." },
      { q: "Can I charge travel fees?", a: "Yes. Add a travel or service-area fee as a line item or bake it into mobile-specific services." },
    ],
  },
  {
    slug: "marine-detailing",
    title: "Marine Detailing",
    eyebrow: "For boat & yacht detailers",
    headline: "Price by the foot. Schedule by the tide.",
    subhead:
      "Quote oxidation removal, gelcoat restoration and ceramic for boats from 18 to 80 feet, track vessels and slips, and keep seasonal maintenance programs running themselves.",
    image: "/images/marine.webp",
    imageAlt: "White sport-fishing yachts docked at a marina",
    seo: {
      title: "Marine Detailing Software — Boat & Yacht CRM",
      description:
        "Marine detailing software for quoting by length, scheduling at marinas, seasonal maintenance programs and payments.",
      keywords: ["marine detailing software", "boat detailing CRM", "yacht detailing app", "boat oxidation removal quote"],
    },
    stats: [
      { value: "$899", label: "avg. oxidation job" },
      { value: "Seasonal", label: "programs on autopilot" },
      { value: "Per-foot", label: "pricing" },
    ],
    pains: [
      { pain: "Every boat is a different size and condition.", solution: "Size multipliers and condition-aware quoting for vessels." },
      { pain: "Owners are rarely at the dock.", solution: "Portal approvals, inspections and payments from anywhere." },
      { pain: "Seasonal demand spikes and droughts.", solution: "Recurring slip-maintenance jobs that reschedule themselves, plus memberships that bill all year." },
    ],
    menu: [
      { name: "Boat Wash & Wax (per ft)", price: "$22/ft", duration: "varies" },
      { name: "Oxidation Removal", price: "$899", duration: "1–2 days" },
      { name: "Marine Ceramic Coating", price: "$1,800+", duration: "2 days" },
      { name: "Interior & Upholstery", price: "$349", duration: "4h" },
      { name: "Monthly Slip Maintenance", price: "$249/mo", duration: "—" },
    ],
    features: ["memberships", "smart-scheduling", "customer-portal", "digital-inspections"],
    testimonial: {
      quote: "Half our owners live out of state. The portal means they approve, sign and pay from wherever they are — we just keep working.",
      name: "Celeste Moreau",
      role: "Owner",
      business: "Saltline Marine Detailing",
      city: "Fort Lauderdale, FL",
    },
    faqs: [{ q: "Can I store hull length and slip location?", a: "Yes. Vessels are stored as vehicles of type boat with size, notes and any custom details you need." }],
  },
  {
    slug: "flat-glass",
    title: "Flat Glass Film",
    eyebrow: "For residential & commercial film",
    headline: "Square-foot quotes for homes and storefronts.",
    subhead:
      "Quote solar, privacy, security and decorative films by the square foot, schedule multi-day commercial installs and keep every property, window and warranty organized.",
    image: "/images/tint-dark.webp",
    imageAlt: "Dark tinted glass reflecting city lights",
    seo: {
      title: "Flat Glass Window Film Business Software",
      description:
        "Software for residential and commercial window film installers: square-foot quoting, scheduling, warranties and payments.",
      keywords: ["flat glass film software", "window film CRM", "residential window tint software", "commercial window film quote"],
    },
    stats: [
      { value: "Sq-ft", label: "pricing built in" },
      { value: "ACH", label: "for commercial clients" },
      { value: "10-yr", label: "warranty tracking" },
    ],
    pains: [
      { pain: "Measuring and pricing dozens of panes by hand.", solution: "Per-square-foot line items with quantities that total automatically." },
      { pain: "Commercial clients pay by ACH on net terms.", solution: "Invoices with due dates, ACH and payment reminders." },
      { pain: "Long warranties outlive paper records.", solution: "Verifiable certificates tied to the property and install." },
    ],
    menu: [
      { name: "Solar Control Film (per sq ft)", price: "$9/sq ft", duration: "varies" },
      { name: "Privacy / Frosted Film (per sq ft)", price: "$12/sq ft", duration: "varies" },
      { name: "Security Film (per sq ft)", price: "$16/sq ft", duration: "varies" },
      { name: "Decorative Storefront Graphics", price: "$750+", duration: "1 day" },
    ],
    features: ["quote-copilot", "payments", "warranty-certificates", "smart-scheduling"],
    testimonial: {
      quote: "Commercial jobs used to be a spreadsheet nightmare. Now the quote, schedule, invoice and warranty all live together.",
      name: "Rafael Ortega",
      role: "Operations Lead",
      business: "Clearview Architectural Film",
      city: "Phoenix, AZ",
    },
    faqs: [{ q: "Can I quote by square foot?", a: "Yes. Set a unit price per square foot and enter the quantity on each line item." }],
  },
  {
    slug: "landscaping",
    title: "Landscaping",
    eyebrow: "For design-build & maintenance crews",
    headline: "Bids, crews and recurring routes in one place.",
    subhead:
      "Quote installs and maintenance programs, route crews efficiently, document properties with photos and bill recurring contracts automatically.",
    image: "/images/lawn-care.webp",
    imageAlt: "Landscaper on a riding mower cutting a bright green lawn",
    seo: {
      title: "Landscaping Business Software",
      description:
        "Landscaping software for bids, crew scheduling, routing, property photos and recurring maintenance billing.",
      keywords: ["landscaping software", "landscaping CRM", "landscape crew scheduling", "landscaping invoicing app"],
    },
    stats: [
      { value: "Recurring", label: "contracts auto-billed" },
      { value: "−18%", label: "windshield time" },
      { value: "Photo", label: "property records" },
    ],
    pains: [
      { pain: "Bids take hours to assemble.", solution: "Reusable service catalog and fast itemized quotes." },
      { pain: "Crews waste time crossing town.", solution: "Route optimization for daily maintenance runs." },
      { pain: "Re-entering the same weekly visits and chasing monthly payments.", solution: "Recurring jobs that auto-create the next visit, plus memberships with recurring billing." },
    ],
    menu: [
      { name: "Weekly Maintenance (per visit)", price: "$65", duration: "1h" },
      { name: "Seasonal Cleanup", price: "$450", duration: "1 day" },
      { name: "Mulch Install (per yard)", price: "$95/yd", duration: "varies" },
      { name: "Irrigation Check", price: "$120", duration: "1.5h" },
    ],
    features: ["memberships", "smart-scheduling", "mobile-routing", "team-payroll"],
    testimonial: {
      quote: "We run four crews and 300 recurring properties. Lustra bills them, routes them and tells me who's clocked in.",
      name: "Hannah Lindqvist",
      role: "Owner",
      business: "Evergreen & Stone Landscapes",
      city: "Raleigh, NC",
    },
    faqs: [{ q: "Is Lustra only for cars?", a: "Lustra was born in auto appearance, but its quoting, scheduling, routing and recurring billing work beautifully for landscaping crews." }],
  },
  {
    slug: "lawn-care",
    title: "Lawn Care",
    eyebrow: "For mowing & treatment programs",
    headline: "Recurring lawn programs that renew themselves.",
    subhead:
      "Sell mowing and treatment plans, schedule rounds, send on-my-way texts and bill automatically every month — rain or shine.",
    image: "/images/lawn-care.webp",
    imageAlt: "Freshly cut green lawn with a riding mower",
    seo: {
      title: "Lawn Care Business Software",
      description:
        "Lawn care software for recurring mowing and treatment programs, route planning, reminders and automatic billing.",
      keywords: ["lawn care software", "lawn mowing scheduling app", "lawn care CRM", "lawn treatment billing"],
    },
    stats: [
      { value: "Auto", label: "monthly billing" },
      { value: "+12%", label: "stops per route" },
      { value: "98%", label: "text open rate" },
    ],
    pains: [
      { pain: "Customers forget when you're coming.", solution: "Automatic reminders and on-my-way texts." },
      { pain: "Treatment rounds slip through the cracks.", solution: "Weekly, biweekly or monthly recurring jobs — completing one schedules the next automatically." },
      { pain: "Collecting payment door-to-door.", solution: "Saved cards and recurring billing." },
    ],
    menu: [
      { name: "Weekly Mow (standard lot)", price: "$45", duration: "40m" },
      { name: "Fertilization Round", price: "$69", duration: "30m" },
      { name: "Aeration & Overseed", price: "$189", duration: "2h" },
      { name: "Lawn Care Program", price: "$149/mo", duration: "—" },
    ],
    features: ["memberships", "smart-scheduling", "mobile-routing", "messaging"],
    testimonial: {
      quote: "Our programs bill themselves now. I haven't sent a manual invoice since March.",
      name: "Derrick Coleman",
      role: "Owner",
      business: "Greenline Lawn Co.",
      city: "Nashville, TN",
    },
    faqs: [{ q: "Can I run recurring weekly visits?", a: "Yes. Pair recurring jobs with memberships to schedule and bill each round automatically." }],
  },
];

export const industryBySlug = (slug: string) => industries.find((i) => i.slug === slug);
