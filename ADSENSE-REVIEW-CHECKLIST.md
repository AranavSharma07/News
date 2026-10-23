# AdSense readiness checklist — NaukriSetu

The source now includes a site-wide AdSense loader for publisher ID `ca-pub-7274245941888092`, privacy/terms/disclaimer pages, an administrator profile, a contact email, and sitemap entries for the public information pages.

Before requesting/retrying review:

- [ ] Deploy this exact version and confirm the live URL works over HTTPS.
- [ ] Set `NEXT_PUBLIC_SITE_URL=https://news-aa-3d38.vercel.app` in Vercel Production environment variables (or the actual custom domain if one is active), then redeploy.
- [ ] Add real, useful, original editorial context to the website; do not rely only on copied feed titles or thin summaries.
- [ ] Confirm published notices have working official-source links and remove broken, duplicate, expired, misleading or unsupported claims.
- [ ] Confirm Privacy Policy, Terms & Conditions, Disclaimer, About Admin and Contact links work on desktop and mobile.
- [ ] Keep the privacy disclosure consistent with the actual cookies, analytics, ads, hosting and data collection used by the site.
- [ ] Ensure the site is publicly accessible to Google's review systems; do not block required pages in robots or authentication.
- [ ] Check Google AdSense for site ownership, review status, policy messages and any consent requirements applicable to visitors.
- [ ] Verify the generated sitemap at `/sitemap.xml` and robots file at `/robots.txt`.
- [ ] Keep admin credentials and Supabase service-role keys server-side; never commit real secrets to GitHub.

These changes improve site transparency and technical readiness but do not guarantee AdSense approval. Review depends on the live website, actual content, account status, policy compliance and Google's assessment.
