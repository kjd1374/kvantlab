/**
 * Vercel Edge Middleware
 * Captures ?ref=PARTNER_CODE from URL and stores it in an httpOnly cookie (30 days).
 * This runs BEFORE any page load, ensuring the referral code is never lost.
 *
 * IMPORTANT: This file does NOT interfere with any existing routing in vercel.json.
 * It only sets a cookie and redirects to clean URL (without ?ref param).
 */
export default function middleware(request) {
  const url = new URL(request.url);
  const ref = url.searchParams.get('ref');

  // No ref parameter → pass through without touching anything
  if (!ref) return;

  // Remove the ref param from URL to keep it clean
  url.searchParams.delete('ref');
  const cleanUrl = url.pathname + (url.search || '');

  // Redirect to clean URL with the ref cookie set
  const response = new Response(null, {
    status: 302,
    headers: {
      'Location': cleanUrl || '/'
    }
  });

  // Set httpOnly cookie — 30 days expiration
  response.headers.append(
    'Set-Cookie',
    `kvant_ref=${encodeURIComponent(ref)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; HttpOnly; SameSite=Lax; Secure`
  );

  return response;
}

// Only intercept the landing page to minimize overhead
export const config = {
  matcher: '/'
};
