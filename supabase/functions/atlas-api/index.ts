import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(res: unknown, status = 200): Response {
  return new Response(JSON.stringify(res), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(msg: string, status = 500): Response {
  return json({ error: msg }, status);
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

// ── Auth helpers ────────────────────────────────────────
async function getUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data } = await supabase.auth.getUser(token);
  return data.user;
}

async function getMembership(userId: string) {
  const { data } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", userId);
  return data || [];
}

async function getOrgForUser(userId: string): Promise<{ org_id: string; role: string } | null> {
  const members = await getMembership(userId);
  if (members.length === 0) return null;
  return { org_id: members[0].org_id, role: members[0].role };
}

function requireHost(membership: { org_id: string; role: string } | null) {
  if (!membership || membership.role !== "host") return false;
  return true;
}

// ── Router ──────────────────────────────────────────────
type Handler = (req: Request, params: Record<string, string>, query: Record<string, string>) => Promise<Response>;

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
}

const routes: Route[] = [];

function addRoute(method: string, path: string, handler: Handler) {
  const keys: string[] = [];
  const pattern = new RegExp(
    "^" + path.replace(/:([^/]+)/g, (_, k) => { keys.push(k); return "([^/]+)"; }) + "$"
  );
  routes.push({ method, pattern, keys, handler });
}

async function matchRoute(method: string, pathname: string) {
  for (const r of routes) {
    if (r.method !== method) continue;
    const m = r.pattern.exec(pathname);
    if (m) {
      const params: Record<string, string> = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      return { ...r, params };
    }
  }
  return null;
}

async function getBody(req: Request): Promise<Record<string, unknown>> {
  try { return await req.json(); } catch { return {}; }
}

function parseQuery(url: URL): Record<string, string> {
  const q: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { q[k] = v; });
  return q;
}

// ── Routes ──────────────────────────────────────────────

// Health
addRoute("GET", "/atlas-api/health", async () => json({ status: "ok", service: "atlas-stay" }));

// ── Organizations (white-label) ─────────────────────────
addRoute("GET", "/atlas-api/organization", async (req) => {
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const membership = await getOrgForUser(user.id);
  if (!membership) return errorResponse("No organization found", 404);
  const { data, error } = await supabase.from("organizations").select("*").eq("id", membership.org_id).single();
  if (error) return errorResponse(error.message);
  return json(data);
});

addRoute("PATCH", "/atlas-api/organization", async (req) => {
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const membership = await getOrgForUser(user.id);
  if (!requireHost(membership)) return errorResponse("Host access required", 403);
  const b = await getBody(req);
  const allowed = ["business_name", "logo_url", "brand_color", "currency", "tot_tax_rate", "slug", "admin_email", "business_email", "sxm_marketplace_url", "region", "website_template", "website_config"];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (b[k] !== undefined) updates[k] = b[k];
  if (Object.keys(updates).length === 0) return errorResponse("No valid fields", 400);
  const { data, error } = await supabase.from("organizations").update(updates).eq("id", membership.org_id).select().single();
  if (error) return errorResponse(error.message);
  return json(data);
});

// ── Properties ──────────────────────────────────────────
// Public list (for guest browsing) — only active, no exact GPS
addRoute("GET", "/atlas-api/properties", async (_req, _p, q) => {
  let query = supabase.from("properties").select("*").order("created_at", { ascending: true });
  if (q.active_only === "true") query = query.eq("active", true);
  const { data, error } = await query;
  if (error) return errorResponse(error.message);
  // Strip exact GPS for public access
  const sanitized = (data || []).map((p: Record<string, unknown>) => {
    const { exact_lat, exact_lng, ...rest } = p;
    return rest;
  });
  return json(sanitized);
});

// Host properties (includes exact GPS)
addRoute("GET", "/atlas-api/host/properties", async (req) => {
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const membership = await getOrgForUser(user.id);
  if (!membership) return errorResponse("No organization found", 404);
  const { data, error } = await supabase.from("properties").select("*").eq("org_id", membership.org_id).order("created_at", { ascending: true });
  if (error) return errorResponse(error.message);
  return json(data);
});

addRoute("POST", "/atlas-api/properties", async (req) => {
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const membership = await getOrgForUser(user.id);
  if (!requireHost(membership)) return errorResponse("Host access required", 403);
  const b = await getBody(req);
  if (!b.title || !b.location) return errorResponse("title and location are required", 400);
  const { data, error } = await supabase.from("properties").insert({
    org_id: membership.org_id,
    title: b.title, location: b.location, description: b.description || "",
    bedrooms: b.bedrooms || 1, bathrooms: b.bathrooms || 1, max_guests: b.max_guests || 2,
    base_rate: b.base_rate || 100, cleaning_fee: b.cleaning_fee || 50,
    occupancy_tax_rate: b.occupancy_tax_rate ?? 0.05,
    image_url: b.image_url || "https://images.pexels.com/photos/6585598/pexels-photo-6585598.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    gallery_urls: b.gallery_urls || [], amenities: b.amenities || [],
    latitude: b.latitude, longitude: b.longitude,
    exact_lat: b.exact_lat ?? b.latitude, exact_lng: b.exact_lng ?? b.longitude,
    active: b.active !== false,
    onboarding_tier: b.onboarding_tier || 'native',
    external_listing_url: b.external_listing_url || null,
    contact_email: b.contact_email || null,
    contact_whatsapp: b.contact_whatsapp || null,
    ical_feed_url: b.ical_feed_url || null,
    custom_domain: b.custom_domain || null,
    site_slug: b.site_slug || null,
    region: b.region || 'sint_maarten',
    website_config: b.website_config || null,
  }).select().single();
  if (error) return errorResponse(error.message);
  return json(data, 201);
});

addRoute("PATCH", "/atlas-api/properties/:id", async (req, p) => {
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const membership = await getOrgForUser(user.id);
  if (!requireHost(membership)) return errorResponse("Host access required", 403);
  const b = await getBody(req);
  const allowed = ["title","description","location","bedrooms","bathrooms","max_guests","base_rate","cleaning_fee","occupancy_tax_rate","image_url","gallery_urls","amenities","active","latitude","longitude","exact_lat","exact_lng","onboarding_tier","external_listing_url","contact_email","contact_whatsapp","ical_feed_url","custom_domain","site_slug","region","website_config"];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (b[k] !== undefined) updates[k] = b[k];
  if (Object.keys(updates).length === 0) return errorResponse("No valid fields", 400);
  // Verify ownership
  const { data: prop } = await supabase.from("properties").select("org_id").eq("id", p.id).single();
  if (!prop || prop.org_id !== membership.org_id) return errorResponse("Property not found", 404);
  const { data, error } = await supabase.from("properties").update(updates).eq("id", p.id).select().single();
  if (error) return errorResponse(error.message);
  return json(data);
});

addRoute("DELETE", "/atlas-api/properties/:id", async (req, p) => {
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const membership = await getOrgForUser(user.id);
  if (!requireHost(membership)) return errorResponse("Host access required", 403);
  const { data: prop } = await supabase.from("properties").select("org_id").eq("id", p.id).single();
  if (!prop || prop.org_id !== membership.org_id) return errorResponse("Property not found", 404);
  const { error } = await supabase.from("properties").delete().eq("id", p.id);
  if (error) return errorResponse(error.message);
  return json({ success: true });
});

// ── Single property (for site preview) ──────────────────
addRoute("GET", "/atlas-api/properties/:id", async (_req, p) => {
  const { data, error } = await supabase.from("properties").select("*").eq("id", p.id).single();
  if (error) return errorResponse("Property not found", 404);
  return json(data);
});

// ── Availability ────────────────────────────────────────
addRoute("GET", "/atlas-api/properties/:id/availability", async (_req, p, q) => {
  if (!q.check_in || !q.check_out) {
    const { data, error } = await supabase
      .from("reservations").select("check_in, check_out")
      .eq("property_id", p.id).neq("status", "CANCELLED");
    if (error) return errorResponse(error.message);
    return json({ bookedRanges: data || [] });
  }
  if (q.check_out <= q.check_in) return errorResponse("Check-out must be after check-in", 400);
  const { data, error } = await supabase
    .from("reservations").select("id")
    .eq("property_id", p.id).neq("status", "CANCELLED")
    .lt("check_in", q.check_out).gt("check_out", q.check_in);
  if (error) return errorResponse(error.message);
  return json({ available: (data || []).length === 0, conflicts: data?.length || 0 });
});

// ── Booking ─────────────────────────────────────────────
addRoute("POST", "/atlas-api/properties/:id/book", async (req, p) => {
  const b = await getBody(req);
  if (!b.guest_name || !b.guest_email || !b.check_in || !b.check_out)
    return errorResponse("guest_name, guest_email, check_in, and check_out are required", 400);
  const { data, error } = await supabase.rpc("create_reservation", {
    p_property_id: p.id, p_guest_name: b.guest_name, p_guest_email: b.guest_email,
    p_check_in: b.check_in, p_check_out: b.check_out, p_guests: b.guests || 1,
  });
  if (error) return errorResponse(error.message, 409);
  return json(data, 201);
});

// Get exact GPS for a property (post-booking or host)
addRoute("GET", "/atlas-api/properties/:id/location", async (req, p) => {
  const user = await getUser(req);
  const { data: prop } = await supabase.from("properties").select("exact_lat, exact_lng, org_id").eq("id", p.id).single();
  if (!prop) return errorResponse("Property not found", 404);

  // If user is host of this org, return exact location
  if (user) {
    const membership = await getOrgForUser(user.id);
    if (membership && membership.org_id === prop.org_id && membership.role === "host") {
      return json({ exact_lat: prop.exact_lat, exact_lng: prop.exact_lng, exact: true });
    }
  }

  // Check if guest has a confirmed booking
  const email = new URL(req.url).searchParams.get("email");
  if (email) {
    const { data: reservation } = await supabase
      .from("reservations").select("id").eq("property_id", p.id)
      .eq("guest_email", email).neq("status", "CANCELLED").limit(1);
    if (reservation && reservation.length > 0) {
      return json({ exact_lat: prop.exact_lat, exact_lng: prop.exact_lng, exact: true });
    }
  }

  // Return approximate location (public)
  return json({ exact: false });
});

// ── Reservations (host only) ────────────────────────────
addRoute("GET", "/atlas-api/reservations", async (req) => {
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const membership = await getOrgForUser(user.id);
  if (!membership) return errorResponse("No organization found", 404);
  const { data, error } = await supabase
    .from("reservations").select("*, property:properties(title, image_url)")
    .eq("org_id", membership.org_id).order("created_at", { ascending: false });
  if (error) return errorResponse(error.message);
  return json(data);
});

addRoute("PATCH", "/atlas-api/reservations/:id/status", async (req, p) => {
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const membership = await getOrgForUser(user.id);
  if (!requireHost(membership)) return errorResponse("Host access required", 403);
  const b = await getBody(req);
  const valid = ["PENDING","CONFIRMED","CHECKED_IN","CHECKED_OUT","CANCELLED"];
  if (!valid.includes(b.status as string)) return errorResponse(`status must be one of: ${valid.join(", ")}`, 400);
  const { data: res } = await supabase.from("reservations").select("org_id").eq("id", p.id).single();
  if (!res || res.org_id !== membership.org_id) return errorResponse("Reservation not found", 404);
  const { data, error } = await supabase.from("reservations").update({ status: b.status }).eq("id", p.id).select().single();
  if (error) return errorResponse(error.message);
  return json(data);
});

// ── Cleaning staff (host only) ──────────────────────────
addRoute("GET", "/atlas-api/cleaning/staff", async (req) => {
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const membership = await getOrgForUser(user.id);
  if (!membership) return errorResponse("No organization found", 404);
  const { data, error } = await supabase.from("cleaning_staff").select("*").eq("org_id", membership.org_id).order("name", { ascending: true });
  if (error) return errorResponse(error.message);
  return json(data);
});

addRoute("POST", "/atlas-api/cleaning/staff", async (req) => {
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const membership = await getOrgForUser(user.id);
  if (!requireHost(membership)) return errorResponse("Host access required", 403);
  const b = await getBody(req);
  if (!b.name) return errorResponse("name is required", 400);
  const { data, error } = await supabase.from("cleaning_staff").insert({
    org_id: membership.org_id, name: b.name, phone: b.phone || "", active: true,
  }).select().single();
  if (error) return errorResponse(error.message);
  return json(data, 201);
});

// ── Cleaning tasks (host: all; staff: assigned only) ───
addRoute("GET", "/atlas-api/cleaning/tasks", async (req) => {
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const membership = await getOrgForUser(user.id);
  if (!membership) return errorResponse("No organization found", 404);

  if (membership.role === "host") {
    const { data, error } = await supabase
      .from("cleaning_tasks").select("*, property:properties(title, image_url, location), staff:cleaning_staff(name)")
      .eq("org_id", membership.org_id).order("created_at", { ascending: false });
    if (error) return errorResponse(error.message);
    return json(data);
  } else {
    // Staff: only see tasks assigned to them, and ONLY property title + check dates (no financials)
    const { data: staffRecord } = await supabase
      .from("cleaning_staff").select("id").eq("user_id", user.id).eq("org_id", membership.org_id).single();
    if (!staffRecord) return json([]);
    const { data, error } = await supabase
      .from("cleaning_tasks").select("id, status, notes, due_date, property_id, staff_id, created_at, updated_at, property:properties(title)")
      .eq("org_id", membership.org_id).eq("staff_id", staffRecord.id).order("due_date", { ascending: true });
    if (error) return errorResponse(error.message);
    return json(data);
  }
});

addRoute("POST", "/atlas-api/cleaning/tasks", async (req) => {
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const membership = await getOrgForUser(user.id);
  if (!requireHost(membership)) return errorResponse("Host access required", 403);
  const b = await getBody(req);
  if (!b.property_id) return errorResponse("property_id is required", 400);
  const valid = ["DIRTY","NEEDS_INSPECTION","CLEAN"];
  if (b.status && !valid.includes(b.status as string)) return errorResponse(`status must be one of: ${valid.join(", ")}`, 400);
  const { data, error } = await supabase.from("cleaning_tasks").insert({
    org_id: membership.org_id, property_id: b.property_id, staff_id: b.staff_id || null,
    status: b.status || "DIRTY", notes: b.notes || "", due_date: b.due_date || null,
  }).select().single();
  if (error) return errorResponse(error.message);
  return json(data, 201);
});

addRoute("PATCH", "/atlas-api/cleaning/tasks/:id", async (req, p) => {
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const membership = await getOrgForUser(user.id);
  if (!membership) return errorResponse("No organization found", 404);
  const b = await getBody(req);
  const allowed = ["staff_id","status","notes","due_date"];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) if (b[k] !== undefined) updates[k] = b[k];
  const valid = ["DIRTY","NEEDS_INSPECTION","CLEAN"];
  if (updates.status && !valid.includes(updates.status as string)) return errorResponse(`status must be one of: ${valid.join(", ")}`, 400);

  // Verify task belongs to org
  const { data: task } = await supabase.from("cleaning_tasks").select("org_id, staff_id").eq("id", p.id).single();
  if (!task || task.org_id !== membership.org_id) return errorResponse("Task not found", 404);

  // Staff can only update status of their own tasks
  if (membership.role === "staff") {
    const { data: staffRecord } = await supabase
      .from("cleaning_staff").select("id").eq("user_id", user.id).eq("org_id", membership.org_id).single();
    if (!staffRecord || task.staff_id !== staffRecord.id) return errorResponse("Not assigned to this task", 403);
    // Staff can only change status
    const staffUpdates: Record<string, unknown> = { status: updates.status, updated_at: updates.updated_at };
    const { data, error } = await supabase.from("cleaning_tasks").update(staffUpdates).eq("id", p.id).select().single();
    if (error) return errorResponse(error.message);
    return json(data);
  }

  const { data, error } = await supabase.from("cleaning_tasks").update(updates).eq("id", p.id).select().single();
  if (error) return errorResponse(error.message);
  return json(data);
});

addRoute("DELETE", "/atlas-api/cleaning/tasks/:id", async (req, p) => {
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const membership = await getOrgForUser(user.id);
  if (!requireHost(membership)) return errorResponse("Host access required", 403);
  const { data: task } = await supabase.from("cleaning_tasks").select("org_id").eq("id", p.id).single();
  if (!task || task.org_id !== membership.org_id) return errorResponse("Task not found", 404);
  const { error } = await supabase.from("cleaning_tasks").delete().eq("id", p.id);
  if (error) return errorResponse(error.message);
  return json({ success: true });
});

// ── AI Import Listing (mock parser) ─────────────────────
addRoute("POST", "/atlas-api/import-listing", async (req) => {
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const membership = await getOrgForUser(user.id);
  if (!requireHost(membership)) return errorResponse("Host access required", 403);
  const b = await getBody(req);
  const url = b.url as string;
  if (!url || !url.includes("airbnb.com")) return errorResponse("Please provide a valid Airbnb URL", 400);

  // Mock parser — extracts a listing ID and generates plausible data
  const idMatch = url.match(/rooms\/(\d+)/);
  const listingId = idMatch ? idMatch[1] : Math.floor(Math.random() * 9000000).toString();

  // Generate mock property data based on the URL
  const mockTitles = ["Sunset Villa Retreat", "Oceanfront Modern Suite", "Downtown Designer Loft", "Hillside Garden Cottage", "Luxury Penthouse Escape"];
  const mockLocations = ["Simpson Bay, SXM", "Maho, SXM", "Grand Case, SXM", "Orient Bay, SXM", "Philipsburg, SXM"];
  const idx = Math.abs(parseInt(listingId) % mockTitles.length);

  const photos = [
    "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    "https://images.pexels.com/photos/2029722/pexels-photo-2029722.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
    "https://images.pexels.com/photos/2029698/pexels-photo-2029698.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  ];

  return json({
    title: mockTitles[idx],
    description: `Imported listing #${listingId}. This beautiful property features modern amenities, spacious living areas, and is perfectly located for your next getaway.`,
    location: mockLocations[idx],
    bedrooms: (idx % 3) + 1,
    bathrooms: (idx % 2) + 1,
    max_guests: ((idx % 3) + 1) * 2,
    base_rate: 120 + (idx * 35),
    cleaning_fee: 60 + (idx * 15),
    occupancy_tax_rate: 0.05,
    image_url: photos[0],
    gallery_urls: photos,
    amenities: ["Wifi", "Kitchen", "AC", "TV", "Free Parking", "Washer"],
    source: "airbnb",
    source_listing_id: listingId,
    imported: true,
  });
});

// ── Ledger entries (host only) ──────────────────────────
addRoute("GET", "/atlas-api/ledger", async (req) => {
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const membership = await getOrgForUser(user.id);
  if (!requireHost(membership)) return errorResponse("Host access required", 403);
  const { data, error } = await supabase
    .from("ledger_entries").select("*, property:properties(title)")
    .eq("org_id", membership.org_id).order("entry_date", { ascending: false });
  if (error) return errorResponse(error.message);
  return json(data);
});

addRoute("POST", "/atlas-api/ledger", async (req) => {
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const membership = await getOrgForUser(user.id);
  if (!requireHost(membership)) return errorResponse("Host access required", 403);
  const b = await getBody(req);
  if (!b.category || !b.type) return errorResponse("category and type are required", 400);
  const { data, error } = await supabase.from("ledger_entries").insert({
    org_id: membership.org_id,
    property_id: b.property_id || null,
    reservation_id: b.reservation_id || null,
    category: b.category, type: b.type,
    amount: b.amount || 0, currency: b.currency || "USD",
    description: b.description || "", entry_date: b.entry_date || new Date().toISOString().slice(0, 10),
  }).select().single();
  if (error) return errorResponse(error.message);
  return json(data, 201);
});

addRoute("PATCH", "/atlas-api/ledger/:id", async (req, p) => {
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const membership = await getOrgForUser(user.id);
  if (!requireHost(membership)) return errorResponse("Host access required", 403);
  const b = await getBody(req);
  const allowed = ["category","type","amount","currency","description","entry_date","synced","property_id"];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (b[k] !== undefined) updates[k] = b[k];
  const { data: entry } = await supabase.from("ledger_entries").select("org_id").eq("id", p.id).single();
  if (!entry || entry.org_id !== membership.org_id) return errorResponse("Entry not found", 404);
  const { data, error } = await supabase.from("ledger_entries").update(updates).eq("id", p.id).select().single();
  if (error) return errorResponse(error.message);
  return json(data);
});

addRoute("DELETE", "/atlas-api/ledger/:id", async (req, p) => {
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const membership = await getOrgForUser(user.id);
  if (!requireHost(membership)) return errorResponse("Host access required", 403);
  const { data: entry } = await supabase.from("ledger_entries").select("org_id").eq("id", p.id).single();
  if (!entry || entry.org_id !== membership.org_id) return errorResponse("Entry not found", 404);
  const { error } = await supabase.from("ledger_entries").delete().eq("id", p.id);
  if (error) return errorResponse(error.message);
  return json({ success: true });
});

// ── Finance sync (mock) ─────────────────────────────────
addRoute("POST", "/atlas-api/finance/sync", async (req) => {
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const membership = await getOrgForUser(user.id);
  if (!requireHost(membership)) return errorResponse("Host access required", 403);

  // Get unsynced entries
  const { data: entries, error } = await supabase
    .from("ledger_entries").select("*")
    .eq("org_id", membership.org_id).eq("synced", false);
  if (error) return errorResponse(error.message);

  if (!entries || entries.length === 0) {
    return json({ synced: 0, message: "No entries to sync" });
  }

  // Mark as synced
  const ids = entries.map((e: { id: string }) => e.id);
  await supabase.from("ledger_entries").update({ synced: true }).in("id", ids);

  // Calculate summary
  const totalIncome = entries.filter((e: { type: string }) => e.type === "INCOME").reduce((s: number, e: { amount: number }) => s + Number(e.amount), 0);
  const totalExpense = entries.filter((e: { type: string }) => e.type === "EXPENSE").reduce((s: number, e: { amount: number }) => s + Number(e.amount), 0);
  const grossRevenue = totalIncome;

  // Get org for TOT calculation
  const { data: org } = await supabase.from("organizations").select("tot_tax_rate, business_name").eq("id", membership.org_id).single();
  const totRate = org?.tot_tax_rate || 0.12;
  const projectedTot = grossRevenue * totRate;

  return json({
    synced: entries.length,
    summary: {
      gross_revenue: grossRevenue,
      total_expenses: totalExpense,
      net_income: grossRevenue - totalExpense,
      projected_tot: projectedTot,
      tot_rate: totRate,
      business_name: org?.business_name,
    },
    message: `Synced ${entries.length} entries to Atlas Accounting`,
  });
});

// ── Pricing calculator (public) ─────────────────────────
addRoute("POST", "/atlas-api/finance/calculate", async (req) => {
  const b = await getBody(req);
  const baseRate = Number(b.base_rate) || 0;
  const cleaningFee = Number(b.cleaning_fee) || 0;
  const taxRate = Number(b.tax_rate) ?? 0.05;
  const nights = Number(b.nights) || 0;
  if (nights <= 0) return errorResponse("nights must be > 0", 400);

  const baseTotal = baseRate * nights;
  const subtotal = baseTotal + cleaningFee;
  const taxTotal = subtotal * taxRate;
  const grandTotal = subtotal + taxTotal;
  const netHostPayout = baseTotal + cleaningFee; // host keeps base + cleaning; tax is remitted

  return json({
    nights,
    base_rate: baseRate,
    base_total: baseTotal,
    cleaning_fee: cleaningFee,
    subtotal,
    tax_rate: taxRate,
    tax_total: taxTotal,
    grand_total: grandTotal,
    net_host_payout: netHostPayout,
    tot_owed: taxTotal,
  });
});

// ── Vendor auth check ───────────────────────────────────
addRoute("GET", "/atlas-api/vendor/me", async (req) => {
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);
  const membership = await getOrgForUser(user.id);
  if (!membership) return errorResponse("No organization found", 404);
  if (membership.role !== "staff") return errorResponse("Vendor access required", 403);

  const { data: staffRecord } = await supabase
    .from("cleaning_staff").select("id, name")
    .eq("user_id", user.id).eq("org_id", membership.org_id).single();

  return json({
    user_id: user.id,
    role: "staff",
    org_id: membership.org_id,
    staff_id: staffRecord?.id || null,
    name: staffRecord?.name || user.email,
    email: user.email,
  });
});

// ── Serve ───────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    const url = new URL(req.url);
    let pathname = url.pathname;
    // Strip the edge function mount prefix so routes registered as /atlas-api/... match
    const funcPrefix = "/functions/v1";
    if (pathname.startsWith(funcPrefix)) pathname = pathname.slice(funcPrefix.length);
    const route = await matchRoute(req.method, pathname);
    if (!route) return errorResponse("Not found", 404);
    return await route.handler(req, route.params, parseQuery(url));
  } catch (err) {
    return errorResponse((err as Error).message || "Internal server error");
  }
});
