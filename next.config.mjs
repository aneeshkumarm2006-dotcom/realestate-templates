/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  experimental: {
    // The admin API routes touch public/ via fs only in local dev (in
    // production, CMS_STORAGE=github routes everything through the GitHub
    // API). Without this, Vercel traces the whole public/ image tree into
    // the function bundles and blows the 250 MB limit.
    outputFileTracingExcludes: {
      '/api/admin/*': ['./public/**'],
      '/api/admin/site-media': ['./public/**'],
      '/api/admin/upload': ['./public/**'],
    },
  },
  async redirects() {
    return [
      { source: '/contact', destination: '/inquire', permanent: true },
      { source: '/inquiry', destination: '/inquire', permanent: true },
      // Renamed properties — old slugs → new slugs.
      { source: '/residences/edmonton/royal-10746', destination: '/residences/edmonton/royal-lady',       permanent: true },
      { source: '/residences/edmonton/catalina',    destination: '/residences/edmonton/catalina-estates', permanent: true },
      { source: '/residences/edmonton/sky',         destination: '/residences/edmonton/sky-manor',        permanent: true },
      { source: '/residences/edmonton/cedar',       destination: '/residences/edmonton/cedar-manor',      permanent: true },
      { source: '/residences/edmonton/copper',      destination: '/residences/edmonton/copper-manor',     permanent: true },
      { source: '/residences/edmonton/grandview',   destination: '/residences/edmonton/grandview-manor',  permanent: true },
      { source: '/residences/edmonton/courts',      destination: '/residences/edmonton/courts-manor',     permanent: true },
      { source: '/residences/edmonton/oakwood',     destination: '/residences/edmonton/oakwood-manor',    permanent: true },
      { source: '/residences/edmonton/balwin',      destination: '/residences/edmonton/balwin-manor',     permanent: true },
      { source: '/residences/edmonton/royal-10215', destination: '/residences/edmonton/royal-manor',      permanent: true },
      // Saskatoon / Regina renames + Cielo & Greyson split.
      { source: '/residences/saskatoon/cielo-greyson', destination: '/residences/saskatoon/cielo',          permanent: true },
      { source: '/residences/saskatoon/lawson',        destination: '/residences/saskatoon/lawson-village', permanent: true },
      { source: '/residences/regina/lockwood',         destination: '/residences/saskatoon/lockwood-arms',  permanent: true },
      { source: '/residences/regina/lockwood-arms',    destination: '/residences/saskatoon/lockwood-arms',  permanent: true },
      { source: '/residences/saskatoon/edge-living',   destination: '/residences/edmonton/edge-living',     permanent: true },
    ];
  },
};

export default nextConfig;
