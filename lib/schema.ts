export interface StructuredData {
  "@context": string;
  "@type": string;
  [key: string]: any;
}

export function generateOrganizationSchema(): StructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SY Data",
    url: "https://sydata.com",
    logo: "https://sydata.com/logo.png",
    description:
      "Buy data, airtime, electricity bills, and cable TV instantly at competitive prices in Nigeria.",
    sameAs: [
      "https://www.facebook.com/sydata",
      "https://www.whatsapp.com",
      "https://www.instagram.com/sydata",
      "https://twitter.com/sydata",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+234-XXX-XXXX-XXX",
      contactType: "Customer Service",
      areaServed: "NG",
      availableLanguage: ["en"],
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "NG",
      addressLocality: "Lagos",
      addressRegion: "Nigeria",
    },
  };
}

export function generateWebsiteSchema(): StructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SY Data",
    url: "https://sydata.com",
    description: "Digital utility payments and airtime platform for Nigeria",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://sydata.com/search?q={search_term_string}",
      },
      query_input: "required name=search_term_string",
    },
  };
}

export function generateLocalBusinessSchema(): StructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "SY Data",
    image: "https://sydata.com/og-image.png",
    description:
      "Digital services platform offering data, airtime, and utility bill payments",
    address: {
      "@type": "PostalAddress",
      addressCountry: "NG",
      addressLocality: "Lagos",
      addressRegion: "Nigeria",
    },
    telephone: "+234-XXX-XXXX-XXX",
    url: "https://sydata.com",
    priceRange: "N100 - N100,000",
    areaServed: "NG",
  };
}

export const structuredDataScripts: StructuredData[] = [
  generateOrganizationSchema(),
  generateWebsiteSchema(),
  generateLocalBusinessSchema(),
];
